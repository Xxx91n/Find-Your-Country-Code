// ══════════════════════════════════════════════════════════════════
// primitives.mjs — harness 交互原语层（票 05 / A-029）
//
// 定位：**密封层与 live 层共用的唯一一份交互原语**。
//   本文件不 import `playwright/test`，也不含任何 `expect()` —— 只做「驱动 + 读取 +
//   等待式技术守卫」，因此可被两种 runtime 零转换地加载同一份实现：
//     · 密封层：playwright/test 运行器（经 tests/helpers/userscript.ts 薄门面 + soft adapter）
//     · live 层：独立 node 脚本（tests/live/live-smoke.mjs，自建软收集器）
//   断言（业务判定）一律留在各自 harness —— 边界依据见
//   .scratch/architecture-recovery/research/atomcode-05-harness-primitives.md §2.2。
//
// 纪律（本票自检项，由 tests/scripts/verify-ticket-05-harness.mjs 结构门钉住）：
//   ① 本文件是 GM 替身与交互原语的唯一来源（禁止第二套）；
//   ② 本文件禁止出现 expect( 调用或 playwright/test 依赖；
//   ③ 等待一律用 locator.waitFor() / waitForFunction()，禁止固定 sleep 充当等待。
// ══════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ── 常量：路径 / 存储键 / 页面侧可观测面选择器（唯一定义处） ──

/** 构建产物绝对路径（npm run build 的产出）。 */
export const DIST_PATH = path.join(HERE, '..', '..', 'dist', 'find-your-country-code.user.js');

/** GM 存储替身使用的 localStorage 键。 */
export const MENU_STORE_KEY = '__cch_gm__';

/** 字段事件记录键（页面侧外部可观测的 input/change 计数来源）。 */
export const EVENTS_KEY = '__cchEvents';

export const PANEL_SELECTOR = '#cch-pop';
export const SEARCH_SELECTOR = '#cch-si';
export const FEEDBACK_SELECTOR = '#cch-toast';
export const WRAPPER_SELECTOR = '.cch-wrapper';
export const BUTTON_SELECTOR = '.cch-btn';
export const ALL_LIST_ROWS_SELECTOR = '.cch-list[data-sec="all"] .cch-row';

/**
 * 驱动原语的默认等待上限（ms）。
 * 取值依据：被本层替换的旧门面 openPanel 用 `expect(locator).toBeVisible()`（expect 默认超时
 * 5s）；共享层零 expect（见 atomcode-05-harness-primitives.md §2.2），改用 waitFor 后必须
 * 显式补齐同一上界，否则失败模式由「5s 断言报错」退化为「吃掉整个用例 30s 超时」。
 */
export const WAIT_MS = 5000;

let cachedCode;

/** 读取并缓存构建产物源码（缺失时抛出可执行的修复提示）。 */
export function userscriptCode() {
  if (cachedCode === undefined) {
    try {
      cachedCode = readFileSync(DIST_PATH, 'utf8');
    } catch {
      throw new Error('缺少构建产物 ' + DIST_PATH + ' —— 先跑 npm run build（或 npm run e2e）');
    }
  }
  return cachedCode;
}

/**
 * GM_* 替身（init-script 载荷；**唯一一份**，密封层与 live 层共用）。
 * 等价 Tampermonkey 环境：GM 存储用 localStorage 承载（刷新 / 同源页面间持久）。
 * GM_registerMenuCommand 记录 `{id, title, fn}` 且 **fn 可调用**（window.__cchMenu），
 * 并还原 Tampermonkey >=5.0 / Violentmonkey >=2.15.9 的 id 原地更新语义：
 *   传入 options.id 时，同 id 重注册只更新 title/fn，不新增条目、不递增计数；
 *   无 id 的旧式调用保持追加语义（向后兼容）。id 语义是被测契约的一部分，不可简化掉。
 */
export const GM_STUB = [
  '(() => {',
  '  const KEY = "__cch_gm__";',
  '  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } };',
  '  window.GM_getValue = (k, d) => { const s = read(); return k in s ? s[k] : d; };',
  '  window.GM_setValue = (k, v) => { const s = read(); s[k] = v; try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} };',
  '  window.GM_addValueChangeListener = () => 0;',
  '  // 记录菜单命令注册；同时记录 {id,title,fn} 供测试调用（fn 可调用是被测契约）。',
  '  window.__cchMenu = [];',
  '  window.__cchMenuIds = [];',
  '  window.__cchMenuCount = 0;',
  '  window.GM_registerMenuCommand = (title, fn, options) => {',
  '    const id = options && options.id != null ? String(options.id) : null;',
  '    if (id !== null) {',
  '      const hit = window.__cchMenu.find((c) => c.id === id);',
  '      if (hit) { hit.title = title; hit.fn = fn; return 0; } // 原地更新：不新增条目',
  '      window.__cchMenu.push({ id: id, title: title, fn: fn });',
  '      window.__cchMenuIds.push(id);',
  '    } else {',
  '      window.__cchMenu.push({ id: null, title: title, fn: fn });',
  '    }',
  '    window.__cchMenuCount = window.__cchMenu.length;',
  '    return 0;',
  '  };',
  '})();',
].join('\n');

// ── 定位器：只返回 Locator，不下判定 ──

/** 目标字段是否已被包进 .cch-wrapper（= 注入了图标）。 */
export function wrapperFor(scope, target) {
  return scope.locator(WRAPPER_SELECTOR, { has: scope.locator(target) });
}

export function panel(scope) { return scope.locator(PANEL_SELECTOR); }
export function searchBox(scope) { return scope.locator(SEARCH_SELECTOR); }
export function feedbackToast(scope) { return scope.locator(FEEDBACK_SELECTOR); }
export function allRows(scope) { return scope.locator(ALL_LIST_ROWS_SELECTOR); }

/** 全量列表内某个 ISO2 的国家行（大小写不敏感；限定 all 列表以避开收藏区同名行）。 */
export function countryRow(scope, iso) {
  return scope.locator(ALL_LIST_ROWS_SELECTOR + '[data-iso="' + String(iso).toLowerCase() + '" i]');
}

// ── 驱动原语 ──

/** inject：装 GM 替身 + 注入构建产物（页面导航前调用）。 */
export async function installUserscript(page) {
  await page.addInitScript(GM_STUB);
  await page.addInitScript(userscriptCode());
}

/** 等目标字段被包裹（等待式守卫，非固定 sleep）。 */
export async function waitForInjection(scope, target, timeout = WAIT_MS) {
  await wrapperFor(scope, target).waitFor({ state: 'attached', timeout });
}

/** open-panel：点字段旁图标 → 等面板可见。 */
export async function openPanel(scope, target) {
  await wrapperFor(scope, target).locator(BUTTON_SELECTOR).click();
  await panel(scope).waitFor({ state: 'visible', timeout: WAIT_MS });
}

/**
 * 目标字段旁图标按钮的定位器；target 为空时取页面内**首个**已注入图标
 * （未校准真实站点：manifest 只声明「该帧内应出现 wrapper」，不预知字段选择器）。票 07 [A-029]。
 */
export function wrapperButton(scope, target) {
  return target
    ? wrapperFor(scope, target).locator(BUTTON_SELECTOR)
    : scope.locator(WRAPPER_SELECTOR + ' > ' + BUTTON_SELECTOR).first();
}

/** open-panel（GM 菜单路径）：调用匹配的菜单命令 → 等面板可见。 */
export async function openPanelViaMenu(scope, matcher = /面板|panel/i) {
  const r = await invokeMenuCommand(scope, matcher);
  if (!r.invoked) {
    throw new Error('GM 菜单未登记匹配 ' + matcher + ' 的命令（已登记：' + (await menuTitles(scope)).join(' / ') + '）');
  }
  await panel(scope).waitFor({ state: 'visible', timeout: WAIT_MS });
  return r;
}

/**
 * open-panel（跨隔离上下文，验收面 §3.3 链路 A）：图标在子帧、面板只在顶层渲染——
 * 点子帧图标 → 顶层代开面板。两端断言由调用方承担（本原语只驱动 + 等待）。
 * 顶层与本帧同源时 buttonScope === panelScope，两条路径共用同一实现（不新造第二套）。
 * 票 07 [A-029]：真实站点层全阶梯 L2 的跨帧判据来源。
 */
export async function openPanelRemote(buttonScope, target, panelScope) {
  await wrapperButton(buttonScope, target).click();
  await panel(panelScope).waitFor({ state: 'visible', timeout: WAIT_MS });
}

/** search-type：在面板搜索框输入查询（传空串即清空恢复全量）。 */
export async function searchType(scope, query) {
  const si = searchBox(scope);
  await si.waitFor({ state: 'visible', timeout: WAIT_MS });
  await si.fill(String(query));
  return si;
}

/**
 * select-country：点国家行。options.query 先经 search-type 收窄；
 * options.expectPanelClose（默认 true）等待面板从 DOM 移除——
 * 无目标字段的 GM 入口路径面板会保持打开，此时传 false。
 */
export async function selectCountry(scope, iso, options = {}) {
  const { query = null, expectPanelClose = true } = options;
  if (query !== null) await searchType(scope, query);
  const row = countryRow(scope, iso);
  await row.waitFor({ state: 'visible', timeout: WAIT_MS });
  await row.click();
  if (expectPanelClose) await panel(scope).waitFor({ state: 'detached', timeout: WAIT_MS });
}

/** fill-field：open → search → select → 读回宿主字段 value 的全链。 */
export async function fillField(scope, target, options = {}) {
  await openPanel(scope, target);
  await selectCountry(scope, options.iso, { query: options.query });
  return readHostValue(scope, target);
}

// ── 读取原语：返回事实，不下判定 ──

/** 注入面快照（wrapper/button 计数 + 目标字段是否被包裹 + 档位）。 */
export async function readInjection(scope, target) {
  return scope.evaluate((sel) => {
    const wrappers = document.querySelectorAll('.cch-wrapper').length;
    const buttons = document.querySelectorAll('.cch-btn').length;
    if (!sel) return { wrappers, buttons, elementFound: null, wrapped: null, tier: null };
    const el = document.querySelector(sel);
    if (!el) return { wrappers, buttons, elementFound: false, wrapped: null, tier: null };
    const w = el.closest('.cch-wrapper');
    const btn = w ? w.querySelector('.cch-btn') : null;
    return { wrappers, buttons, elementFound: true, wrapped: !!w, tier: btn ? btn.getAttribute('data-cch-tier') : null };
  }, target || null);
}

/** 宿主字段快照：{ tag, value, text }（contenteditable 等无 value 的面回退 textContent）。 */
export async function readHostField(scope, target) {
  return scope.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const hasValue = 'value' in el;
    return {
      tag: el.tagName.toLowerCase(),
      value: hasValue ? String(el.value) : (el.textContent || '').trim(),
      text: (el.textContent || '').trim(),
    };
  }, target);
}

/** 读回宿主字段 value（验收面 #6 的判据来源）。 */
export async function readHostValue(scope, target) {
  const f = await readHostField(scope, target);
  return f ? f.value : null;
}

/**
 * 读回「已被 .cch-wrapper 包裹的宿主字段」快照（{ tag, value, text }）。
 * 未校准真实站点（未声明 selector）的 L3 判据来源：wrapper 的子元素去掉 .cch-btn 即宿主字段
 * （注入结构见 src/ui/index.ts:217-229 —— wrap 先插到字段原位，再把字段与按钮 append 进来）。
 * 票 07 [A-029]。
 */
export async function readWrappedHostField(scope) {
  return scope.evaluate(() => {
    const w = document.querySelector('.cch-wrapper');
    if (!w) return null;
    const el = Array.from(w.children).find((c) => !c.classList.contains('cch-btn'));
    if (!el) return null;
    const hasValue = 'value' in el;
    return {
      tag: el.tagName.toLowerCase(),
      value: hasValue ? String(el.value) : (el.textContent || '').trim(),
      text: (el.textContent || '').trim(),
    };
  });
}

/**
 * 在「已被 .cch-wrapper 包裹的宿主字段」上装 input/change 监听；与 recordFieldEvents 共用
 * 同一 EVENTS_KEY，故 readFieldEvents / countFieldEvents 直接读回。未校准真实站点的 L3 事件面判据来源。
 * 票 07 [A-029]。
 */
export async function recordWrappedFieldEvents(scope, types = ['input', 'change']) {
  await scope.evaluate((arg) => {
    const w = document.querySelector('.cch-wrapper');
    const el = w ? Array.from(w.children).find((c) => !c.classList.contains('cch-btn')) : null;
    if (!el) throw new Error('wrapped host field not found');
    window[arg.key] = [];
    for (const t of arg.types) el.addEventListener(t, () => window[arg.key].push(t));
  }, { types, key: EVENTS_KEY });
}

/** 在目标字段上装 input/change 监听（写入结果正确性的页面侧证据）。 */
export async function recordFieldEvents(scope, target, types = ['input', 'change']) {
  await scope.evaluate((arg) => {
    const el = document.querySelector(arg.sel);
    if (!el) throw new Error('element not found: ' + arg.sel);
    window[arg.key] = [];
    for (const t of arg.types) el.addEventListener(t, () => window[arg.key].push(t));
  }, { sel: target, types, key: EVENTS_KEY });
}

/** 读回已记录的事件序列。 */
export async function readFieldEvents(scope, key = EVENTS_KEY) {
  return scope.evaluate((k) => (window[k] || []).slice(), key);
}

/** 某类事件的派发次数（input/change 各 ≥1 的判据来源）。 */
export async function countFieldEvents(scope, type, key = EVENTS_KEY) {
  const events = await readFieldEvents(scope, key);
  return events.filter((e) => e === type).length;
}

/** 填充反馈快照：{ present, text, on }（#cch-toast）。 */
export async function readFeedback(scope) {
  const toast = feedbackToast(scope);
  if ((await toast.count()) === 0) return { present: false, text: '', on: false };
  return toast.evaluate((el) => ({ present: true, text: (el.textContent || '').trim(), on: el.classList.contains('on') }));
}

/** 等反馈出现后读回（等待式守卫）。 */
export async function waitForFeedback(scope) {
  await feedbackToast(scope).waitFor({ state: 'visible', timeout: WAIT_MS });
  return readFeedback(scope);
}

/** 目标字段图标的注入档位（data-cch-tier ∈ {auto, lowkey}）。 */
export async function readTier(scope, target) {
  return wrapperFor(scope, target).locator(BUTTON_SELECTOR).getAttribute('data-cch-tier');
}

/** 目标字段图标的评分字符串（诊断/观测用，不作验收判据）。 */
export async function readScore(scope, target) {
  return wrapperFor(scope, target).locator(BUTTON_SELECTOR).getAttribute('data-cch-score');
}

/** 全量列表当前可见行文本（搜索收窄判据来源）。 */
export async function readVisibleRows(scope) {
  return scope.locator(ALL_LIST_ROWS_SELECTOR).evaluateAll((rows) =>
    rows.filter((r) => r.getClientRects().length > 0).map((r) => (r.textContent || '').trim()));
}

/**
 * 读回某个国家行自带的区号（行内 .cch-fav[data-code] / .cch-cd 文本）。
 * 未校准真实站点的 L3 期望值同源依据：断言「选国 → 宿主字段写入该行声明的区号」，
 * 不依赖任何外部区号表。票 07 [A-029]。
 */
export async function readRowDialCode(scope, iso) {
  return scope.evaluate((v) => {
    const row = document.querySelector('.cch-list[data-sec="all"] .cch-row[data-iso="' + v + '" i]');
    if (!row) return null;
    const fav = row.querySelector('.cch-fav[data-code]');
    const cd = row.querySelector('.cch-cd');
    return (fav && fav.getAttribute('data-code')) || (cd ? (cd.textContent || '').trim() : null);
  }, String(iso).toLowerCase());
}

// ── GM 菜单原语（记录 {title, fn} 且 fn 可调用） ──

/** 菜单命令快照：[{ id, title, callable }]。 */
export async function menuCommands(scope) {
  return scope.evaluate(() => (window.__cchMenu || []).map((c) => ({
    id: c.id == null ? null : c.id,
    title: c.title,
    callable: typeof c.fn === 'function',
  })));
}

export async function menuTitles(scope) {
  return scope.evaluate(() => (window.__cchMenu || []).map((c) => c.title));
}

export async function menuIds(scope) {
  return scope.evaluate(() => (window.__cchMenuIds || []).slice());
}

export async function menuCount(scope) {
  return scope.evaluate(() => window.__cchMenuCount || 0);
}

/** 等菜单注册达到 min 条（脚本求值时注册，等待式守卫）。 */
export async function waitForMenu(scope, min = 1) {
  await scope.waitForFunction((n) => (window.__cchMenuCount || 0) >= n, min, { timeout: WAIT_MS });
}

/**
 * 调用匹配 matcher 的菜单命令（fn 真实执行）。
 * matcher 经 source/flags 传入页面（RegExp 不可结构化克隆）。
 * 返回 { invoked, title, id, reason }；reason ∈ {null, no-match, fn-not-callable}。
 */
export async function invokeMenuCommand(scope, matcher) {
  return scope.evaluate((arg) => {
    const re = new RegExp(arg.src, arg.flags);
    const cmd = (window.__cchMenu || []).find((c) => re.test(c.title));
    if (!cmd) return { invoked: false, title: null, id: null, reason: 'no-match' };
    const id = cmd.id == null ? null : cmd.id;
    if (typeof cmd.fn !== 'function') return { invoked: false, title: cmd.title, id: id, reason: 'fn-not-callable' };
    cmd.fn();
    return { invoked: true, title: cmd.title, id: id, reason: null };
  }, { src: matcher.source, flags: matcher.flags });
}

// ── 纯判定助手（对已读回的事实做布尔归约；不含断言库调用） ──

/** 注入是否成立：有 wrapper，且（未指定目标字段时只看计数 / 指定时该字段确实被包裹）。 */
export function injectionSatisfied(probe, target) {
  return !!probe && probe.wrappers > 0 && (!target || (probe.elementFound === true && probe.wrapped === true));
}
