#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-31.mjs — 票 31（填充结果可观测 + 失败反馈闭环，覆盖 A-005）验收门
// 断言面（node 直跑，无浏览器、无 npm 依赖）：
//   G1 三态信号：filled（成功填充）/ copied（未匹配降级复制）/ failed（剪贴板不可用）
//      —— run 返回 Promise<FillResult> 且同步落 window.__cchLastFill（测试面唯一钩子）
//   G2 toast 文案分层（zh 环境）：成功=已填入 / 分歧=已填入（格式可能有出入）/
//      降级=未匹配到选项，已复制 / 失败=填充失败，请手动输入
//   G3 格式分歧观测（input 策略）：placeholder 无数字线索→plus 推测撞声明式数字约束
//      （pattern / inputmode / type=number）报 fmtDiff；写入值本就纯数字或 pattern 容
//      '\+' 不报。只增观测——写入值与注入序列逐字节不变（正确路径不回退）。
//   G4 三策略正确路径结构守卫（静态）：iti/select/pseudo 分支与消歧双证据、
//      _inject 收敛、_guessFmt 判据逐字保留（与 verify-09/13/18 口径一致）
//   G5 i18n 双语键集一致（fmtDiverge/fillFailed 两语齐）
// 装载：与 14-lib-engine 同心智——module.stripTypeScriptTypes（Node>=22.13）剥类型后
//   new Function；mock 三类元素原型 value descriptor + 记录型 UI/clipboard/window。
// 用法：node tests/scripts/verify-ticket-31.mjs
// ══════════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
if (typeof stripTypeScriptTypes !== 'function') {
  console.error('verify-ticket-31 需要 Node >= 22.13（module.stripTypeScriptTypes）');
  process.exit(2);
}

let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function toModuleBody(file) {
  return readFileSync(file, 'utf8')
    .replace(/^\r?$/gm, '')
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

const fillSrcRaw = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
const i18nSrc = readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8');

// ── mock 环境：原型 value descriptor（真实 getter/setter）+ 元素鸭子面 ──
const PRELUDE = `
const window = {};
class MockNode {
  constructor() { this._events = []; }
  addEventListener() {}
  dispatchEvent(ev) { this._events.push(ev.type); return true; }
  getAttribute(n) { return this._attrs && n in this._attrs ? this._attrs[n] : null; }
  setAttribute(n, v) { (this._attrs = this._attrs || {})[n] = v; }
  closest() { return null; }
  getRootNode() { return null; }
  click() { this._clicked = true; }
}
function makeCtor(tag) {
  const Ctor = class extends MockNode {
    constructor() { super(); this.tagName = tag; this._domValue = ''; }
  };
  Object.defineProperty(Ctor.prototype, 'value', {
    configurable: true, enumerable: true,
    get() { return this._domValue; }, set(v) { this._domValue = String(v); },
  });
  window['HTML' + (tag === 'TEXTAREA' ? 'TextArea' : tag.charAt(0) + tag.slice(1).toLowerCase()) + 'Element'] = Ctor;
  return Ctor;
}
const CTORS = { INPUT: makeCtor('INPUT'), SELECT: makeCtor('SELECT'), TEXTAREA: makeCtor('TEXTAREA') };
const OptionCtor = class extends MockNode {
  constructor() { super(); this.tagName = 'OPTION'; this._domValue = ''; this.text = ''; }
};
Object.defineProperty(OptionCtor.prototype, 'value', {
  configurable: true, enumerable: true, get() { return this._domValue; }, set(v) { this._domValue = String(v); },
});
window['HTMLOptionElement'] = OptionCtor;
CTORS.OPTION = OptionCtor;
function mk(tag, props) {
  props = props || {};
  const el = new CTORS[tag]();
  el.ownerDocument = { defaultView: window };
  if (props.options) { el.options = props.options.map(o => { const n = mk('OPTION', {}); n.value = o.value; n.text = o.text; return n; }); }
  for (const k of ['placeholder', 'type', 'name', 'id']) if (props[k] !== undefined) el[k] = props[k];
  if (props.attrs) el._attrs = props.attrs;
  return el;
}
const toasts = [];
const UI = { toast(msg) { toasts.push(msg); } };
const CN = { code: '+86', iso: 'cn', flag: '\u{1F1E8}\u{1F1F3}', country: '中国', countryEn: 'China' };
let __navClipboard = { writeText: () => Promise.resolve() };
const __navLanguage = 'zh-CN';
function setClipboard(fn) { __navClipboard = fn ? { writeText: fn } : undefined; }
`;

const i18nBody = toModuleBody(join(ROOT, 'src', 'i18n.ts')).replace(/navigator\.language/g, '__navLanguage');
// fill 源码里的 navigator.clipboard 是注入通道 mock 缝：Node 22 的 navigator 全局只读，
// 直接 globalThis.navigator= 赋值静默失败 —— 以源码替换注入可变绑定（verify-09 同手法）。
const fillBody = toModuleBody(join(ROOT, 'src', 'fill', 'index.ts')).replace(/navigator\.clipboard/g, '__navClipboard');
// stripTypes 以模块语法解析：顶层 return 不合法，故先剥类型再拼返回语句（14-lib-engine 同法）
const bundle = [
  PRELUDE,
  i18nBody,
  toModuleBody(join(ROOT, 'src', 'iti-adapter', 'index.ts')),
  fillBody,
].join('\n');
const { createFill, mk, toasts, window, setClipboard, CN } =
  new Function(stripTypeScriptTypes(bundle, { mode: 'strip' }) + '\n;return { createFill, mk, toasts, window, setClipboard, CN };')();
const Fill = createFill({ toast(m) { toasts.push(m); } });

function opt(v, t) { const o = mk('OPTION', {}); o.value = v; o.text = t; return o; }

// ══ G1/G2/G4：select 三策略分发 + 三态 + 文案分层 ══
{
  // S1 命中 → filled，值写入，toast 成功档
  const sel = mk('SELECT', { options: [opt('', '请选择'), opt('+86', '+86 中国 China'), opt('+1', '+1 美国 United States')] });
  const r1 = await Fill.run(sel, 'select', CN);
  check('S1 select 命中 status=filled', r1.status === 'filled' && r1.kind === 'select', JSON.stringify(r1));
  check('S1b select 命中值写入 +86', String(sel.value) === '+86');
  check('S1c toast 成功档 已填入', /已填入: /.test(toasts[toasts.length - 1]), toasts[toasts.length - 1]);
  check('S1d __cchLastFill 同步落钩子', window.__cchLastFill && window.__cchLastFill.status === 'filled');
}
{
  // S2 无匹配 + 剪贴板可用 → copied（降级），字段未被写入，toast 降级档
  const sel = mk('SELECT', { options: [opt('', '请选择'), opt('+1', '+1 美国'), opt('+44', '+44 英国')] });
  toasts.length = 0;
  const r2 = await Fill.run(sel, 'select', CN);
  check('S2 无匹配 status=copied', r2.status === 'copied', JSON.stringify(r2));
  check('S2b 降级不写字段', String(sel.value) === '');
  check('S2c toast 降级档 未匹配', /未匹配到选项，已复制/.test(toasts[0]), toasts[0]);
}
{
  // S3 无匹配 + 剪贴板 rejection → failed（旧布尔时代不可感知的静默面）
  const sel = mk('SELECT', { options: [opt('+1', '+1 美国')] });
  setClipboard(() => Promise.reject(new Error('denied')));
  toasts.length = 0;
  const r3 = await Fill.run(sel, 'select', CN);
  check('S3 剪贴板失败 status=failed', r3.status === 'failed', JSON.stringify(r3));
  check('S3b toast 失败档', /填充失败/.test(toasts[0]), toasts[0]);
  setClipboard(() => Promise.resolve());
}
{
  // S3c 无 clipboard 全局对象（非安全上下文形态）→ failed 而非假 copied
  const sel = mk('SELECT', { options: [opt('+1', '+1 美国')] });
  setClipboard(null);
  const r3c = await Fill.run(sel, 'select', CN);
  check('S3c clipboard 缺失 status=failed', r3c.status === 'failed', JSON.stringify(r3c));
  setClipboard(() => Promise.resolve());
}
// ══ G1 iti 策略正确路径：setNumber 命中 → filled ══
{
  window.intlTelInputGlobals = { getInstance: () => ({ setNumber: (v) => { window._itiV = v; } }) };
  const el = mk('INPUT', { placeholder: '+86' });
  el.closest = (s) => (s === '.iti' ? mk('DIV', {}) : null);
  const r = await Fill.run(el, 'iti', CN);
  check('I1 iti setNumber 命中 status=filled', r.status === 'filled' && window._itiV === '+86', JSON.stringify(r));
  check('I2 iti fmtDiff 恒 false（观测仅挂 input）', r.fmtDiff === false);
}
// ══ G3 格式分歧观测（input 策略，只观测不改写入）══
async function inputCase(name, props, wantFmtDiff, wantValue) {
  toasts.length = 0;
  const el = mk('INPUT', props);
  const r = await Fill.run(el, 'input', CN);
  check(name + ' status=filled', r.status === 'filled');
  check(name + ' fmtDiff=' + wantFmtDiff, r.fmtDiff === wantFmtDiff, JSON.stringify(r));
  check(name + ' 写入值不变 ' + wantValue, String(el.value) === wantValue, String(el.value));
  const toast = toasts[0];
  if (wantFmtDiff) check(name + ' toast 分歧档', /格式可能有出入/.test(toast), toast);
  else check(name + ' toast 纯成功档', /已填入: /.test(toast) && !/格式/.test(toast), toast);
}
await inputCase('F1 期望digits得plus', { placeholder: 'Code', attrs: { pattern: '[0-9]{1,3}' } }, true, '+86');
await inputCase('F2 digits 对照', { placeholder: '86', attrs: { pattern: '[0-9]{1,3}' } }, false, '86');
await inputCase('F3 double0 纯数字', { placeholder: '0086', attrs: { pattern: '[0-9]{2,4}' } }, false, '0086');
await inputCase('F4 type=number 撞 plus', { placeholder: 'code', type: 'number' }, true, '+86');
await inputCase('F5 pattern 容 plus 不报', { placeholder: 'Code', attrs: { pattern: '\\+[0-9]{1,3}' } }, false, '+86');
await inputCase('F6 inputmode=numeric', { placeholder: 'Code', attrs: { inputmode: 'numeric' } }, true, '+86');
await inputCase('F7 无约束无分歧', { placeholder: 'Code' }, false, '+86');
// ══ pseudo 冒烟：可编辑型经承值 input 注入 → filled（深覆盖在 verify-18）══
{
  const carrier = mk('INPUT', { name: 'x' }); carrier.type = 'hidden'; carrier.value = '';
  const formEl = { querySelectorAll: () => [carrier] };
  const trig = mk('INPUT', {});
  Object.defineProperty(trig, 'getAttribute', { value: (n) => (n === 'readonly' ? null : (trig._attrs || {})[n] ?? null) });
  trig.form = formEl;
  const r = await Fill.run(trig, 'pseudo', CN);
  check('P1 可编辑 pseudo 承值注入 status=filled', r.status === 'filled' && String(carrier.value).toLowerCase() === 'cn', JSON.stringify(r) + ' carrier=' + carrier.value);
}
// ══ G4 正确路径静态结构守卫（与既有引擎门口径一致，行为零变更锚点）══
{
  check('T1 run 三分支关键字保留', fillSrcRaw.includes("kind === 'iti'") && fillSrcRaw.includes("kind === 'select'") && fillSrcRaw.includes("kind === 'pseudo'"));
  check('T2 select 消歧双证据未动', fillSrcRaw.includes('opts.find(o => valueMatch(o) && nameInText(o))'));
  check('T3 _guessFmt 判据逐字保留', fillSrcRaw.includes("if (/^00\\d/.test(ph))  return 'double0';") && fillSrcRaw.includes("if (/^\\d/.test(ph))    return 'digits';"));
  check('T4 fillInput 注入表达式未动', fillSrcRaw.includes("this._inject(el, formatted + (rest ? ' ' + rest : ''));"));
  check('T5 toast 分层映射', fillSrcRaw.includes("res.fmtDiff ? t('fmtDiverge') : t('ok')") && fillSrcRaw.includes("res.status === 'copied' ? t('copied') : t('fillFailed')"));
}
// ══ G5 i18n 双语键集一致 ══
{
  const zh = i18nSrc.slice(i18nSrc.indexOf('zh: {'), i18nSrc.indexOf('en: {'));
  const en = i18nSrc.slice(i18nSrc.indexOf('en: {'));
  const keys = (b) => [...b.replace(/'[^']*'/g, "''").matchAll(/([A-Za-z][A-Za-z0-9]*)\s*:/g)].map(m => m[1]).sort();
  const kz = keys(zh), ke = keys(en);
  check('L1 zh/en 键集一致', JSON.stringify(kz) === JSON.stringify(ke), kz.join(',') + ' vs ' + ke.join(','));
  check('L2 新键双语齐', /fmtDiverge:'已填入/.test(i18nSrc) && /fmtDiverge:'Filled/.test(i18nSrc) && /fillFailed:'填充失败/.test(i18nSrc) && /fillFailed:'Fill failed/.test(i18nSrc));
}

console.log('-----------------------------');
console.log('verify-ticket-31: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('failures:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
