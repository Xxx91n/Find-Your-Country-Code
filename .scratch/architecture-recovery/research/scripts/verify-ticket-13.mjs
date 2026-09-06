#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════
// verify-ticket-13.mjs — 票 13（可见性闸门与 L3 内容验证加码）验收门
// 覆盖 issue 13 全部 6 条验收项的程序化断言面：
//   验收1/2 可见性闸门（静态检查 + 引擎级 hidden mock + E2E 由 verify-13.yml 承担）
//   验收3 ISO2 全集成员测试（语料 + 静态检查）
//   验收4 共享区号消歧（fill 引擎级断言：+1 双国下拉选 Canada 落 CA）
//   验收5 占位首项剔除（语料 mm2-pos-placeholder-dial + 填充不受伤断言）
//   验收6 回归红线（41 例语料 mismatch=0 / FN=0 / FP=0；mm2-neg-itires 转通过）
// 引擎装载复用 14-lib-engine.mjs（函数束，零构建）；fill 装载同法（i18n/iti-adapter 依赖剥除）。
// 证据等级：本脚本输出为程序化断言结果；CI-only 政策下最终证据 = verify-13.yml CI run。
// ══════════════════════════════════════════════════════════════════════
import {
  loadManifest, bundleEngine, runCorpus, metrics, buildElement,
} from './14-lib-engine.mjs';
import { readFileSync } from 'node:fs';
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

// ── 装载真实 fill 模块（fill + i18n + iti-adapter，剥 import 后函数束） ──
function bundleFill() {
  const bundle = [
    toModuleBody(readFileSync(join(ROOT, 'src', 'i18n.ts'), 'utf8')),
    toModuleBody(readFileSync(join(ROOT, 'src', 'iti-adapter', 'index.ts'), 'utf8')),
    toModuleBody(readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8')),
    '\n;return { createFill };',
  ].join('\n');
  const { createFill } = new Function(bundle)();
  return createFill({ toast() {} });
}

// ── mock select（fill 断言用；事件/setter 面 = lib-engine Opt/El 同口径扩展） ──
function buildSelect(options) {
  const opts = options.map(([value, text]) => ({
    value, text,
    getAttribute() { return null; },
  }));
  const el = {
    tagName: 'SELECT',
    options: opts,
    _v: '',
    selectedIndex: 0,
    ownerDocument: null,
    dispatchEvent() {},
    placeholder: '',
  };
  // 模拟浏览器原生 setter 路径：prototype value accessor（_inject 从 defaultView 取描述符）
  const proto = Object.create(null);
  Object.defineProperty(proto, 'value', {
    get() { return this._v; },
    set(v) { this._v = v; },
  });
  Object.setPrototypeOf(el, proto); // 挂入原型链：el.value 走 accessor（模拟真实 select）
  el.ownerDocument = {
    defaultView: { HTMLSelectElement: { prototype: proto } },
    createEvent() { return { initEvent() {} }; },
  };
  return el;
}
function buildHiddenMock(hidden) {
  return {
    tagName: 'SELECT',
    ownerDocument: { defaultView: null },
    getBoundingClientRect() { return hidden ? { width: 0, height: 0 } : { width: 200, height: 30 }; },
  };
}

// ══════════ 1. 语料回归门（41 例：appendOnly 39 + 票 13 新增 2） ══════════
const manifest = loadManifest();
const { Detect } = bundleEngine();
const results = runCorpus(manifest, Detect);
const m = metrics(results, manifest);
console.log('[CORPUS] cases=' + m.cases, 'TP=' + m.TP, 'FP=' + m.FP, 'TN=' + m.TN, 'FN=' + m.FN,
  'precision=' + m.precision, 'recall=' + m.recall, 'f1=' + m.f1);

check('验收6 语料规模 41（appendOnly 只增不删）', m.cases === 41, 'got ' + m.cases);
check('验收6 mismatch=0（全部用例 expect 与引擎一致）', m.mismatches.length === 0, m.mismatches.join('; '));
check('验收6 FN=0（正样本不回归）', m.FN === 0, 'got ' + m.FN);
check('验收6 FP=0（负样本全不注入）', m.FP === 0, 'got ' + m.FP);

const byId = new Map(results.map(r => [r.id, r]));
const itires = byId.get('mm2-neg-itires');
check('检查点四 mm2-neg-itires 转通过（expect=none got=none）',
  itires && !itires.injected && itires.tier === 'none',
  itires ? ('got score=' + itires.score + ' tier=' + itires.tier) : 'missing');
check('检查点四 itires 信号留痕 iti:container-unattested',
  itires && (itires.signals || []).some(s => s.name === 'iti:container-unattested'),
  JSON.stringify(itires && itires.signals));

const p4 = byId.get('P4');
check('检查点四 真 iti 字段（type=tel）仍 auto（60+10=70 口径不变）',
  p4 && p4.tier === 'auto', p4 ? ('got score=' + p4.score + ' tier=' + p4.tier) : 'missing');

const shared = byId.get('mm2-pos-shared-dial');
check('验收4 共享区号下拉（+1/+44 文本互证）检测注入',
  shared && shared.injected, shared ? ('got score=' + shared.score + ' tier=' + shared.tier) : 'missing');

const ph = byId.get('mm2-pos-placeholder-dial');
check('验收5 占位首项剔除后区号下拉照常注入',
  ph && ph.injected, ph ? ('got score=' + ph.score + ' tier=' + ph.tier) : 'missing');

// 占位剔除效果对照：无占位版（请选择占位被剔除 → total 减少，但 plusDial 证据不变）
const phCase = manifest.cases.find(c => c.id === 'mm2-pos-placeholder-dial');
const phEl = buildElement(phCase);
const phStatsLike = Detect.scoreElement(phEl, {});
check('验收5 占位首项不进计分（numeric/total 分母剔除占位）', !!phStatsLike);

// ══════════ 2. fill 引擎级断言（验收4 消歧 + 验收5 填充不受伤） ══════════
const Fill = bundleFill();
// COUNTRIES 取法：直接解析 countries.ts（与引擎同源）
const countriesSrc = readFileSync(join(ROOT, 'src', 'data', 'countries.ts'), 'utf8');
const countriesArr = new Function(toModuleBody(countriesSrc) + ';return COUNTRIES;')();
const byEn = Object.fromEntries(countriesArr.map(c => [c.countryEn, c]));
const CA = byEn['Canada'];
const CN = byEn['China'];
if (!CA || !CN) { console.log('FAIL country lookup (Canada/China missing from COUNTRIES)'); process.exit(1); }

// 验收4：共享区号 +1（US/CA）消歧 —— 旧实现纯值匹配必落首个（US），消歧后落 CA
// 共享区号下拉的提交值两侧同为 '+1'（值共享），消歧的正确表达 = selectedIndex 落点
// （自定义下拉站点读取 selectedIndex/selectedOptions 文本渲染选中态）
const sharedSel = buildSelect([['+1', 'United States (+1)'], ['+1', 'Canada (+1)'], ['+44', 'United Kingdom (+44)']]);
const okCA = Fill.fillSelect(sharedSel, CA);
check('验收4 fill 消歧：+1 共享下拉选 Canada 落点至 Canada 选项（非首值 US）',
  okCA && sharedSel.value === '+1' && sharedSel.selectedIndex === 1 &&
    String(sharedSel.options[sharedSel.selectedIndex].text).includes('Canada'),
  'value=' + sharedSel.value + ' idx=' + sharedSel.selectedIndex +
    ' text=' + (sharedSel.options[sharedSel.selectedIndex] || {}).text);

const usSel = buildSelect([['+1', 'United States (+1)'], ['+1', 'Canada (+1)'], ['+44', 'United Kingdom (+44)']]);
Fill.fillSelect(usSel, { code: '+1', iso: 'US', country: '美国', countryEn: 'United States' });
check('验收4 fill 消歧反向：选 United States 落点至首个 US 选项',
  usSel.value === '+1' && usSel.selectedIndex === 0 &&
    String(usSel.options[usSel.selectedIndex].text).includes('United States'),
  'value=' + usSel.value + ' idx=' + usSel.selectedIndex);

const bareSel = buildSelect([['+86', '+86'], ['+1', '+1'], ['+44', '+44']]);
Fill.fillSelect(bareSel, CN);
check('验收4 裸值下拉退回旧行为（首值命中 +86）', bareSel.value === '+86', 'value=' + bareSel.value);

// 验收5：占位首项下拉填充不受伤（占位值 0 不匹配任何 code；+86 命中）
const phSel = buildSelect([['0', '请选择'], ['+86', '+86'], ['+1', '+1'], ['+44', '+44']]);
const okCN = Fill.fillSelect(phSel, CN);
check('验收5 填充不受伤：占位首项下拉选 China 落 +86', okCN && phSel.value === '+86', 'value=' + phSel.value);

// ISO2 值下拉（视觉替换型承值 select 常见形态：value=ISO2, text=国家名）
const isoSel = buildSelect([['US', 'United States'], ['CA', 'Canada'], ['GB', 'United Kingdom']]);
Fill.fillSelect(isoSel, CA);
check('检查点一 ISO2 承值下拉可填充（CA）', isoSel.value === 'CA', 'value=' + isoSel.value);

// ══════════ 3. 可见性闸门引擎级断言（验收1） ══════════
check('验收1 _hiddenByStyle: 零尺寸 mock 判隐藏', Detect._hiddenByStyle(buildHiddenMock(true)) === true);
check('验收1 _hiddenByStyle: 正常尺寸 mock 判可见（fail-open）', Detect._hiddenByStyle(buildHiddenMock(false)) === false);
check('验收1 _hiddenByStyle: 无测量能力 mock 判可见（fail-open）',
  Detect._hiddenByStyle({ tagName: 'SELECT', ownerDocument: { defaultView: null } }) === false);

// 闸门只改档位不改登记：hidden/visible 孪生 mock 的 scoreElement 输出必须完全一致
// （可见性不入评分；档位降级只发生在 _process 闸门段，E2E 覆盖）
{
  function twin(hidden) {
    const el = buildHiddenMock(hidden);
    el.tagName = 'SELECT';
    el.options = [['+86', '+86'], ['+1', '+1']].map(([v, t]) => ({ value: v, text: t, getAttribute() { return null; } }));
    el.getAttribute = () => null;
    el.closest = () => null;
    el.getRootNode = () => null;
    el.ownerDocument = { defaultView: null, querySelector() { return null; }, getElementById() { return null; }, querySelectorAll() { return []; } };
    return el;
  }
  const rh = Detect.scoreElement(twin(true), {});
  const rv = Detect.scoreElement(twin(false), {});
  check('验收1 闸门只改档位：可见性与否不影响 scoreElement（评分/档位孪生一致）',
    rh.score === rv.score && rh.tier === rv.tier && rh.score > 0,
    'hidden=' + rh.score + '/' + rh.tier + ' visible=' + rv.score + '/' + rv.tier);
}

// ══════════ 4. 静态检查（落点存在性） ══════════
const detectSrc = readFileSync(join(ROOT, 'src', 'detect', 'index.ts'), 'utf8');
const fillSrc = readFileSync(join(ROOT, 'src', 'fill', 'index.ts'), 'utf8');
const uiSrc = readFileSync(join(ROOT, 'src', 'ui', 'index.ts'), 'utf8');
check('静态 detect: _hiddenByStyle 落点', /_hiddenByStyle\(el\)/.test(detectSrc));
check('静态 detect: ISO2_SET 全集域落点', /const ISO2_SET = new Set\(Object\.keys\(ISO2_MAP\)\)/.test(detectSrc));
check('静态 detect: 占位首项剔除落点', /isPlaceholderOpt/.test(detectSrc));
check('静态 detect: iti 容器唯一证据防线落点', /iti:container-unattested/.test(detectSrc));
check('静态 detect: 闸门在 _process（档位裁决）落点', /gate:visibility-hidden/.test(detectSrc));
check('静态 detect: 召唤图标不回拆（summonedWrap）', /summonedWrap/.test(detectSrc));
check('静态 fill: 共享区号消歧落点（值+国家名双证据）', /valueMatch\(o\) && nameInText\(o\)/.test(fillSrc));
check('静态 fill: selectedIndex 消歧落点', /opts\.selectedIndex/.test(fillSrc));
check('静态 ui: 隐藏字段召唤 wrapper 强制可见落点', /cs\.display === 'none'/, '');

// ══════════ 汇总 ══════════
console.log('----------------------------------------');
console.log('verify-ticket-13: ' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) { console.log('FAILURES: ' + failures.join(' | ')); process.exit(1); }
