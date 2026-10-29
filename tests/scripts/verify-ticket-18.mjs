#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-18.mjs — 票 18（伪 select 端到端识别与填充）验收门
// 覆盖 issue 18 验收项的程序化断言面（E2E 端到端由 e2e.yml 统一承担；票级门挂接见 8.8）:
//   验收1 ARIA 语义层接入评分: 两形态识别 + 内容验证沿用 L3 口径 + 否决组 + 误报防线同等生效
//         （含既有语料回归 mismatch=0，规模动态计数 >=41 —— 伪层对既有语料零扰动）
//   验收2 填充策略: 可编辑型隐藏承值 input 原生 setter+事件 / select-only listbox 点击选值
//   验收5 伪 select 裁决=实现（非缓议）; 检查点二 口径复用静态落点
//   #3 / spec #42 追加 9.：登记门（纯国家选择器两形态都不调登记 / 含 (+NN) 仍登记 /
//         强关键字豁免 / 判定记录 reason 取国家语义工具门）
//   #45 追加 9.27–9.35：国家语义证据面补「选项文本恰为国家名」（本地化国名的原生 select /
//         只有国名的 ARIA combobox），并锁住证据面只加国名、不放宽区号面
// 装载: 引擎束（config+countries+detect, createDetect 注入记录型 UI）+ 填充束
//   （i18n+iti-adapter+fill），零构建；与 verify-ticket-02/13 同心智。
// ══════════════════════════════════════════════════════════════════════
import { loadManifest, bundleEngine, runCorpus, metrics } from './14-lib-engine.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
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

// 票 36（A-014）装载修复：函数束须先剥 TS 标注再 new Function（14-lib-engine 同口径），
// 否则 cch-23 起 SyntaxError。Node >= 22.13（module.stripTypeScriptTypes）。
function stripTypes(src) {
  if (typeof stripTypeScriptTypes !== 'function') {
    throw new Error('verify-ticket-18 需要 Node >= 22.13（module.stripTypeScriptTypes）；CI 已钉 node-version 22');
  }
  return stripTypeScriptTypes(src, { mode: 'strip' });
}

// ── 引擎束（createDetect 注入记录型 UI，_process 档位 cap/登记断言用）──
const engineBundle = [
  toModuleBody(readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8')),
].join('\n');
const { createDetect, COUNTRIES, pseudoOptionStats, DIAG_REASON } =
  new Function(stripTypes(engineBundle) + '\n;return { createDetect, COUNTRIES, ISO2_MAP, pseudoOptionStats, DIAG_REASON };')();

// ── 填充束（真实 fill 模块；Node 20 无 navigator/window 全局，verify-13 同口径 stub）──
const fillBundle = [
  'if (typeof navigator === "undefined") { try { globalThis.navigator = { language: "zh-CN" }; } catch {} }',
  'if (typeof window === "undefined") { try { globalThis.window = undefined; } catch {} }',
  toModuleBody(readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'iti-adapter', 'index.ts'), 'utf8')),
  // 票 03 [A-028]：fill 引用诊断面常量（DIAG_REASON/DIAG_POINT_PREFIX）——函数束须同装 config
  toModuleBody(readFileSync(join(ROOT, 'src', 'config.ts'), 'utf8')),
  toModuleBody(readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8')),
].join('\n');
const { createFill } = new Function(stripTypes(fillBundle) + '\n;return { createFill };')();

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
  check('1.5 伪 select 档位 cap: none 分支登记 + gate 留痕', calls.rememberLow.length === 1 &&
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
  // 检查点一「不误杀」的证据面 = 评分层：类型/只读/aria-hidden 闸门都没判死它，
  // pseudo 候选成立且 isoName 证据入账。（登记与否不由本形状决定——见 4.4）
  const res4 = Det.scoreElement(trig);
  check('4.1 antd 形态不被类型/aria-hidden 闸门误杀(pseudo 候选成立 + score>=25)',
    res4.pseudo === true && res4.score >= 25 &&
    !res4.signals.some(function (s) { return /^gate:(input-type|aria-hidden)/.test(s.name); }),
    'score=' + res4.score + ' :: ' + res4.signals.map(function (s) { return s.name; }).join(','));
  // antd 选项文本=ISO2、国名在 aria-label（17 票 observed）→ 双面互证 isoName=4/4
  check('4.2 antd 选项 aria-label 国名互证入 L3(isoName=4/4)',
    pseudoOptionStats(lb.children).isoName === 4,
    'isoName=' + pseudoOptionStats(lb.children).isoName);
  check('4.3 isoName 证据入账(country-identity 信号)',
    res4.signals.some(function (s) { return s.name === 'pseudo:opts:country-identity'; }),
    res4.signals.map(function (s) { return s.name; }).join(','));
  // #3 / spec #42：17 票 observed 的 antd 国家选择形态选项只有 ISO2 + 国名、零区号证据
  // ⇒ 纯国家选择器，退出召唤面（本例不是被闸门杀掉，而是被国家语义判定挡在登记之外）
  Det._process(trig);
  check('4.4 该形态按 #3 不登记召唤，且带国家语义阻断留痕',
    calls.rememberLow.length === 0 &&
    res4.signals.some(function (s) { return s.name === 'country-semantic:no-register'; }));
}

// ══ 5. aria-hidden 承值 input 硬排除（防承值面混入登记） ══
{
  const carrier = makeNode('INPUT', { type: 'text', name: 'country', 'aria-hidden': 'true' }, [], '');
  const Det = createDetect({ attach() {}, rememberLow() {}, summon() {}, _pruneLow() {} }, null);
  const res = Det.scoreElement(carrier);
  check('5.1 aria-hidden input gate', res.score === 0 && res.signals.some(function (s) { return s.name === 'gate:aria-hidden'; }));
}

// ══ 6. 既有语料回归（伪层零扰动；规模动态计数） ══
{
  const manifest = loadManifest();
  const Detect = bundleEngine(null).Detect;
  const results = runCorpus(manifest, Detect);
  const m = metrics(results, manifest);
  check('6.1 语料 mismatch=0', m.mismatches.length === 0, m.mismatches.join(','));
  check('6.2 precision=1.0 recall=1.0', m.precision === 1 && m.recall === 1,
    'precision=' + m.precision + ' recall=' + m.recall);
  check('6.3 语料规模 >=41 例（动态计数，appendOnly 只增不删）', m.cases >= 41, 'cases=' + m.cases);
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
  check('8.5 fill 双形态分发(fillPseudo+keys)', /fillPseudo\(el:\s*\w+,\s*country:\s*Country/.test(fil) && fil.includes('_pseudoFillByKeys'));
  check('8.6 Fill.run 伪 select 分支', fil.includes("kind === 'pseudo'"));
  check('8.7 ui lowkey 迁移 kind=pseudo', ui.includes("combobox') ? 'pseudo'"));
  // Cycle-7 D-004：票级 workflow 合并后，CI 挂接点 = 调用方 verify-tickets.yml 的 matrix + plan 的 '18' 条目
  const plan18 = JSON.parse(readFileSync(join(ROOT, 'tests', 'scripts', 'verify-ticket-plan.json'), 'utf8'));
  const caller18 = readFileSync(join(ROOT, '.github', 'workflows', 'verify-tickets.yml'), 'utf8');
  check('8.8 票 18 已挂接 CI（plan 条目 + 调用方 matrix）', !!plan18.tickets['18'] && caller18.includes("'18'"));
}

// ══ 9. 纯国家选择器退出召唤面（#3 / spec #42）══
// 登记由**分数**驱动：只把档位压成 none 的旧抑制请不出国家选择器，且伪 select 分支此前
// 完全没有该抑制。可失败性（红名单为实测，非推理）：
//   摘掉 noRegister 判定 → 4.4 / 9.1 / 9.3 / 9.8 / 9.10 / 9.13 / 9.14 / 9.15 / 9.18
//                                    / 9.25 / 9.26 转红；
//   去掉 reason 的 tier 守卫 → 9.19 转红；
//   去掉伪侧 textDial 反向证据 → 9.20 / 9.21 / 9.22 转红（#43 首轮返修，守 US11）；
//   去掉 tel-country-code 豁免 → 9.23 / 9.24 转红（#43 二轮返修，守 US5）；
//   去掉 countryName 证据（谓词的 (isoName + countryName) 退回只看 isoName） → 9.27 / 9.28 转红
//                                    （#45 返修：本地化国名 / 纯国名两形态）；
//   把 veto 的国家名命中退回零命中口径 → 9.29 转红（#45：纯国名 autocomplete 不冒充站内搜索）；
//   删掉 0 分信号留痕 → 9.1 / 9.8 / 4.4 转红（三者都把该信号写进断言条件，未实跑）。
// 真·口径 guard 与正例对照（上述四条变异都转不了它们的红，只证明阻断没有顺手改掉注入口径
// 与分数面）：9.2 / 9.4 / 9.6 / 9.7 / 9.9 / 9.11 / 9.12 / 9.16 / 9.17。
// 反向护栏另列——9.25（无区号 token 时照旧挡）与 9.26（country / country-name 不一起豁免）
// 对「摘掉判定」这条变异敏感、对「摘掉豁免」这条中性：它们锁的是**豁免没有再放宽**，
// 不是「与本修复无关」。#43 三轮审查指出本表曾把它们误归入上一条。
// 判定记录断在调用点——_register 的下游 UI.rememberLow 未被调用，reason 取自既有国家语义
// 工具门，不得是「只登记不注入」（那描述一个没发生的结果）。
function countryOptions() {
  return [
    makeNode('LI', { role: 'option', 'data-value': 'US' }, [], 'United States'),
    makeNode('LI', { role: 'option', 'data-value': 'GB' }, [], 'United Kingdom'),
    makeNode('LI', { role: 'option', 'data-value': 'CN' }, [], 'China'),
    makeNode('LI', { role: 'option', 'data-value': 'JP' }, [], 'Japan'),
  ];
}
function recordingDiag(records) {
  return {
    counter: function () {}, error: function () {}, info: function () {},
    warn: function (point, reason) { records.push({ point: point, reason: reason }); },
    trace: function (point, reason) { records.push({ point: point, reason: reason }); },
    traceOn: function () { return true; }, setTrace: function () { return true; },
    records: function () { return records; }, checks: function () { return []; },
    snapshot: function () { return { records: records }; }, text: function () { return ''; },
    clear: function () {},
  };
}
function registerProbe() {
  const calls = { attach: [], rememberLow: [] };
  const records = [];
  const Det = createDetect({
    attach: function () { calls.attach.push(Array.prototype.slice.call(arguments)); },
    rememberLow: function () { calls.rememberLow.push(Array.prototype.slice.call(arguments)); },
    detach() {}, summon() {}, _pruneLow() {},
  }, null, recordingDiag(records));
  return { Det: Det, calls: calls, records: records };
}
const sigNames = function (res) { return res.signals.map(function (s) { return s.name; }); };
const hasName = function (res, name) {
  return res.signals.some(function (s) { return s.name === name && s.pts === 0; });
};
const reasons = function (records) { return records.map(function (r) { return r.reason; }); };

// 9a 伪 select（ARIA combobox 形态）纯国家选择器：ISO2 值 + 国名文本、零区号证据
{
  const lb = makeNode('UL', { role: 'listbox', id: 'cty-lb' }, countryOptions());
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'cty-lb',
      id: 'cty-combo', class: 'MuiSelect-select' }, [], 'United States'),
    { 'cty-lb': lb });
  const p = registerProbe();
  const res = p.Det.scoreElement(trig);
  check('9.1 伪 select 分支同口径判定(noRegister + 0 分留痕)', res.noRegister === true &&
    hasName(res, 'country-semantic:no-register'), sigNames(res).join(','));
  check('9.2 分数与信号明细保留（不归零）', res.score >= 25 &&
    res.signals.some(function (s) { return s.name === 'pseudo:opts:country-identity'; }),
    'score=' + res.score);
  p.Det._process(trig);
  check('9.3 纯国家伪 select 不调用登记', p.calls.rememberLow.length === 0,
    'rememberLow=' + p.calls.rememberLow.length);
  check('9.4 注入口径 guard：纯国家伪 select 不注入图标（修复前后同为 0）', p.calls.attach.length === 0);
  check('9.5 reason 派生为既有国家语义工具门', reasons(p.records).indexOf(DIAG_REASON.TOOL_GATE_COUNTRY_SEMANTIC) >= 0,
    JSON.stringify(reasons(p.records)));
}

// 9b 同结构正例对照：选项含 (+NN) → 判定不成立、照常登记（修复不得过头）
{
  const lb = makeNode('UL', { role: 'listbox', id: 'dial-lb' }, dialOptions());
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'dial-lb',
      id: 'dial-combo', class: 'MuiSelect-select' }, [], 'United States (+1)'),
    { 'dial-lb': lb });
  const p = registerProbe();
  const res = p.Det.scoreElement(trig);
  check('9.6 含 (+NN) 的伪 select 不被国家语义阻断', res.noRegister !== true &&
    !hasName(res, 'country-semantic:no-register'), sigNames(res).join(','));
  p.Det._process(trig);
  check('9.7 含 (+NN) 的伪 select 仍登记(kind=pseudo)', p.calls.rememberLow.length === 1 &&
    p.calls.rememberLow[0][1] === 'pseudo', 'rememberLow=' + p.calls.rememberLow.length);
}

// 9c 原生 select 侧同口径（语料 F2 形态：name=country + ISO2 值 + 国名，44 分已过登记线）
{
  const sel = makeNode('SELECT', { name: 'country', id: 'cty-native' }, [], '');
  sel.options = [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' },
    { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }];
  const p = registerProbe();
  const res = p.Det.scoreElement(sel);
  check('9.8 原生侧判定与既有的档位压制同谓词', res.noRegister === true &&
    hasName(res, 'country-semantic:suppress') && hasName(res, 'country-semantic:no-register'),
    sigNames(res).join(','));
  check('9.9 原生侧分数保留（原 44 分不归零，仍 ≥ 登记线 25）', res.score >= 25, 'score=' + res.score);
  p.Det._process(sel);
  check('9.10 纯国家原生 select 不调用登记', p.calls.rememberLow.length === 0,
    'rememberLow=' + p.calls.rememberLow.length + ' reasons=' + JSON.stringify(reasons(p.records)));
  check('9.11 口径 guard：原生 reason 仍为国家语义工具门（修复前经 suppress 已同值）', reasons(p.records).indexOf(DIAG_REASON.TOOL_GATE_COUNTRY_SEMANTIC) >= 0,
    JSON.stringify(reasons(p.records)));
}

// 9d 最常见布局「国家选择器紧挨电话框」：主号锚把分数抬到 auto 档 —— 旧豁免
//    （tier!=='auto' 才抑制）在此漏网，档位上限随后又补上 gate:adr-0005-register-only
//    留痕。阻断登记不看档位，且 reason 必须压过该注入层留痕。
{
  const lb = makeNode('UL', { role: 'listbox', id: 'cty2-lb' }, countryOptions());
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'cty2-lb',
      id: 'cty2-combo', class: 'select-country' }, [], 'United States'),
    { 'cty2-lb': lb });
  // 同 form 主号锚（_process 走 ownerDocument 兜底扫描 input[type=tel]）
  trig.ownerDocument = { querySelectorAll: function () { return [{ tagName: 'INPUT' }]; },
    getElementById: function () { return null; }, defaultView: undefined };
  const p = registerProbe();
  const res = p.Det.scoreElement(trig, { anchorHasTel: true });
  check('9.12 有锚时纯国家选择器达 auto 档（旧豁免的漏网面）', res.tier === 'auto' && res.score >= 70,
    'score=' + res.score + ' tier=' + res.tier);
  check('9.13 auto 档不压档位，但照旧判 noRegister', res.noRegister === true &&
    !hasName(res, 'country-semantic:suppress'), sigNames(res).join(','));
  p.Det._process(trig);
  check('9.14 结算后被档位上限压成 none 也不登记', p.calls.rememberLow.length === 0 &&
    p.calls.attach.length === 0, 'rememberLow=' + p.calls.rememberLow.length);
  check('9.15 与 register-only 留痕共存时 reason 取国家语义阻断',
    reasons(p.records).indexOf(DIAG_REASON.TOOL_GATE_COUNTRY_SEMANTIC) >= 0 &&
    reasons(p.records).indexOf(DIAG_REASON.INJECT_GATE_REGISTER_ONLY) < 0,
    JSON.stringify(reasons(p.records)));
}

// 9e 强关键字是唯一逃生口：属性写着区号专名 → 不阻断（懒加载选项等合法字段不误伤）
{
  const lb = makeNode('UL', { role: 'listbox', id: 'kw-lb' }, countryOptions());
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'kw-lb',
      id: 'kw-combo', 'aria-label': 'Country code' }, [], 'United States'),
    { 'kw-lb': lb });
  const p = registerProbe();
  const res = p.Det.scoreElement(trig);
  check('9.16 强关键字豁免(不判 noRegister)', res.noRegister !== true &&
    res.signals.some(function (s) { return s.name === 'kw:strong'; }), sigNames(res).join(','));
  p.Det._process(trig);
  check('9.17 强关键字字段仍可登记召唤', p.calls.rememberLow.length === 1,
    'rememberLow=' + p.calls.rememberLow.length);
}

// 9f 判定成立但字段被**注入**（L0 autocomplete=country 抬到 auto 档）：注入口径本票不动，
//    判定记录也不得因此冒充国家语义门——一条消息只说一个原因（注入成功＝已识别）。
{
  const sel = makeNode('SELECT', { name: 'country', id: 'cty-l0', autocomplete: 'country' }, [], '');
  sel.options = [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' },
    { value: 'CN', text: 'China' }, { value: 'JP', text: 'Japan' }];
  const p = registerProbe();
  const res = p.Det.scoreElement(sel);
  check('9.18 auto 档纯国家 select 仍走注入（注入口径不变）', res.tier === 'auto' &&
    res.noRegister === true, 'score=' + res.score + ' tier=' + res.tier);
  p.Det._process(sel);
  check('9.19 注入成功时 reason 取「已识别」，不冒充国家语义门',
    p.calls.attach.length === 1 && p.calls.rememberLow.length === 0 &&
    reasons(p.records).every(function (r) { return r !== DIAG_REASON.TOOL_GATE_COUNTRY_SEMANTIC; }),
    'attach=' + p.calls.attach.length + ' reasons=' + JSON.stringify(reasons(p.records)));
}

// 9g #43 审查返修：伪 select 侧的裸 +NN 文本证据必须**可评估**，否则 #42 谓词第 4 条在伪侧
//    空转，把「带区号证据的伪 select」误判成纯国家并撤出召唤面——直接违反 US11「现有带
//    (+NN)/+NN 证据的伪 select 行为完全不变」。该证据只作反向证据，不进任何加分项。
{
  const lb = makeNode('UL', { role: 'listbox', id: 'bare-lb' }, [
    makeNode('LI', { role: 'option', 'data-value': 'US' }, [], 'United States +1'),
    makeNode('LI', { role: 'option', 'data-value': 'CA' }, [], 'Canada +1'),
    makeNode('LI', { role: 'option', 'data-value': 'GB' }, [], 'United Kingdom +44'),
    makeNode('LI', { role: 'option', 'data-value': 'CN' }, [], 'China +86'),
  ]);
  const trig = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'bare-lb',
      id: 'bare-combo', class: 'MuiSelect-select' }, [], 'United States +1'),
    { 'bare-lb': lb });
  check('9.20 伪侧裸 +NN 文本被计入反向证据(textDial>0 ⇒ 不判 noRegister)',
    pseudoOptionStats(lb.children).textDial === 4 &&
    pseudoOptionStats(lb.children).plusDial === 0 &&
    pseudoOptionStats(lb.children).parenDial === 0,
    JSON.stringify(pseudoOptionStats(lb.children)));
  const p = registerProbe();
  const res = p.Det.scoreElement(trig);
  check('9.21 该证据不抬分：L3 计分面仍只有 plus/paren/numeric/isoName（权重面未动）',
    res.score === 50 && !hasName(res, 'country-semantic:no-register'),
    'score=' + res.score + ' :: ' + sigNames(res).join(','));
  p.Det._process(trig);
  check('9.22 带区号证据的伪 select 仍登记（US11 不回归）',
    p.calls.rememberLow.length === 1 && p.calls.rememberLow[0][1] === 'pseudo' &&
    p.calls.attach.length === 0,
    'rememberLow=' + p.calls.rememberLow.length);
}

// 9h #43 二轮审查返修：L0 的 WHATWG 区号 token 也必须是逃生口。此前逃生口只看 L1 关键字，
//    于是 autocomplete="tel-country-code"（站点显式声明「这是国际区号」）的伪 select 被国家语义
//    挡出召唤面——本 PR 之前它凭 100 分照常登记（撞 US5「明确写着区号的字段仍可召唤」）。
//    同条带反向护栏：autocomplete 的 country / country-name 声明的是地址里的国家名，正是
//    「国家选择器」本身，不得一起豁免（故逃生口取 === 'tel-country-code'，不是 !!strong）。
function acTrigger(ac) {
  const lb = makeNode('UL', { role: 'listbox', id: 'ac-' + ac }, [
    makeNode('LI', { role: 'option', 'data-value': 'US' }, [], 'United States'),
    makeNode('LI', { role: 'option', 'data-value': 'GB' }, [], 'United Kingdom'),
    makeNode('LI', { role: 'option', 'data-value': 'CN' }, [], 'China'),
  ]);
  // 属性面刻意不含 country / dial 词根：让 autocomplete 成为唯一的区号语义来源
  const byId = {};
  byId['ac-' + ac] = lb;
  return withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'ac-' + ac, autocomplete: ac, id: 'sel-node', class: 'rs__input' }, [], ''),
    byId);
}
{
  const p = registerProbe();
  const res = p.Det.scoreElement(acTrigger('tel-country-code'));
  check('9.23 tel-country-code 豁免：不判 noRegister，分数与信号保留',
    res.noRegister !== true && res.score >= 100 &&
    !hasName(res, 'country-semantic:no-register'),
    'score=' + res.score + ' :: ' + sigNames(res).join(','));
  p.Det._process(acTrigger('tel-country-code'));
  check('9.24 tel-country-code 伪 select 仍登记（档位上限照旧不注入）',
    p.calls.rememberLow.length === 1 && p.calls.rememberLow[0][1] === 'pseudo' &&
    p.calls.attach.length === 0, 'rememberLow=' + p.calls.rememberLow.length);
  const pOff = registerProbe();
  pOff.Det._process(acTrigger('off'));
  check('9.25 没有区号 token 时照旧被挡（豁免未放宽到一般形态）',
    pOff.calls.rememberLow.length === 0, 'rememberLow=' + pOff.calls.rememberLow.length);
  const pCty = registerProbe();
  const resCountry = pCty.Det.scoreElement(acTrigger('country'));
  const resCName = pCty.Det.scoreElement(acTrigger('country-name'));
  check('9.26 country / country-name 不一起豁免（那两个 token 就是国家选择器）',
    resCountry.noRegister === true && resCName.noRegister === true,
    'country=' + resCountry.noRegister + ' country-name=' + resCName.noRegister);
}

// 9i #45：国家语义证据面不能只认「ISO2 ↔ 国名互证」。真实站点的纯国家选择器有两类拿不到
//    ISO2 线索：本地化国名的原生 select（值 ISO2、文本 CJK —— 旧 isoName 的拉丁字母正则把
//    CJK 直接排除）与只有国名的 ARIA combobox（无值域 ISO2）。两类都实测进过召唤面
//    （32 / 34 分），与 #3 的判据是同一缺口。取证：CLDR 推荐形态即 value=ISO2 + label=本地化
//    国名（atomcode 调研，2026-10-29）；MUI CountrySelect 的 renderOption 输出
//    `<li role=option>` + 国名文本。
//    反向护栏：证据面只放行「文本恰为国家名」，带任何区号证据的仍照旧不进国家语义判定。
{
  // (a) 原生：ISO2 值 + 中文国名，同 form tel 锚（issue #45 实测 32 分）
  const nativeLocalized = makeNode('SELECT', { name: 'country', id: 'cty-loc' }, [], '');
  nativeLocalized.options = [{ value: 'US', text: '美国' }, { value: 'GB', text: '英国' },
    { value: 'CN', text: '中国大陆' }, { value: 'JP', text: '日本' }];
  nativeLocalized.ownerDocument = { querySelectorAll: function () { return [{ tagName: 'INPUT' }]; },
    getElementById: function () { return null; }, defaultView: undefined };
  const pA = registerProbe();
  const resA = pA.Det.scoreElement(nativeLocalized, { anchorHasTel: true });
  check('9.27 本地化国名原生 select 判 noRegister（CJK 不因拉丁字母正则出局）',
    resA.noRegister === true && hasName(resA, 'country-semantic:no-register'),
    'score=' + resA.score + ' :: ' + sigNames(resA).join(','));
  check('9.28 该形态分数面未动（32 分原样保留，只改登记裁决）',
    resA.score === 32, 'score=' + resA.score);
  pA.Det._process(nativeLocalized);
  check('9.29 本地化国名原生 select 不调用登记',
    pA.calls.rememberLow.length === 0, 'rememberLow=' + pA.calls.rememberLow.length);

  // (d) ARIA combobox：选项只有国名，无 data-value / 无 ISO2 文本（issue #45 实测 34 分）
  const lbName = makeNode('UL', { role: 'listbox', id: 'nameonly-lb' }, [
    makeNode('LI', { role: 'option' }, [], 'United States'),
    makeNode('LI', { role: 'option' }, [], 'United Kingdom'),
    makeNode('LI', { role: 'option' }, [], 'China'),
    makeNode('LI', { role: 'option' }, [], 'Japan'),
  ]);
  const trigName = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'nameonly-lb', id: 'nameonly-combo', class: 'select-country' }, [], ''),
    { 'nameonly-lb': lbName });
  const pD = registerProbe();
  const resD = pD.Det.scoreElement(trigName);
  check('9.30 纯国名 ARIA combobox 判 noRegister',
    resD.noRegister === true && hasName(resD, 'country-semantic:no-register'),
    'score=' + resD.score + ' :: ' + sigNames(resD).join(','));
  check('9.31 该形态分数面未动（34 分原样保留，结构分 20 仍 < 登记线口径不变）',
    resD.score === 34, 'score=' + resD.score);
  pD.Det._process(trigName);
  check('9.32 纯国名 ARIA combobox 不调用登记',
    pD.calls.rememberLow.length === 0, 'rememberLow=' + pD.calls.rememberLow.length);

  // 反向护栏：国家名 + 括号区号 → 不进国家语义判定（国家名不足以覆盖区号证据）
  const lbDial = makeNode('UL', { role: 'listbox', id: 'namedial-lb' }, [
    makeNode('LI', { role: 'option' }, [], 'United States (+1)'),
    makeNode('LI', { role: 'option' }, [], 'United Kingdom (+44)'),
    makeNode('LI', { role: 'option' }, [], 'China (+86)'),
  ]);
  const trigDial = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'namedial-lb', id: 'namedial-combo', class: 'select-country' }, [], ''),
    { 'namedial-lb': lbDial });
  const pR = registerProbe();
  const resR = pR.Det.scoreElement(trigDial);
  check('9.33 国家名 + 括号区号仍不进国家语义判定（证据面只加国名，不放宽区号面）',
    resR.noRegister !== true, 'score=' + resR.score + ' :: ' + sigNames(resR).join(','));

  // 搜索型 veto 不得把纯国名 autocomplete 冒充站内搜索：reason 必须指向国家语义门
  const lbSearch = makeNode('UL', { role: 'listbox', id: 'ctysearch-lb' }, [
    makeNode('LI', { role: 'option' }, [], 'Germany'),
    makeNode('LI', { role: 'option' }, [], 'France'),
    makeNode('LI', { role: 'option' }, [], 'Japan'),
  ]);
  const trigSearch = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'ctysearch-lb', 'aria-autocomplete': 'list',
      id: 'ctysearch-combo', class: 'country-search' }, [], ''),
    { 'ctysearch-lb': lbSearch });
  const pS = registerProbe();
  const resS = pS.Det.scoreElement(trigSearch);
  check('9.34 纯国名 autocomplete 不被判为站内搜索 veto',
    !sigNames(resS).some(function (n) { return n.indexOf('pseudo:veto:') === 0; }),
    sigNames(resS).join(','));
  check('9.35 其 reason 指向国家语义门而非搜索 veto',
    resS.noRegister === true && pS.Det._reasonOf(resS) === DIAG_REASON.TOOL_GATE_COUNTRY_SEMANTIC,
    'noRegister=' + resS.noRegister + ' reason=' + pS.Det._reasonOf(resS));

  // 9.36–9.37 #45 审查返修（CodeRabbit PR #46，两条实测复现后修）：
  //   ① veto 的国家名免除门槛必须是**覆盖过半**，不是「命中一条即解除」——少数国名与
  //      城市/帮助混排的站点搜索（France / Paris / Help，1/3）若解除 veto，会退回按分数
  //      登记（34 >= 25）重新进召唤面，正是 veto 要挡的那类。
  //   ② 原生侧同一选项只计一次国家证据：英文名选项同时满足 isoName 与 countryName，
  //      重复计数把 2/5 虚增成 4/5 而误判 noRegister。
  const lbMix = makeNode('UL', { role: 'listbox', id: 'mix-lb' }, [
    makeNode('LI', { role: 'option' }, [], 'France'),
    makeNode('LI', { role: 'option' }, [], 'Paris'),
    makeNode('LI', { role: 'option' }, [], 'Help'),
  ]);
  const trigMix = withRoot(
    makeNode('INPUT', { role: 'combobox', type: 'text', 'aria-expanded': 'false',
      'aria-controls': 'mix-lb', 'aria-autocomplete': 'list',
      id: 'mix-combo', class: 'country-search' }, [], ''),
    { 'mix-lb': lbMix });
  const pMix = registerProbe();
  const resMix = pMix.Det.scoreElement(trigMix);
  check('9.36 少数国名命中不解除搜索 veto（France/Paris/Help 1/3 仍判站内搜索）',
    sigNames(resMix).some(function (n) { return n === 'pseudo:veto:search-typeahead'; }),
    sigNames(resMix).join(','));
  pMix.Det._process(trigMix);
  check('9.37 该形态不登记（veto 未被少数国名打开）',
    pMix.calls.rememberLow.length === 0, 'rememberLow=' + pMix.calls.rememberLow.length);

  // 构造要点：国家名恰为 2/5（低于谓词的 50% 门槛），分数 32（kw:country 14 + anchor:tel 18）
  // 已过登记线——重复计数会把分子虚增到 4/5 并判 noRegister，字段因此退出召唤面。
  // 非国名选项刻意取非数字、非区号的值，避免 plusDial 串入（否则国家名不再是唯一变量）。
  const selDouble = makeNode('SELECT', { name: 'country', id: 'double-count' }, [], '');
  selDouble.options = [{ value: 'US', text: 'United States' }, { value: 'GB', text: 'United Kingdom' },
    { value: 'a', text: 'Alpha' }, { value: 'b', text: 'Beta' }, { value: 'c', text: 'Gamma' }];
  // _process 不接受 ctx，锚靠 ownerDocument 兜底扫描发现——不喂这个输入，重算就掉到
  // 14 分（低于登记线），9.39 会因「压根没到登记线」而通过，变成抓不住缺陷的空断言。
  selDouble.ownerDocument = { querySelectorAll: function () { return [{ tagName: 'INPUT' }]; },
    getElementById: function () { return null; }, defaultView: undefined };
  const pDouble = registerProbe();
  const resDouble = pDouble.Det.scoreElement(selDouble, { anchorHasTel: true });
  check('9.38 原生侧同一选项只计一次国家证据（2/5 不虚增成 4/5）',
    resDouble.noRegister !== true && resDouble.score === 32,
    'score=' + resDouble.score + ' noRegister=' + resDouble.noRegister + ' :: ' + sigNames(resDouble).join(','));
  pDouble.Det._process(selDouble);
  check('9.39 该形态照常登记（重复计数会让它被误挡出召唤面）',
    pDouble.calls.rememberLow.length === 1, 'rememberLow=' + pDouble.calls.rememberLow.length);

  // 9.40–9.41 #45 三轮审查返修（CodeRabbit PR #46，diff 外意见，实测复现）：
  //   区号藏在选项**值**里（value="France +33" / text="France"）时，裸 +NN 扫描只看文本
  //   ⇒ countryName 计了国名却不记区号证据 ⇒ 有区号的下拉被当纯国家选择器挡出召唤面。
  //   对拍 main（47aea97）：同一构造 main 判 noReg=false 并登记 —— 这是本票引入的回归。
  //   修法只收窄国名证据的采集面（带区号令牌的选项不算国名），不扩计分面。
  const selDialValue = makeNode('SELECT', { name: 'country', id: 'dial-in-value' }, [], '');
  selDialValue.options = [{ value: 'France +33', text: 'France' },
    { value: 'Germany +49', text: 'Germany' }, { value: 'Spain +34', text: 'Spain' }];
  selDialValue.ownerDocument = { querySelectorAll: function () { return [{ tagName: 'INPUT' }]; },
    getElementById: function () { return null; }, defaultView: undefined };
  const pDialValue = registerProbe();
  const resDialValue = pDialValue.Det.scoreElement(selDialValue);
  check('9.40 区号藏在选项值里不判纯国家选择器（value="France +33"）',
    resDialValue.noRegister !== true,
    'score=' + resDialValue.score + ' noRegister=' + resDialValue.noRegister + ' :: ' + sigNames(resDialValue).join(','));
  pDialValue.Det._process(selDialValue);
  check('9.41 该形态照常登记（与 main 口径一致，回归已消除）',
    pDialValue.calls.rememberLow.length === 1, 'rememberLow=' + pDialValue.calls.rememberLow.length);

  // 伪侧同口径：data-value 里藏区号，文本只有国名
  const lbDialVal = makeNode('UL', { role: 'listbox', id: 'dv-lb' }, [
    makeNode('LI', { role: 'option', 'data-value': 'France +33' }, [], 'France'),
    makeNode('LI', { role: 'option', 'data-value': 'Germany +49' }, [], 'Germany'),
    makeNode('LI', { role: 'option', 'data-value': 'Spain +34' }, [], 'Spain'),
  ]);
  const trigDialVal = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'dv-lb',
      id: 'dv-combo', class: 'select-country' }, [], 'France'),
    { 'dv-lb': lbDialVal });
  const pDv = registerProbe();
  const resDv = pDv.Det.scoreElement(trigDialVal);
  check('9.42 伪侧同一口径：data-value 藏区号时不判纯国家选择器',
    resDv.noRegister !== true, 'score=' + resDv.score + ' :: ' + sigNames(resDv).join(','));
}

  // #45 形态 (e)：纯国名 ARIA combobox + tel 锚（52 分，本票表格里分数最高的漏网形态）。
  // 无锚的 (d) 由 9.30 锁；有锚这条单独锁——锚把分数抬过 SCORE_LOWKEY(35)，档位上限
  // 随后再压回 none，是最容易被「只看档位」的判定漏掉的一条。
  const lbAnchored = makeNode('UL', { role: 'listbox', id: 'anchored-lb' }, [
    makeNode('LI', { role: 'option' }, [], 'China'),
    makeNode('LI', { role: 'option' }, [], 'United States'),
    makeNode('LI', { role: 'option' }, [], 'Japan'),
  ]);
  const trigAnchored = withRoot(
    makeNode('DIV', { role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'anchored-lb',
      id: 'anchored-combo', class: 'select-country' }, [], 'China'),
    { 'anchored-lb': lbAnchored });
  // _process 不接受 ctx，锚靠 ownerDocument 兜底扫描发现（src/detect/index.ts 的 L2 锚段）。
  // 不喂这个输入，_process 重算只有 34 分（走不到 52 那条路），9.44 就成了空断言——
  // 「没登记」只是因为没到那条路径，而不是被 noRegister 拦住。
  // 注意用 withRoot 保留 root：listbox 解引用走 getRootNode()，不能被子树查找覆盖。
  trigAnchored.ownerDocument = {
    querySelectorAll: function (sel) {
      return sel === 'input[type="tel"]' ? [makeNode('INPUT', { type: 'tel' })] : [];
    },
    getElementById: function () { return null; },
    defaultView: undefined,
  };
  const pAnch = registerProbe();
  // 用 _process 单次驱动（而非 scoreElement + _process 两次），断言的就是真实结算路径
  pAnch.Det._process(trigAnchored);
  const stAnch = pAnch.Det._state.get(trigAnchored);
  check('9.43 纯国名 ARIA combobox + tel 锚走 52 分结算路径且判 noRegister',
    !!stAnch && stAnch.score === 52 &&
    (stAnch.signals || []).some(function (s) { return s.name === 'country-semantic:no-register'; }),
    'score=' + (stAnch && stAnch.score) + ' tier=' + (stAnch && stAnch.tier) +
    ' :: ' + ((stAnch && stAnch.signals) || []).map(function (s) { return s.name; }).join(','));
  check('9.44 该形态不调用登记（有锚不等于可召唤）',
    pAnch.calls.rememberLow.length === 0, 'rememberLow=' + pAnch.calls.rememberLow.length);

console.log('-----------------------------');
console.log('verify-ticket-18: ' + pass + ' PASS, ' + fail + ' FAIL');
if (failures.length) { console.log('FAILURES:'); failures.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
