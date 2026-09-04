// ══════════════════════════════════════════════════════════════════
// verify-ticket-07.mjs — 票 07 面板 UI 升级单元门（node 直跑，无浏览器）
// 方法：config/countries/store/rules/detect/ui 六模块剥离 import/export 按依赖序
//   拼接 → new Function 装配（与 verify-ticket-02/05 同心智）。i18n 不入 bundle
//   （单元路径不调用 t）；UI 的 DOM 交互路径由 e2e（tests/rules-ui.spec.ts）承担，
//   本门锁定：偏好持久化与低调分流 / matchingOverrides 纯逻辑 / 负反馈幂等与
//   冲突清理 / 规则删除恢复注入 / 豁免开关与恢复 / main.ts 静态接线契约。
// 覆盖（issue 验收映射）：S1→验收1（可配置）S3→验收2（写入+幂等）S4→验收2/3
//   （引擎侧即时生效与删除恢复）S5→验收2（豁免）S6→接线契约；S0 为 02/05 回归烟测。
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-07.mjs
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
    .replace(/^declare\s+function[\s\S]*?;\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

// ── GM mock：内存桶（与 verify-ticket-05 同款） ──
const BUCKET = Object.create(null);
globalThis.GM_getValue = (k, d) => (k in BUCKET ? BUCKET[k] : d);
globalThis.GM_setValue = (k, v) => { BUCKET[k] = v; };
globalThis.GM_addValueChangeListener = () => 1;
globalThis.BroadcastChannel = class BC {
  constructor() {}
  addEventListener() {}
  postMessage() {}
  close() {}
};

const bundle = [
  toModuleBody(join(ROOT, 'src', 'config.ts')),
  toModuleBody(join(ROOT, 'src', 'data', 'countries.ts')),
  toModuleBody(join(ROOT, 'src', 'store', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'rules', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'detect', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'ui', 'index.ts')),
  '\n;return { createStore, createRules, createDetect, createUI, matchingOverrides, COUNTRIES, ISO2_MAP, UI_PREFS_KEY };',
].join('\n');
const { createStore, createRules, createDetect, createUI, matchingOverrides, UI_PREFS_KEY } = new Function(bundle)();

// ── 测试脚手架 ──
let pass = 0; const fails = [];
function ok(cond, name) { if (cond) { pass++; } else { fails.push(name); console.log('FAIL', name); } }
function eq(a, b, name) { ok(a === b, name + ' | got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }
function setLoc(href) {
  const h = String(href);
  const hn = h.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
  globalThis.location = { href: h, hostname: hn };
}
const DOC = { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] };
globalThis.document = DOC;

class El {
  constructor(tag, props = {}) {
    this.tagName = String(tag).toUpperCase();
    this._id = props.id || '';
    this._name = props.name || '';
    this._cls = props.cls || '';
    this.attrs = props.attrs || {};
    this.options = props.options || null;
    this.ancestors = [];
    this.disabled = false; this.readOnly = false;
    this.ownerDocument = DOC;
  }
  get id() { return this._id; }
  get className() { return this._cls; }
  getAttribute(n) {
    if (n === 'name') return this._name || null;
    if (n === 'id') return this._id || null;
    if (n === 'class') return this._cls || null;
    return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null;
  }
  closest(sel) {
    if (sel.startsWith('.')) { const c = sel.slice(1); return this.ancestors.find(a => String(a._cls || '').split(/\s+/).includes(c)) || null; }
    if (sel.startsWith('#')) { const i = sel.slice(1); return this.ancestors.find(a => a._id === i) || null; }
    if (sel === 'form') return this.ancestors.find(a => a.tagName === 'FORM') || null;
    if (sel === 'label') return this.ancestors.find(a => a.tagName === 'LABEL') || null;
    return null;
  }
  matches(sel) {
    sel = String(sel || '').trim();
    const m = /^([a-z]+)?(?:#([\w-]+))?(?:\.([\w-]+))?(?:\[name=["']?([\w-]+)["']?\])?$/.exec(sel);
    if (!m || (!m[1] && !m[2] && !m[3] && !m[4])) return false;
    if (m[1] && this.tagName.toLowerCase() !== m[1]) return false;
    if (m[2] && this._id !== m[2]) return false;
    if (m[3] && !String(this._cls).split(/\s+/).includes(m[3])) return false;
    if (m[4] && this._name !== m[4]) return false;
    return true;
  }
  getRootNode() { return DOC; }
}
function mockUI() {
  return {
    attachCalls: [], detachCalls: [], lowCalls: [],
    attach(el, kind, tier, score) { this.attachCalls.push({ el, kind, tier, score }); },
    detach(el) { this.detachCalls.push({ el }); },
    rememberLow(el, kind, score) { this.lowCalls.push({ el, kind, score }); },
    _pruneLow() {},
  };
}
// 只把 els 交给第一组选择器收集（避免同元素被 4 组选择器重复处理）
function scanWith(det, els) {
  let first = true;
  const orig = det._collect;
  det._collect = () => { if (first) { first = false; return els; } return []; };
  try { det.scan(DOC); } finally { det._collect = orig; }
}
const DIAL_CODES = ['+86','+852','+853','+886','+81','+82','+44','+1','+49','+33','+39','+34','+61','+7','+55','+91','+62','+60','+65','+66','+84','+63','+90','+27','+20'];

// ══ S0 引擎回归烟测（02/05 语义未被本票破坏） ══
{
  setLoc('https://smoke.test/');
  const Store = createStore(); Store.init();
  const Rules = createRules(Store);
  const Det = createDetect(mockUI(), Rules);
  const good = new El('SELECT', { id: 'g1', name: 'country_code' });
  good.options = DIAL_CODES.map(c => ({ value: c, text: c }));
  const res = Det.scoreElement(good);
  eq(res.tier, 'auto', 'S0 正例 auto');
  const bad = new El('SELECT', { id: 'b1', name: 'province' });
  bad.options = [{ value: 'a', text: 'A' }, { value: 'b', text: 'B' }];
  eq(Det.scoreElement(bad).tier, 'none', 'S0 负例 none');
}

// ══ S1 UI 偏好：默认/损坏回退/持久化/低调分流（验收1 可配置） ══
{
  delete BUCKET[UI_PREFS_KEY];
  setLoc('https://prefs.test/');
  const UI1 = createUI({}, { Fill: null, Rules: null });
  eq(UI1.prefs().lowkeyMode, 'dim', 'S1 默认 dim');
  BUCKET[UI_PREFS_KEY] = JSON.stringify({ version: 1, lowkeyMode: 'nonsense' });
  const UI2 = createUI({}, { Fill: null, Rules: null });
  eq(UI2.prefs().lowkeyMode, 'dim', 'S1 损坏值回退 dim');
  UI2.setPref('lowkeyMode', 'hidden');
  eq(JSON.parse(BUCKET[UI_PREFS_KEY]).lowkeyMode, 'hidden', 'S1 setPref 落 GM 桶');
  eq(UI2.prefs().lowkeyMode, 'hidden', 'S1 偏好即时生效');
  const el = new El('INPUT', { id: 'm1', name: 'areacode' });
  UI2.attach(el, 'input', 'lowkey', 56, []);
  eq(UI2._lowFields.size, 1, 'S1 hidden 分流：lowkey 不注入转召唤登记');
  eq(UI2._lowFields.get(el).kind, 'input', 'S1 登记含 kind');
  const UI3 = createUI({}, { Fill: null, Rules: null });
  eq(UI3.prefs().lowkeyMode, 'hidden', 'S1 重实例读回偏好（刷新持久语义）');
}

// ══ S2 matchingOverrides 纯逻辑（负反馈幂等/冲突清理的判定核） ══
{
  const el = new El('INPUT', { id: 'fbx', name: 'cc' });
  const ovs = [
    { selector: '#fbx', action: { tier: 'none' } },
    { selector: 'input[name="cc"]', action: { tier: 'auto' } },
    { selector: '##bad[', action: { tier: 'lowkey' } },
    { selector: '', action: { tier: 'auto' } },
    null,
  ];
  eq(matchingOverrides(el, ovs).length, 2, 'S2 命中 2 条（非法/空选择器跳过）');
  eq(matchingOverrides(null, ovs).length, 0, 'S2 空元素安全');
  eq(matchingOverrides(el, 'nope').length, 0, 'S2 非数组安全');
  eq(matchingOverrides(el, ovs)[0].action.tier, 'none', 'S2 保序返回副本引用');
}

// ══ S3 负反馈语义（验收2 写入 + 幂等 + 冲突清理） ══
{
  setLoc('https://fb.test/page');
  const Store = createStore(); Store.init();
  const Rules = createRules(Store);
  const el = new El('INPUT', { id: 'fbx' });
  const id = Rules.rememberNone(el);
  ok(typeof id === 'string' && id, 'S3 rememberNone 返回 id');
  const pov = Rules.pageOverrides();
  eq(pov.length, 1, 'S3 规则落盘 1 条');
  eq(pov[0].action.tier, 'none', 'S3 tier=none');
  eq(pov[0].note, 'panel-negative-feedback', 'S3 note=panel-negative-feedback');
  eq(pov[0].selector, '#fbx', 'S3 按 id 生成选择器');
  eq(matchingOverrides(el, Rules.pageOverrides()).length, 1, 'S3 幂等判定：none 已命中 → UI 不重复写');
  eq(Rules.forcedTier(el), 'none', 'S3 评分前命中 none');
  // 冲突清理：同页 auto 强制规则压在负反馈前 → UI 先删后写，后到意图优先
  const el2 = new El('INPUT', { id: 'conf' });
  Rules.upsertOverride({ host: 'fb.test', selector: '#conf', action: { tier: 'auto' } });
  const hit2 = matchingOverrides(el2, Rules.pageOverrides());
  eq(hit2.length, 1, 'S3 auto 规则命中目标');
  ok(Rules.removeOverride(hit2[0].id) === true, 'S3 UI 删除冲突规则');
  ok(!!Rules.rememberNone(el2), 'S3 重写 none');
  eq(Rules.forcedTier(el2), 'none', 'S3 后到意图优先：none 压过 auto');
}

// ══ S4 引擎侧即时生效与删除恢复（验收2/3 的检测接线） ══
{
  setLoc('https://det.test/');
  const Store = createStore(); Store.init();
  const Rules = createRules(Store);
  const mUI = mockUI();
  const Det = createDetect(mUI, Rules);
  const sel = new El('SELECT', { id: 'cc-strong', name: 'country_code' });
  sel.options = DIAL_CODES.map(c => ({ value: c, text: c }));
  scanWith(Det, [sel]);
  eq(mUI.attachCalls.length, 1, 'S4 无规则 → auto 注入');
  eq(mUI.attachCalls[0].tier, 'auto', 'S4 注入档位 auto');
  ok(!!Rules.rememberNone(sel), 'S4 写入负反馈规则');
  scanWith(Det, [sel]);
  eq(mUI.attachCalls.length, 1, 'S4 规则命中后不再注入（抑制生效，重扫即可无需刷新）');
  ok(Rules.removeOverride(Rules.listRules().overrides[0].id) === true, 'S4 删除规则');
  scanWith(Det, [sel]);
  eq(mUI.attachCalls.length, 2, 'S4 删除后重扫恢复注入');
  eq(mUI.attachCalls[1].tier, 'auto', 'S4 恢复注入档位 auto');
}

// ══ S5 豁免开关与恢复（验收2 全站维度） ══
{
  setLoc('https://ex.test/');
  const Store = createStore(); Store.init();
  const Rules = createRules(Store);
  const mUI = mockUI();
  const Det = createDetect(mUI, Rules);
  const sel = new El('SELECT', { id: 'ccx', name: 'country_code' });
  sel.options = DIAL_CODES.map(c => ({ value: c, text: c }));
  scanWith(Det, [sel]);
  eq(mUI.attachCalls.length, 1, 'S5 基线注入');
  Rules.setExempt('https://ex.test/x', true);
  eq(Rules.isPageExcluded(), true, 'S5 当前页豁免判定');
  scanWith(Det, [sel]);
  eq(mUI.attachCalls.length, 1, 'S5 豁免后 scan 入口短路（无新注入）');
  Rules.setExempt('https://ex.test/x', false);
  eq(Rules.isPageExcluded(), false, 'S5 豁免解除');
  scanWith(Det, [sel]);
  ok(mUI.attachCalls.length >= 2, 'S5 解除后重扫恢复（自愈补挂）');
}

// ══ S6 静态接线契约（node 无法执行 main.ts IIFE；以源码断言钉死接线） ══
{
  const main = readFileSync(join(ROOT, 'src', 'main.ts'), 'utf8');
  const ui = readFileSync(join(ROOT, 'src', 'ui', 'index.ts'), 'utf8');
  const i18n = readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8');
  for (const f of ['deps.Rules = Rules', 'UI.detachAll', 'Detect.scheduleScan', 'GM_registerMenuCommand']) {
    ok(main.includes(f), 'S6 main.ts 含 ' + f);
  }
  for (const f of ['cch-fb', 'cch-rules-view', 'cch-rules-tg', 'cch-exempt-tg', 'cch-lowkey-tg',
    'lowkeyMode', '{ force: true }', 'detachAll', '_applyLowkeyMode', 'matchingOverrides',
    'rememberNone', 'panel-negative-feedback']) {
    ok(ui.includes(f), 'S6 ui/index.ts 含 ' + f);
  }
  const zhKeys = ["feedback:'这不是区号字段'", "rules:'站点规则'", "ruleExempt:'在本站禁用'",
    "rulesEmpty:'本站暂无规则'", "ruleDeleted:'已删除规则'", "lowkeyStyle:'低调样式（中置信）'"];
  const enKeys = ["feedback:'Not a country-code field'", "rules:'Site rules'", "ruleExempt:'Disable on this site'",
    "rulesEmpty:'No rules on this site'", "ruleDeleted:'Rule removed'", "lowkeyStyle:'Low-key style (mid-confidence)'"];
  for (const k of zhKeys) ok(i18n.includes(k), 'S6 i18n zh ' + k);
  for (const k of enKeys) ok(i18n.includes(k), 'S6 i18n en ' + k);
  ok(i18n.includes('ruleNoneRemembered') && i18n.includes('ruleExemptAdded') && i18n.includes('ruleExemptRemoved'), 'S6 05 票三键仍在');
  const cfg = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
  ok(cfg.includes('UI_PREFS_KEY') && cfg.includes('LOWKEY_MODES'), 'S6 config 常量');
}

console.log('total ' + (pass + fails.length) + ' | pass ' + pass + ' | fail ' + fails.length);
if (fails.length) { console.log('FAILED:', fails.join(' ; ')); process.exit(1); }
