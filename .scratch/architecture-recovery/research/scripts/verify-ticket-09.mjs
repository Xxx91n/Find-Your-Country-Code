// ══════════════════════════════════════════════════════════════════
// verify-ticket-09.mjs — 票 09 注入安全层单测门（node 直跑，无浏览器）
// 方法：与 verify-ticket-02 同心智 —— src 模块剥离 import/export 按依赖序拼接 →
//   new Function 装配。本门额外预置（PRELUDE，随 bundle 一起求值并导出给外层断言）：
//   ① 三类元素原型（HTMLInputElement/HTMLSelectElement/HTMLTextAreaElement）
//      带 prototype value descriptor（get/set 读写 _domValue）
//   ② React 18 value tracker 模拟（react-dom inputValueTracking.js 语义）：
//      实例 value 拦截器仅在 JS 级赋值时更新快照；原生 setter 直写 prototype 不经过拦截器
//      → updateValueIfChanged 感知 lastValue≠nextValue → onChange 触发。
//      （react#11488 同心智 [AM 核心结论9]；suppression 语义由对照用例 C1 自证）
//   ③ 事件：Node 原生 Event；元素级监听记录 type 序列与首个事件的 bubbles/composed 元数据。
// 覆盖：React select/input/textarea 注入终态与 onChange、Vue（无 tracker）select/input、
//   TEXTAREA 分支、事件序列 input→change→blur 一致性、bubbles/composed 元数据、
//   直接赋值被 tracker 吞掉的对照（C1）、iti 兜底经注入回调（R7）、单一注入函数收敛结构检查。
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-09.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');

function toModuleBody(file) {
  const src = readFileSync(file, 'utf8');
  return src
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

// i18n 顶层读 navigator.language —— 单测门以 __navLanguage 替身注入
const i18nBody = toModuleBody(join(ROOT, 'src', 'i18n.ts')).replace(/navigator\.language/g, '__navLanguage');

const PRELUDE = `
// ── mock 原型：真实 prototype value descriptor 语义 ──
const window = {};
class MockNode {
  constructor() { this._ls = {}; this._events = []; this._meta = null; }
  addEventListener(t, fn) { (this._ls[t] = this._ls[t] || []).push(fn); }
  dispatchEvent(ev) {
    this._events.push(ev.type);
    if (!this._meta) this._meta = { bubbles: ev.bubbles, composed: ev.composed };
    (this._ls[ev.type] || []).slice().forEach(fn => fn(ev));
    return true;
  }
  closest() { return null; }
  getAttribute() { return null; }
  getRootNode() { return null; }
}
function makeCtor(tag) {
  const Ctor = class extends MockNode {
    constructor() { super(); this.tagName = tag; this._domValue = ''; }
  };
  Object.defineProperty(Ctor.prototype, 'value', {
    configurable: true, enumerable: true,
    get() { return this._domValue; },
    set(v) { this._domValue = String(v); },
  });
  // 真实浏览器原型名（TEXTAREA 的原型是 HTMLTextAreaElement，大写 A —— 别按小写化规则拼）
  window['HTML' + (tag === 'TEXTAREA' ? 'TextArea' : tag.charAt(0) + tag.slice(1).toLowerCase()) + 'Element'] = Ctor;
  return Ctor;
}
const TAG_CTORS = { INPUT: makeCtor('INPUT'), SELECT: makeCtor('SELECT'), TEXTAREA: makeCtor('TEXTAREA') };

// ── React 18 value tracker 模拟（react-dom inputValueTracking.js 语义）──
function reactTrack(el) {
  if (el._valueTracker) return;
  let field = el.value;   // track 时刻快照
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  Object.defineProperty(el, 'value', {
    configurable: true, enumerable: true,
    get() { return desc.get.call(el); },                                   // 真 DOM 值
    set(v) { field = String(v); desc.set.call(el, v); },                   // JS 级赋值 → 快照同步
  });
  el._valueTracker = { getValue: () => field, setValue: (v) => { field = String(v); } };
}
function updateValueIfChanged(el) {   // react-dom 原样语义
  if (!el) return false;
  const tracker = el._valueTracker;
  if (!tracker) return true;
  const lastValue = tracker.getValue();
  const nextValue = String(el.value);
  if (lastValue === nextValue) return false;
  tracker.setValue(nextValue);
  return true;
}
function makePlain(tag, props) {
  props = props || {};
  const el = new TAG_CTORS[tag]();
  if (props.options) el.options = props.options;
  if (props.placeholder !== undefined) el.placeholder = props.placeholder;
  return el;
}
function makeReact(tag, props) {
  const el = makePlain(tag, props);
  reactTrack(el);
  el.__reactLog = [];
  // React 语义：文本类（input/textarea）onChange 由 input 事件驱动，select 由 change 事件驱动
  el.addEventListener(tag === 'SELECT' ? 'change' : 'input', () => {
    if (updateValueIfChanged(el)) el.__reactLog.push('onChange');
  });
  return el;
}
`;

const bundle = [
  'const __navLanguage = "zh-CN";',
  PRELUDE,
  toModuleBody(join(ROOT, 'src', 'config.ts')),
  toModuleBody(join(ROOT, 'src', 'data', 'countries.ts')),
  i18nBody,
  toModuleBody(join(ROOT, 'src', 'iti-adapter', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'fill', 'index.ts')),
  '\n;return { createFill, makePlain, makeReact, updateValueIfChanged, window };',
].join('\n');

const { createFill, makePlain, makeReact, updateValueIfChanged, window } = new Function(bundle)();
const UIstub = { toast() {} };
const Fill = createFill(UIstub);

// ── 断言工具 ──
let pass = 0, fail = 0;
const failures = [];
function check(id, cond, detail) {
  if (cond) { pass++; console.log(`[PASS] ${id} ${detail || ''}`); }
  else { fail++; failures.push(id); console.log(`[FAIL] ${id} ${detail || ''}`); }
}
const SEQ = ['input', 'change', 'blur'];

function assertInjectResult(id, el, expectVal, expectReact) {
  check(id + ':value', el.value === expectVal, `value=${JSON.stringify(el.value)} expect=${JSON.stringify(expectVal)}`);
  check(id + ':seq', JSON.stringify(el._events) === JSON.stringify(SEQ), `events=${JSON.stringify(el._events)}`);
  check(id + ':meta', !!el._meta && el._meta.bubbles === true && el._meta.composed === true,
    `meta=${JSON.stringify(el._meta)}`);
  if (expectReact) {
    // onChange 触发本身就是「原生 setter 绕过 tracker」的因果证据：
    // updateValueIfChanged 在 dispatch 期间由 React 监听器消费，原生 setter 直写后
    // lastValue≠nextValue 才会 fire（对照 C1：JS 级赋值同步快照 → 被吞）。
    check(id + ':react', el.__reactLog.indexOf('onChange') >= 0, `reactLog=${JSON.stringify(el.__reactLog)}`);
  }
}

const CN = { code: '+86', iso: 'CN', flag: '🇨🇳', country: '中国', countryEn: 'China' };
const JP = { code: '+81', iso: 'JP', flag: '🇯🇵', country: '日本', countryEn: 'Japan' };
const GB = { code: '+44', iso: 'GB', flag: '🇬🇧', country: '英国', countryEn: 'United Kingdom' };
const dialOpts = () => [{ value: '', text: '选择…' }, { value: '+86', text: '+86' }, { value: '+81', text: '+81' }, { value: '+1', text: '+1' }];

// R1 React 受控 select：fillSelect 经单一注入函数 → React onChange 触发
{
  const el = makeReact('SELECT', { options: dialOpts() });
  const ok = Fill.fillSelect(el, CN);
  check('R1:ret', ok === true);
  assertInjectResult('R1', el, '+86', true);
}
// R2 React 受控 input：fillInput → onChange 触发（直接赋值会被 tracker 吞 —— 本票修复点）
{
  const el = makeReact('INPUT', { placeholder: '+86' });
  const ok = Fill.fillInput(el, JP);
  check('R2:ret', ok === true);
  assertInjectResult('R2', el, '+81', true);
}
// R3/R4 Vue v-model（无 tracker 普通元素）：同样走注入函数，序列一致
{
  const el = makePlain('SELECT', { options: dialOpts() });
  Fill.fillSelect(el, CN);
  assertInjectResult('R3', el, '+86', false);
}
{
  const el = makePlain('INPUT', { placeholder: '+86' });
  Fill.fillInput(el, JP);
  assertInjectResult('R4', el, '+81', false);
}
// R5/R6 TEXTAREA 分支：同一注入函数覆盖 HTMLTextAreaElement（检测侧当前不产出 textarea kind，E2E 不可达，引擎级验证）
{
  const el = makePlain('TEXTAREA', { placeholder: '+86' });
  Fill.fillInput(el, CN);
  assertInjectResult('R5', el, '+86', false);
}
{
  const el = makeReact('TEXTAREA', { placeholder: '+86' });
  Fill.fillInput(el, GB);
  assertInjectResult('R6', el, '+44', true);
}
// R7 iti 实例缺失路径：adapter 最终兜底也必须经注入回调（tracker 语义保持）
{
  const el = makeReact('INPUT', { placeholder: 'phone' });
  const ok = Fill.fillIti(el, JP);
  check('R7:ret', ok === true);
  assertInjectResult('R7', el, '+81', true);
}
// C1 对照：直接赋值 + 裸派发（修复前心智）→ React onChange 被吞（自证 mock 的 suppression 语义可信）
{
  const el = makeReact('INPUT', { placeholder: '+86' });
  el.value = '+86';
  SEQ.forEach(t => el.dispatchEvent(new Event(t, { bubbles: true })));
  check('C1:suppressed', el.__reactLog.indexOf('onChange') < 0,
    `reactLog=${JSON.stringify(el.__reactLog)}（tracker 已随实例赋值同步 → diff 不出变化）`);
}
// C2 对照：原生 setter 直写 → tracker 未同步 → updateValueIfChanged 为 true（机制正证）
{
  const el = makeReact('INPUT', { placeholder: '+86' });
  const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  desc.set.call(el, '+44');
  check('C2:fires', updateValueIfChanged(el) === true);
}

// ── A 组：Angular accessor 事件契约（@angular/forms）──
// 现代 Angular 无 UMD/CDN 构建 → 无法建 hermetic E2E fixture（报告 §边界）。
// 契约依据：DefaultValueAccessor 监听 'input'（文本/textarea），SelectControlValueAccessor
// 监听 'change'；两者都把 el.value 写回模型，blur 触发 touched。本组验证注入序列满足该契约。
function makeAngular(tag, props) {
  const el = makePlain(tag, props);
  el.__ngLog = [];
  el.addEventListener(tag === 'SELECT' ? 'change' : 'input', () => el.__ngLog.push('onChange:' + el.value));
  el.addEventListener('blur', () => el.__ngLog.push('touched'));
  return el;
}
{
  const sel = makeAngular('SELECT', { options: dialOpts() });
  Fill.fillSelect(sel, CN);
  check('A1:select-contract', JSON.stringify(sel.__ngLog) === JSON.stringify(['onChange:+86', 'touched']),
    `log=${JSON.stringify(sel.__ngLog)}`);
}
{
  const inp = makeAngular('INPUT', { placeholder: '+86' });
  Fill.fillInput(inp, JP);
  check('A2:input-contract', JSON.stringify(inp.__ngLog) === JSON.stringify(['onChange:+81', 'touched']),
    `log=${JSON.stringify(inp.__ngLog)}`);
}
{
  const ta = makeAngular('TEXTAREA', { placeholder: '+86' });
  Fill.fillInput(ta, GB);
  check('A3:textarea-contract', JSON.stringify(ta.__ngLog) === JSON.stringify(['onChange:+44', 'touched']),
    `log=${JSON.stringify(ta.__ngLog)}`);
}

// ── 结构检查：注入行为集中在一个函数 ──
{
  const fillSrc = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
  const adSrc = readFileSync(join(ROOT, 'src', 'iti-adapter', 'index.ts'), 'utf8');
  const assignFill = (fillSrc.match(/\.\s*value\s*=/g) || []).length;
  const assignAd = (adSrc.match(/\.\s*value\s*=/g) || []).length;
  check('S1:fill-single-assign', assignFill === 1, `src/fill 直接赋值 ${assignFill} 次（应仅 _inject 兜底 1 次）`);
  check('S2:adapter-zero-assign', assignAd === 0, `src/iti-adapter 直接赋值 ${assignAd} 次（应为 0，兜底走注入回调）`);
  check('S3:single-inject-fn', (fillSrc.match(/_inject\s*\(/g) || []).length >= 1 && /_inject\(el,\s*value\)/.test(fillSrc), '_inject 为唯一注入函数');
}

console.log(`\n${pass}/${pass + fail} pass${fail ? ` | FAILURES: ${failures.join(', ')}` : ''}`);
process.exit(fail ? 1 : 0);
