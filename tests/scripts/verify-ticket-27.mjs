// ==========================================================================
// verify-ticket-27.mjs - 票 27 [A-001] 检测覆盖率下限：票级验收门
// --------------------------------------------------------------------------
// 无 npm 安装面（同 verify-28/29/31 口径）：仅 node 标准库 + 14-lib-engine 函数束装载，
// node 钉 22（module.stripTypeScriptTypes >= 22.13）。
// 断言面：弱信号复现基线 -> 改后跨线 -> 分值来源 -> 负例护栏 -> 阈值不变 -> 指标不回退。
// ==========================================================================
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadManifest, bundleEngine, evaluateCase, runCorpus, metrics, ROOT } from './14-lib-engine.mjs';

const manifest = loadManifest();
const configSrc = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
const detectSrc = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, name, detail) {
  if (cond) { pass++; console.log(String.fromCharCode(32, 32) + "PASS " + name); }
  else { fail++; console.log(String.fromCharCode(32, 32) + "FAIL " + name + (detail ? " -- " + detail : "")); }
}

// 改前/改后同引擎对照：把新增信号权重覆写为 0 即复算改前状态
const pre = bundleEngine({ L1_ATTR_PHRASE_SCORE: 0 });
const post = bundleEngine({});
const t27 = manifest.cases.filter(function (c) { return String(c.fixingTicket) === '27'; });
const negs = manifest.cases.filter(function (c) { return c.polarity !== 'positive'; });

// ── G1 改后：弱信号字段跨过低置信线，且只到 lowkey（SCORE_AUTO 未破）──
console.log('G1 弱信号 5 例改后 38/lowkey（>= SCORE_LOWKEY 且 < SCORE_AUTO）');
ok(t27.length === 5, '票 27 归属用例数 = 5', 'got ' + t27.length);
for (const c of t27) {
  const r = evaluateCase(c, post.Detect);
  const names = (r.signals || []).map(function (s) { return s.name; }).join(",");
  ok(r.score === 38 && r.tier === 'lowkey' && r.injected, c.id + ' = 38/lowkey', r.score + '/' + r.tier);
  ok(names.indexOf('kw:strong') >= 0 && names.indexOf('attr:phrase:') >= 0, c.id + ' 信号归因含 kw:strong + attr:phrase', names);
}

// ── G2 改前复现基线：30/none ──
console.log('G2 改前(L1_ATTR_PHRASE_SCORE=0) 复现基线 30/none');
for (const c of t27) {
  const r = evaluateCase(c, pre.Detect);
  ok(r.score === 30 && r.tier === 'none' && !r.injected, c.id + ' 改前 = 30/none', r.score + '/' + r.tier);
}

// ── G3 分值来源：单一 config 常量，无裸数字 ──
console.log('G3 分值单一来源（config.ts 常量，无裸数字）');
ok(configSrc.indexOf('export const L1_ATTR_PHRASE_SCORE = 8;') >= 0, 'config.ts 定义 L1_ATTR_PHRASE_SCORE = 8');
ok(detectSrc.indexOf('L1_ATTR_PHRASE_SCORE') >= 0, 'detect/index.ts 引用该常量');
ok(detectSrc.indexOf('attr:phrase:') >= 0, 'detect/index.ts 登记 attr:phrase 信号');
ok(detectSrc.indexOf('ATTR_PHRASES_STRONG = LABEL_PHRASES_STRONG') >= 0, '属性强短语与 label 强短语同词表（不新造第二套词表）');

// ── G4 护栏：负例零抬升（含本地固话区号 / 语言前缀 / areacode）──
console.log('G4 负例零抬升（全语料 ' + negs.length + ' 例）');
for (const c of negs) {
  const r = evaluateCase(c, post.Detect);
  const r0 = evaluateCase(c, pre.Detect);
  ok(!r.injected, '负例 ' + c.id + ' 改后仍不注入', r.score + '/' + r.tier);
  ok(r.score === r0.score, '负例 ' + c.id + ' 分值未被本票改动抬升', r0.score + ' -> ' + r.score);
}

// ── G5 阈值不变 ──
console.log('G5 SCORE_AUTO / SCORE_LOWKEY 常量未动');
ok(configSrc.indexOf('export const SCORE_AUTO = 70;') >= 0, 'SCORE_AUTO 仍为 70');
ok(configSrc.indexOf('export const SCORE_LOWKEY = 35;') >= 0, 'SCORE_LOWKEY 仍为 35');
ok(configSrc.indexOf('export const L1_STRONG_KW_SCORE = 30;') >= 0, 'L1_STRONG_KW_SCORE 仍为 30（未靠抬强关键字越线）');

// ── G6 全语料指标不回退 ──
console.log('G6 全语料 precision/recall 不回退');
const pm = metrics(runCorpus(manifest, pre.Detect), manifest);
const qm = metrics(runCorpus(manifest, post.Detect), manifest);
ok(qm.precision >= pm.precision, 'precision 不回退', pm.precision + ' -> ' + qm.precision);
ok(qm.recall >= pm.recall, 'recall 不回退', pm.recall + ' -> ' + qm.recall);
ok(qm.precision === 1, '改后 precision = 1.0', String(qm.precision));
ok(qm.mismatches.length === 0, '改后 mismatch = 0', qm.mismatches.join(' | '));
ok(qm.recall === 1, '改后 recall = 1.0', String(qm.recall));

// ── G7 命名变体覆盖（语料外的真实站点命名）──
console.log('G7 命名变体归一覆盖');
const variants = [
  { id: 'camel', el: { tag: 'input', name: 'countryCode', type: 'text' } },
  { id: 'snake', el: { tag: 'input', name: 'country_code', type: 'text' } },
  { id: 'kebab', el: { tag: 'input', name: 'country-code', type: 'text' } },
  { id: 'lower', el: { tag: 'input', name: 'countrycode', type: 'text' } },
  { id: 'dialCamel', el: { tag: 'input', name: 'dialCode', type: 'text' } },
  { id: 'placeholder', el: { tag: 'input', type: 'text', placeholder: 'Country code' } },
];
for (const v of variants) {
  const r = evaluateCase({ el: v.el, labels: [], ctx: {} }, post.Detect);
  ok(r.tier === 'lowkey', '变体 ' + v.id + ' 归一命中 -> lowkey', r.score + '/' + r.tier);
}

// ── G8 反例护栏：areacode 类专名不得靠本票改动越线 ──
console.log('G8 areacode 类专名仍不注入（锁定改法边界）');
const areaKebab = evaluateCase({ el: { tag: 'input', name: 'area-code', type: 'text' }, labels: [], ctx: {} }, post.Detect);
ok(!areaKebab.injected, 'name=area-code 仍不注入', areaKebab.score + '/' + areaKebab.tier);
const areaLocal = evaluateCase({ el: { tag: 'input', name: 'areaCode', type: 'text', placeholder: '本地固话区号' }, labels: [], ctx: {} }, post.Detect);
ok(!areaLocal.injected, '本地固话区号仍不注入', areaLocal.score + '/' + areaLocal.tier);
const langPrefix = evaluateCase({ el: { tag: 'input', name: 'langPrefix', type: 'text', placeholder: '语言前缀' }, labels: [], ctx: {} }, post.Detect);
ok(!langPrefix.injected, '语言前缀仍不注入（L4 排除有效）', langPrefix.score + '/' + langPrefix.tier);

// ── G9 R1 返工锁定：属性短语与 L3 区号内容证据同源时不重复计分（P8 跨线返工）──
// 形态 = Engine Gates 的 P8（Case4：aria-label 含 calling code + 全 +NN 选项 + tel 锚）。
// 首轮 +8 使其 68 -> 76 越过 SCORE_AUTO(70) 由 lowkey 升 auto，属『抬天花板』越界；
// R1 改法：属性短语在 L3 已独立证明区号值域（plusDial/parenDial > 0）时不重复计入。
console.log('G9 R1 去重：属性短语不得把既有 68 分正例推过 SCORE_AUTO（floor 不抬 ceiling）');
const p8Case = { el: { tag: 'select', attrs: { 'aria-label': 'Select country calling code' }, options: ['+86', '+1', '+44', '+33', '+49'] }, labels: [], ctx: { anchorHasTel: true } };
const p8Post = evaluateCase(p8Case, post.Detect);
ok(p8Post.score === 68 && p8Post.tier === 'lowkey', 'P8 形态改后 68/lowkey（未跨 auto 线）', p8Post.score + '/' + p8Post.tier);
const p8Pre = evaluateCase(p8Case, pre.Detect);
ok(p8Pre.score === 68 && p8Pre.tier === 'lowkey', 'P8 形态与首轮改前基线一致（68/lowkey）', p8Pre.score + '/' + p8Pre.tier);
ok(p8Post.signals.some(function (g) { return /^attr:phrase:.*dedup\(opts-dial\)$/.test(g.name); }), '去重留痕信号 attr:phrase:*:dedup(opts-dial) 存在', (p8Post.signals.map(function (g) { return g.name; }).join(' | ') || 'none'));
const wsNoContent = evaluateCase({ el: { tag: 'input', name: 'countryCode', type: 'text' }, labels: [], ctx: {} }, post.Detect);
ok(wsNoContent.score === 38 && wsNoContent.tier === 'lowkey', '无内容证据的弱信号 input 仍 38/lowkey（去重不误伤 A-001）', wsNoContent.score + '/' + wsNoContent.tier);
const p3Like = evaluateCase({ el: { tag: 'input', name: 'country_code', type: 'text' }, labels: [], ctx: { anchorHasTel: true } }, post.Detect);
ok(p3Like.score === 56 && p3Like.tier === 'lowkey', '弱信号 input + tel 锚仍 56/lowkey（去重不误伤）', p3Like.score + '/' + p3Like.tier);

console.log(String.fromCharCode(45, 45, 45));
console.log('票 27 验收门: ' + pass + ' passed / ' + fail + ' failed');
if (fail > 0) process.exit(1);
