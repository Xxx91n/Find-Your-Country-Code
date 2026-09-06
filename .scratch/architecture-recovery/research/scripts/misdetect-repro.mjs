// ══════════════════════════════════════════════════════════════════
// misdetect-repro.mjs — 误检测/漏检最小复现 harness
// 方法：从仓库 src/Find-Your-Country-Code.js 原样提取
//   SELECT_KW / SELECT_EXCLUDE_KW / INPUT_KW / LABEL_PHRASES
//   COUNTRIES / ISO2_MAP / Detect
// 在 mock DOM 上直接调用【真实】的 Detect._isSelect/_isInput/_isIti，
// 验证"非区号字段出现图标"（FP）与"应命中却漏检"（FN）样本。
// 用法：node misdetect-repro.mjs
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', '..', '..', '..', 'src', 'Find-Your-Country-Code.js');
const src = readFileSync(SRC, 'utf8');

// ── 1. 提取真实代码段（按源码标记切片，不做任何改写） ──
const segA = src.slice(src.indexOf('const SELECT_KW'), src.indexOf('const COUNTRIES = ['));
const isoIdx = src.indexOf('const ISO2_MAP');
const segB = src.slice(src.indexOf('const COUNTRIES = ['), src.indexOf('\n', src.indexOf(';', isoIdx)));
const segC = src.slice(src.indexOf('const Detect = {'), src.indexOf('// FILL'));

// ── 2. mock DOM（仅实现 Detect 用到的接口） ──
class Opt {
  constructor(value, text, attrs = {}) { this.value = value; this.text = text; this._a = attrs; }
  getAttribute(n) { return Object.prototype.hasOwnProperty.call(this._a, n) ? this._a[n] : null; }
}

class El {
  constructor(tag, props = {}) {
    this.tagName = tag.toUpperCase();
    this.name = props.name || '';
    this.id = props.id || '';
    this.className = props.className || '';
    this.title = props.title || '';
    this.type = props.type || '';
    this.textContent = props.textContent || '';
    this.attrs = props.attrs || {};
    this.options = (props.options || []).map(o =>
      typeof o === 'string' ? new Opt(o, o) : new Opt(o.value, o.text, o.attrs || {}));
    this.ancestors = [];
    this.parentElement = null;
    this.disabled = false;
    this.readOnly = false;
  }
  get dataset() {
    const d = {};
    for (const k of Object.keys(this.attrs)) {
      if (k.startsWith('data-')) d[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = this.attrs[k];
    }
    return d;
  }
  getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; }
  closest(s) {
    if (s === 'label') return this.ancestors.find(a => a.tagName === 'LABEL') || null;
    if (s.startsWith('.')) { const c = s.slice(1); return this.ancestors.find(a => String(a.className || '').split(/\s+/).includes(c)) || null; }
    if (s.startsWith('#')) { const i = s.slice(1); return this.ancestors.find(a => a.id === i) || null; }
    return null;
  }
}

// label 注册表：支撑 _label 的 document.querySelector('label[for=…]') / getElementById
const labelRegistry = [];
const documentMock = {
  querySelector(sel) {
    const m = /^label\[for="(.*)"\]$/.exec(sel);
    if (m) { const l = labelRegistry.find(x => x.for === m[1]); return l ? { textContent: l.text } : null; }
    return null;
  },
  getElementById(id) { const l = labelRegistry.find(x => x.id === id); return l ? { textContent: l.text } : null; },
};

const factory = new Function('document', 'window',
  `${segA}\n${segB}\n${segC}\n;return { Detect, SELECT_KW, SELECT_EXCLUDE_KW, INPUT_KW, LABEL_PHRASES, ISO2_MAP };`);
const { Detect, SELECT_KW: SELECT_KW_REF, SELECT_EXCLUDE_KW, LABEL_PHRASES, ISO2_MAP } = factory(documentMock, {});

// ── 3. 辅助构造器 ──
const div = (className, attrs = {}) => new El('DIV', { className, attrs });
const lbl = (text, className = '') => new El('LABEL', { className, textContent: text });
function under(el, ...ancs) { el.ancestors = ancs; el.parentElement = ancs[0] || null; return el; }
function addLabel(forId, text) { labelRegistry.push({ for: forId, text }); return labelRegistry.length - 1; }

// 镜像源码 L441-486 的各 gate，仅用于打印"哪个 gate 命中"（判定本身以真实 _isSelect 为准）
function diagSelect(el) {
  const opts = (el.options || []).filter(o => (o.value || '').trim());
  const attrStr = [el.name, el.id, el.className, el.getAttribute('data-name'),
    el.getAttribute('aria-label'), el.title].filter(Boolean).join(' ');
  const lblRaw = Detect._label(el);
  const lbl = lblRaw.toLowerCase();
  const parentHint = el.parentElement
    ? `${el.parentElement.className || ''} ${el.parentElement.getAttribute('aria-label') || ''}` : '';
  const detectHint = `${attrStr} ${lbl} ${parentHint}`.toLowerCase();
  const excluded = Detect._kw(detectHint, SELECT_EXCLUDE_KW);
  const hasLabelPhrase = LABEL_PHRASES.some(p => lbl.includes(p));
  const hasAttrKw = Detect._kw(attrStr, SELECT_KW_REF) || Detect._kw(lblRaw, SELECT_KW_REF)
    || (el.parentElement && Detect._kw(parentHint, SELECT_KW_REF));
  const v = o => (o.value || '').trim(); const t = o => (o.text || '').trim();
  const hitCode = opts.filter(o => /^\+\d{1,4}$/.test(v(o)) || /^00\d{1,4}$/.test(v(o)) || /^\d{1,4}$/.test(v(o)) || /\(\+\d{1,4}\)/.test(t(o))).length;
  const hitIso = opts.filter(o => /^[a-z]{2}$/.test(v(o).toLowerCase()) && !!ISO2_MAP[v(o).toLowerCase()]).length;
  const hitPlusLike = opts.filter(o => /^\+\d{1,4}$/.test(v(o)) || /^00\d{1,4}$/.test(v(o)) || /\(\+\d{1,4}\)/.test(t(o))).length;
  return { opts: opts.length, excluded, hasAttrKw, hasLabelPhrase, hitCode, hitIso, hitPlusLike };
}

// ── 4. 用例 ──
const CASES = [];
const C = (id, cat, desc, fn) => CASES.push({ id, cat, desc, fn });

// ---- 对照组：正向（应检出） ----
C('P1', 'CTRL+', 'select name=countrycode + +XX 值（测试页 Case1）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'countrycode', options: ['+86', '+1', '+44', '+81'] }))) === true);
C('P2', 'CTRL+', 'select name=dial_code_country + ISO 值（测试页 A2）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'dial_code_country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }] }))) === true);
C('P3', 'CTRL+', 'input name=country_code type=text（测试页 B1）',
  () => Detect._isInput(under(new El('INPUT', { name: 'country_code', type: 'text' }))) === true);
C('P4', 'CTRL+', 'input type=tel 在 .iti 容器内（iti v18 wrapper）',
  () => Detect._isIti(under(new El('INPUT', { type: 'tel' }), div('iti'))) === true);
// ---- 对照组：负向（应不检出） ----
C('N0a', 'CTRL-', 'select name=province 省份码（测试页 Case9）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'province', options: [{ value: '11', text: '北京' }, { value: '12', text: '天津' }, { value: '31', text: '上海' }] }))) === false);
C('N0b', 'CTRL-', 'select name=months 月份 1-6 无关键词',
  () => Detect._isSelect(under(new El('SELECT', { name: 'months', options: [{ value: '1', text: '1月' }, { value: '2', text: '2月' }, { value: '3', text: '3月' }] }))) === false);
C('N0c', 'CTRL-', 'select name=countrycode 仅 1 个选项（测试页 Case10）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'countrycode', options: [{ value: '+86', text: '+86 中国' }] }))) === false);

// ---- 误检测样本（FP：非区号字段会出图标） ----
C('F1', 'FP', '称谓前缀 select name="prefix"，值 mr/ms/mrs（Mr./Ms./Mrs.）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'prefix', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }, { value: 'mrs', text: 'Mrs.' }] }))) === true);
C('F1b', 'FP', '称谓前缀 select name="prefix"，值 1/2/3（数字编码称谓）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'prefix', options: [{ value: '1', text: 'Mr.' }, { value: '2', text: 'Ms.' }, { value: '3', text: 'Mrs.' }] }))) === true);
C('F1c', 'FP', '称谓 select（无 name），label 文本 "Phone Prefix"',
  () => { addLabel('ttl', 'Phone Prefix'); return Detect._isSelect(under(new El('SELECT', { id: 'ttl', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }))) === true; });
C('F2', 'FP', '纯国家选择 select name="country"（ISO 值，用户选国家非区号）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }] }))) === true);
C('F3', 'FP', '固话本地区号 input，label "固话区号（不含国家区号）"',
  () => { addLabel('la', '固话区号（不含国家区号）'); return Detect._isInput(under(new El('INPUT', { id: 'la', name: 'area_local', type: 'text' }))) === true; });
C('F4', 'FP', '固话本地区号 select，label "区号"，值 010/020/0755/021',
  () => { addLabel('ls', '区号'); return Detect._isSelect(under(new El('SELECT', { id: 'ls', name: 'area', options: [{ value: '010', text: '010' }, { value: '020', text: '020' }, { value: '0755', text: '0755' }, { value: '021', text: '021' }] }))) === true; });
C('F5', 'FP', '时区 select name=timezone aria-label=时区，值 +8/+9/+5/0/-5',
  () => Detect._isSelect(under(new El('SELECT', { name: 'timezone', attrs: { 'aria-label': '时区' }, options: [{ value: '+8', text: 'GMT+8' }, { value: '+9', text: 'GMT+9' }, { value: '+5', text: 'GMT+5' }, { value: '0', text: 'GMT' }, { value: '-5', text: 'GMT-5' }] }))) === true);
C('F6', 'FP', '数量 select name=qty class="form-control hidden"（hidden 含子串 idd），值 1-6',
  () => Detect._isSelect(under(new El('SELECT', { name: 'qty', className: 'form-control hidden', options: [{ value: '1', text: '1' }, { value: '2', text: '2' }, { value: '3', text: '3' }, { value: '4', text: '4' }] }))) === true);
C('F7', 'FP', '表单主题容器 class="country-form" 内的称谓 select name=title（父类名污染）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'title', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }), div('country-form'))) === true);
C('F8', 'FP', '纯国家选择 select（无 name），label "国家/地区"（值 +86 等真区号格式也放进来对照）',
  () => { addLabel('cty', '国家/地区'); return Detect._isSelect(under(new El('SELECT', { id: 'cty', options: [{ value: 'US', text: '美国' }, { value: 'GB', text: '英国' }, { value: 'CN', text: '中国大陆' }] }))) === true; });

// ---- 漏检样本（FN：应命中但检不出） ----
C('N1', 'FN', '手机区号 select name=phone_code 值 +86/+1/+44，label "国家/地区区号"（EXCLUDE 地区 误杀）',
  () => { addLabel('pc', '国家/地区区号'); return Detect._isSelect(under(new El('SELECT', { id: 'pc', name: 'phone_code', options: ['+86', '+1', '+44', '+81'] }))) === false; });
C('N2', 'FN', 'input type=tel aria-labelledby="lb1 lb2"（多 id，源码未 split）',
  () => { addLabel(null, ''); labelRegistry.push({ id: 'lb1', text: '手机区号' }); labelRegistry.push({ id: 'lb2', text: '必填' }); const el = under(new El('INPUT', { type: 'tel', name: 'phone', attrs: { 'aria-labelledby': 'lb1 lb2' } })); return Detect._isInput(el) === false; });
C('N2b', 'FN-对照', '同上但 aria-labelledby 单 id="lb1" → 应命中（证明多 id 是失败原因）',
  () => { labelRegistry.push({ id: 'lb1x', text: '手机区号' }); const el = under(new El('INPUT', { type: 'tel', name: 'phone', attrs: { 'aria-labelledby': 'lb1x' } })); return Detect._isInput(el) === true; });
C('N3', 'FN', 'input type=number name=country_code（type 过滤 + scan 选择器双重漏）',
  () => Detect._isInput(under(new El('INPUT', { name: 'country_code', type: 'number' }))) === false);
C('N4', 'FN', 'input id=phonePrefix（测试页2 B3 隐含期望命中；INPUT_KW 无 prefix）',
  () => Detect._isInput(under(new El('INPUT', { id: 'phonePrefix', type: 'text' }))) === false);
C('N5', 'FN', 'react-phone-input-2 组件：input type=tel name=phone，wrapper class="react-tel-input"',
  () => { const el = under(new El('INPUT', { type: 'tel', name: 'phone' }), div('react-tel-input')); return Detect._isIti(el) === false && Detect._isInput(el) === false; });
C('N6', 'FN', 'MUI/AntD 隐藏承值 input type=hidden name=countryCode',
  () => Detect._isInput(under(new El('INPUT', { name: 'countryCode', type: 'hidden' }))) === false);
C('N7', 'FN(可用性)', 'Select2：原生 select name=country_code class="select2-hidden-accessible"（能检出，但目标 display:none → 图标挂零宽包裹）',
  () => Detect._isSelect(under(new El('SELECT', { name: 'country_code', className: 'select2-hidden-accessible', options: ['+86', '+1', '+44'] }))) === true);

// ── 5. 运行 ──
console.log('src =', SRC);
console.log('提取段: segA(kw)=' + segA.length + 'B  segB(countries)=' + segB.length + 'B  segC(Detect)=' + segC.length + 'B\n');
console.log('ISO2 撞库检查: mr→', JSON.stringify(ISO2_MAP['mr']?.countryEn), ' ms→', JSON.stringify(ISO2_MAP['ms']?.countryEn), ' id→', JSON.stringify(ISO2_MAP['id']?.countryEn), ' do→', JSON.stringify(ISO2_MAP['do']?.countryEn));
console.log('_kw 子串检查: "form-control hidden" 命中 idd =', Detect._kw('form-control hidden', ['idd']));
console.log('');

let pass = 0;
for (const c of CASES) {
  let ok, diag = '';
  try { ok = c.fn(); } catch (e) { ok = 'ERROR: ' + e.message; }
  const verdict = ok === true ? (c.cat.startsWith('CTRL') || c.cat.startsWith('FN') ? '符合预期' : '✔ 复现')
    : ok === false ? (c.cat === 'FP' ? '✘ 未复现' : '✘ 不符合预期') : String(ok);
  if (ok === true) pass++;
  console.log(`[${c.id}] ${c.cat}  ${verdict}`);
  console.log(`      ${c.desc}`);
}
console.log(`\n合计 ${CASES.length} 例，与预期一致 ${pass} 例`);

// 逐项 gate 诊断（误检测样本）
console.log('\n── FP 样本 gate 诊断（镜像 L441-486，仅供定位命中路径） ──');
const fpSelects = {
  F1: under(new El('SELECT', { name: 'prefix', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }, { value: 'mrs', text: 'Mrs.' }] })),
  F2: under(new El('SELECT', { name: 'country', options: [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' }, { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }] })),
  F5: under(new El('SELECT', { name: 'timezone', attrs: { 'aria-label': '时区' }, options: [{ value: '+8', text: 'GMT+8' }, { value: '+9', text: 'GMT+9' }, { value: '+5', text: 'GMT+5' }, { value: '0', text: 'GMT' }, { value: '-5', text: 'GMT-5' }] })),
  F6: under(new El('SELECT', { name: 'qty', className: 'form-control hidden', options: [{ value: '1', text: '1' }, { value: '2', text: '2' }, { value: '3', text: '3' }, { value: '4', text: '4' }] })),
  F7: under(new El('SELECT', { name: 'title', options: [{ value: 'mr', text: 'Mr.' }, { value: 'ms', text: 'Ms.' }] }), div('country-form')),
};
for (const [id, el] of Object.entries(fpSelects)) {
  console.log(id, JSON.stringify(diagSelect(el)));
}
console.log('F4(区号 label select) =', JSON.stringify(diagSelect((() => { const e = under(new El('SELECT', { id: 'ls2', name: 'area', options: [{ value: '010', text: '010' }, { value: '020', text: '020' }, { value: '0755', text: '0755' }, { value: '021', text: '021' }] })); return e; })())));
