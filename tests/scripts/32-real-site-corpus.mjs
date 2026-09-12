// ══════════════════════════════════════════════════════════════════
// 32-real-site-corpus.mjs — 票 32 真实站点抽样语料：契约校验 + 候选集覆盖探针 + 复现基线锁
// 输入: tests/corpus/manifest.json（realSiteForms 段 + family="real-site" 用例）
//       src/detect/index.ts（SCAN_SELECTORS 真源，正则提取，不硬编码副本）
// 输出: stdout 紧摘要 + --json 摘要 + --out markdown 报告
// 硬门禁（任一失败 → exit 1）:
//   1) realSiteForms 契约字段完整
//   2) corpusCases 必须存在于 cases 且 family="real-site"
//   3) 覆盖探针自证（已知命中/已知不命中样本全部符合预期）——验收工具先自证 [WORKFLOW §5]
//   4) SCAN_SELECTORS 提取成功且非空
//   5) 实测候选集覆盖 === 登记的覆盖基线；实测引擎结果 === 登记的复现基线
//      （27/28/29 修复后必须显式更新 manifest，禁止静默漂移）
// 用法: node 32-real-site-corpus.mjs [--out report.md] [--json summary.json]
// 可重复运行: 纯确定性（无时钟/随机/网络依赖）。
// ══════════════════════════════════════════════════════════════════
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadManifest, bundleEngine, evaluateCase, metrics, runCorpus, ROOT } from './14-lib-engine.mjs';

const DETECT_SRC = join(ROOT, 'src', 'detect', 'index.ts');
const REQUIRED_FORM_FIELDS = ['id', 'label', 'coveredA', 'fixingTicket', 'expectedTier',
  'expectedTierRationale', 'corpusCases', 'candidateDescriptor',
  'coveredByCandidateSetBaseline', 'coveredByCandidateSetTarget', 'baseline'];
const TIERS = ['auto', 'lowkey', 'none'];

function arg(flag) { const i = process.argv.indexOf(flag); return i >= 0 ? process.argv[i + 1] : null; }
function writeOut(path, content) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content); }

// ── SCAN_SELECTORS 真源提取（禁硬编码副本，防与引擎漂移） ──
function extractScanSelectors(src) {
  const m = /const SCAN_SELECTORS = \[([\s\S]*?)\];/.exec(src);
  if (!m) throw new Error('SCAN_SELECTORS 提取失败：src/detect/index.ts 结构已变');
  const groups = (m[1].match(/'[^']*'/g) || []).map(s => s.slice(1, -1));
  if (!groups.length) throw new Error('SCAN_SELECTORS 提取为空');
  const flat = [];
  for (const g of groups) {
    for (const s of g.split(',')) if (s.trim()) flat.push({ selector: s.trim(), group: g.trim() });
  }
  return flat;
}

// ── 受限 CSS 选择器匹配器 ──
// 只覆盖 SCAN_SELECTORS 实际使用的语法：tag / .class / [attr] / [attr="v"] / :not([attr]) / 后代组合。
// 非通用 CSS 引擎：不支持的语法会 parse 出空 parts 从而只比 tag——因此下面必须自证（selfTest）。
function parseCompound(text) {
  const m = /^([A-Za-z*][\w-]*)?([\s\S]*)$/.exec(text.trim());
  const tag = m[1] || '*';
  const rest = m[2];
  const parts = [];
  const re = /\.([\w-]+)|\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]|:not\(\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'))?\]\)/g;
  let x;
  while ((x = re.exec(rest)) !== null) {
    if (x[1]) parts.push({ k: 'class', v: x[1] });
    else if (x[2]) parts.push({ k: 'attr', n: x[2], v: x[3] !== undefined ? x[3] : (x[4] !== undefined ? x[4] : (x[5] !== undefined ? x[5] : null)) });
    else if (x[6]) parts.push({ k: 'notAttr', n: x[6] });
  }
  return { tag, parts };
}

function matchCompound(node, c) {
  if (c.tag !== '*' && String(node.tag || '').toUpperCase() !== c.tag.toUpperCase()) return false;
  for (const p of c.parts) {
    if (p.k === 'class') {
      if (!(node.classes || []).includes(p.v)) return false;
    } else if (p.k === 'attr') {
      const v = (node.attrs || {})[p.n];
      if (v === undefined) return false;
      if (p.v !== null && String(v) !== p.v) return false;
    } else if (p.k === 'notAttr') {
      if ((node.attrs || {})[p.n] !== undefined) return false;
    }
  }
  return true;
}

function matchesSelector(selector, desc) {
  const segs = selector.trim().split(/\s+/);
  if (!matchCompound(desc, parseCompound(segs[segs.length - 1]))) return false;
  let ancs = (desc.ancestors || []).slice();
  for (let i = segs.length - 2; i >= 0; i--) {
    const c = parseCompound(segs[i]);
    const idx = ancs.findIndex(a => matchCompound(a, c));
    if (idx < 0) return false;
    ancs = ancs.slice(idx + 1);
  }
  return true;
}

function normalizeDescriptor(d) {
  const attrs = {};
  for (const [k, v] of Object.entries(d.attrs || {})) attrs[k] = v;
  return {
    tag: d.tag || 'div',
    classes: d.classes || (d.className ? String(d.className).split(/\s+/).filter(Boolean) : []),
    attrs,
    ancestors: (d.ancestors || []).map(a => ({ tag: a.tag || 'div', classes: a.classes || (a.className ? String(a.className).split(/\s+/).filter(Boolean) : []), attrs: a.attrs || {} })),
  };
}

// ── 探针自证：已知命中 / 已知不命中样本，全部必须符合预期 [WORKFLOW §5 教训] ──
function selfTest(scanSelectors) {
  const cases = [
    ['select', { tag: 'select' }, true],
    ['input[type="tel"]', { tag: 'input', attrs: { type: 'tel' } }, true],
    ['input[type="text"]', { tag: 'input', attrs: { type: 'text' } }, true],
    ['input[type="text"]', { tag: 'input' }, false],
    ['input:not([type])', { tag: 'input' }, true],
    ['input:not([type])', { tag: 'input', attrs: { type: 'text' } }, false],
    ['[role="combobox"]', { tag: 'div', attrs: { role: 'combobox' } }, true],
    ['[role="combobox"]', { tag: 'input', attrs: { role: 'combobox' } }, true],
    ['[role="combobox"]', { tag: 'div', classes: ['select-country'] }, false],
    ['.iti input', { tag: 'input', ancestors: [{ tag: 'div', classes: ['iti'] }] }, true],
    ['.iti input', { tag: 'input' }, false],
    ['.intl-tel-input input', { tag: 'input', ancestors: [{ tag: 'div', classes: ['iti'] }] }, false],
    ['select', { tag: 'div', classes: ['select-country'] }, false],
  ];
  const fails = [];
  for (const [sel, desc, want] of cases) {
    const got = matchesSelector(sel, normalizeDescriptor(desc));
    if (got !== want) fails.push('matcher: ' + sel + ' vs ' + JSON.stringify(desc) + ' want=' + want + ' got=' + got);
  }
  // 提取器自证：组内逗号必须被拆成子选择器（matchesSelector 不接受逗号组）
  const flat = scanSelectors.map(s => s.selector);
  const need = ['select', '.iti input', '.intl-tel-input input', 'input[type="tel"]', 'input[type="text"]',
    'input:not([type])', 'input[type="number"]', '[role="combobox"]'];
  for (const n of need) if (!flat.includes(n)) fails.push('extractor: 缺少子选择器 ' + n);
  return { fails, checks: cases.length + need.length };
}

// ══ 主流程 ══
const manifest = loadManifest();
const { Detect } = bundleEngine(null);
const byId = new Map(manifest.cases.map(c => [c.id, c]));
const violations = [];
const scanSelectors = extractScanSelectors(readFileSync(DETECT_SRC, 'utf8'));

if (!Array.isArray(manifest.realSiteForms) || !manifest.realSiteForms.length) {
  violations.push('manifest.realSiteForms 缺失或为空');
}
const st = selfTest(scanSelectors);
const selfFails = st.fails;
if (selfFails.length) violations.push('覆盖探针自证失败: ' + selfFails.join(' | '));
if (!scanSelectors.length) violations.push('SCAN_SELECTORS 提取为空');

const results = [];
for (const form of manifest.realSiteForms || []) {
  for (const f of REQUIRED_FORM_FIELDS) {
    if (form[f] === undefined || form[f] === null || form[f] === '') violations.push(form.id + ': 契约字段缺失 ' + f);
  }
  if (!TIERS.includes(form.expectedTier)) violations.push(form.id + ': expectedTier 非法 ' + form.expectedTier);
  if (!form.baseline || !form.baseline.observed) { violations.push(form.id + ': baseline.observed 缺失'); continue; }

  // 覆盖探针
  const desc = normalizeDescriptor(form.candidateDescriptor);
  const matched = scanSelectors.filter(s => matchesSelector(s.selector, desc)).map(s => s.selector);
  const covered = matched.length > 0;
  const baseMatched = (form.baseline.matchedSelectors || []).slice().sort();
  if (covered !== form.coveredByCandidateSetBaseline) {
    violations.push(form.id + ': 候选集覆盖漂移 实测=' + covered + ' 基线=' + form.coveredByCandidateSetBaseline);
  }
  if (matched.slice().sort().join('|') !== baseMatched.join('|')) {
    violations.push(form.id + ': 命中选择器集漂移 实测=[' + matched.join(',') + '] 基线=[' + baseMatched.join(',') + ']');
  }

  // 引擎复现基线
  const obs = [];
  for (const cid of form.corpusCases || []) {
    const c = byId.get(cid);
    if (!c) { violations.push(form.id + ': corpusCase 不存在 ' + cid); continue; }
    if (c.family !== 'real-site') violations.push(form.id + ': corpusCase ' + cid + ' 的 family 非 real-site');
    if (c.fixingTicket !== form.fixingTicket) violations.push(form.id + ': corpusCase ' + cid + ' fixingTicket 与形态不一致');
    const r = evaluateCase(c, Detect);
    obs.push({ id: cid, score: r.score, tier: r.tier, injected: r.injected });
    const b = form.baseline.observed;
    if (r.score !== b.score || r.tier !== b.tier || r.injected !== b.injected) {
      violations.push(form.id + '/' + cid + ': 引擎基线漂移 实测 score=' + r.score + ' tier=' + r.tier +
        ' injected=' + r.injected + ' 基线 score=' + b.score + ' tier=' + b.tier + ' injected=' + b.injected);
    }
    // 用例语义与基线一致性
    const wantKnownResidual = form.baseline.verdict === 'MISS';
    if (!!c.knownResidual !== wantKnownResidual) {
      violations.push(form.id + '/' + cid + ': knownResidual 与 verdict 不一致（verdict=' + form.baseline.verdict + ' knownResidual=' + !!c.knownResidual + '）');
    }
    if (wantKnownResidual && c.expect !== 'inject') violations.push(form.id + '/' + cid + ': verdict=MISS 但 expect 非 inject');
    if (!wantKnownResidual && c.expect !== 'none') violations.push(form.id + '/' + cid + ': verdict=' + form.baseline.verdict + ' 但 expect 非 none');
  }

  results.push({
    id: form.id, coveredA: form.coveredA, fixingTicket: form.fixingTicket,
    label: form.label, expectedTier: form.expectedTier, verdict: form.baseline.verdict,
    coveredByCandidateSet: covered, matchedSelectors: matched, observed: obs,
    gaps: form.baseline.gaps || [],
  });
}

// ── 前后对照（CI-only 证据）：real-site 语料入 / 不入 的 precision/recall ──
// 同一引擎、同一 harness，只切分语料集：证明新增语料不带来误报（precision 不回退），
// 且把真实世界漏检量化成 recall 下降（FN = 三形态）。
const beforeManifest = { ...manifest, cases: manifest.cases.filter(c => c.family !== 'real-site') };
const contrast = {
  before: (() => { const m = metrics(runCorpus(beforeManifest, Detect), beforeManifest); return { cases: m.cases, TP: m.TP, FP: m.FP, TN: m.TN, FN: m.FN, precision: m.precision, recall: m.recall, f1: m.f1, gate: m.mismatches.length ? 'fail' : 'pass' }; })(),
  after: (() => { const m = metrics(runCorpus(manifest, Detect), manifest); return { cases: m.cases, TP: m.TP, FP: m.FP, TN: m.TN, FN: m.FN, precision: m.precision, recall: m.recall, f1: m.f1, gate: m.mismatches.length ? 'fail' : 'pass' }; })(),
};

const gate = violations.length === 0;

// ── stdout 紧摘要 ──
const pad = (s, n) => String(s).padEnd(n);
console.log('— 真实站点抽样语料（票 32 / A-006）：SCAN_SELECTORS ' + scanSelectors.length + ' 条 / 形态 ' + results.length + ' 类');
console.log('覆盖探针自证: ' + (selfFails.length ? 'FAIL' : 'PASS') + '（' + st.checks + ' 断言）');
for (const r of results) {
  const o = r.observed[0] || {};
  console.log('[' + pad(r.verdict, 9) + '] ' + pad(r.id, 26) + ' covered=' + pad(r.coveredByCandidateSet, 5) +
    ' expectTier=' + pad(r.expectedTier, 6) + ' got=' + pad(o.tier, 6) + ' score=' + o.score +
    ' fix=' + r.fixingTicket + ' (' + r.coveredA + ')');
}
for (const r of results) for (const g of r.gaps) console.log('    gap[' + r.id + '] ' + g);
const num = x => x === null ? 'n/a' : x.toFixed(4);
console.log('— calibration 前后对照（同引擎，仅切分 real-site 语料）');
console.log('  前 cases=' + contrast.before.cases + ' precision=' + num(contrast.before.precision) + ' recall=' + num(contrast.before.recall) + ' f1=' + num(contrast.before.f1) + ' gate=' + contrast.before.gate);
console.log('  后 cases=' + contrast.after.cases + ' precision=' + num(contrast.after.precision) + ' recall=' + num(contrast.after.recall) + ' f1=' + num(contrast.after.f1) + ' gate=' + contrast.after.gate);
console.log('  Δ  precision=' + num(contrast.after.precision - contrast.before.precision) + ' recall=' + num(contrast.after.recall - contrast.before.recall) + '（FN 从 ' + contrast.before.FN + ' 升到 ' + contrast.after.FN + '，FP 不变 ' + contrast.after.FP + '）');
console.log('契约 + 覆盖 + 复现基线硬门禁: ' + (gate ? 'PASS' : 'FAIL'));
if (!gate) {
  for (const v of violations) console.log('  VIOLATION ' + v);
  console.log('  → 若本票为 27/28/29 修复票：请同步更新 manifest.realSiteForms[].baseline（observed/matchedSelectors/verdict）与用例 knownResidual/expect，禁止静默漂移。');
}

// ── 产物 ──
const json = {
  ticket: 32, coveredA: 'A-006', corpus: 'tests/corpus/manifest.json',
  scanSelectors: scanSelectors.map(s => s.selector),
  selfTest: selfFails.length ? 'fail' : 'pass',
  gate: gate ? 'pass' : 'fail', violations,
  contrast,
  forms: results,
};
const jsonPath = arg('--json');
if (jsonPath) { writeOut(jsonPath, JSON.stringify(json, null, 2) + '\n'); console.log('json → ' + jsonPath); }

const mdPath = arg('--out');
if (mdPath) {
  const L = [];
  L.push('# 真实站点抽样语料报告（票 32 / A-006）');
  L.push('');
  L.push('- 引擎: `src/detect/index.ts`（函数束装载，零构建零依赖）');
  L.push('- 模式库: `tests/corpus/manifest.json` 的 `realSiteForms` 段 + `family="real-site"` 用例（append-only）');
  L.push('- 候选集真源: `SCAN_SELECTORS`（' + scanSelectors.length + ' 条子选择器，正则提取自引擎源码）');
  L.push('- 覆盖探针自证: ' + (selfFails.length ? 'FAIL' : 'PASS'));
  L.push('');
  L.push('## 三类真实形态 × 覆盖 / 复现基线');
  L.push('');
  L.push('| 形态 | 覆盖 A | 候选集覆盖 | 期望 tier | 实测 tier | score | 复现基线 | 修复票 |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const o = r.observed[0] || {};
    L.push('| ' + [r.label, r.coveredA, r.coveredByCandidateSet ? 'yes' : '**no**', r.expectedTier,
      o.tier, o.score, r.verdict, r.fixingTicket].join(' | ') + ' |');
  }
  L.push('');
  L.push('## 缺口明细（供 27/28/29 作复现基线）');
  L.push('');
  for (const r of results) {
    L.push('### ' + r.id + '（' + r.coveredA + ' → 票 ' + r.fixingTicket + '）');
    L.push('');
    L.push('- 命中选择器: ' + (r.matchedSelectors.length ? '`' + r.matchedSelectors.join('`, `') + '`' : '**零命中**'));
    L.push('- 引擎实测: ' + r.observed.map(o => o.id + ' score=' + o.score + ' tier=' + o.tier + ' injected=' + o.injected).join('；'));
    for (const g of r.gaps) L.push('- 缺口: ' + g);
    L.push('');
  }
  L.push('## calibration 前后对照（同引擎，仅切分 real-site 语料）');
  L.push('');
  L.push('| 集合 | cases | TP | FP | TN | FN | precision | recall | f1 | 回归门禁 |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  const rows = [['前（无 real-site）', contrast.before], ['后（含 real-site）', contrast.after]];
  for (const [tag, m] of rows) L.push('| ' + [tag, m.cases, m.TP, m.FP, m.TN, m.FN, num(m.precision), num(m.recall), num(m.f1), m.gate].join(' | ') + ' |');
  L.push('| Δ | +' + (contrast.after.cases - contrast.before.cases) + ' | ' + (contrast.after.TP - contrast.before.TP) + ' | ' + (contrast.after.FP - contrast.before.FP) + ' | ' + (contrast.after.TN - contrast.before.TN) + ' | +' + (contrast.after.FN - contrast.before.FN) + ' | ' + num(contrast.after.precision - contrast.before.precision) + ' | **' + num(contrast.after.recall - contrast.before.recall) + '** | ' + num(contrast.after.f1 - contrast.before.f1) + ' | — |');
  L.push('');
  L.push('## 门禁');
  L.push('');
  L.push((gate ? 'PASS' : 'FAIL') + ' — ' + (violations.length ? violations.join('；') : '契约 / 覆盖 / 复现基线全部与登记一致'));
  L.push('');
  writeOut(mdPath, L.join('\n') + '\n');
  console.log('report → ' + mdPath);
}
process.exit(gate ? 0 : 1);
