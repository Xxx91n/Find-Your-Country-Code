// T-13 伪 select 子集度量（Cycle-7 度量脚本，可复跑）
// 用法：node .scratch/cycle7-grill/scripts/t13-pseudo-subset.mjs
// 结论留档：docs/adr/0005-pseudo-select-recognition-implement.md「Notes（2026-09-17 · T-13 二次裁决）」。
//
// 子集口径（机械、可复跑）：引擎进入伪 select 分支的用例 —— pseudo===true 或信号含 custom:/pseudo: 前缀。
// 内容轴：用例的 dialEvidence / upgradeCandidate 字段（polarity 在本仓编码的是 ADR-0005 注入真值，
// 不是内容真值 —— 先例 rs-noaria-custom-dropdown：选项含 (+NN) 仍记 negative）。
// 自路径锚定仓库根（与 tests/scripts/*.mjs 同口径，ADR-0006 决策 1 精神）。


// T-13 伪 select 子集度量（补语料后）
// 子集口径（机械、可复跑）：引擎进入伪 select 分支的用例 —— pseudo===true 或信号含 custom:/pseudo: 前缀。
// 内容轴：用例的 dialEvidence / upgradeCandidate 字段（polarity 在本仓编码的是 ADR-0005 注入真值，不是内容真值）。
import { loadManifest, bundleEngine, runCorpus, metrics } from '../../../tests/scripts/14-lib-engine.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..'); // .scratch/cycle7-grill/scripts -> 仓库根
const cfg = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const num = (n) => Number(new RegExp('export const ' + n + '\\s*=\\s*(-?\\d+)').exec(cfg)[1]);
const REG = num('ITI_LOW_REGISTER_SCORE'), LOWKEY = num('SCORE_LOWKEY'), AUTO = num('SCORE_AUTO');
const manifest = loadManifest();
const { Detect } = bundleEngine(null);
const results = runCorpus(manifest, Detect);
const byId = new Map(results.map(r => [r.id, r]));
const isPseudo = (r) => r.pseudo === true || (r.signals || []).some(s => /^(custom|pseudo):/.test(s.name));
const subset = manifest.cases.filter(c => isPseudo(byId.get(c.id)));
console.log('阈值: REGISTER=' + REG + ' SCORE_LOWKEY=' + LOWKEY + ' SCORE_AUTO=' + AUTO);
console.log('| id | polarity | expect | score | tier | injected | registered(>=25) | dialEvidence | upgradeCandidate | pass |');
let TP = 0, FP = 0, TN = 0, FN = 0, cTP = 0, cFP = 0;
for (const c of subset) {
  const r = byId.get(c.id);
  const pass = (c.expect === 'inject') === r.injected;
  const reg = r.score >= REG;
  const pos = c.polarity === 'positive';
  if (pos && r.injected) TP++; else if (pos && !r.injected) FN++; else if (!pos && r.injected) FP++; else TN++;
  if (c.upgradeCandidate === true && reg) cTP++; else if (c.upgradeCandidate === false && reg) cFP++;
  console.log('| ' + [c.id, c.polarity, c.expect, r.score, r.tier, r.injected, reg, c.dialEvidence, c.upgradeCandidate, pass].join(' | ') + ' |');
}
const pos = subset.filter(c => c.polarity === 'positive').length;
const neg = subset.filter(c => c.polarity === 'negative').length;
console.log('子集规模=' + subset.length + '（polarity 正 ' + pos + ' / 负 ' + neg + '；内容轴 候选 ' + subset.filter(c => c.upgradeCandidate === true).length + ' / 非候选 ' + subset.filter(c => c.upgradeCandidate === false).length + '）');
const r4 = (a, b) => (a + b) ? (a / (a + b)).toFixed(4) : 'n/a';
console.log('口径A 注入（harness 默认 tier∈{auto,lowkey}，语料 polarity 标签）: TP=' + TP + ' FP=' + FP + ' TN=' + TN + ' FN=' + FN + ' precision=' + r4(TP, FP) + ' recall=' + r4(TP, FN));
console.log('口径B 召唤面（score>=' + REG + '＝升级后的注入目标集；以内容轴为真值）: 候选且登记=' + cTP + ' 非候选却登记=' + cFP + ' → 判别 precision=' + r4(cTP, cFP) + ' FP/负例=' + r4(cFP, neg));
console.log('口径B 明细: 召唤面成员 = ' + subset.filter(c => byId.get(c.id).score >= REG).map(c => c.id + '(cand=' + c.upgradeCandidate + ')').join(', '));
const all = metrics(results, manifest);
console.log('全语料: cases=' + all.cases + ' TP=' + all.TP + ' FP=' + all.FP + ' TN=' + all.TN + ' FN=' + all.FN + ' precision=' + all.precision.toFixed(4) + ' recall=' + all.recall.toFixed(4) + ' f1=' + all.f1.toFixed(4) + ' accuracy=' + all.accuracy.toFixed(4) + ' gate=' + (all.mismatches.length ? 'FAIL ' + all.mismatches.join(',') : 'PASS'));
