// ══════════════════════════════════════════════════════════════════
// verify-ticket-15.mjs — 票 15 React 19 填充能力探测兜底 单测门（node 直跑，无浏览器）
// 方法：verify-ticket-09 同心智（src 模块拼接 → new Function 装配）；React 19.2.8
//   react-dom-client.production.js 实读：_valueTracker / updateValueIfChanged 与 16–18
//   逐字同构（observed）。覆盖：
//   P 组 能力探测语义（own accessor + _valueTracker 双条件；任一缺失不命中）
//   F 组 强制 diff（快照将吞事件时回拨；prev==next 哨兵；快照落后不干预）
//   D 组 安全降级（tracker 方法缺失/探测抛错 → 既有路径不受影响，事件序列不变）
//   E 组 既有路径回归（React18 mock/Vue/plain/TEXTAREA 全组不回归，等价票 09 门）
//   S 组 结构检查（S1 fill .value= 恰 1 / S2 adapter 0 / S3 _probe 探测-兜底单点 /
//        S4 textarea/select 原型路径未改：_inject 为唯一派发点，fillSelect/fillInput 不直派）
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-15.mjs
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

const i18nBody = toModuleBody(join(ROOT, 'src', 'i18n.ts')).replace(/navigator\.language/g, '__navLanguage');

const PRELUDE = `
// ── mock 原型 ──
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
  window['HTML' + (tag === 'TEXTAREA' ? 'TextArea' : tag.charAt(0) + tag.slice(1).toLowerCase()) + 'Element'] = Ctor;
  return Ctor;
}
const TAG_CTORS = { INPUT: makeCtor('INPUT'), SELECT: makeCtor('SELECT'), TEXTAREA: makeCtor('TEXTAREA') };

// ── React 18/19 value tracker（react-dom inputValueTracking 语义；19.2.8 源码同构 observed）──
function reactTrack(el) {
  if (el._valueTracker) return;
  let field = el.value;
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  Object.defineProperty(el, 'value', {
    configurable: true, enumerable: true,
    get() { return desc.get.call(el); },
    set(v) { field = String(v); desc.set.call(el, v); },
  });
  el._valueTracker = { getValue: () => field, setValue: (v) => { field = String(v); } };
}
function updateValueIfChanged(el) {
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
  '\n;return { createFill, makePlain, makeReact, updateValueIfChanged, reactTrack, window };',
].join('\n');

const { createFill, makePlain, makeReact, updateValueIfChanged, reactTrack, window } = new Function(bundle)();
const Fill = createFill({ toast() {} });

let pass = 0, fail = 0;
const failures = [];
function check(id, cond, detail) {
  if (cond) { pass++; console.log(`[PASS] ${id} ${detail || ''}`); }
  else { fail++; failures.push(id); console.log(`[FAIL] ${id} ${detail || ''}`); }
}
const SEQ = ['input', 'change', 'blur'];
const CN = { code: '+86', iso: 'CN', flag: '🇨🇳', country: '中国', countryEn: 'China' };
const JP = { code: '+81', iso: 'JP', flag: '🇯🇵', country: '日本', countryEn: 'Japan' };
const dialOpts = () => [{ value: '', text: '选择…' }, { value: '+86', text: '+86' }, { value: '+81', text: '+81' }, { value: '+1', text: '+1' }];

// ── P 组：能力探测语义 ──
const probeSrc = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
{
  const el = makeReact('INPUT', { placeholder: '+86' });
  check('P1:react-tracked-hit', probeSrc.includes("const own = Object.getOwnPropertyDescriptor(el, 'value')") && el._valueTracker !== undefined, 'own accessor + tracker 双条件命中形态');
}
{
  const el = makePlain('INPUT', { placeholder: '+86' });
  check('P2:plain-not-hit-src', probeSrc.includes('if (!own || typeof own.get !== \'function\' || typeof own.set !== \'function\') return false;'), '无 own accessor → 不命中');
}
{
  const el = makePlain('INPUT', { placeholder: '+86' });
  el._valueTracker = { getValue: () => 'x' }; // setValue 缺失 → 不命中（降级）
  check('P3:partial-tracker-guard', probeSrc.includes("typeof tracker.setValue !== 'function'"), 'tracker 方法缺失 → 不命中');
}
{
  const el = makeReact('SELECT', { options: dialOpts() });
  check('P4:select-tracked-hit', probeSrc.includes("el._valueTracker"), '受控 select 同样命中探测');
}

// ── F 组：强制 diff 语义（fill 全链路验证）──
{
  // F1 快照落后（标准 React 18/19 形态）：原生 setter 已保证 diff，不干预
  const el = makeReact('INPUT', { placeholder: '+86' });
  Fill.fillInput(el, JP);
  check('F1:stale-snapshot-unchanged', el.value === '+81' && el.__reactLog.indexOf('onChange') >= 0, `value=${el.value} onChange fired`);
}
{
  // F2 快照已同步到填充值（react#11488 经典形态）：prev≠next → 回拨 prev 保证 diff
  const el = makeReact('INPUT', { placeholder: '+86' });
  el.value = '+81';               // 站点 JS 直接赋值 → tracker 快照同步为 +81，React state 滞后
  check('F2:precondition', el._valueTracker.getValue() === '+81', '快照已等于填充值（将吞事件形态）');
  Fill.fillInput(el, JP);         // 填充值也是 +81
  check('F2:onChange-fired', el.__reactLog.indexOf('onChange') >= 0, `强制 diff 生效（无兜底时快照==next 会被吞） value=${el.value}`);
}
{
  // F3 prev==next 哨兵：快照=填充值=prev，回拨为 prev+ZWSP 保证 diff 非空
  const el = makeReact('INPUT', { placeholder: '+86' });
  el.value = '+86';               // 站点已写 +86（快照=prev=next=+86，三次相等形态）
  Fill.fillInput(el, CN);         // 填充值也是 +86
  check('F3:sentinel-diff', el.__reactLog.indexOf('onChange') >= 0, `哨兵保证 diff 非空 → onChange fired（无哨兵必吞）value=${el.value}`);
}
{
  // F4 受控 select 强制 diff（select 的 onChange 由 change 事件驱动）
  const el = makeReact('SELECT', { options: dialOpts() });
  el.value = '+81';
  check('F4:precondition', el._valueTracker.getValue() === '+81', '快照已等于填充值（将吞事件形态）');
  Fill.fillSelect(el, JP);
  check('F4:select-forcediff', el.__reactLog.indexOf('onChange') >= 0, `select（change 事件驱动）强制 diff 生效 value=${el.value}`);
}

// ── D 组：安全降级（探测失败不引入新失败面）──
{
  // D1 tracker.setValue 缺失：探测不命中，但既有路径完整（值+事件序列）
  const el = makeReact('INPUT', { placeholder: '+86' });
  const broken = el._valueTracker;
  delete broken.setValue;        // tracker 半残（setValue 缺失）→ 探测不命中 → 无兜底
  el.value = '+81';              // F2 形态：快照==填充值
  Fill.fillInput(el, JP);
  check('D1:degraded-no-crash', JSON.stringify(el._events) === JSON.stringify(SEQ), `探测不命中也绝不崩：events=${JSON.stringify(el._events)}`);
  check('D1:degraded-value', el.value === '+81', `值路径不受影响 value=${el.value}`);
  check('D1:degraded-suppressed', el.__reactLog.indexOf('onChange') < 0, '降级语义边界：无兜底时 F2 形态事件被吞（与 React 原生行为一致，非新失败面）');
}
{
  // D2 探测/兜底链抛错不冒泡：poison own accessor（探测命中形态）+ poison tracker（兜底抛错形态）
  const el = makeReact('INPUT', { placeholder: '+86' });
  let boom = 0;
  const poisonTracker = { getValue() { throw new Error('tracker boom'); }, setValue() { boom++; } };
  el._valueTracker = poisonTracker;   // probe 命中（own accessor + tracker 在），forceDiff 读 getValue 即抛 → try/catch 吞
  Fill.fillInput(el, JP);             // 值照写、事件照发，兜底失败不冒泡
  check('D2:events-still-fired', JSON.stringify(el._events) === JSON.stringify(SEQ), `poison tracker 下 events=${JSON.stringify(el._events)}`);
  check('D2:value-applied', el.value === '+81', `value=${el.value}`);
}
{
  // D3 probe.hit 本身抛错（定义 getter 让 getOwnPropertyDescriptor 阶段就炸）→ catch → false → 既有路径
  const el = makePlain('INPUT', { placeholder: '+86' });
  Object.defineProperty(el, 'value', {
    configurable: true,
    get() { return ''; },
    set() { throw new Error('setter boom'); },
  });
  Fill.fillInput(el, JP);
  check('D3:poison-el-no-crash', JSON.stringify(el._events) === JSON.stringify(SEQ), `events=${JSON.stringify(el._events)}（探测/兜底/派发全程 try/catch）`);
}

// ── E 组：既有路径回归（等价票 09 门主链）──
{
  const el = makeReact('SELECT', { options: dialOpts() });
  const ok = Fill.fillSelect(el, CN);
  check('E1:react-select', ok === true && el.value === '+86' && el.__reactLog.indexOf('onChange') >= 0 && JSON.stringify(el._events) === JSON.stringify(SEQ));
}
{
  const el = makeReact('INPUT', { placeholder: '+86' });
  Fill.fillInput(el, JP);
  check('E2:react-input', el.value === '+81' && el.__reactLog.indexOf('onChange') >= 0 && JSON.stringify(el._events) === JSON.stringify(SEQ));
}
{
  const el = makePlain('SELECT', { options: dialOpts() });
  Fill.fillSelect(el, CN);
  check('E3:vue-plain-select', el.value === '+86' && JSON.stringify(el._events) === JSON.stringify(SEQ));
}
{
  const el = makePlain('INPUT', { placeholder: '+86' });
  Fill.fillInput(el, JP);
  check('E4:vue-plain-input', el.value === '+81' && JSON.stringify(el._events) === JSON.stringify(SEQ));
}
{
  const el = makePlain('TEXTAREA', { placeholder: '+86' });
  Fill.fillInput(el, CN);
  check('E5:textarea-plain', el.value === '+86' && JSON.stringify(el._events) === JSON.stringify(SEQ), 'TEXTAREA 原型路径不变');
}
{
  const el = makeReact('TEXTAREA', { placeholder: '+86' });
  Fill.fillInput(el, JP);
  check('E6:textarea-tracked', el.value === '+81' && el.__reactLog.indexOf('onChange') >= 0 && JSON.stringify(el._events) === JSON.stringify(SEQ), 'TEXTAREA tracker 路径不变');
}
{
  // iti 兜底经注入回调
  const el = makeReact('INPUT', { placeholder: 'phone' });
  const ok = Fill.fillIti(el, JP);
  check('E7:iti-fallback-inject', ok === true && el.value === '+81' && el.__reactLog.indexOf('onChange') >= 0);
}

// ── S 组：结构检查 ──
{
  const fillSrc = probeSrc;
  const adSrc = readFileSync(join(ROOT, 'src', 'iti-adapter', 'index.ts'), 'utf8');
  const assignFill = (fillSrc.match(/\.\s*value\s*=/g) || []).length;
  const assignAd = (adSrc.match(/\.\s*value\s*=/g) || []).length;
  check('S1:fill-single-assign', assignFill === 1, `src/fill 直接赋值 ${assignFill} 次（应仅 _inject 兜底 1 次）`);
  check('S2:adapter-zero-assign', assignAd === 0, `src/iti-adapter 直接赋值 ${assignAd} 次`);
  check('S3:probe-single-point', (fillSrc.match(/_probe\.hit\(/g) || []).length === 1 && (fillSrc.match(/_probe\.forceDiff\(/g) || []).length === 1, '探测+兜底收敛于 _inject 单点');
  check('S4:dispatch-single', (fillSrc.match(/dispatchEvent/g) || []).length === 1, '事件派发仅 _inject 一处（textarea/select 原型路径未改）');
  check('S5:probe-readonly', fillSrc.includes('Object.getOwnPropertyDescriptor(el, \'value\')') && !fillSrc.includes('defineProperty'), '探测只读（不写元素属性，无新失败面）');
}

console.log(`\n${pass}/${pass + fail} pass${fail ? ` | FAILURES: ${failures.join(', ')}` : ''}`);
process.exit(fail ? 1 : 0);
