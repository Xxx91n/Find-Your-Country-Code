// ══════════════════════════════════════════════════════════════════
// verify-ticket-04.mjs — 票 04 引擎级验证门（node 直跑，无浏览器）
// 方法：同 verify-ticket-02（剥离 import/export 按依赖序拼接 → new Function 装配）。
// 覆盖：_deepRoots open shadow 穿透（含嵌套两层）/ _collect 跨根查询 /
//   _fingerprint 指纹构成 / _process 指纹重评双向纠正（attach→detach→attach、
//   漏挂→补上、disabled 撤挂→补回）/ 指纹未变跳过 / iti kind 保持。
// 路由 hook 与防抖语义由 E2E 归因用例覆盖（rescan.e2e.spec.ts，需真实浏览器 API）。
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-04.mjs  （-v 打明细）
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
const verbose = process.argv.includes('-v');

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
  '\n;return { createDetect, COUNTRIES };',
].join('\n');
const { createDetect, COUNTRIES } = new Function(bundle)();

// node 无 DOM 全局；引擎 ownerDocument 兜底链末端引用 document —— 提供空实现替身
globalThis.document = { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] };

// ── mock DOM ──
function makeOpt(value, text) { return { value, text: text || value, getAttribute: () => null }; }
function matchesSel(el, sel) {
  // 只需覆盖 detect 用到的选择器形态：* / tag / .class / .iti input / tag[attr=...] 等
  const tag = sel === '*' ? '' : sel.split(/[.\[\s:]/)[0].toLowerCase();
  if (tag && el.tagName.toLowerCase() !== tag) return false;
  const cls = sel.match(/\.([A-Za-z0-9_-]+)/);
  if (cls && !(el._classes || []).includes(cls[1])) return false;
  return true;
}
function makeEl(tag, props = {}) {
  const el = {
    tagName: tag.toUpperCase(),
    attrs: props.attrs || {},
    _id: props.id || '',
    _classes: (props.className || '').split(/\s+/).filter(Boolean),
    options: (props.options || []).map(o => typeof o === 'string' ? makeOpt(o) : o),
    disabled: props.disabled || false,
    readOnly: props.readOnly || false,
    shadowRoot: props.shadowRoot || null,
    children: props.children || [],
    host: props.host || null,
    nodeType: props.nodeType || 1,
    dataset: props.dataset || {},
    ownerDocument: null,
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
    get id() { return this._id; },
    get className() { return this._classes.join(' '); },
    closest(sel) {
      if (!sel) return null;
      if (sel.startsWith('.')) { const c = sel.slice(1); return this._classes.includes(c) ? this : null; }
      if (sel.startsWith('#')) { const i = sel.slice(1); return this._id === i ? this : null; }
      return this.tagName.toLowerCase() === sel.toLowerCase() ? this : null;
    },
    getRootNode() { return this._root || null; },
    querySelectorAll(sel) {
      const out = [];
      const walk = n => { for (const c of n.children || []) { if (matchesSel(c, sel)) out.push(c); walk(c); if (c.shadowRoot) walk(c.shadowRoot); } };
      walk(this);
      return out;
    },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
  };
  for (const c of el.children) c.parent = el;
  return el;
}
function connect(rootEl, doc) { // 给树挂 _root（getRootNode 语义）
  const walk = n => { n._root = doc; for (const c of n.children || []) walk(c); if (n.shadowRoot) { n.shadowRoot._root = n.shadowRoot; walk(n.shadowRoot); } };
  walk(rootEl);
}

const UI = {
  attachCalls: [], detachCalls: [], lowCalls: [],
  attach(el, kind, tier, score) { this.attachCalls.push({ id: el._id, kind, tier }); },
  detach(el) { this.detachCalls.push({ id: el._id }); },
  rememberLow(el, kind, score) { this.lowCalls.push({ id: el._id, kind, score }); },
};
const Detect = createDetect(UI);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' | got: ' + JSON.stringify(extra) : '')); }
}

// ═══ A 组：shadow DOM 穿透 ═══
console.log('A 组：open shadowRoot 穿透');
const innerSel = makeEl('select', { id: 'inner-code', attrs: { name: 'country_code' }, options: ['+86', '+1', '+44', '+81'] });
const innerLabel = makeEl('label', { id: 'inner-lb', children: [] });
innerLabel.attrs.for = 'inner-code';
const innerHost = makeEl('div', { id: 'inner-host', children: [innerLabel, innerSel] });
const innerRoot = makeEl('#shadow-root', { nodeType: 11, host: innerHost, children: [innerLabel, innerSel] });
innerHost.shadowRoot = innerRoot;
const outerInput = makeEl('input', { id: 'outer-code', attrs: { name: 'phone_code' } });
const outerHost = makeEl('div', { id: 'outer-host', children: [innerHost, outerInput] });
const outerRoot = makeEl('#shadow-root', { nodeType: 11, host: outerHost, children: [innerHost, outerInput] });
outerHost.shadowRoot = outerRoot;
const telAnchor = makeEl('input', { id: 'anchor', attrs: { type: 'tel', name: 'phone' } });
const body = makeEl('body', { children: [telAnchor, outerHost] });
connect(body, { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] });

const roots = Detect._deepRoots(body);
check('A1 穿透收集 [body, outer shadow, inner shadow]', roots.length === 3, roots.length);
const selAll = Detect._collect(roots, 'select');
check('A2 跨根查询命中嵌套两层 select', selAll.some(e => e._id === 'inner-code'), selAll.map(e => e._id));
check('A3 outer shadow 内 input 同样命中', Detect._collect(roots, 'input').some(e => e._id === 'outer-code'));
const deepSel = selAll.find(e => e._id === 'inner-code');
Detect.scan(body);
check('A4 shadow 内 select 评分后 attach（有 tel 锚 → auto）', UI.attachCalls.some(c => c.id === 'inner-code'), UI.attachCalls);

// ═══ B 组：指纹重评双向纠正 ═══
console.log('B 组：指纹重评（双向）');
const sel = makeEl('select', { id: 'reuse-sel', attrs: { name: 'country_code' }, options: ['+86', '+1', '+44', '+81'] });
const wrap = makeEl('div', { className: 'cch-wrapper', children: [sel] });
sel.parent = wrap; sel._classes = [];
sel.closest = s => s === '.cch-wrapper' ? wrap : null;
wrap.querySelector = () => ({ getAttribute: () => 'auto' });
const body2 = makeEl('body', { children: [telAnchor, wrap] });
connect(body2, { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] });
UI.attachCalls = []; UI.detachCalls = [];
Detect.scan(body2);
check('B1 初始 attach（含档位/detach 重挂路径）', UI.attachCalls.some(c => c.id === 'reuse-sel'), UI.attachCalls);
const nAttach1 = UI.attachCalls.length, nDetach1 = UI.detachCalls.length;
// 复用为月份枚举（换 name + options → 指纹必变 → none 档 → detach）
sel.attrs.name = 'valid_month';
sel.options = Array.from({ length: 12 }, (_, i) => makeOpt(String(i + 1), (i + 1) + ' 个月'));
Detect.scan(body2);
check('B2 误挂纠正：none 档触发 detach', UI.detachCalls.length > nDetach1 && UI.detachCalls.some(c => c.id === 'reuse-sel'), UI.detachCalls);
// 复用回区号字段 → 指纹再变 → 重新 attach
sel.attrs.name = 'country_code';
sel.options = ['+86', '+1', '+44', '+81'].map(v => makeOpt(v));
Detect.scan(body2);
check('B3 漏挂纠正：重新 attach', UI.attachCalls.length > nAttach1, UI.attachCalls);
const nAttach2 = UI.attachCalls.length, nDetach2 = UI.detachCalls.length;
// 指纹未变 → 跳过（无新增 attach/detach）
Detect.scan(body2);
check('B4 指纹未变跳过（等价旧 _done 短路）',
  UI.attachCalls.length === nAttach2 && UI.detachCalls.length === nDetach2,
  { attach: UI.attachCalls.length, detach: UI.detachCalls.length });
// disabled → detach；恢复 → attach
sel.disabled = true;
Detect.scan(body2);
check('B5 disabled 撤挂（指纹变化触发重评 → none → detach）', UI.detachCalls.length > nDetach2, UI.detachCalls.length);
sel.disabled = false;
Detect.scan(body2);
check('B6 重新启用补挂', UI.attachCalls.length > nAttach2, UI.attachCalls.length);

// ═══ C 组：iti kind 保持（重评路径不丢失适配层语义） ═══
console.log('C 组：iti kind 保持');
const itiInput = makeEl('input', { id: 'iti-phone', className: 'iti', attrs: { type: 'tel' } });
const body3 = makeEl('body', { children: [itiInput] });
connect(body3, { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] });
UI.attachCalls = [];
Detect.scan(body3);
const itiCall = UI.attachCalls.find(c => c.id === 'iti-phone');
check('C1 _isIti 命中 → kind=iti', itiCall && itiCall.kind === 'iti', UI.attachCalls);

// ═══ D 组：国家数据完整性（装配自检） ═══
console.log('D 组：装配自检');
check('D1 COUNTRIES 装载', COUNTRIES.length > 100, COUNTRIES.length);

console.log('\nRESULT: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
