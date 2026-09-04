// ══════════════════════════════════════════════════════════════════
// verify-ticket-05.mjs — 票 05 站点规则引擎单元门（node 直跑，无浏览器）
// 方法：config/store/rules/detect 四模块剥离 import/export 按依赖序拼接 →
//   new Function 装配（与 verify-ticket-02.mjs 同心智）。GM_* 用内存桶 mock；
//   BroadcastChannel 用进程内 mock 类（跨实例互投）模拟跨标签页。
// 覆盖：S0 02 票回归自证 / S1 持久化+刷新+跨标签页（issue 验收1）/
//   S2 引擎语义（豁免/强制/覆盖 + 自身 UI 防护，验收2/3）/ S3 检测入口接线 /
//   S4 数据格式契约 + CRUD 边界（验收4 的可执行部分）
// 用法：node .scratch/architecture-recovery/research/scripts/verify-ticket-05.mjs
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

// ── GM mock：内存桶 + 监听器登记（远端触发用） ──
const BUCKET = Object.create(null);
const LISTENERS = [];
globalThis.GM_getValue = (k, d) => (k in BUCKET ? BUCKET[k] : d);
globalThis.GM_setValue = (k, v) => { BUCKET[k] = v; };
globalThis.GM_addValueChangeListener = (k, fn) => { LISTENERS.push({ k, fn }); return LISTENERS.length; };
// ── BroadcastChannel mock：进程内多实例互投（跨标签页语义） ──
class BC {
  constructor(name) { this.name = name; BC.all.push(this); this._handlers = []; }
  addEventListener(_t, fn) { this._handlers.push(fn); }
  postMessage(msg) { for (const inst of BC.all) { if (inst !== this) for (const fn of inst._handlers) fn({ data: msg }); } }
  close() {}
}
BC.all = [];
globalThis.BroadcastChannel = BC;

const bundle = [
  toModuleBody(join(ROOT, 'src', 'config.ts')),
  toModuleBody(join(ROOT, 'src', 'data', 'countries.ts')),
  toModuleBody(join(ROOT, 'src', 'store', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'rules', 'index.ts')),
  toModuleBody(join(ROOT, 'src', 'detect', 'index.ts')),
  '\n;return { createStore, createRules, createDetect, COUNTRIES, ISO2_MAP };',
].join('\n');
const { createStore, createRules, createDetect } = new Function(bundle)();

// ── 测试脚手架 ──
let pass = 0; const fails = [];
function ok(cond, name) { if (cond) { pass++; } else { fails.push(name); console.log('FAIL', name); } }
function eq(a, b, name) { ok(a === b, name + ' | got=' + JSON.stringify(a) + ' want=' + JSON.stringify(b)); }
const tick = () => new Promise(r => setTimeout(r, 10));
function setLoc(href) {
  const h = String(href);
  const hn = h.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0];
  globalThis.location = { href: h, hostname: hn };
}
const DOC = { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] };

class El {
  constructor(tag, props = {}) {
    this.tagName = String(tag).toUpperCase();
    this.attrs = props.attrs || {};
    this._id = props.id || '';
    this._cls = props.cls || '';
    this._name = props.name || '';
    this.options = props.options || null;
    this.ancestors = [];
    this.disabled = false; this.readOnly = false;
    this.ownerDocument = DOC;
  }
  get id() { return this._id; }
  get className() { return this._cls; }
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
function scanRoot(els) {
  return {
    host: null,
    querySelectorAll(sel) {
      if (sel === '*') return els;
      if (sel === 'select') return els.filter(e => e.tagName === 'SELECT');
      if (sel.indexOf('input') === 0) return els.filter(e => e.tagName === 'INPUT');
      return [];
    },
  };
}
function freshRules() {
  const Store = createStore();
  Store.init();
  return { Store, Rules: createRules(Store) };
}

// ── helpers（拼接段）──
const RULES_KEY_A = 'cch_site_rules_v1';
function MSG_KEYS() {
  const body = toModuleBody(join(ROOT, 'src', 'i18n.ts'))
    .replace(/^export const LANG[^\n]*$/m, 'const LANG = "zh";');
  const fn = new Function(body + '\n;return { zh: MSG.zh, en: MSG.en };')();
  return fn.zh;
}

// ══════════════════════════════════════════════════════════════════
// S0 — 02 票回归自证（验收脚本先对已知好样本干跑 [WORKFLOW §5 教训]）
// ══════════════════════════════════════════════════════════════════
async function S0() {
  console.log('── S0 02 票回归自证 ──');
  setLoc('https://plain.example.com/page');
  const { Rules } = freshRules();
  eq(Rules.isPageExcluded(), false, 'S0 无规则页不豁免');
  const kw = new El('SELECT', { name: 'country-code', options: [{ value: '+86', text: 'China (+86)' }, { value: '+81', text: 'Japan (+81)' }] });
  const det = createDetect(mockUI(), Rules);
  det.scan(scanRoot([kw]));
  ok(!!det._state.get(kw), 'S0 空规则时 02 评分引擎照常工作（kw select 进状态）');
  ok(det._state.get(kw).tier === 'auto' || det._state.get(kw).tier === 'lowkey',
    'S0 区号 select 判档非 none（02 引擎语义保留）');
  // 单参签名向后兼容（verify-ticket-02.mjs 调用形态）
  const det1 = createDetect(mockUI());
  det1.scan(scanRoot([kw]));
  ok(!!det1._state.get(kw), 'S0 createDetect(UI) 单参兼容');
}

// ══════════════════════════════════════════════════════════════════
// S1 — 规则持久化 / 刷新生效 / 跨标签页同步（issue 验收1）
// ══════════════════════════════════════════════════════════════════
async function S1() {
  console.log('── S1 持久化 / 刷新 / 跨标签页 ──');
  // 写入 → GM 桶内有独立键
  const a = freshRules();
  ok(a.Rules.setExempt('example.com', true), 'S1 setExempt 成功');
  const id = a.Rules.upsertOverride({ host: 'example.com', selector: '#phone-cc', action: { tier: 'auto' } });
  ok(!!id, 'S1 upsertOverride 返回 id');
  ok(typeof BUCKET[RULES_KEY_A] === 'string', 'S1 GM 桶出现规则键');
  const doc = JSON.parse(BUCKET[RULES_KEY_A]);
  eq(doc.version, 1, 'S1 文档 version=1');
  eq(doc.exempt[0], 'example.com', 'S1 豁免域名落盘（归一化小写）');
  eq(doc.overrides[0].selector, '#phone-cc', 'S1 覆盖规则落盘');
  ok(doc.overrides[0].id === id, 'S1 id 主键一致');
  ok(doc.overrides[0].createdAt > 0 && doc.overrides[0].updatedAt >= doc.overrides[0].createdAt, 'S1 timestamps 落盘');

  // 幂等与删改
  a.Rules.setExempt('example.com', true);
  eq(JSON.parse(BUCKET[RULES_KEY_A]).exempt.length, 1, 'S1 豁免幂等');
  a.Rules.setExempt('example.com', false);
  eq(JSON.parse(BUCKET[RULES_KEY_A]).exempt.length, 0, 'S1 豁免关闭');
  a.Rules.upsertOverride({ id, host: 'example.com', selector: '#phone-cc', action: { tier: 'lowkey' } });
  eq(JSON.parse(BUCKET[RULES_KEY_A]).overrides.find(o => o.id === id).action.tier, 'lowkey', 'S1 按 id 更新 action');
  eq(JSON.parse(BUCKET[RULES_KEY_A]).overrides.length, 1, 'S1 更新不产生新规则');
  ok(a.Rules.removeOverride(id), 'S1 removeOverride true');
  ok(!a.Rules.removeOverride(id), 'S1 removeOverride 不存在 id → false');

  // 域名归一与点边界：大写裸域名归一小写；豁免 example.com → www 子域命中、负例不误命中
  a.Rules.setExempt('Example.COM', true);
  ok(JSON.parse(BUCKET[RULES_KEY_A]).exempt.includes('example.com'), 'S1 host 归一化小写落盘');
  ok(a.Rules.isExempt('https://www.example.com/x'), 'S1 子域点边界命中 www.example.com');
  ok(a.Rules.isExempt('example.com'), 'S1 裸域名命中');
  ok(!a.Rules.isExempt('https://notexample.com/'), 'S1 非点边界不误命中 notexample.com');
  ok(!a.Rules.isExempt('https://evil.example.com.evil.io/'), 'S1 后缀拼接不误命中');
  setLoc('https://www.example.com/x');
  ok(a.Store.isExempt(location.href), 'S1 location.href 命中');

  // 刷新（新 Store 实例重读 GM）
  const b = createStore();
  ok(b.isExempt('https://www.example.com/x'), 'S1 刷新后豁免仍生效（GM 重读）');

  // 跨标签页 ① GM_addValueChangeListener 远端路径：模拟另一标签页直写 GM 桶 + remote 触发
  const gmInst = createStore(); gmInst.init();
  const gmRecs = LISTENERS.filter(l => l.k === RULES_KEY_A);
  const gmRec = gmRecs[gmRecs.length - 1];
  ok(!!gmRec, 'S1 规则键远端监听器已注册');
  BUCKET[RULES_KEY_A] = JSON.stringify({ version: 1, exempt: ['gm.example.com'], overrides: [], global: null });
  gmRec.fn(RULES_KEY_A, null, BUCKET[RULES_KEY_A], true);
  ok(gmInst.isExempt('https://gm.example.com/'), 'S1 GM 远端变更即时生效（跨标签页）');

  // 跨标签页 ② BroadcastChannel 广播路径
  const bcInst = createStore(); bcInst.init();
  a.Rules.setExempt('bc.example.com', true);
  await tick();
  ok(bcInst.isExempt('https://bc.example.com/'), 'S1 BroadcastChannel 广播同步（跨标签页）');

  // 外部写坏数据 → 防御性规范化不崩（每次用新实例读，绕过缓存）
  BUCKET[RULES_KEY_A] = '{bad json';
  eq(createStore().getSiteRules().version, 1, 'S1 坏 JSON 回退默认文档');
  BUCKET[RULES_KEY_A] = JSON.stringify({ version: 2, exempt: ['x'], overrides: [] });
  eq(createStore().getSiteRules().version, 1, 'S1 未知 version 回退默认文档');
  BUCKET[RULES_KEY_A] = JSON.stringify({ version: 1, exempt: ['ok.com', 42, ''], overrides: [{ id: 'r1', host: 'h.com', selector: ' ', action: { tier: 'nope' } }] });
  const d3 = createStore();
  const norm = d3.getSiteRules();
  eq(JSON.stringify(norm.exempt), JSON.stringify(['ok.com']), 'S1 exempt 过滤非字符串/空');
  eq(norm.overrides.length, 0, 'S1 overrides 过滤空选择器/非法 tier');
  ok(d3.isExempt('https://ok.com/'), 'S1 规范化后判定可用');
}

// ══════════════════════════════════════════════════════════════════
// S2 — 引擎语义：强制选择器 / 分档覆盖 / 自身 UI 不生效（issue 验收2/3）
// ══════════════════════════════════════════════════════════════════
async function S2() {
  console.log('── S2 引擎语义 ──');
  setLoc('https://rules.example.com/page');
  const { Store, Rules } = freshRules();
  const idCC = Rules.upsertOverride({ host: 'rules.example.com', selector: 'input[name="cc"]', action: { tier: 'auto' }, note: 'force' });
  const hit = new El('input', { name: 'cc', attrs: { type: 'text' } });
  eq(Rules.forcedTier(hit), 'auto', 'S2 强制选择器命中 → 规则档');
  eq(Rules.forcedTier(new El('input', { name: 'other' })), null, 'S2 未命中 → null');

  // 自身 UI 永不命中（验收3）
  const ownEl = new El('input', { name: 'cc' });
  ownEl.ancestors = [{ _id: 'cch-root', _cls: '', tagName: 'DIV' }];
  eq(Rules.forcedTier(ownEl), null, 'S2 #cch-root 内元素永不命中');
  const ownBtn = new El('button', { cls: 'cch-btn' });
  eq(Rules.forcedTier(ownBtn), null, 'S2 .cch-btn 自身元素不命中');
  eq(Rules.forcedTier(null), null, 'S2 非法元素 → null');

  // 分档覆盖（页面级；KeePassXC Site Preferences 心智）：auto/lowkey 参与覆盖，none 走豁免
  // 先移除元素级规则，避免与页面级覆盖相互污染
  ok(Rules.removeOverride(idCC), 'S2 移除元素级规则');
  const idT = Rules.upsertOverride({ host: 'rules.example.com', selector: 'body', action: { tier: 'lowkey' } });
  eq(Rules.pageTierOverride(), 'lowkey', 'S2 页面级 lowkey 覆盖生效');
  ok(Rules.removeOverride(idT), 'S2 removeOverride true');
  eq(Rules.pageTierOverride(), null, 'S2 移除后无覆盖');
  Rules.upsertOverride({ host: 'rules.example.com', selector: 'body', action: { tier: 'none' } });
  eq(Rules.pageTierOverride(), null, 'S2 none 覆盖不参与分档覆盖');
  ok(!Rules.isPageExcluded(), 'S2 none 覆盖 ≠ 域名豁免（完全跳过仅属豁免）');
  Store.setExempt('rules.example.com', true);
  ok(Rules.isPageExcluded(), 'S2 域名豁免 → isPageExcluded');
  Store.setExempt('rules.example.com', false);

  // rememberNone 负反馈便捷入口（spec US9）：id / name / tag 三态选择器
  const negId = Rules.rememberNone(new El('select', { id: 'cc-sel' }));
  const saved = Store.getSiteRules().overrides.find(o => o.id === negId);
  ok(saved && saved.action.tier === 'none' && saved.note === 'panel-negative-feedback', 'S2 负反馈 tier=none + note');
  eq(saved.selector, '#cc-sel', 'S2 id 选择器形态');
  const negId2 = Rules.rememberNone(new El('input', { name: 'phone-cc' }));
  eq(Store.getSiteRules().overrides.find(o => o.id === negId2).selector, 'input[name="phone-cc"]', 'S2 name 选择器形态');
  const negId3 = Rules.rememberNone(new El('textarea', {}));
  eq(Store.getSiteRules().overrides.find(o => o.id === negId3).selector, 'textarea', 'S2 tag 兜底形态');

  // 非法选择器静默不命中（不抛错污染检测主路径）
  Rules.upsertOverride({ host: 'rules.example.com', selector: '##bad[', action: { tier: 'auto' } });
  eq(Rules.forcedTier(new El('input', { name: 'zzz' })), null, 'S2 非法选择器静默不命中');

  // 自身元素不可负反馈登记（rememberNone 对自身 UI 返回 null 不落盘）
  const before = Store.getSiteRules().overrides.length;
  eq(Rules.rememberNone(ownEl), null, 'S2 自身 UI 不写规则');
  eq(Store.getSiteRules().overrides.length, before, 'S2 未新增规则');
}

// ══════════════════════════════════════════════════════════════════
// S3 — 检测入口接线：豁免=完全跳过 / 强制注入 / 分档覆盖 / 自身 UI（issue 验收2/3）
// ══════════════════════════════════════════════════════════════════
async function S3() {
  console.log('── S3 检测入口接线 ──');
  setLoc('https://wired.example.com/app');
  const { Store, Rules } = freshRules();
  const telSel = new El('SELECT', { id: 'plain-num', options: [{ value: '1', text: 'One' }, { value: '2', text: 'Two' }, { value: '3', text: 'Three' }] });
  const acSel = new El('SELECT', { attrs: { autocomplete: 'tel-country-code' }, options: [{ value: '+1', text: 'US' }, { value: '+86', text: 'CN' }] });
  const root = scanRoot([telSel, acSel]);
  // 每阶段独立 Detect+UI（mock attach 不产生真实 wrapper，自愈补挂会跨扫描累积计数）
  const fresh = () => { const UI = mockUI(); return { UI, Det: createDetect(UI, Rules) }; };

  // 基线（无规则）：acSel 注入 auto；telSel 纯数字枚举不注入
  let r = fresh();
  r.Det.scan(root);
  eq(r.UI.attachCalls.length, 1, 'S3 无规则基线：仅 acSel 注入');
  eq(r.UI.attachCalls[0] && r.UI.attachCalls[0].tier, 'auto', 'S3 基线档位 auto');
  eq(r.UI.lowCalls.length, 0, 'S3 基线：纯数字枚举不登记召唤');

  // 豁免 = 完全跳过检测（scan 入口短路：不注入不登记；验收2①）
  Store.setExempt('wired.example.com', true);
  r = fresh();
  r.Det.scan(root);
  eq(r.UI.attachCalls.length, 0, 'S3 豁免后 scan 完全跳过');
  eq(r.UI.lowCalls.length, 0, 'S3 豁免后不登记召唤');
  Store.setExempt('wired.example.com', false);
  r = fresh();
  r.Det.scan(root);
  eq(r.UI.attachCalls.length, 1, 'S3 解除豁免恢复注入');

  // 强制选择器按高置信注入引擎本不注入的元素（验收2②）
  const idF = Rules.upsertOverride({ host: 'wired.example.com', selector: '#plain-num', action: { tier: 'auto' } });
  r = fresh();
  r.Det.scan(scanRoot([telSel]));
  const forcedCall = r.UI.attachCalls.find(c => c.el === telSel);
  ok(!!forcedCall, 'S3 强制选择器命中元素被注入');
  eq(forcedCall && forcedCall.tier, 'auto', 'S3 强制注入档位 = 规则声明档');

  // 强制 none：负反馈字段不注入也不登记召唤（按 id 更新该规则）
  Rules.upsertOverride({ id: idF, host: 'wired.example.com', selector: '#plain-num', action: { tier: 'none' }, note: 'panel-negative-feedback' });
  r = fresh();
  r.Det.scan(scanRoot([telSel]));
  eq(r.UI.attachCalls.length, 0, 'S3 强制 none 不注入');
  eq(r.UI.lowCalls.length, 0, 'S3 强制 none 不登记召唤');

  // 分档覆盖：页面级规则把引擎 auto 压成 lowkey（验收2③）
  Rules.upsertOverride({ host: 'wired.example.com', selector: 'body', action: { tier: 'lowkey' } });
  const acSel2 = new El('SELECT', { attrs: { autocomplete: 'tel-country-code' }, options: [{ value: '+1', text: 'US' }, { value: '+86', text: 'CN' }] });
  r = fresh();
  r.Det.scan(scanRoot([acSel2]));
  eq(r.UI.attachCalls.length, 1, 'S3 覆盖规则下 acSel 仍注入');
  eq(r.UI.attachCalls[0] && r.UI.attachCalls[0].tier, 'lowkey', 'S3 引擎 auto 被页面规则压成 lowkey');

  // 分档覆盖反向：lowkey 提到 auto（覆盖双向生效）
  const lowRule = Rules.pageOverrides().find(o => o.action.tier === 'lowkey');
  ok(Rules.removeOverride(lowRule.id), 'S3 移除 lowkey 覆盖');
  Rules.upsertOverride({ host: 'wired.example.com', selector: 'body', action: { tier: 'auto' } });
  const lowSel = new El('SELECT', { name: 'cc-2', options: [{ value: '+44', text: 'UK (+44)' }, { value: '+33', text: 'FR (+33)' }] });
  r = fresh();
  r.Det.scan(scanRoot([lowSel]));
  const c4 = r.UI.attachCalls.find(c => c.el === lowSel);
  ok(!!c4, 'S3 低分字段在 auto 覆盖下注入');
  eq(c4 && c4.tier, 'auto', 'S3 覆盖提升档位 auto');

  // 自身 UI：规则不对面板元素产生任何效果（验收3）
  Rules.upsertOverride({ host: 'wired.example.com', selector: '#cch-si', action: { tier: 'auto' } });
  const ownSearch = new El('input', { id: 'cch-si', attrs: { type: 'text' } });
  ownSearch.ancestors = [{ _id: 'cch-root', _cls: '', tagName: 'DIV' }];
  r = fresh();
  r.Det.scan(scanRoot([ownSearch]));
  eq(r.UI.attachCalls.length, 0, 'S3 自身 UI 元素不被规则注入');
  eq(r.UI.lowCalls.length, 0, 'S3 自身 UI 元素不登记');
}

// ══════════════════════════════════════════════════════════════════
// S4 — 数据格式契约 + CRUD 边界（issue 验收4 的可执行部分）
// ══════════════════════════════════════════════════════════════════
async function S4() {
  console.log('── S4 格式契约 + CRUD 边界 ──');
  setLoc('https://fmt.example.com/');
  const { Store, Rules } = freshRules();
  // 非法输入拒绝且不落盘
  const n0 = Store.getSiteRules().overrides.length;
  eq(Rules.upsertOverride(null), null, 'S4 null 输入 → null');
  eq(Rules.upsertOverride({ host: '', selector: '#a', action: { tier: 'auto' } }), null, 'S4 空 host → null');
  eq(Rules.upsertOverride({ host: 'fmt.example.com', selector: '  ', action: { tier: 'auto' } }), null, 'S4 空 selector → null');
  eq(Rules.upsertOverride({ host: 'fmt.example.com', selector: '#a', action: { tier: 'wat' } }), null, 'S4 非法 tier → null');
  eq(Store.getSiteRules().overrides.length, n0, 'S4 非法输入不落盘');
  // 副本隔离：改返回对象不影响存储
  const snap = Store.getSiteRules();
  snap.overrides.push({ id: 'fake', host: 'x', selector: '#x', action: { tier: 'auto' }, note: '', createdAt: 0, updatedAt: 0 });
  eq(Store.getSiteRules().overrides.length, n0, 'S4 getSiteRules 返回副本（外部改不渗入）');
  // 规则上限防御
  for (let i = 0; i < 505; i++) {
    Store.upsertOverride({ host: 'bulk.example.com', selector: '#s' + i, action: { tier: 'none' } });
  }
  ok(Store.getSiteRules().overrides.length <= 500, 'S4 RULES_MAX_OVERRIDES 上限生效（got=' + Store.getSiteRules().overrides.length + '）');
  // i18n 负反馈三键存在（供 07 票 UI 消费）
  ok(typeof MSG_KEYS().ruleNoneRemembered === 'string', 'S4 i18n ruleNoneRemembered 存在');
  ok(typeof MSG_KEYS().ruleExemptAdded === 'string', 'S4 i18n ruleExemptAdded 存在');
  ok(typeof MSG_KEYS().ruleExemptRemoved === 'string', 'S4 i18n ruleExemptRemoved 存在');
}

// ══════════════════════════════════════════════════════════════════
const groups = [['S0', S0], ['S1', S1], ['S2', S2], ['S3', S3], ['S4', S4]];
(async () => {
  const only = process.argv[2] || '';
  for (const [name, fn] of groups) {
    if (only && name !== only) continue;
    await fn();
  }
  const total = pass + fails.length;
  console.log('═'.repeat(50));
  console.log('ticket-05 单元门: ' + pass + '/' + total + ' pass' + (fails.length ? ' | FAIL=' + fails.length : ' | ALL GREEN'));
  process.exit(fails.length ? 1 : 0);
})();
