#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-18.mjs — 票 18（伪 select 端到端识别与填充）验收门
// 覆盖 issue 18 验收项的程序化断言面（E2E 端到端由 verify-18.yml e2e job 承担）:
//   验收1 ARIA 语义层接入评分: 两形态识别 + 内容验证沿用 L3 口径 + 否决组 + 误报防线同等生效
//         （含 41 例既有语料回归 mismatch=0 —— 伪层对既有语料零扰动）
//   验收2 填充策略: 可编辑型隐藏承值 input 原生 setter+事件 / select-only listbox 点击选值
//   验收5 ADR-0005 裁决=实现（非缓议）; 检查点二 口径复用静态落点
// 装载: 引擎束（config+countries+detect, createDetect 注入记录型 UI）+ 填充束
//   （i18n+iti-adapter+fill），零构建；与 verify-ticket-02/13 同心智。
// ══════════════════════════════════════════════════════════════════════
import { loadManifest, bundleEngine, runCorpus, metrics } from './14-lib-engine.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..', '..', '..');
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; failures.push(name + (detail ? ' :: ' + detail : '')); console.log('FAIL ' + name + (detail ? ' :: ' + detail : '')); }
}
function toModuleBody(src) {
  return src
    .replace(/^import[\s\S]*?from\s+'[^']*';\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

// ── 引擎束（createDetect 注入记录型 UI，_process 档位 cap/登记断言用）──
const engineBundle = [
  toModuleBody(readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8')),
  '\n;return { createDetect, COUNTRIES, ISO2_MAP, pseudoOptionStats };',
].join('\n');
const { createDetect, COUNTRIES, pseudoOptionStats } = new Function(engineBundle)();

// ── 填充束（真实 fill 模块；Node 20 无 navigator/window 全局，verify-13 同口径 stub）──
const fillBundle = [
  'if (typeof navigator === "undefined") { try { globalThis.navigator = { language: "zh-CN" }; } catch {} }',
  'if (typeof window === "undefined") { try { globalThis.window = undefined; } catch {} }',
  toModuleBody(readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'iti-adapter', 'index.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8')),
  '\n;return { createFill };',
].join('\n');
const { createFill } = new Function(fillBundle)();

// ── combobox mock DOM（鸭子类型面: getAttribute/getRootNode/querySelectorAll/textContent/
//    events/click; ownerDocument 注入避开 Node 无 document 的 L2 兜底引用）──
function makeNode(tag, attrs, children, text) {
  return {
    tagName: String(tag).toUpperCase(),
    attrs: attrs || {},
    children: children || [],
    textContent: text || '',
    value: '',
    disabled: false,
    readOnly: false,
    events: [],
    clicked: false,
    parentElement: null,
    ownerDocument: { querySelectorAll: function () { return []; }, getElementById: function () { return null; }, defaultView: undefined },
    form: null,
    root: null,
    get id() { return this.attrs.id || ''; },
    get className() { return this.attrs.class || ''; },
    get type() { return this.attrs.type || null; },
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
    querySelectorAll(sel) {
      if (sel === '[role="option"]') return this.children.filter(function (c) { return c.getAttribute('role') === 'option'; });
      if (sel === 'input[name], select[name]') return this.children.filter(function (c) {
        return (c.tagName === 'INPUT' || c.tagName === 'SELECT') && c.getAttribute('name');
      });
      return [];
    },
    querySelector() { return null; },
    getElementById(id) { return (this.root && this.root.byId && this.root.byId[id]) || null; },
    closest() { return null; },
    click() { this.clicked = true; },
    focus() {},
    dispatchEvent(ev) { this.events.push(ev.type); return true; },
    getRootNode() { return this.root || this; },
  };
}
// root registry: 触发器 getRootNode() 返回带 getElementById 的 root（shadow/文档解引用面）
function withRoot(el, registry) {
  el.root = { byId: registry, getElementById: function (id) { return registry[id] || null; }, querySelector: function () { return null; } };
  return el;
}
function dialOptions() {
  return [
    makeNode('LI', { role: 'option', 'data-value': 'US', 'aria-selected': 'true' }, [], 'United States (+1)'),
    makeNode('LI', { role: 'option', 'data-value': 'CA' }, [], 'Canada (+1)'),
    makeNode('LI', { role: 'option', 'data-value': 'GB' }, [], 'United Kingdom (+44)'),
    makeNode('LI', { role: 'option', 'data-value': 'CN' }, [], 'China (+86)'),
  ];
}
const CA = { code: '+1', iso: 'CA', flag: 'x', country: '加拿大', countryEn: 'Canada' };

// ══ 1. select-only 型（MUI 结构）: 评分 + ADR cap + 登记 ══
{
  const labelNode = makeNode('LABEL', {}, [], 'Country code');
  const lb = makeNode('UL', { role: 'listbox', id: 'mui-lb' }, dialOptions());
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-haspopup': 'listbox',
      'aria-controls': 'mui-lb', 'aria-labelledby': 'cc-label', id: 'cc-mui', class: 'MuiSelect-select' }, [], 'United States (+1)'),
    { 'mui-lb': lb, 'cc-label': labelNode });
  const res = createDetect({ attach() {}, rememberLow() {}, summon() {} }, null).scoreElement(trig);
  check('1.1 select-only 结构命中(pseudo=true)', res.pseudo === true);
  check('1.2 结构信号 pseudo:combobox', res.signals.some(function (s) { return s.name === 'pseudo:combobox'; }));
  check('1.3 内容验证沿用 L3 口径(country-identity 信号)', res.signals.some(function (s) { return s.name === 'pseudo:opts:country-identity'; }));
  check('1.4 高置信可登记(score>=25)', res.score >= 25, 'score=' + res.score);

  const calls = { attach: [], rememberLow: [] };
  const Det = createDetect({
    attach: function () { calls.attach.push(Array.prototype.slice.call(arguments)); },
    rememberLow: function () { calls.rememberLow.push(Array.prototype.slice.call(arguments)); },
    summon() {}, _pruneLow() {},
  }, null);
  Det._process(trig);
  // rememberLow(el, kind, score, signals): 被调用本身即 tier=none（none 分支专属）；
  // score>=25 证明登记线口径生效，gate 信号留痕在 signals
  check('1.5 ADR-0005 档位 cap: none 分支登记 + gate 留痕', calls.rememberLow.length === 1 &&
    calls.rememberLow[0][2] >= 25 &&
    calls.rememberLow[0][3].some(function (s) { return s.name === 'gate:adr-0005-register-only'; }));
  check('1.6 登记 kind=pseudo', calls.rememberLow.length === 1 && calls.rememberLow[0][1] === 'pseudo');
  check('1.7 不自动注入图标(attach 未调用)', calls.attach.length === 0);
}

// ══ 2. 可编辑型（react-select 结构）: 评分 + 登记 ══
{
  const lb = makeNode('DIV', { role: 'listbox', id: 'rs-lb' }, dialOptions());
  const trig = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false', 'aria-haspopup': 'true',
      'aria-controls': 'rs-lb', 'aria-autocomplete': 'list', id: 'rs-input', autocomplete: 'off' }, [], ''),
    { 'rs-lb': lb });
  const calls = { attach: [], rememberLow: [] };
  const Det = createDetect({
    attach: function () { calls.attach.push(Array.prototype.slice.call(arguments)); },
    rememberLow: function () { calls.rememberLow.push(Array.prototype.slice.call(arguments)); },
    summon() {}, _pruneLow() {},
  }, null);
  Det._process(trig);
  check('2.1 可编辑型识别(pseudo 登记)', calls.rememberLow.length === 1 && calls.rememberLow[0][1] === 'pseudo');
  check('2.2 aria-autocomplete=list + 国家选项不触发 veto', calls.rememberLow.length === 1);
  check('2.3 不自动注入(ADR 档位)', calls.attach.length === 0);
}

// ══ 3. 否决组: 搜索型 typeahead ══
{
  const lb = makeNode('DIV', { role: 'listbox', id: 'search-lb' }, [
    makeNode('DIV', { role: 'option' }, [], 'apple pie'),
    makeNode('DIV', { role: 'option' }, [], 'banana split'),
    makeNode('DIV', { role: 'option' }, [], 'cherry tart'),
    makeNode('DIV', { role: 'option' }, [], 'durian shake'),
  ]);
  const trig = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'search-lb', 'aria-autocomplete': 'list', id: 'site-search' }, [], ''),
    { 'search-lb': lb });
  const Det = createDetect({ attach() {}, rememberLow() {}, summon() {}, _pruneLow() {} }, null);
  const res = Det.scoreElement(trig);
  check('3.1 veto: score=0', res.score === 0 && res.tier === 'none');
  check('3.2 veto 信号留痕', res.signals.some(function (s) { return s.name === 'pseudo:veto:search-typeahead'; }));
  check('3.3 veto 不作 pseudo 候选', res.pseudo !== true);
  const calls = { rememberLow: [] };
  const Det2 = createDetect({ attach() {}, rememberLow: function () { calls.rememberLow.push(arguments); }, summon() {}, _pruneLow() {} }, null);
  Det2._process(trig);
  check('3.4 搜索型不进登记面', calls.rememberLow.length === 0);
}

// ══ 4. antd 形态: type=search+readonly+combobox 豁免类型/只读闸门 + aria-owns 解引用 ══
{
  const lb = makeNode('DIV', { role: 'listbox', id: 'country_list' }, [
    makeNode('DIV', { role: 'option', 'aria-label': 'United States' }, [], 'US'),
    makeNode('DIV', { role: 'option', 'aria-label': 'Canada' }, [], 'CA'),
    makeNode('DIV', { role: 'option', 'aria-label': 'United Kingdom' }, [], 'GB'),
    makeNode('DIV', { role: 'option', 'aria-label': 'China' }, [], 'CN'),
  ]);
  const trig = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'search', readonly: '', 'aria-expanded': '',
      'aria-haspopup': 'listbox', 'aria-owns': 'country_list', 'aria-autocomplete': 'list',
      id: 'country', class: 'ant-select-selection-search-input' }, [], ''),
    { country_list: lb });
  trig.readOnly = true; // antd 触发器 readOnly 属性为真（observed）
  const calls = { attach: [], rememberLow: [] };
  const Det = createDetect({
    attach: function () { calls.attach.push(Array.prototype.slice.call(arguments)); },
    rememberLow: function () { calls.rememberLow.push(Array.prototype.slice.call(arguments)); },
    summon() {}, _pruneLow() {},
  }, null);
  Det._process(trig);
  check('4.1 antd 形态不被类型/只读闸门误杀(登记命中)', calls.rememberLow.length === 1 && calls.rememberLow[0][1] === 'pseudo');
  // antd 选项文本=ISO2、国名在 aria-label（17 票 observed）→ 双面互证 isoName=4/4
  check('4.2 antd 选项 aria-label 国名互证入 L3(isoName=4/4)',
    pseudoOptionStats(lb.children).isoName === 4,
    'isoName=' + pseudoOptionStats(lb.children).isoName);
  check('4.3 isoName 证据入账(score>=25)', calls.rememberLow.length === 1 && calls.rememberLow[0][2] >= 25,
    'score=' + (calls.rememberLow[0] ? calls.rememberLow[0][2] : 'n/a'));
}

// ══ 5. aria-hidden 承值 input 硬排除（防承值面混入登记） ══
{
  const carrier = makeNode('INPUT', { type: 'text', name: 'country', 'aria-hidden': 'true' }, [], '');
  const Det = createDetect({ attach() {}, rememberLow() {}, summon() {}, _pruneLow() {} }, null);
  const res = Det.scoreElement(carrier);
  check('5.1 aria-hidden input gate', res.score === 0 && res.signals.some(function (s) { return s.name === 'gate:aria-hidden'; }));
}

// ══ 6. 既有 41 例语料回归（伪层零扰动） ══
{
  const manifest = loadManifest();
  const Detect = bundleEngine(null).Detect;
  const results = runCorpus(manifest, Detect);
  const m = metrics(results, manifest);
  check('6.1 语料 mismatch=0', m.mismatches.length === 0, m.mismatches.join(','));
  check('6.2 precision=1.0 recall=1.0', m.precision === 1 && m.recall === 1,
    'precision=' + m.precision + ' recall=' + m.recall);
  check('6.3 语料规模 41 例', m.cases === 41, 'cases=' + m.cases);
}

// ══ 7. 填充策略（issue 验收2）══
{
  const Fill = createFill({ toast() {} });
  // 7a 可编辑型: 隐藏承值 input 原生 setter + input/change/blur 事件
  const form = makeNode('FORM', { id: 'rs-form' }, [], '');
  const carrier = makeNode('INPUT', { type: 'hidden', name: 'country' }, [], '');
  const trig = makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
    'aria-controls': 'rs-lb', 'aria-autocomplete': 'list' }, [], '');
  form.children = [trig, carrier];
  trig.form = form;
  const okA = await Fill.fillPseudo(trig, CA);
  check('7a.1 可编辑型承值写入 ISO2', okA === true && carrier.value === 'CA', 'value=' + carrier.value);
  check('7a.2 事件序列 input/change/blur', ['input', 'change', 'blur'].every(function (t) { return carrier.events.includes(t); }),
    carrier.events.join(','));
  // 7b 承值现值为 ISO2 形态（MUI observed US→CA 同象）→ 覆写
  const carrier2 = makeNode('INPUT', { type: 'text', name: 'country', 'aria-hidden': 'true' }, [], '');
  carrier2.value = 'US';
  const trigB = makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false' }, [], '');
  const wrapB = makeNode('DIV', {}, [trigB, carrier2], '');
  trigB.form = wrapB;
  await Fill.fillPseudo(trigB, CA);
  check('7b MUI 形态承值 US→CA 覆写', carrier2.value === 'CA', 'value=' + carrier2.value);
  // 7c select-only: listbox 点击选值
  const lb = makeNode('UL', { role: 'listbox', id: 'mui-lb' }, dialOptions());
  const trigC = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'mui-lb' }, [], 'United States (+1)'),
    { 'mui-lb': lb });
  const okC = await Fill.fillPseudo(trigC, CA);
  check('7c.1 select-only 点击选值命中 CA option', okC === true);
  check('7c.2 CA option 被 click', lb.children.some(function (o) { return o.clicked && o.getAttribute('data-value') === 'CA'; }));
  // 7d 无 listbox 无承值 → 键盘回退失败安全返回 false（不抛错）
  const trigD = makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'nope' }, [], '');
  withRoot(trigD, {});
  const okD = await Fill.fillPseudo(trigD, CA);
  check('7d 键盘回退失败安全 false', okD === false);
}

// ══ 8. 静态落点（检查点一/二 + 扫描面） ══
{
  const det = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
  const cfg = readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8');
  const fil = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
  const ui = readFileSync(join(ROOT, 'src', 'ui', 'index.ts'), 'utf8');
  check('8.1 扫描面含 [role=combobox]', det.includes("'[role=\"combobox\"]',"));
  check('8.2 ADR 档位 cap 留痕', det.includes('gate:adr-0005-register-only'));
  check('8.3 指纹含 aria-expanded(开合重评)', det.includes("el.getAttribute('aria-expanded')"));
  check('8.4 结构常量入 config 单一来源', cfg.includes('ARIA_COMBO_STRUCT_SCORE = 20'));
  check('8.5 fill 双形态分发(fillPseudo+keys)', fil.includes('fillPseudo(el, country) {') && fil.includes('_pseudoFillByKeys'));
  check('8.6 Fill.run 伪 select 分支', fil.includes("kind === 'pseudo'"));
  check('8.7 ui lowkey 迁移 kind=pseudo', ui.includes("combobox') ? 'pseudo'"));
  check('8.8 verify-18.yml 存在', existsSync(join(ROOT, '.github', 'workflows', 'verify-18.yml')));
}

console.log('-----------------------------');
console.log('verify-ticket-18: ' + pass + ' PASS, ' + fail + ' FAIL');
if (failures.length) { console.log('FAILURES:'); failures.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
