#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-28.mjs — 票 28（ISO2-value 下拉区号证据补全，覆盖 A-002）验收门
// 断言面（node 直跑，无浏览器、无 npm 依赖；装载复用 14-lib-engine 的 stripTypes 心智）：
//   G1 A-002 正例：rs-iso2-paren-select → lowkey/injected，opts:(+NN)-text 入账 +24、
//      opts:plus-dial 不入账（ISO2 值域不命中区号表）
//   G2 常量口径单一：分值 = L3_PLUS_PAREN_SCORE × 3，受 L3_DIAL_CAP 约束；源码无魔法数
//   G3 护栏1：纯 ISO2 国家选择器（F2/F8）仍不注入；F2 保留 country-semantic:suppress 留痕
//   G4 护栏2：共享区号下拉（mm2-pos-shared-dial）注入档与分值不回退
//   G5 口径同步（票 13 检查点二）：pseudo 侧括号区号独立计分且与 select 侧同常量
//   G6 全语料回归：非 residual 用例 mismatch = 0、precision 不回退、recall 较票 32 基线提升
// 用法：node tests/scripts/verify-ticket-28.mjs
// ══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadManifest, bundleEngine, metrics, runCorpus } from './14-lib-engine.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}

const manifest = loadManifest();
const { Detect } = bundleEngine();
const results = runCorpus(manifest, Detect);
const byId = new Map(results.map((r) => [r.id, r]));
const src = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
const cfg = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const constVal = (name) => { const m = new RegExp(name + ' = (-?\\d+)').exec(cfg); return m ? Number(m[1]) : NaN; };
const PAREN = constVal('L3_PLUS_PAREN_SCORE');
const CAP = constVal('L3_DIAL_CAP');
const sigOf = (r, n) => (r.signals || []).find((s) => s.name === n);

// ══ G1 A-002 正例 ══
{
  const r = byId.get('rs-iso2-paren-select');
  const sig = sigOf(r, 'opts:(+NN)-text');
  const plus = sigOf(r, 'opts:plus-dial');
  check('1.1 A-002 正例跨过低置信线（score >= SCORE_LOWKEY）', r.score >= 35, 'score=' + r.score);
  check('1.2 正例落 lowkey 档并注入', r.tier === 'lowkey' && r.injected === true, 'tier=' + r.tier);
  check('1.3 文本括号区号证据独立入账（L3）', !!sig && sig.layer === 'L3', JSON.stringify(sig));
  check('1.4 分值 = L3_PLUS_PAREN_SCORE x 3', !!sig && sig.pts === PAREN * 3, 'pts=' + (sig && sig.pts));
  check('1.5 ISO2 值域不产生 plus-dial 证据', !plus, JSON.stringify(plus));
}

// ══ G2 常量口径 ══
{
  const r = byId.get('rs-iso2-paren-select');
  const sig = sigOf(r, 'opts:(+NN)-text');
  check('2.1 L3 常量取自 config（无魔法数）', PAREN === 8 && CAP === 45, PAREN + '/' + CAP);
  check('2.2 分值受 L3_DIAL_CAP 约束', !!sig && sig.pts <= CAP, 'pts=' + (sig && sig.pts) + ' cap=' + CAP);
  check('2.3 parenDial 计分已移出 plusDial 门', /if \(st\.parenDial > 0\) \{/.test(src) && !/st\.plusDial > 0 && st\.parenDial/.test(src));
  check('2.4 select 侧计分复用既有常量（无裸数字）',
    /add\('L3', 'opts:\(\+NN\)-text', Math\.min\(st\.parenDial \* L3_PLUS_PAREN_SCORE, L3_DIAL_CAP\)\)/.test(src));
}

// ══ G3 护栏1：国家选择器 ≠ 区号字段 ══
{
  const f2 = byId.get('F2');
  check('3.1 纯 ISO2 国家选择器（F2）仍不注入', f2 && f2.injected === false, 'tier=' + (f2 && f2.tier) + ' score=' + (f2 && f2.score));
  check('3.2 F2 保留 country-semantic:suppress 留痕', !!sigOf(f2, 'country-semantic:suppress'), JSON.stringify(f2.signals));
  const f8 = byId.get('F8');
  check('3.3 纯 ISO2 国家选择器（F8，CJK 国名）仍不注入', f8 && f8.injected === false, 'tier=' + (f8 && f8.tier) + ' score=' + (f8 && f8.score));
}

// ══ G4 护栏2：共享区号消歧不回退 ══
{
  const sd = byId.get('mm2-pos-shared-dial');
  check('4.1 共享区号（+1 多国）下拉仍注入', sd && sd.injected === true, 'tier=' + (sd && sd.tier));
  check('4.2 共享区号分值不回退（>= 票 32 基线 66）', sd && sd.score >= 66, 'score=' + (sd && sd.score));
}

// ══ G5 口径同步（票 13 检查点二）══
{
  check('5.1 pseudo 侧括号区号独立计分（去掉 plusDial 前置）',
    /if \(st2\.parenDial > 0\)/.test(src) && !/st2\.plusDial > 0 && st2\.parenDial/.test(src));
  check('5.2 pseudo 与 select 侧同常量口径',
    /add\('L3', 'pseudo:opts:\(\+NN\)-text', Math\.min\(st2\.parenDial \* L3_PLUS_PAREN_SCORE, L3_DIAL_CAP\)\)/.test(src));
}

// ══ G6 全语料回归 ══
{
  const m = metrics(results, manifest);
  check('6.1 非 residual 用例 mismatch = 0', m.mismatches.length === 0, m.mismatches.join(','));
  check('6.2 precision 不回退（= 1.0）', m.precision === 1, 'precision=' + m.precision);
  check('6.3 recall 较票 32 基线（0.8696）提升', m.recall > 0.8696, 'recall=' + m.recall);
}

console.log('-----------------------------');
console.log('verify-ticket-28: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('failures:'); failures.forEach((f) => console.log('  - ' + f)); process.exit(1); }
