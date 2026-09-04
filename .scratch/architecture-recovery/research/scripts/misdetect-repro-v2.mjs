// ══════════════════════════════════════════════════════════════════
// misdetect-repro-v2.mjs — 误检测/漏检 harness（新引擎回归基准）
// 与 misdetect-repro.mjs（旧布尔引擎基线，保留只读）同一套样本 id/语义，
// 但装载【票 02 五层评分引擎】（src/config.ts + src/data/countries.ts + src/detect/index.ts）。
// 判定口径：注入 = tier ∈ {auto, lowkey}（分级行动：中置信低调注入也算注入）。
// 验收（issue 02 第 3 条）：FP 全家桶（F1–F8）全部不注入；FN 修复组 N1/N2/N3/N4 转为注入；
//   N5(react-phone-input-2)/N6(hidden) 保持不注入为语义决策（组件自带选择器/隐藏字段不挂图标）。
// 用法：node .scratch/architecture-recovery/research/scripts/misdetect-repro-v2.mjs  (-v 看信号明细)
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
const bundle = [
  toModuleBody(join(ROOT, 'src', 'config.ts')),
  toModuleBody(join(ROOT, 'src', 'data', 'countries.ts')),
  toModuleBody(join(ROOT, 'src', 'detect', 'index.ts')),
  '\n;return { createDetect, COUNTRIES, ISO2_MAP };',
].join('\n');
const { createDetect, COUNTRIES } = new Function(bundle)();

// ── mock DOM（仅实现新引擎消费的接口面） ──
class Opt {
  constructor(value, text) { this.value = value; this.text = text; }
  getAttribute() { return null; }
}
class El {
  constructor(tag, props = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = props.attrs || {};
    this._id = props.id || '';
    this._class = props.className || '';
    this._name = props.name || '';
    this.options = (props.options || []).map(o => typeof o === 'string' ? new Opt(o, o) : new Opt(o.value, o.text));
    this.ancestors = [];
    this.parentElement = null;
    this.disabled = false;
    this.readOnly = false;
    this.ownerDocument = docMock;
  }
  get id() { return this._id; }
  get className() { return this._class; }
  get name() { return this._name; }
  get dataset() {
    const d = {};
    for (const k of Object.keys(this.attrs)) {
      if (k.startsWith('data-')) d[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = this.attrs[k];
    }
    return d;
  }
  getAttribute(n) {
    if (n === 'name') return this._name || null;
    if (n === 'id') return this._id || null;
    if (n === 'class') return this._class || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
  }
  closest(sel) {
    if (sel.startsWith('.')) { const c = sel.slice(1); return this.ancestors.find(a => String(a._class || '').split(/\s+/).includes(c)) || null; }
    if (sel.startsWith('#')) { const i = sel.slice(1); return this.ancestors.find(a => a._id === i) || null; }
    if (sel === 'form') return this.ancestors.find(a => a.tagName === 'FORM') || null;
    if (sel === 'label') return this.ancestors.find(a => a.tagName === 'LABEL') || null;
    return null;
  }
}
const labelRegistry = [];
const docMock = {
  querySelector(sel) {
    const m = /^label\[for="(.*)"\]$/.exec(sel);
    if (m) { const l = labelRegistry.find(x => x.for === m[1]); return l ? { textContent: l.text } : null; }
    return null;
  },
  getElementById(id) { const l = labelRegistry.find(x => x.id === id); return l ? { textContent: l.text } : null; },
  querySelectorAll() { return []; },
};

const Detect = createDetect({ attach() {}, rememberLow() {}, summon() {} });

const div = (cls) => new El('DIV', { className: cls });
function under(el, ...ancs) { el.ancestors = ancs; el.parentElement = ancs[0] || null; return el; }
function addLabel(forId, text) { labelRegistry.push({ for: forId, text }); }

// ── 用例：id 与旧 harness 一一对应；expect: 'inject' | 'none' ──
const CASES = [];
const C = (id, cat, expect, desc, build, ctx) => CASES.push({ id, cat, expect, desc, build, ctx: ctx || {} });

// 对照组正向
C('P1', 'CTRL+', 'inject', 'select name=countrycode + +XX 值（测试页 Case1）',
  () => new El('SELECT', { name: 'countrycode', options: ['+86', '+1', '+44', '+81'] }));
C('P2', 'CTRL+', 'inject', 'select name=dial_code_country + ISO 值（测试页 A2）',
  () => new El('SELECT', { name: 'dial_code_country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }] }));
C('P3', 'CTRL+', 'inject', 'input name=country_code type=text（测试页 B1；页面含 tel 主号锚）',
  () => new El('INPUT', { name: 'country_code', type: 'text' }), { anchorHasTel: true });
C('P4', 'CTRL+', 'inject', 'input type=tel 在 .iti 容器（iti v18 wrapper）',
  () => { const i = new El('INPUT', { type: 'tel' }); return under(i, div('iti')); }, { iti: true });
// 对照组负向
C('N0a', 'CTRL-', 'none', 'select name=province 省份码（测试页 Case9）',
  () => new El('SELECT', { name: 'province', options: [{ value: '11', text: '北京' }, { value: '12', text: '天津' }, { value: '31', text: '上海' }] }));
C('N0b', 'CTRL-', 'none', 'select name=months 月份 1-6 无关键词',
  () => new El('SELECT', { name: 'months', options: [{ value: '1', text: '1月' }, { value: '2', text: '2月' }, { value: '3', text: '3月' }] }));
C('N0c', 'CTRL-', 'none', 'select name=countrycode 仅 1 个选项（测试页 Case10）',
  () => new El('SELECT', { name: 'countrycode', options: [{ value: '+86', text: '+86 中国' }] }));

// 误检测样本（旧引擎 FP：误插图标）→ 新引擎必须全部不注入
C('F1',  'FP', 'none', '称谓前缀 select name="prefix"，值 mr/ms/mrs',
  () => new El('SELECT', { name: 'prefix', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }, { value: 'mrs', text: 'Mrs.' }] }));
C('F1b', 'FP', 'none', '称谓前缀 select name="prefix"，值 1/2/3',
  () => new El('SELECT', { name: 'prefix', options: [{ value: '1', text: 'Mr.' }, { value: '2', text: 'Ms.' }, { value: '3', text: 'Mrs.' }] }));
C('F1c', 'FP', 'none', '称谓 select（无 name），label "Phone Prefix"',
  () => { addLabel('ttl', 'Phone Prefix'); return new El('SELECT', { id: 'ttl', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }); });
C('F2',  'FP', 'none', '纯国家选择 select name="country"（ISO 值）',
  () => new El('SELECT', { name: 'country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }] }));
C('F3',  'FP', 'none', '固话本地区号 input，label "固话区号（不含国家区号）"',
  () => { addLabel('la', '固话区号（不含国家区号）'); return new El('INPUT', { id: 'la', name: 'area_local', type: 'text' }); });
C('F4',  'FP', 'none', '固话本地区号 select，label "区号"，值 010/020/0755/021',
  () => { addLabel('ls', '区号'); return new El('SELECT', { id: 'ls', name: 'area', options: ['010', '020', '0755', '021'] }); });
C('F5',  'FP', 'none', '时区 select name=timezone aria-label=时区，值 +8/+9/+5/0/-5',
  () => new El('SELECT', { name: 'timezone', attrs: { 'aria-label': '时区' }, options: [{ value: '+8', text: 'GMT+8' }, { value: '+9', text: 'GMT+9' }, { value: '+5', text: 'GMT+5' }, { value: '0', text: 'GMT' }, { value: '-5', text: 'GMT-5' }] }));
C('F6',  'FP', 'none', '数量 select name=qty class="form-control hidden"（hidden 含子串 idd），值 1-6',
  () => new El('SELECT', { name: 'qty', className: 'form-control hidden', options: ['1', '2', '3', '4'] }));
C('F7',  'FP', 'none', '表单主题容器 class="country-form" 内的称谓 select name=title',
  () => { const s = new El('SELECT', { name: 'title', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }); return under(s, div('country-form')); });
C('F8',  'FP', 'none', '纯国家选择 select（无 name），label "国家/地区"（旧 harness 未复现样本）',
  () => { addLabel('cty', '国家/地区'); return new El('SELECT', { id: 'cty', options: [{ value: 'US', text: '美国' }, { value: 'GB', text: '英国' }, { value: 'CN', text: '中国大陆' }] }); });

// 漏检样本（旧引擎 FN）→ 新引擎修复组
C('N1',  'FN', 'inject', '手机区号 select name=phone_code 值 +86/+1/+44，label "国家/地区区号"（旧 EXCLUDE 地区 误杀）',
  () => { addLabel('pc', '国家/地区区号'); return new El('SELECT', { id: 'pc', name: 'phone_code', options: ['+86', '+1', '+44', '+81'] }); });
C('N2',  'FN', 'inject', 'input type=tel aria-labelledby="lb1 lb2"（旧多 id 未 split）',
  () => { labelRegistry.push({ id: 'lb1', text: '手机区号' }); labelRegistry.push({ id: 'lb2', text: '必填' }); return new El('INPUT', { type: 'tel', name: 'phone', attrs: { 'aria-labelledby': 'lb1 lb2' } }); });
C('N2b', 'FN-对照', 'inject', '同上但 aria-labelledby 单 id="lb1"',
  () => { labelRegistry.push({ id: 'lb1x', text: '手机区号' }); return new El('INPUT', { type: 'tel', name: 'phone', attrs: { 'aria-labelledby': 'lb1x' } }); });
C('N3',  'FN', 'inject', 'input type=number name=country_code（锚上下文=真实页面存在 tel 主号）',
  () => new El('INPUT', { name: 'country_code', type: 'number' }), { anchorHasTel: true });
C('N4',  'FN', 'inject', 'input id=phonePrefix（锚上下文=真实页面存在 tel 主号）',
  () => new El('INPUT', { id: 'phonePrefix', type: 'text' }), { anchorHasTel: true });
// 保持不注入（语义决策，见文件头）
C('N5',  'FN(语义保留)', 'none', 'react-phone-input-2 组件 input（组件自带选择器，不叠加图标）',
  () => { const i = new El('INPUT', { type: 'tel', name: 'phone' }); return under(i, div('react-tel-input')); });
C('N6',  'FN(语义保留)', 'none', 'MUI/AntD 隐藏承值 input type=hidden name=countryCode（隐藏字段不挂图标）',
  () => new El('INPUT', { name: 'countryCode', type: 'hidden' }));
C('N7',  'FN(可用性)', 'inject', 'Select2：原生 select name=country_code class="select2-hidden-accessible"',
  () => new El('SELECT', { name: 'country_code', className: 'select2-hidden-accessible', options: ['+86', '+1', '+44'] }));

// ── 运行 ──
console.log('engine = src/detect/index.ts（票 02 五层评分引擎）| countries:', COUNTRIES.length);
console.log('注入判定：tier ∈ {auto, lowkey}\n');
let pass = 0;
const failures = [];
for (const c of CASES) {
  const el = c.build();
  let tier;
  if (c.ctx.iti) tier = Detect._isIti(el) ? 'auto' : 'none';
  else tier = Detect.scoreElement(el, { anchorHasTel: c.ctx.anchorHasTel }).tier;
  const injected = tier === 'auto' || tier === 'lowkey';
  const ok = (c.expect === 'inject') === injected;
  if (ok) pass++; else failures.push(c.id);
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.id} ${c.cat}  expect=${c.expect} got=${injected ? 'inject(' + tier + ')' : 'none'}`);
  console.log(`      ${c.desc}`);
}
console.log(`\n合计 ${CASES.length} 例，符合预期 ${pass} 例${failures.length ? ' | FAILURES: ' + failures.join(', ') : ''}`);
console.log('FP 全家桶（F1–F8）不注入：', CASES.filter(c => c.id.startsWith('F')).every(c => {
  const el = c.build();
  const r = Detect.scoreElement(el);
  return r.tier === 'none';
}) ? 'YES' : 'NO');
process.exit(failures.length ? 1 : 0);
