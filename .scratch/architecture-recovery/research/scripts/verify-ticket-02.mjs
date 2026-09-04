// ══════════════════════════════════════════════════════════════════
// verify-ticket-02.mjs — 票 02 引擎级单测门（纯函数 scoreElement，node 直跑，无浏览器）
// 方法：三个 src 模块（config/countries/detect）均为「纯 JS + import/export」风格，
//   剥离 import/export 行按依赖序拼接 → new Function 装配（与 misdetect-repro.mjs 同心智）。
//   mock DOM 只实现引擎消费的接口面（getAttribute 含 name/id/class 反射）。
// 覆盖：E2E 24 字段代表性映射（P 组）+ 误报 5 类/harness FP 全集（F 组，全落 none）
//   + 旧引擎 FN 修复确认（A 组）+ autocomplete 强信号（P11/P12）。
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-02.mjs  （-v 打信号明细）
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
const { createDetect, COUNTRIES, ISO2_MAP } = new Function(bundle)();

console.log('countries:', COUNTRIES.length, '| ISO2_MAP keys:', Object.keys(ISO2_MAP).length);

// ── mock DOM ──
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

const UIstub = { attach() {}, rememberLow() {}, summon() {} };
const Detect = createDetect(UIstub);

const div = (cls) => new El('DIV', { className: cls });
function under(el, ...ancs) { el.ancestors = ancs; el.parentElement = ancs[0] || null; return el; }
function addLabel(forId, text) { labelRegistry.push({ for: forId, text }); }

// ── 用例（expect: 'auto'|'lowkey'|'none'；anchorHasTel 模拟所在页面存在 tel 主号锚） ──
const CASES = [];
const C = (id, expect, desc, build, ctx) => CASES.push({ id, expect, desc, build, ctx: ctx || {} });

// P 组：E2E 24 个注入字段的代表性映射（band 允许 auto|lowkey，E2E 断言的是 wrapper 存在）
C('P1',  'auto',   'c1_code：name=countrycode + 6 个 +NN（cch Case1）', () => new El('SELECT', { name: 'countrycode', options: ['+86', '+1', '+44', '+81', '+82', '+852'] }), { anchorHasTel: true });
C('P2',  'auto',   'sel-a2：name=dial_code_country + ISO 值/EN 名', () => new El('SELECT', { name: 'dial_code_country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }] }), { anchorHasTel: true });
C('P3',  'lowkey', 'inp-b1：input name=country_code（B1）', () => new El('INPUT', { name: 'country_code', type: 'text' }), { anchorHasTel: true });
C('P4',  'auto',   'input type=tel 在 .iti 容器（iti 通道）', () => { const i = new El('INPUT', { type: 'tel' }); return under(i, div('iti')); }, { iti: true });
C('P6',  'auto',   'Case3：class=phone-code-selector 裸NN 值', () => new El('SELECT', { className: 'phone-code-selector', options: ['86', '1', '44', '81', '82', '65'] }), { anchorHasTel: true });
C('P7',  'lowkey', 'Case6：label「Mobile Country Code」+ +NN 值', () => { addLabel('c6', 'Mobile Country Code'); return new El('SELECT', { id: 'c6', options: ['+86', '+1', '+44', '+852', '+81'] }); }, { anchorHasTel: true });
C('P8',  'lowkey', 'Case4：aria-label「Select country calling code」', () => new El('SELECT', { attrs: { 'aria-label': 'Select country calling code' }, options: [{ value: '+86', text: '🇨🇳 +86' }, { value: '+1', text: '🇺🇸 +1' }, { value: '+44', text: '🇬🇧 +44' }, { value: '+33', text: '🇫🇷 +33' }, { value: '+49', text: '🇩🇪 +49' }] }), { anchorHasTel: true });
C('P9',  'auto',   'Case7：label「区号选择」+ China (+86) 括号形态', () => { addLabel('c7', '区号选择'); return new El('SELECT', { id: 'c7', options: [{ value: '+86', text: 'China (+86)' }, { value: '+1', text: 'United States (+1)' }, { value: '+44', text: 'UK (+44)' }, { value: '+81', text: 'Japan (+81)' }, { value: '+82', text: 'Korea (+82)' }] }); }, { anchorHasTel: true });
C('P10', 'lowkey', 'Case8：data-name=area-code + 中国 +86（页面 label 无 for 关联）', () => new El('SELECT', { attrs: { 'data-name': 'area-code' }, options: [{ value: '+86', text: '中国 +86' }, { value: '+1', text: '美国 +1' }, { value: '+44', text: '英国 +44' }, { value: '+61', text: '澳大利亚 +61' }, { value: '+64', text: '新西兰 +64' }] }), { anchorHasTel: true });
C('P11', 'auto',   'L0：autocomplete=tel-country-code（一票强信号）', () => new El('INPUT', { type: 'text', attrs: { autocomplete: 'tel-country-code' } }));
C('P12', 'auto',   'L0：autocomplete=country select + ISO 值', () => new El('SELECT', { attrs: { autocomplete: 'country' }, options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }] }));
C('P13', 'lowkey', 'phonePrefix：id camelCase（N4 修复）', () => new El('INPUT', { id: 'phonePrefix', type: 'text' }), { anchorHasTel: true });
C('P16', 'lowkey', 'N3：input type=number name=country_code', () => new El('INPUT', { name: 'country_code', type: 'number' }), { anchorHasTel: true });

// N 组：主号/负例 —— 不得注入
C('N0a', 'none', '省份 select name=province', () => new El('SELECT', { name: 'province', options: [{ value: '11', text: '北京' }, { value: '12', text: '天津' }, { value: '31', text: '上海' }] }), { anchorHasTel: true });
C('N0b', 'none', '月份 select 1-6', () => new El('SELECT', { name: 'months', options: [{ value: '1', text: '1月' }, { value: '2', text: '2月' }, { value: '3', text: '3月' }] }), { anchorHasTel: true });
C('N0c', 'none', '单选项 select name=countrycode（Case10）', () => new El('SELECT', { name: 'countrycode', options: [{ value: '+86', text: '+86 中国' }] }), { anchorHasTel: true });
C('N0d', 'none', '主号 tel input（type=tel 单独不足以注入）', () => new El('INPUT', { type: 'tel', name: 'phone' }), { anchorHasTel: true });
C('N0e', 'none', 'autocomplete=off 不触发 L0', () => new El('INPUT', { type: 'text', attrs: { autocomplete: 'off' } }));
C('N0f', 'none', '普通文本 input 无任何信号', () => new El('INPUT', { type: 'text', name: 'remark' }), { anchorHasTel: true });
C('N0g', 'none', 'email/password 等 input 不评分', () => new El('INPUT', { type: 'email', name: 'mail' }), { anchorHasTel: true });

// F 组：误报 5 类 + harness FP 全集（全部 none）
C('F1',  'none', '① 称谓前缀 name=prefix mr/ms/mrs（F1）', () => new El('SELECT', { name: 'prefix', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }, { value: 'mrs', text: 'Mrs.' }] }), { anchorHasTel: true });
C('F1b', 'none', '① 称谓前缀数字编码 1/2/3', () => new El('SELECT', { name: 'prefix', options: [{ value: '1', text: 'Mr.' }, { value: '2', text: 'Ms.' }, { value: '3', text: 'Mrs.' }] }), { anchorHasTel: true });
C('F1c', 'none', '① label「Phone Prefix」称谓 select', () => { addLabel('ttl', 'Phone Prefix'); return new El('SELECT', { id: 'ttl', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }); }, { anchorHasTel: true });
C('F2',  'none', '② 国家选择 name=country ISO 值（fp-4）', () => new El('SELECT', { name: 'country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }] }), { anchorHasTel: true });
C('F3',  'none', '③ 固话本地区号 input「固话区号（不含国家区号）」', () => { addLabel('la', '固话区号（不含国家区号）'); return new El('INPUT', { id: 'la', name: 'area_local', type: 'text' }); }, { anchorHasTel: true });
C('F4',  'none', '③ 固话本地区号 select label「区号」010/020（fp-2）', () => { addLabel('ls', '区号'); return new El('SELECT', { id: 'ls', name: 'area', options: ['010', '020', '0755', '021'] }); }, { anchorHasTel: true });
C('F5',  'none', '③ 时区 select GMT±X（fp-3）', () => new El('SELECT', { name: 'timezone', attrs: { 'aria-label': '时区' }, options: [{ value: '+8', text: 'GMT+8' }, { value: '+9', text: 'GMT+9' }, { value: '+5', text: 'GMT+5' }, { value: '0', text: 'GMT' }, { value: '-5', text: 'GMT-5' }] }), { anchorHasTel: true });
C('F6',  'none', '⑤ class hidden 子串撞库 + 数量 1-4（fp-5）', () => new El('SELECT', { name: 'qty', className: 'form-control hidden', options: ['1', '2', '3', '4'] }), { anchorHasTel: true });
C('F7',  'none', '④ 父容器 country-form 内称谓 select name=title', () => { const s = new El('SELECT', { name: 'title', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }); return under(s, div('country-form')); }, { anchorHasTel: true });
C('F8',  'none', 'label「国家/地区」zh 国家名 select', () => { addLabel('cty', '国家/地区'); return new El('SELECT', { id: 'cty', options: [{ value: 'US', text: '美国' }, { value: 'GB', text: '英国' }, { value: 'CN', text: '中国大陆' }] }); }, { anchorHasTel: true });
C('F8b', 'none', 'label「国家/地区」EN 国家名 select（ISO 主导 → 语义分层 none）', () => { addLabel('cty2', '国家/地区'); return new El('SELECT', { id: 'cty2', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }] }); }, { anchorHasTel: true });
C('F9',  'none', 'dyn_country：name=country zh 国家名无值属性（Case12）', () => new El('SELECT', { name: 'country', options: [{ value: '中国大陆', text: '中国大陆' }, { value: '香港', text: '香港' }, { value: '台湾', text: '台湾' }] }), { anchorHasTel: true });
C('N5',  'none', 'react-phone-input-2 组件 input（组件自带选择器，不注入）', () => { const i = new El('INPUT', { type: 'tel', name: 'phone' }); return under(i, div('react-tel-input')); }, { anchorHasTel: true });

// A 组：旧引擎 FN 修复确认（新引擎必须命中）
C('A1', 'auto',   'N1 修复：label「国家/地区区号」+ phone_code + XX（复合短语白名单）', () => { addLabel('pc', '国家/地区区号'); return new El('SELECT', { id: 'pc', name: 'phone_code', options: ['+86', '+1', '+44', '+81'] }); });
C('A2', 'lowkey', 'N2 修复：aria-labelledby 双 id「手机区号」「必填」+ type=tel', () => { labelRegistry.push({ id: 'lb1', text: '手机区号' }); labelRegistry.push({ id: 'lb2', text: '必填' }); return new El('INPUT', { type: 'tel', name: 'phone', attrs: { 'aria-labelledby': 'lb1 lb2' } }); });
C('A3', 'lowkey', 'phonePrefix 真页面形态（B3：label 相邻 + 有 tel 锚 → lowkey 档注入）', () => new El('INPUT', { id: 'phonePrefix', type: 'text', attrs: { placeholder: '+XX' } }), { anchorHasTel: true });

// ── 运行 ──
let pass = 0, fail = 0;
const failures = [];
for (const c of CASES) {
  const el = c.build();
  let res;
  if (c.ctx.iti) res = { tier: Detect._isIti(el) ? 'auto' : 'none', score: null, signals: [] };
  else res = Detect.scoreElement(el, { anchorHasTel: c.ctx.anchorHasTel });
  const ok = res.tier === c.expect;
  if (ok) pass++; else { fail++; failures.push(`${c.id}(expect=${c.expect},got=${res.tier},score=${res.score})`); }
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.id}  expect=${c.expect} got=${res.tier} score=${res.score}`);
  console.log(`        ${c.desc}`);
  if (!ok || process.argv.includes('-v')) {
    for (const s of res.signals) console.log(`          · ${s.layer} ${s.name} ${s.pts}`);
  }
}
console.log(`\n${pass}/${CASES.length} pass${fail ? ` | FAILURES: ${failures.join(', ')}` : ''}`);
process.exit(fail ? 1 : 0);
