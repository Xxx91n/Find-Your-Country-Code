// ══════════════════════════════════════════════════════════════════
// 14-threshold-calibration.mjs — 票 14 阈值标定脚本
// 输入: tests/corpus/manifest.json + src/ 评分引擎（函数束装载 + config 常量内存覆盖）
// 输出: 「建议参数 + 标定报告」(--out markdown)；只建议，绝不写回 src/config.ts。
// 可重复运行: 全确定性（固定网格、稳定排序、无时钟/随机）。
// 方法:
//   1) 基线分布: 现值下全语料 score/tier；
//   2) 阈值可行域: (SCORE_AUTO, SCORE_LOWKEY) 网格全量重评测（非 residual、非 iti
//      短路用例），求全部满足门禁的参数对 → 可行区间 + 现值判定；
//   3) 权重敏感性: L1/L2/L3/L4 常量 ×{0.5,0.75,1.25,1.5} 单变量扰动 → 门禁/F1/翻转例；
//   4) 建议 = 现值（若在可行域内）+ 区间边界与安全边距，供 16 票决策，不在本票生效。
// 用法: node 14-threshold-calibration.mjs [--out report.md]
// ══════════════════════════════════════════════════════════════════
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadManifest, bundleEngine, runCorpus, metrics, currentConfigValues, CALIBRATED_CONSTANTS } from './14-lib-engine.mjs';

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
}

const manifest = loadManifest();
const cur = currentConfigValues();

// 标定宇宙：排除 iti 短路用例（_process 硬编码 auto，阈值无关）与 knownResidual（结构性偏差，
// 修复归属 16 票，不参与阈值求解）
const universe = manifest.cases.filter(c => !(c.ctx && c.ctx.iti) && !c.knownResidual).map(c => c.id);

function evalWith(overrides) {
  const { Detect } = bundleEngine(overrides);
  const res = runCorpus(manifest, Detect);
  const u = res.filter(r => universe.includes(r.id));
  const byId = new Map(res.map(r => [r.id, r]));
  const violations = [];
  for (const c of manifest.cases) {
    if (!universe.includes(c.id)) continue;
    const r = byId.get(c.id);
    if ((c.expect === 'inject') !== r.injected) {
      violations.push(c.id + '(expect=' + c.expect + ',got=' + (r.injected ? r.tier : 'none') + ')');
    }
  }
  const inj = u.map(r => ({ pos: manifest.cases.find(c => c.id === r.id).polarity === 'positive', got: r.injected }));
  const TP = inj.filter(x => x.pos && x.got).length, FP = inj.filter(x => !x.pos && x.got).length;
  const FN = inj.filter(x => x.pos && !x.got).length;
  const precision = (TP + FP) ? TP / (TP + FP) : 0, recall = (TP + FN) ? TP / (TP + FN) : 0;
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return { res, byId, violations, f1, feasible: violations.length === 0 };
}

// ── 1) 基线 ──
const base = evalWith(null);
console.log('标定宇宙: ' + universe.length + ' 例（排除 iti 短路 ' +
  manifest.cases.filter(c => c.ctx && c.ctx.iti).map(c => c.id).join(',') + ' 与 knownResidual ' +
  manifest.cases.filter(c => c.knownResidual).map(c => c.id).join(',') + '）');
console.log('现值: SCORE_AUTO=' + cur.SCORE_AUTO + ' SCORE_LOWKEY=' + cur.SCORE_LOWKEY +
  ' → 现值可行: ' + (base.feasible ? 'YES' : 'NO ' + base.violations.join(', ')));

// ── 2) 阈值网格 ──
const autos = [], lowkeys = [];
for (let v = 40; v <= 165; v += 5) autos.push(v);
for (let v = 5; v <= 160; v += 5) lowkeys.push(v);
const feasiblePairs = [];
for (const a of autos) {
  for (const l of lowkeys) {
    if (l > a) continue;
    const r = evalWith({ SCORE_AUTO: a, SCORE_LOWKEY: l });
    if (r.feasible) feasiblePairs.push({ AUTO: a, LOWKEY: l, f1: r.f1 });
  }
}
const autoSet = [...new Set(feasiblePairs.map(p => p.AUTO))].sort((x, y) => x - y);
const lowSet = [...new Set(feasiblePairs.map(p => p.LOWKEY))].sort((x, y) => x - y);
console.log('可行域: ' + feasiblePairs.length + ' 组 | AUTO 边际 ∈ [' + (autoSet[0] ?? '-') + '..' + (autoSet[autoSet.length - 1] ?? '-') +
  '] | LOWKEY 边际 ∈ [' + (lowSet[0] ?? '-') + '..' + (lowSet[lowSet.length - 1] ?? '-') + ']');

// ── 3) 权重敏感性 ──
const sensRows = [];
for (const name of CALIBRATED_CONSTANTS) {
  if (name === 'SCORE_AUTO' || name === 'SCORE_LOWKEY') continue;
  for (const k of [0.5, 0.75, 1.25, 1.5]) {
    const v = Math.round(cur[name] * k);
    if (v === cur[name]) continue;
    const r = evalWith({ [name]: v });
    const flips = r.res.filter(x => universe.includes(x.id)).filter(x => {
      const b = base.byId.get(x.id);
      return b.injected !== x.injected || b.tier !== x.tier;
    }).map(x => x.id + '(' + base.byId.get(x.id).tier + '→' + x.tier + ')');
    sensRows.push({ name, from: cur[name], to: v, feasible: r.feasible, f1: r.f1, violations: r.violations, flips });
  }
}
const sensStable = sensRows.filter(r => r.feasible).length;
console.log('敏感性: ' + sensRows.length + ' 组扰动中 ' + sensStable + ' 组保持门禁可行');

// ── 4) 建议参数 ──
const currentFeasible = base.feasible &&
  feasiblePairs.some(p => p.AUTO === cur.SCORE_AUTO && p.LOWKEY === cur.SCORE_LOWKEY);
const suggestion = currentFeasible
  ? { decision: 'keep-current', SCORE_AUTO: cur.SCORE_AUTO, SCORE_LOWKEY: cur.SCORE_LOWKEY }
  : (feasiblePairs.length
    ? { decision: 'move', SCORE_AUTO: feasiblePairs[0].AUTO, SCORE_LOWKEY: feasiblePairs[0].LOWKEY,
        note: '首个可行对（网格升序）' }
    : { decision: 'no-feasible-threshold', note: '阈值不可解——偏差为结构性（见 knownResidual / 信号层），需 16 票改评分层' });

const md = [];
md.push('# 阈值标定报告（票 14）');
md.push('');
md.push('> 只输出建议，不修改 src/config.ts；参数变更须经 16 票或独立批准（issue 14 验收 5）。');
md.push('> 引擎装载: 函数束 + config 常量内存覆盖（零构建）；语料: tests/corpus/manifest.json。');
md.push('> 标定宇宙 ' + universe.length + ' 例 = 全语料 39 例 − iti 短路（阈值无关）− knownResidual（结构性偏差）。');
md.push('');
md.push('## 1. 现值与基线');
md.push('');
md.push('- 现值: SCORE_AUTO=' + cur.SCORE_AUTO + ', SCORE_LOWKEY=' + cur.SCORE_LOWKEY);
md.push('- 现值可行域判定: ' + (base.feasible ? '可行（全部非 residual 用例符合 expect）' : '不可行 → ' + base.violations.join(', ')));
md.push('- 基线 F1（标定宇宙, 注入口径 tier≠none）: ' + base.f1.toFixed(4));
md.push('');
md.push('| id | polarity | expect | score | tier | injected |');
md.push('|---|---|---|---|---|---|');
for (const c of manifest.cases) {
  const r = base.byId.get(c.id);
  md.push('| ' + c.id + ' | ' + c.polarity + ' | ' + c.expect + ' | ' + r.score + ' | ' + r.tier + ' | ' + r.injected + ' |');
}
md.push('');
md.push('## 2. 阈值可行域（网格步长 5，全量重评测）');
md.push('');
md.push('- 满足门禁的 (AUTO, LOWKEY) 参数对: ' + feasiblePairs.length + ' 组');
md.push('- SCORE_AUTO 边际（出现于任一可行对）: ' + (autoSet.length ? autoSet[0] + ' .. ' + autoSet[autoSet.length - 1] : '无'));
md.push('- SCORE_LOWKEY 边际: ' + (lowSet.length ? lowSet[0] + ' .. ' + lowSet[lowSet.length - 1] : '无'));
md.push('');
md.push('约束解读（与语料直接对应）:');
md.push('');
md.push('- AUTO 下界: F2（国家选择, score=44）依赖「tier=lowkey 才触发 country 语义抑制」，AUTO≤44 会令 F2 升 auto 绕过抑制而注入;');
md.push('- AUTO 上界: mm2-pos-l0country（autocomplete=country, score=162）同理依赖 auto 档逃逸抑制，AUTO 越过 162 将其压入 lowkey → 被抑制 → 漏检;');
md.push('- LOWKEY 下界: mm2-neg-tanote（score=18, 占位 +86 备注 textarea）以上必须不注入；');
md.push('- LOWKEY 上界: N7（select2, score=42）为最低分正例，LOWKEY 越过 42 即漏检。');
md.push('');
md.push('## 3. 权重敏感性（单变量 ×{0.5,0.75,1.25,1.5}）');
md.push('');
md.push('| 常量 | 现值 | 变体 | 门禁可行 | F1 | 违反例 | 档位翻转例 |');
md.push('|---|---|---|---|---|---|---|');
for (const r of sensRows) {
  md.push('| ' + r.name + ' | ' + r.from + ' | ' + r.to + ' | ' + (r.feasible ? 'yes' : 'NO') + ' | ' + r.f1.toFixed(4) + ' | ' +
    (r.violations.length ? r.violations.join(', ') : '') + ' | ' + (r.flips.length ? r.flips.join(', ') : '') + ' |');
}
md.push('');
md.push('## 4. 建议参数');
md.push('');
md.push('```json');
md.push(JSON.stringify({
  suggestion,
  feasibleRange: { SCORE_AUTO: autoSet, SCORE_LOWKEY: lowSet },
  currentInFeasibleRegion: currentFeasible,
  governance: '建议不生效；参数变更走 16 票（评分一致性）或独立批准',
}, null, 2));
md.push('```');
md.push('');
md.push('## 5. 结构性说明（阈值不可解项）');
md.push('');
md.push('- mm2-neg-itires（.iti 容器内非电话输入）: _isIti 无条件 score:100 auto，任何阈值组合均无法消除——修复路径为 16 票「iti 识别并入评分，取消无条件最高分短路」；');
md.push('- 小整数 option 值与拨号集撞库: 值 1..99 中恰为真实区号者（如月份 1..3 命中 +1/+31）会获得 L3 plus-dial 加分并压制 numeric-enum 罚分（N0b=4、F1b=11、F6=4、N0a=-66），现均未达注入档，但属 16 票 L3 加码时的已知敏感面;');
md.push('- country 语义抑制与 SCORE_AUTO 耦合（见 §2 约束解读）: 调整 AUTO 时必须同时复跑本语料。');
md.push('');

const outPath = arg('--out');
if (outPath) {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, md.join('\n') + '\n');
  console.log('report → ' + outPath);
} else {
  console.log(md.join('\n'));
}
console.log('建议: ' + JSON.stringify(suggestion));
process.exit(0);
