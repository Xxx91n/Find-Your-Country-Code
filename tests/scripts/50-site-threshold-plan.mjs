#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════
// tests/scripts/50-site-threshold-plan.mjs
// Cycle-8 D-009（ADR-0015）—— 站点级质量门槛的可测化机器实现
//
// 提供三件事（均为纯计算，零依赖，无浏览器，无外网）：
//   1) 零事件上界反推抽样量：rule of three(3/n) ／ 精确 Clopper-Pearson(k=0) ／ Wilson 上界
//   2) OC 双点（AQL/LTPD）反解最小 (n, c) 抽样计划
//   3) 观测结果 → Wilson 区间 + 燃烧率分级（阻断发版 / 冻结并扩样 / 常态 / 观察）
//
// 口径纪律（ADR-0015）：
//   - 抽样量由「CI 上界必须低于门槛」反推，**不得由点估计反推**；
//   - k=0 时用 rule of three 作**快速口径**，用 Wilson 作**守口径**（取大者）；
//   - 不用正态近似（1e-3 量级下覆盖度差），不用 Clopper-Pearson 作守口径（过保守）。
//
// 仓库根以本文件位置上溯两级锚定。
// 用法：
//   node tests/scripts/50-site-threshold-plan.mjs
//   node tests/scripts/50-site-threshold-plan.mjs --threshold 0.001 --aql 0.0005 --ltpd 0.002
//   node tests/scripts/50-site-threshold-plan.mjs --evaluate --sites 3842 --fps 0
//   node tests/scripts/50-site-threshold-plan.mjs --self-test
//   node tests/scripts/50-site-threshold-plan.mjs --json
// ══════════════════════════════════════════════════════════════════

const ARGS = process.argv.slice(2);
const has = (f) => ARGS.includes(f);
const num = (f, d) => { const i = ARGS.indexOf(f); return i >= 0 ? Number(ARGS[i + 1]) : d; };
const JSON_OUT = has('--json');

const Z95 = 1.959963984540054; // 双侧 95% 正态分位

// ── 数值基座（Lanczos log-gamma，用于二项分布对数 pmf） ──
const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function logGamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = 0.99999999999980993;
  const t = x + 7.5;
  for (let i = 0; i < 8; i++) a += LG[i] / (x + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
const logBinomCoef = (n, k) => logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
function logBinomPmf(k, n, p) {
  if (p <= 0) return k === 0 ? 0 : -Infinity;
  if (p >= 1) return k === n ? 0 : -Infinity;
  return logBinomCoef(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
}
/** P(X ≤ c) for X ~ Bin(n, p)，对数域求和无上溢/下溢 */
function binomCdf(c, n, p) {
  const logs = [];
  for (let i = 0; i <= Math.min(c, n); i++) logs.push(logBinomPmf(i, n, p));
  const mx = Math.max(...logs);
  if (!Number.isFinite(mx)) return 0;
  return Math.exp(mx) * logs.reduce((s, l) => s + Math.exp(l - mx), 0);
}

// ── 1) 零事件上界反推抽样量 ──
/** rule of three 快速口径：ceil(3/threshold) */
export const ruleOfThreeN = (threshold) => Math.ceil(3 / threshold);
/** 精确 Clopper-Pearson k=0 上界 = 1 - alpha^(1/n)，反推最小 n */
export const exactZeroEventN = (threshold, alpha = 0.05) =>
  Math.ceil(Math.log(alpha) / Math.log(1 - threshold));
/** Wilson 上界（k 次误报 / n 个站点） */
export function wilsonUpper(k, n, z = Z95) {
  const p = k / n, z2 = z * z;
  const center = (p + z2 / (2 * n)) / (1 + z2 / n);
  const half = (z / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return center + half;
}
/** Wilson 守口径：最小的 n 使 wilsonUpper(0, n) ≤ threshold */
export function wilsonZeroEventN(threshold, z = Z95) {
  // 二分（上界关于 n 单调递减）
  let lo = 1, hi = Math.ceil((z * z) / threshold) + 10;
  while (lo < hi) { const m = Math.floor((lo + hi) / 2); if (wilsonUpper(0, m, z) <= threshold) hi = m; else lo = m + 1; }
  return lo;
}

// ── 2) OC 双点（AQL/LTPD）反解最小 (n, c) ──
/**
 * 求最小 n 与对应 c，使：P(接受|AQL) ≥ 1-α 且 P(接受|LTPD) ≤ β。
 * 对每个 c：P(接受|p) 关于 n 单调递减 ⇒ n_min(c)=最小满足 LTPD 约束的 n，
 * n_max(c)=最大满足 AQL 约束的 n；可行 iff n_min ≤ n_max。
 */
export function findPlan(aql, ltpd, alpha = 0.05, beta = 0.10, maxC = 40, maxN = 500000) {
  let best = null;
  for (let c = 0; c <= maxC; c++) {
    // n_min：二分最小 n 使 binomCdf(c,n,ltpd) ≤ beta
    let lo = c + 1, hi = maxN, nMin = null;
    while (lo <= hi) { const m = Math.floor((lo + hi) / 2); if (binomCdf(c, m, ltpd) <= beta) { nMin = m; hi = m - 1; } else lo = m + 1; }
    if (nMin === null) continue;
    // n_max：二分最大 n 使 binomCdf(c,n,aql) ≥ 1-alpha
    lo = nMin; hi = maxN; let nMax = null;
    while (lo <= hi) { const m = Math.floor((lo + hi) / 2); if (binomCdf(c, m, aql) >= 1 - alpha) { nMax = m; lo = m + 1; } else hi = m - 1; }
    if (nMax === null || nMin > nMax) continue;
    if (!best || nMin < best.n) best = { n: nMin, c, alphaActual: 1 - binomCdf(c, nMin, aql), betaActual: binomCdf(c, nMin, ltpd) };
  }
  return best;
}

// ── 3) 燃烧率分级（SRE multi-burn-rate 的站点级移植） ──
export function burnRate(rateUpper, threshold) {
  const ratio = rateUpper / threshold;
  let action = 'watch', label = '观察（0.5×–1×）';
  if (ratio > 3) { action = 'block'; label = '阻断发版（>3×）'; }
  else if (ratio > 1) { action = 'freeze'; label = '冻结规则变更 + 扩样 2×（1×–3×）'; }
  else if (ratio <= 0.5) { action = 'normal'; label = '常态（≤0.5×）'; }
  return { ratio, action, label };
}

// ── Neyman 分层配额 ──
export function neymanAllocation(total, layers) {
  const w = layers.map((l) => l.weight * l.sigma);
  const s = w.reduce((a, b) => a + b, 0);
  return layers.map((l, i) => ({ ...l, quota: s > 0 ? Math.round((total * w[i]) / s) : 0 }));
}

// ── 自检 ──
function selfTest() {
  const fails = [];
  const t = (name, ok, detail) => { if (!ok) fails.push(name + (detail !== undefined ? ' :: ' + detail : '')); };
  t('rule of three: 1‰ → 3000', ruleOfThreeN(0.001) === 3000, ruleOfThreeN(0.001));
  t('exact CP k=0: 1‰ → 2995', exactZeroEventN(0.001) === 2995, exactZeroEventN(0.001));
  const wn = wilsonZeroEventN(0.001);
  t('wilson zero-event: 1‰ → 3838', wn === 3838, wn);
  t('wilson upper(0,3000) > 1‰（rule of three 偏乐观）', wilsonUpper(0, 3000) > 0.001, wilsonUpper(0, 3000).toFixed(6));
  t('wilson upper(0,3838) ≤ 1‰', wilsonUpper(0, 3838) <= 0.001, wilsonUpper(0, 3838).toFixed(6));
  const p = findPlan(0.0005, 0.002);
  t('OC plan exists for AQL .5‰ / LTPD 2‰', !!p, JSON.stringify(p));
  if (p) {
    t('OC plan: AQL 约束成立（P(接受|AQL) ≥ 1-α）', binomCdf(p.c, p.n, 0.0005) >= 0.95, binomCdf(p.c, p.n, 0.0005).toFixed(4));
    t('OC plan: LTPD 约束成立', binomCdf(p.c, p.n, 0.002) <= 0.10, binomCdf(p.c, p.n, 0.002).toFixed(4));
    t('OC plan: 最小性（同 c 下 n-1 违反 LTPD）', binomCdf(p.c, p.n - 1, 0.002) > 0.10, binomCdf(p.c, p.n - 1, 0.002).toFixed(4));
  }
  t('burnRate 3.5× → block', burnRate(0.0035, 0.001).action === 'block');
  t('burnRate 恰 3× → 不阻断（边界为开区间）', burnRate(0.003, 0.001).action === 'freeze');
  t('burnRate 2× → freeze', burnRate(0.002, 0.001).action === 'freeze');
  t('burnRate 0.4× → normal', burnRate(0.0004, 0.001).action === 'normal');
  const alloc = neymanAllocation(1000, [{ name: 'high', weight: 0.2, sigma: 3 }, { name: 'mid', weight: 0.3, sigma: 1.5 }, { name: 'low', weight: 0.5, sigma: 0.5 }]);
  t('neyman: 配额之和 ≈ 总数', Math.abs(alloc.reduce((s, l) => s + l.quota, 0) - 1000) <= 2, alloc.map((a) => a.quota).join(','));
  t('neyman: 高风险层配额最高', alloc[0].quota > alloc[2].quota, JSON.stringify(alloc.map((a) => a.quota)));
  return { fails, wilsonZeroEventN: wn, ocPlan: p };
}

// ── CLI ──
const threshold = num('--threshold', 0.001);
const aql = num('--aql', 0.0005);
const ltpd = num('--ltpd', 0.002);
const evalMode = has('--evaluate');
const sites = num('--sites', 0);
const fps = num('--fps', 0);

if (has('--self-test')) {
  const st = selfTest();
  if (JSON_OUT) console.log(JSON.stringify({ ok: st.fails.length === 0, failures: st.fails, wilsonZeroEventN: st.wilsonZeroEventN, ocPlan: st.ocPlan }, null, 2));
  else {
    if (st.fails.length === 0) console.log('  PASS  self-test (rule-of-three / exact CP / Wilson / OC plan / burn-rate / Neyman)');
    else for (const f of st.fails) console.log('  FAIL  ' + f);
    console.log(st.fails.length === 0 ? 'site-threshold-plan: OK' : 'site-threshold-plan: ' + st.fails.length + ' failure(s)');
  }
  if (st.fails.length > 0) process.exit(1);
} else if (evalMode) {
  const upper = wilsonUpper(fps, sites);
  const br = burnRate(upper, threshold);
  const out = { mode: 'evaluate', sites, fps, rate: sites ? fps / sites : null, wilsonUpper95: upper, threshold, burnRate: br, gate: br.action === 'block' ? 'fail' : 'pass' };
  if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
  else {
    console.log('站点级 FPR 评估：sites=' + sites + ' fps=' + fps + ' 点估计=' + (sites ? (fps / sites).toExponential(3) : 'n/a'));
    console.log('  Wilson 95% 上界 = ' + upper.toExponential(6) + '   门槛 = ' + threshold);
    console.log('  燃烧率 = ' + br.ratio.toFixed(3) + '×  → ' + br.label + '  [gate=' + out.gate + ']');
  }
  if (br.action === 'block') process.exit(1);
} else {
  const n3 = ruleOfThreeN(threshold), nExact = exactZeroEventN(threshold), nWilson = wilsonZeroEventN(threshold);
  const plan = findPlan(aql, ltpd);
  const layers = [{ name: 'high', weight: 0.2, sigma: 3 }, { name: 'mid', weight: 0.3, sigma: 1.5 }, { name: 'low', weight: 0.5, sigma: 0.5 }];
  const alloc = neymanAllocation(nWilson, layers);
  const out = { mode: 'plan', threshold, zeroEventN: { ruleOfThree: n3, exactClopperPearson: nExact, wilsonConservative: nWilson, operative: Math.max(n3, nExact, nWilson) }, ocPlan: plan, aql, ltpd, neymanDemo: alloc };
  if (JSON_OUT) console.log(JSON.stringify(out, null, 2));
  else {
    console.log('══ 站点级质量门槛可测化计划（D-009 / ADR-0015）══');
    console.log('门槛 = ' + threshold + '（' + (threshold * 1000).toFixed(2) + '‰）');
    console.log('零事件上界反推抽样量（k=0，95%）：');
    console.log('  rule of three（快速口径）  n ≥ ' + n3);
    console.log('  精确 Clopper-Pearson(k=0)  n ≥ ' + nExact);
    console.log('  Wilson 守口径              n ≥ ' + nWilson + '   ← 取此值为准');
    console.log('  ⇒ 操作值 = ' + out.zeroEventN.operative + ' 个良性站点零误报');
    console.log('OC 双点（AQL=' + aql + ' α=5% / LTPD=' + ltpd + ' β=10%）：' + (plan ? ('n=' + plan.n + ', c=' + plan.c + '（实测 α=' + plan.alphaActual.toFixed(4) + ', β=' + plan.betaActual.toFixed(4) + '）') : '无可行解'));
    { const rp = { n: 3000, c: 2 }; const a1 = binomCdf(rp.c, rp.n, aql), b1 = binomCdf(rp.c, rp.n, ltpd);
      console.log('  对照（调研存档引用的 n=3000, c=2）：P(接受|AQL)=' + a1.toFixed(4) + '（需 ≥0.95）  P(接受|LTPD)=' + b1.toFixed(4) + '（需 ≤0.10）  ⇒ ' + ((a1 >= 0.95 && b1 <= 0.10) ? '双点成立' : '**不满足**')); }
    console.log('Neyman 分层配额示例（n=' + nWilson + '）：' + alloc.map((a) => a.name + '=' + a.quota).join('  '));
    console.log('燃烧率处置：>3× 阻断发版 ｜ 1×–3× 冻结规则变更 + 扩样 2× ｜ ≤0.5× 常态');
  }
}
