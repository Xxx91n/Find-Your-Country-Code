// ══════════════════════════════════════════════════════════════════
// verify-ticket-29.mjs — 票 29（A-003 扫描候选集扩展）票级回归门
// 覆盖：无 ARIA 手写自定义下拉（div/span 触发器 + ul/ol>li 选项面板）
//   ① 候选集扩展（形态描述符，禁止裸 ul li / 全 div 扫描）
//   ② 结构启发式候选仍走 scoreElement 全瀑布 + 内容证据门槛
//   ③ ADR-0005 档位上限（登记 + 手动召唤，tier 强制 none）
//   ④ 指纹面 = 观测面（tabindex 同步 _fingerprint 与 OBSERVED_ATTRS）
//   ⑤ 无裸 [contenteditable]（票 12 / D-014）：候选集只收「contenteditable ∧ 可聚焦 tabindex=0 ∧ 强 tel 先验」复合描述符；语料 A-023 已备
//   ⑥ 元素级退出协议（票 15 [D-016 ②]）：data-1p-ignore / data-form-type="other" 命中即
//      完全跳过（不评分/不注入/不登记召唤），观测面与指纹面同步；语料 mm2-*-optout-* 已备
// 用法: node tests/scripts/verify-ticket-29.mjs  （exit 0 = 全绿）
// 可重复运行: 纯确定性（无时钟/随机/网络依赖）。
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bundleEngine, ROOT } from './14-lib-engine.mjs';

const DETECT_SRC = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
const FILL_SRC = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');

let pass = 0;
const fails = [];
function check(name, cond, extra) {
  if (cond) { pass++; return; }
  fails.push(name + (extra ? ' — ' + extra : ''));
}

// ── 极简 mock DOM（鸭子类型面 = 引擎实际消费面）──
const DOC = { querySelector: () => null, getElementById: () => null, querySelectorAll: () => [] };
function node(tag, attrs, children, text) {
  return {
    tagName: String(tag).toUpperCase(),
    attrs: attrs || {},
    children: children || [],
    textContent: text || '',
    // 引擎的 L1 语料面读 el.className（非 getAttribute('class')）——真实 DOM 同理，mock 必须提供
    className: (attrs && attrs.class) || '',
    disabled: false,
    readOnly: false,
    options: undefined,
    ownerDocument: DOC,
    getAttribute(n) { return Object.prototype.hasOwnProperty.call(this.attrs, n) ? this.attrs[n] : null; },
    querySelectorAll(sel) {
      const want = String(sel).trim().replace(/^.*\s+/, '');
      const roleM = /^\[role="([\w-]+)"\]$/.exec(want);
      const out = [];
      const walk = (n) => {
        for (const c of n.children || []) {
          if (roleM ? c.getAttribute('role') === roleM[1] : c.tagName === want.toUpperCase()) out.push(c);
          walk(c);
        }
      };
      walk(this);
      return out;
    },
    closest() { return null; },
    getRootNode() { return null; },
    getBoundingClientRect() { return { width: 0, height: 0 }; },
  };
}
function li(value, text) { return node('li', { 'data-value': value }, [], text); }
function ul(items) { return node('ul', {}, items, ''); }

const { Detect } = bundleEngine(null);

// ══ 1. 候选集：形态描述符（窄），不含裸 ul li / 全 div ══
const selBlock = /const SCAN_SELECTORS = \[([\s\S]*?)\];/.exec(DETECT_SRC);
const selRaw = selBlock ? selBlock[1] : '';
check('1.1 候选集含 div[tabindex="0"]', /'div\[tabindex="0"\]/.test(selRaw));
check('1.2 候选集含 span[tabindex="0"]', /span\[tabindex="0"\]/.test(selRaw));
check('1.3 无裸 ul li 宽选择器', !/'ul li'|'ul>li'|',\s*'ul'/.test(selRaw));
check('1.4 未退化为全 div 扫描', !/'div'\s*,|,\s*'div'/.test(selRaw));
check('1.5 既有 [role=combobox] 未被移除', /'\[role="combobox"\]'/.test(selRaw));
// 1.6 票 12 [D-014]：候选集不得放裸 [contenteditable]（候选爆炸，D-29d）；只收复合形态描述符
const Q = String.fromCharCode(34); // 双引号字面量（避免转义）
const ceSelLines = selRaw.split(String.fromCharCode(10)).filter(l => !l.trim().startsWith('//')).join(String.fromCharCode(10));
const ceHits = ceSelLines.split('[contenteditable]').length - 1;
const ceComposite = ['inputmode=' + Q + 'tel' + Q, 'autocomplete=' + Q + 'tel' + Q, 'role=' + Q + 'textbox' + Q]
  .filter(a => ceSelLines.includes('[contenteditable][tabindex=' + Q + '0' + Q + '][' + a + ']')).length;
check('1.6 无裸 [contenteditable]（仅收可聚焦+tel 先验复合描述符）', ceHits === 3 && ceComposite === 3, 'ce=' + ceHits + ' composite=' + ceComposite);

// ══ 2. 正例：无 ARIA 自定义下拉（票 32 语料形态）══
const pos = node('div', { class: 'select-country', tabindex: '0' },
  [ul([li('us', 'United States (+1)'), li('gb', 'United Kingdom (+44)'), li('cn', 'China (+86)')])], '');
const rPos = Detect.scoreElement(pos);
const posNames = (rPos.signals || []).map(s => s.name);
check('2.1 结构信号命中 custom:dropdown', rPos.pseudo === true, 'pseudo=' + rPos.pseudo);
check('2.2 信号留痕 custom:dropdown', posNames.includes('custom:dropdown'), posNames.join(','));
check('2.3 登记线达标 score>=25', rPos.score >= 25, 'score=' + rPos.score);
check('2.4 ADR-0005 档位上限 tier=none（不自动注入）', rPos.tier === 'none', 'tier=' + rPos.tier);
check('2.5 未越过低调注入线 score<35', rPos.score < 35, 'score=' + rPos.score);

// ══ 3. 负例：内容无区号/国家证据的列表（导航菜单）══
const nav = node('div', { class: 'main-nav', tabindex: '0' },
  [ul([li('home', 'Home'), li('about', 'About us'), li('price', 'Pricing')])], '');
const rNav = Detect.scoreElement(nav);
const navNames = (rNav.signals || []).map(s => s.name);
check('3.1 导航菜单不作 pseudo 候选', rNav.pseudo !== true, 'pseudo=' + rNav.pseudo);
check('3.2 内容门槛留痕 custom:gate:no-dial-evidence', navNames.includes('custom:gate:no-dial-evidence'), navNames.join(','));

// ══ 4. 负例：选项数 < 2 ══
const one = node('div', { class: 'select-country', tabindex: '0' },
  [ul([li('us', 'United States (+1)')])], '');
const rOne = Detect.scoreElement(one);
check('4.1 单选项不进登记面', rOne.pseudo !== true);
check('4.2 规模门槛留痕 custom:gate:options<2',
  (rOne.signals || []).some(s => s.name === 'custom:gate:options<2'));

// ══ 5. 负例：不可聚焦（无 tabindex）与无列表结构 ══
const noTab = node('div', { class: 'select-country' },
  [ul([li('us', 'United States (+1)'), li('cn', 'China (+86)')])], '');
const rNoTab = Detect.scoreElement(noTab);
check('5.1 不可聚焦容器不作候选', rNoTab.pseudo !== true);
check('5.2 不可聚焦容器无 custom 信号',
  !(rNoTab.signals || []).some(s => String(s.name).startsWith('custom:')));

const noList = node('div', { class: 'select-country', tabindex: '0' }, [], 'United States (+1)');
const rNoList = Detect.scoreElement(noList);
check('5.3 无列表结构不作候选', rNoList.pseudo !== true);
check('5.4 无列表结构无 custom 信号',
  !(rNoList.signals || []).some(s => String(s.name).startsWith('custom:')));

// ══ 6. 负例：非 DIV/SPAN 不落自定义下拉分支（防与 select/input 口径串扰）══
const asInput = node('input', { type: 'text', class: 'select-country', tabindex: '0' },
  [ul([li('us', 'United States (+1)'), li('cn', 'China (+86)')])], '');
const rAsInput = Detect.scoreElement(asInput);
check('6.1 INPUT 不走自定义下拉分支', rAsInput.pseudo !== true);

// ══ 7. 指纹面 = 观测面（tabindex 同步）[票 04 契约] ══
const OBS = /const OBSERVED_ATTRS = \[([\s\S]*?)\];/.exec(DETECT_SRC);
const obsRaw = OBS ? OBS[1] : '';
check('7.1 OBSERVED_ATTRS 含 tabindex', /'tabindex'/.test(obsRaw));
const fpBlock = /_fingerprint\(el: AnyEl\): string \{([\s\S]*?)\n    \}/.exec(DETECT_SRC);
const fpRaw = fpBlock ? fpBlock[1] : '';
check('7.2 _fingerprint 读取 tabindex', /getAttribute\('tabindex'\)/.test(fpRaw));

// ══ 8. _process 档位上限与 kind 分发（ADR-0005：登记 + 手动召唤）══
const calls = { attach: [], rememberLow: [], detach: [] };
const UI = {
  attach: (...a) => calls.attach.push(a),
  rememberLow: (...a) => calls.rememberLow.push(a),
  detach: (...a) => calls.detach.push(a),
};
const { Detect: Det } = bundleEngine(null, UI);
const posEl = node('div', { class: 'select-country', tabindex: '0' },
  [ul([li('us', 'United States (+1)'), li('gb', 'United Kingdom (+44)'), li('cn', 'China (+86)')])], '');
Det._process(posEl);
check('8.1 未自动注入（attach 未调用）', calls.attach.length === 0, 'attach=' + calls.attach.length);
check('8.2 登记进召唤面（rememberLow 调用）', calls.rememberLow.length === 1, 'rememberLow=' + calls.rememberLow.length);
check('8.3 登记 kind=pseudo', calls.rememberLow.length === 1 && calls.rememberLow[0][1] === 'pseudo',
  calls.rememberLow.length ? String(calls.rememberLow[0][1]) : 'n/a');

// ══ 9. fill 侧：无 ARIA 形态选项定位回退（登记后召唤可填）══
check('9.1 fill 侧 li 回退（无 role=option 时）',
  /querySelectorAll\('li'\)/.test(FILL_SRC));
check('9.2 fill 侧回退不破坏既有 role=option 路径',
  /querySelectorAll\('\[role="option"\]'\)/.test(FILL_SRC));

// ══ 10. 元素级退出协议（票 15 [D-016 ②]）：data-1p-ignore / data-form-type="other" ══
// 裁定：退出协议是站点/用户的**显式否决**，压过一切启发式（与 scan() 入口页面豁免同族）——
// 命中即完全跳过（不评分、不注入、不登记召唤）。裁定与依据：docs/adr/0012-mental-model-adoption.md
check('10.1 源码含 data-1p-ignore 退出判定（任意值）',
  DETECT_SRC.includes("getAttribute('data-1p-ignore') !== null"));
check('10.2 源码含 data-form-type="other" 退出判定',
  DETECT_SRC.includes("getAttribute('data-form-type') === 'other'"));
check('10.3 退出属性入观测面 OBSERVED_ATTRS（票 04 契约）',
  obsRaw.includes("'data-1p-ignore'") && obsRaw.includes("'data-form-type'"));
check('10.4 退出属性入指纹面 _fingerprint（票 04 契约）',
  fpRaw.includes("el.getAttribute('data-1p-ignore'), el.getAttribute('data-form-type'),"));
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'tests', 'corpus', 'manifest.json'), 'utf8'));
const caseOf = (id) => (MANIFEST.cases || []).find(c => c.id === id) || null;
const optNeg1 = caseOf('mm2-neg-optout-1p-ignore');
const optNeg2 = caseOf('mm2-neg-optout-form-type');
const optCtl = caseOf('mm2-pos-optout-control');
check('10.5 语料三例在位（2 负例 + 1 对照）', !!optNeg1 && !!optNeg2 && !!optCtl);
check('10.6 语料 polarity/expect 正确',
  !!optNeg1 && optNeg1.polarity === 'negative' && optNeg1.expect === 'none' &&
  !!optNeg2 && optNeg2.polarity === 'negative' && optNeg2.expect === 'none' &&
  !!optCtl && optCtl.polarity === 'positive' && optCtl.expect === 'inject');
// 行为面：退出元素短路为 none/0；对照元素照常评分（证明是元素级精确否决，非「整体失效」）
const optEl1 = node('input', { type: 'text', autocomplete: 'tel-country-code', 'data-1p-ignore': '' });
const rOpt1 = Detect.scoreElement(optEl1);
check('10.7 data-1p-ignore 元素短路 tier=none score=0',
  rOpt1.tier === 'none' && rOpt1.score === 0, 'tier=' + rOpt1.tier + ' score=' + rOpt1.score);
const optEl2 = node('input', { type: 'text', autocomplete: 'tel-country-code', 'data-form-type': 'other' });
const rOpt2 = Detect.scoreElement(optEl2);
check('10.8 data-form-type=other 元素短路 tier=none score=0',
  rOpt2.tier === 'none' && rOpt2.score === 0, 'tier=' + rOpt2.tier + ' score=' + rOpt2.score);
const ctlEl = node('input', { type: 'text', autocomplete: 'tel-country-code' });
const rCtl = Detect.scoreElement(ctlEl);
check('10.9 无退出属性的对照元素仍走评分（非整体失效）',
  rCtl.tier !== 'none' && rCtl.score > 0, 'tier=' + rCtl.tier + ' score=' + rCtl.score);

// ══ 汇总 ══
console.log('— 票 29 回归门（A-003 扫描候选集扩展）');
console.log('  pass=' + pass + ' fail=' + fails.length);
for (const f of fails) console.log('  FAIL ' + f);
console.log(fails.length ? 'RESULT: FAIL' : 'RESULT: PASS');
process.exit(fails.length ? 1 : 0);
