// ══════════════════════════════════════════════════════════════════
// 14-calibration-harness.mjs — 票 14 precision/recall 基线 harness
// 输入: tests/corpus/manifest.json（正负例语料，append-only）+ src/ 评分引擎（函数束装载，零构建）
// 输出: stdout 紧摘要 + --json 摘要 JSON + --out markdown 报告
// 门禁: 全部 knownResidual!=true 的用例 expect 必须与引擎输出一致（knownResidual =
//   已登记结构性残留，修复归属 16 票，如实计入 precision 分母但不拦 CI）。
// 用法: node 14-calibration-harness.mjs [--out report.md] [--json summary.json]
// 可重复运行: 纯确定性（无时钟/随机依赖），同语料同引擎 → 同输出。
// ══════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadManifest, bundleEngine, runCorpus, metrics } from './14-lib-engine.mjs';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}
function writeOut(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const manifest = loadManifest();
const { Detect, COUNTRIES } = bundleEngine(null);
const results = runCorpus(manifest, Detect);
const m = metrics(results, manifest);

const pad = (s, n) => String(s).padEnd(n);
for (const c of manifest.cases) {
  const r = results.find(x => x.id === c.id);
  const ok = (c.expect === 'inject') === r.injected;
  const tag = c.knownResidual ? (ok ? 'PASS*' : 'RESID') : (ok ? 'PASS' : 'FAIL');
  console.log(`[${tag}] ${pad(c.id, 18)} ${pad(c.polarity, 9)} expect=${pad(c.expect, 7)} got=${pad(r.injected ? 'inject/' + r.tier : 'none', 14)} score=${r.score}`);
}
console.log('\n— 基线指标（注入判定 tier ∈ {auto, lowkey}；语料 ' + manifest.cases.length + ' 例 / 国家数据 ' + COUNTRIES.length + ' 国）');
console.log(`precision=${m.precision === null ? 'n/a' : m.precision.toFixed(4)} (TP=${m.TP}, FP=${m.FP})`);
console.log(`recall   =${m.recall === null ? 'n/a' : m.recall.toFixed(4)} (FN=${m.FN})`);
console.log(`f1       =${m.f1 === null ? 'n/a' : m.f1.toFixed(4)}  accuracy=${m.accuracy.toFixed(4)}`);
console.log(`knownResidual 计入 FP 的结构性残留: ${manifest.cases.filter(c => c.knownResidual).map(c => c.id).join(', ') || '无'}`);
const gate = m.mismatches.length === 0;
console.log(`回归门禁（非 residual 用例全部符合 expect）: ${gate ? 'PASS' : 'FAIL → ' + m.mismatches.join(', ')}`);

const json = {
  ticket: 14,
  corpus: 'tests/corpus/manifest.json',
  cases: m.cases, TP: m.TP, FP: m.FP, TN: m.TN, FN: m.FN,
  precision: m.precision, recall: m.recall, f1: m.f1, accuracy: m.accuracy,
  gate: gate ? 'pass' : 'fail',
  gateMismatches: m.mismatches,
  knownResidual: manifest.cases.filter(c => c.knownResidual).map(c => c.id),
  appendOnly: manifest._meta.appendOnlyRule,
  engine: 'src/detect/index.ts (function-bundle, no build)',
};
const jsonPath = arg('--json');
if (jsonPath) { writeOut(jsonPath, JSON.stringify(json, null, 2) + '\n'); console.log('json → ' + jsonPath); }

const mdPath = arg('--out');
if (mdPath) {
  const lines = [];
  lines.push('# Precision/Recall 基线报告（票 14 harness）');
  lines.push('');
  lines.push('- 引擎: `src/detect/index.ts`（函数束装载，零构建零依赖，不改检测行为）');
  lines.push('- 语料: `tests/corpus/manifest.json`（' + manifest.cases.length + ' 例，append-only，每例标注正/负与来源）');
  lines.push('- 注入口径: tier ∈ {auto, lowkey}（与 misdetect-repro-v2.mjs 一致）');
  lines.push('');
  lines.push('| 指标 | 值 |');
  lines.push('|---|---|');
  lines.push('| precision | ' + (m.precision === null ? 'n/a' : m.precision.toFixed(4)) + ' (TP=' + m.TP + ', FP=' + m.FP + ') |');
  lines.push('| recall | ' + (m.recall === null ? 'n/a' : m.recall.toFixed(4)) + ' (FN=' + m.FN + ') |');
  lines.push('| F1 | ' + (m.f1 === null ? 'n/a' : m.f1.toFixed(4)) + ' |');
  lines.push('| accuracy | ' + m.accuracy.toFixed(4) + ' |');
  lines.push('');
  lines.push('## 回归门禁');
  lines.push('');
  lines.push((gate ? 'PASS — ' : 'FAIL — ') + (m.mismatches.length ? m.mismatches.join(', ') : '非 residual 用例全部符合 expect'));
  lines.push('');
  lines.push('## 逐例结果');
  lines.push('');
  lines.push('| id | family | polarity | expect | got | score | residual | source |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const c of manifest.cases) {
    const r = results.find(x => x.id === c.id);
    const got = r.injected ? 'inject/' + r.tier : 'none';
    lines.push('| ' + [c.id, c.family, c.polarity, c.expect, got, r.score, c.knownResidual ? 'yes' : '', c.source].join(' | ') + ' |');
  }
  lines.push('');
  lines.push('> knownResidual=yes 的用例为已登记结构性残留（见 manifest note），计入 precision 分母、不拦门禁。');
  lines.push('');
  writeOut(mdPath, lines.join('\n') + '\n');
  console.log('report → ' + mdPath);
}
process.exit(gate ? 0 : 1);
