// cycle4-crosscheck.mjs — 逐字段程序化交叉比对：prompts ↔ handoffs ↔ issues ↔ spec ↔ decision-ledger ↔ README
// 用法: node research/scripts/cycle4-crosscheck.mjs （从 .scratch/architecture-recovery/ 运行）
import fs from 'node:fs';
const REPO = 'D:/Aworker/mozilla/choose-your-country';
const BASE = REPO + '/.scratch/architecture-recovery';
// [nn, slug, 声明的A-xxx, 需求锚token(正则串)]
const TICKETS = [
  ['27', 'detection-coverage-floor', ['A-001'], 'SCORE_LOWKEY|低置信线'],
  ['28', 'iso2-dial-evidence', ['A-002'], 'parenDial'],
  ['29', 'scan-candidates-expansion', ['A-003'], 'SCAN_SELECTORS|自定义下拉|候选面'],
  ['30', 'rules-tier-scope-fix', ['A-004'], 'pageTierOverride|分档覆盖'],
  ['31', 'fill-feedback-loop', ['A-005'], '静默|三态'],
  ['32', 'real-site-corpus', ['A-006'], '模式库|真实站点'],
  ['33', 'version-bump-delivery', ['A-007'], 'bump|版本号'],
  ['34', 'gate-slimming', ['A-008', 'A-009'], 'engine-gates'],
  ['35', 'history-landing-discipline', ['A-010'], 'squash|历史'],
];
const problems = [];
const P = (s) => problems.push(s);
const read = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return null; } };
const exists = (p) => { try { fs.statSync(p); return true; } catch { return false; } };
const norm = (s) => s.replace(/\\/g, '/');
function absPaths(txt) {
  const out = new Set();
  for (const m of (txt || '').matchAll(/`([^`\n]+)`/g)) {
    let s = m[1].trim();
    if (/window-reports/.test(s)) continue;
    let c = null;
    if (/^D:\\/i.test(s)) c = norm(s);
    else if (/^(src|tests|docs|\.github|greasyfork)\\/i.test(s)) c = REPO + '/' + norm(s);
    if (c) out.add(c.replace(/[（(].*$/, '').trim());
  }
  return [...out];
}
const forbidden = [
  ['worktree', /worktree/i],
  ['git checkout', /git\s+checkout/i],
  ['git branch', /git\s+branch/i],
  ['bare-git-write', /\bgit\s+(add|commit|push|pull|merge|rebase|stash|cherry-pick|restore|checkout)(?![\w-])/i],
];
const spec = read(BASE + '/spec.md') || '';
const ledger = read(BASE + '/decision-ledger.md') || '';
const readme = read(BASE + '/README.md') || '';
const raw = {}; // nn -> {issue,handoff,prompt}
for (const [nn, slug] of TICKETS) {
  raw[nn] = {
    issue: read(`${BASE}/issues/${nn}-${slug}.md`),
    handoff: read(`${BASE}/handoffs/${nn}-${slug}.md`),
    prompt: read(`${BASE}/prompts/${nn}-${slug}.md`),
  };
  for (const [k, v] of Object.entries(raw[nn])) if (v === null) P(`[${nn}] ${k} file MISSING: ${nn}-${slug}.md`);
}
// ── 1) 路径引用 ──
for (const [nn, slug] of TICKETS) {
  const { handoff, prompt } = raw[nn];
  if (prompt) {
    if (!prompt.includes(`handoffs\\${nn}-${slug}.md`) && !prompt.includes(`handoffs/${nn}-${slug}.md`)) P(`[${nn}] prompt 未引用本票 handoff 路径`);
    if (!prompt.includes(`issues\\${nn}-${slug}.md`) && !prompt.includes(`issues/${nn}-${slug}.md`)) P(`[${nn}] prompt 未引用本票 issue 路径`);
    for (const [name, re] of forbidden) if (re.test(prompt)) P(`[${nn}] prompt 违禁模式 "${name}"`);
    if (/串行护栏|续跑锚定|证据铁律|对标行业成熟心智模型/.test(prompt)) P(`[${nn}] prompt 复述调研要求块`);
    if (/issue 全部验收项勾销并各附/.test(prompt)) P(`[${nn}] prompt 复述 handoff 完成定义原文`);
    if (!/完成定义遵循 handoff 内完成定义/.test(prompt)) P(`[${nn}] prompt 缺「完成定义遵循 handoff」指针`);
    for (const p of absPaths(prompt)) if (!exists(p)) P(`[${nn}] prompt 路径不可解析: ${p}`);
    const lines = prompt.split(/\r?\n/).length;
    if (lines > 60) P(`[${nn}] prompt 行数 ${lines} >60`);
  }
  if (handoff) {
    for (const [name, re] of forbidden) if (re.test(handoff)) P(`[${nn}] handoff 违禁模式 "${name}"`);
    for (const p of absPaths(handoff)) if (!exists(p)) P(`[${nn}] handoff 路径不可解析: ${p}`);
    if (!handoff.includes(`issues\\${nn}-${slug}.md`) && !handoff.includes(`issues/${nn}-${slug}.md`)) P(`[${nn}] handoff 未引用本票 issue`);
    if ((handoff.match(/通用调研要求/g) || []).length !== 1) P(`[${nn}] handoff 通用调研要求块非恰 1 次`);
  }
  if (raw[nn].issue) for (const [name, re] of forbidden) if (re.test(raw[nn].issue)) P(`[${nn}] issue 违禁模式 "${name}"`);
}
for (const f of ['spec.md', 'decision-ledger.md', 'research/cycle4-atomcode-findings.md', 'research/cycle4-investigation.md']) {
  const t = read(BASE + '/' + f) || '';
  for (const [name, re] of forbidden) if (re.test(t)) P(`[doc] ${f} 违禁模式 "${name}"`);
}
// ── 2) 标题一致性 ──
for (const [nn] of TICKETS) {
  const gi = (t, re) => { const m = (t || '').match(re); return m ? m[2].trim() : null; };
  const ti = gi(raw[nn].issue, /^# (\d+) — (.+)$/m);
  const th = gi(raw[nn].handoff, /^# Handoff (\d+) — (.+)$/m);
  const tp = gi(raw[nn].prompt, /^# Prompt (\d+) — (.+)$/m);
  if (!ti) P(`[${nn}] issue 无 H1 标题`);
  if (ti && th && ti !== th) P(`[${nn}] 标题不一致 issue「${ti}」≠ handoff「${th}」`);
  if (ti && tp && ti !== tp) P(`[${nn}] 标题不一致 issue「${ti}」≠ prompt「${tp}」`);
  if (ti) { const row = readme.split(/\r?\n/).find((l) => new RegExp('\\| ' + nn + ' [^|]').test(l)); if (row && !row.includes(ti)) P(`[${nn}] README 状态行未含标题「${ti}」`); }
}
// ── 3) 需求原文锚 + A-xxx 声明跨工件一致 ──
for (const [nn, , ax, anchor] of TICKETS) {
  const re = new RegExp(anchor);
  const docs = { ledger, spec, issue: raw[nn].issue || '', handoff: raw[nn].handoff || '', prompt: raw[nn].prompt || '' };
  for (const [dn, t] of Object.entries(docs)) if (!re.test(t)) P(`[${nn}] 需求锚 /${anchor}/ 缺失于 ${dn}`);
  const declared = (t, re1) => { const m = (t || '').match(re1); return m ? [...new Set([...(m[1] || m[0]).matchAll(/A-0\d\d/g)].map((x) => x[0]))].sort() : []; };
  const ai = declared(raw[nn].issue, /\*\*覆盖 A-xxx:\*\*([^\n]+)/);
  const ah = declared(raw[nn].handoff, /覆盖 (A-\d{3}(?:, A-\d{3})*)/);
  const ap = declared(raw[nn].prompt, /（覆盖 ([^）]+)）/);
  const want = [...ax].sort();
  for (const [dn, got] of [['issue', ai], ['handoff', ah], ['prompt', ap]]) {
    if (JSON.stringify(got) !== JSON.stringify(want)) P(`[${nn}] A-xxx 声明不一致 ${dn}=[${got}] 应为=[${want}]`);
  }
}
// ── 4) 阻塞边 ──
const blockers = {};
for (const [nn] of TICKETS) {
  const t = raw[nn].issue || '';
  const m = t.match(/\*\*Blocked by:\*\*\s*([^\n]+)/);
  if (!m) { blockers[nn] = null; continue; }
  blockers[nn] = /None/.test(m[1]) ? [] : [...new Set([...m[1].matchAll(/\b(2[7-9]|3[0-5])\b/g)].map((x) => x[1]))].sort();
  for (const b of blockers[nn]) if (!TICKETS.some((t2) => t2[0] === b)) P(`[${nn}] 阻塞引用不存在的票 ${b}`);
}
for (const [nn] of TICKETS) {
  const p = raw[nn].prompt || '';
  const m = p.match(/Blocked by:[^）)】]*[）)】]?/);
  const seg = m ? m[0] : '';
  const pb = /None/.test(seg) ? [] : [...new Set([...seg.matchAll(/\b(2[7-9]|3[0-5])\b/g)].map((x) => x[1]))].sort();
  if (JSON.stringify(pb) !== JSON.stringify(blockers[nn] || [])) P(`[${nn}] 阻塞边不一致 issue=[${blockers[nn]}] ≠ prompt=[${pb}]`);
}
// 环检测 + 波次推导
{
  const done = new Set(); const waves = []; let rem = TICKETS.map((t) => t[0]);
  while (rem.length) {
    const w = rem.filter((n) => (blockers[n] || []).every((b) => done.has(b))).sort();
    if (!w.length) { P('阻塞图存在环: ' + rem.join(',')); break; }
    waves.push(w); w.forEach((n) => done.add(n)); rem = rem.filter((n) => !w.includes(n));
  }
  globalThis.__waves = waves;
  // README 波次行核对（第四周期节：| **W1** | 30, 31, 32, 34 |）
  const c4 = readme.slice(readme.indexOf('## 第四周期'));
  for (let i = 0; i < waves.length; i++) {
    const row = c4.match(new RegExp('\\| \\*\\*W' + (i + 1) + '\\*\\* \\| ([^|]+) \\|'));
    if (!row) { P(`README 缺 W${i + 1} 波次行`); continue; }
    const got = [...new Set([...row[1].matchAll(/\b(2[7-9]|3[0-5])\b/g)].map((x) => x[1]))].sort();
    if (JSON.stringify(got) !== JSON.stringify(waves[i])) P(`README W${i + 1}=[${got}] ≠ 推导=[${waves[i]}]`);
  }
}
// ── 5) 验收清单 ──
for (const [nn, slug] of TICKETS) {
  const t = raw[nn].issue || '';
  const acs = (t.match(/^- \[ \] /gm) || []).length;
  if (acs < 4) P(`[${nn}] issue 验收项 ${acs} <4`);
  if (!/commit sha/.test(t) || !/CI run/.test(t)) P(`[${nn}] issue 缺证据锚条款(commit sha/CI run)`);
  const rep = `${nn}-${slug}-report.md`;
  const rp = (raw[nn].prompt || '').includes(rep);
  const rh = (raw[nn].handoff || '').includes(rep);
  const rr = readme.includes('window-reports/' + rep);
  if (!rp || !rh) P(`[${nn}] 报告路径未在 prompt/handoff 中一致出现`);
  if (!rr) P(`[${nn}] README 状态表缺报告路径 ${rep}`);
}
// ── 6) 三段覆盖集合等式 ──
const ids = []; for (let i = 1; i <= 10; i++) ids.push('A-' + String(i).padStart(3, '0'));
const ledgerCurrent = ids.filter((id) => new RegExp('\\| ' + id + ' .+current', '').test(ledger.replace(/\r/g, '')));
const specDeclared = ids.filter((id) => spec.includes(id));
const ticketDeclared = [...new Set(TICKETS.flatMap((t) => t[2]))].sort();
const missing = (a, b) => a.filter((x) => !b.includes(x));
if (missing(ledgerCurrent, specDeclared).length) P(`段1缺漏: ledger-current 未被 spec 声明 = [${missing(ledgerCurrent, specDeclared)}]`);
if (missing(specDeclared, ledgerCurrent).length) P(`段1多向: spec 声明但非 ledger-current = [${missing(specDeclared, ledgerCurrent)}]`);
if (missing(specDeclared, ticketDeclared).length) P(`段3缺漏: spec 声明但无票覆盖 = [${missing(specDeclared, ticketDeclared)}]`);
if (missing(ticketDeclared, specDeclared).length) P(`段3多向: 票声明但 spec 未声明 = [${missing(ticketDeclared, specDeclared)}]`);
if (missing(ticketDeclared, ledgerCurrent).length) P(`票声明未见于 ledger-current = [${missing(ticketDeclared, ledgerCurrent)}]`);
// ── 输出 ──
const waves = globalThis.__waves;
const lines = [
  '# Cycle-4 交叉核对报告（程序化比对）', '',
  `> 工具: node research/scripts/cycle4-crosscheck.mjs | ${new Date().toISOString()}`, '',
  `- 比对工件: ${TICKETS.length} 票 × {issue,handoff,prompt} + spec + ledger + README + 2 份 research`,
  `- 检查维度: 路径引用 / 标题 / 需求锚 / A-xxx 声明 / 阻塞边 / 验收清单 / 违禁模式 / 复述 / 三段覆盖`,
  `- 三段覆盖: ledger-current=[${ledgerCurrent}] spec-declared=[${specDeclared}] tickets-declared=[${ticketDeclared}]`,
  `- 波次推导(含票35): ${JSON.stringify(waves)}`,
  `- 不一致总数: ${problems.length}`, '', '## 不一致清单', '',
  ...(problems.length ? problems.map((p) => '- ' + p) : ['- 无 — 全部维度通过']), '',
];
fs.writeFileSync(BASE + '/research/cycle4-crosscheck-report.md', lines.join('\n'), 'utf8');
console.log(`tickets=${TICKETS.length} ledger-current=${ledgerCurrent.length} spec=${specDeclared.length} tickets-declared=${ticketDeclared.length}`);
console.log('waves=' + JSON.stringify(waves));
console.log('PROBLEMS=' + problems.length);
problems.forEach((p) => console.log(' - ' + p));