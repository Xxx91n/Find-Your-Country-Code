// 票 02 [A-026 · A-027] 设置面收口 E2E：GM 菜单「设置」一级入口（开面板 + 显式切设置视图 +
// 语言行滚入可见区 + 高亮衰减 + 已开面板原地复用）/ 三选一显式语言控件 / 切换后全 UI 无漏刷
// （图标 title·aria-label、收藏行 title、空态文案）/ 菜单标签 id 原地更新（免重载跟随）。
// 运行：npm run e2e（先 vite build 出 dist 再 playwright test，CI 执行）。
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

type Seed = { rules?: unknown; prefs?: unknown };

// GM 种子必须在 userscript 注入前写入（与 rules-ui.spec.ts / locale-switch.spec.ts 同口径）
async function boot(page: Page, seed: Seed = {}): Promise<void> {
  await page.addInitScript((s) => {
    if (!s.rules && !s.prefs) return;
    if (localStorage.getItem('__cch_seed_done__')) return;
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    if (s.rules) bucket['cch_site_rules_v1'] = JSON.stringify(s.rules);
    if (s.prefs) bucket['cch_ui_prefs_v1'] = JSON.stringify(s.prefs);
    localStorage.setItem('__cch_gm__', JSON.stringify(bucket));
    localStorage.setItem('__cch_seed_done__', '1');
  }, { rules: seed.rules ?? null, prefs: seed.prefs ?? null });
  // 导航计数：证明菜单标签跟随语言「无需重载」（reload/跳转会让计数 > 1）
  await page.addInitScript(() => { (window as any).__nav = ((window as any).__nav || 0) + 1; });
  await installUserscript(page);
  await page.goto('/fixtures/rules-ui.html');
}

// 深链/视图目标一律以稳定标识符（属性）表达，不绑内部实现名或易变排序位置
const SETTINGS_VIEW = '#cch-rules-view[data-cch-view="settings"]';
const LOCALE_ROW = '[data-cch-section="locale"]';

// 经 GM 菜单「设置」命令进入 —— 本票前 GM 菜单无任何设置入口（唯一零置信度入口）
async function invokeMenuSettings(page: Page): Promise<void> {
  const ok = await page.evaluate(() => {
    const menu = (window as any).__cchMenu || [];
    const cmd = menu.find((c: any) => /设置|settings/i.test(c.title));
    if (!cmd) return false;
    cmd.fn();
    return true;
  });
  expect(ok, 'GM 菜单应登记「设置」命令').toBe(true);
}

async function textOf(page: Page, sel: string): Promise<string | null> {
  return page.evaluate((s) => { const el = document.querySelector(s); return el ? el.textContent : null; }, sel);
}

async function openSettingsView(page: Page): Promise<void> {
  await page.locator('#cch-rules-tg').click();
  await expect(page.locator(SETTINGS_VIEW)).toBeVisible();
}

// i18n 期望值（zh/en 两语言下 langZh/langEn 恒为「中文」/「English」）
const ZH = '中文';
const EN = 'English';
const AUTO_EN = 'Auto (follow browser)';
const ICON_EN = 'Country Code Helper';
const ICON_ZH = '区号助手';
const RM_FAV_EN = 'Remove from favorites';
const RM_FAV_ZH = '取消收藏';
const NONE_ZH = '无结果';
const SETTINGS_EN = 'Settings';
const SETTINGS_ZH = '设置';
const SEARCH_ZH = '搜索国家或区号…';

// ────────────────────────────────────────────────────────────────
// 验收 1：GM 菜单新增「设置」项 → 打开面板并显式切到设置所在视图
// ────────────────────────────────────────────────────────────────
test('验收1 GM 菜单「设置」项打开面板并显式切到设置所在视图', async ({ page }) => {
  await boot(page);
  await expect(page.locator('#cch-pop')).toHaveCount(0);
  await invokeMenuSettings(page);
  // ① 打开面板
  await expect(page.locator('#cch-pop')).toBeVisible();
  // ② 显式切到设置所在视图（不能只开面板停在列表视图）
  await expect(page.locator(SETTINGS_VIEW)).toBeVisible();
  await expect(page.locator('#cch-pop ' + LOCALE_ROW)).toBeVisible();
  // 列表 / 召唤 / 负反馈在设置视图下隐藏
  await expect(page.locator('#cch-pop .cch-sec-favs')).toBeHidden();
  await expect(page.locator('#cch-pop .cch-sec-all')).toBeHidden();
  await expect(page.locator('#cch-pop #cch-summon')).toBeHidden();
  await expect(page.locator('#cch-pop #cch-fb')).toBeHidden();
});

// ────────────────────────────────────────────────────────────────
// 验收 2：语言控件由循环按钮改为三选一显式控件（自动 / 中文 / English 并列可见）
// ────────────────────────────────────────────────────────────────
test('验收2 语言控件为三选一显式控件（自动 / 中文 / English 并列可见）', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openSettingsView(page);
  const row = page.locator('#cch-pop ' + LOCALE_ROW);
  await expect(row).toBeVisible();
  const opts = row.locator('[data-locale]');
  await expect(opts).toHaveCount(3);
  expect(await opts.evaluateAll((ns) => ns.map((n) => n.getAttribute('data-locale')))).toEqual(['auto', 'zh', 'en']);
  // 三选一「并列可见」：三者同时可见且同处一行（y 轴一致），非循环按钮 / 非下拉
  await expect(row.locator('[data-locale="auto"]')).toBeVisible();
  await expect(row.locator('[data-locale="zh"]')).toBeVisible();
  await expect(row.locator('[data-locale="en"]')).toBeVisible();
  await expect(row.locator('[data-locale="auto"]')).toHaveText(AUTO_EN);
  await expect(row.locator('[data-locale="zh"]')).toHaveText(ZH);
  await expect(row.locator('[data-locale="en"]')).toHaveText(EN);
  const tops = await opts.evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
  // 三选一语义 + 初始选中 auto
  await expect(row.locator('[role="radiogroup"]')).toHaveCount(1);
  await expect(row.locator('[data-locale="auto"]')).toHaveAttribute('aria-pressed', 'true');
  // 回归钉：循环按钮入口不得复活
  await expect(page.locator('#cch-locale-tg')).toHaveCount(0);
});

// ────────────────────────────────────────────────────────────────
// 验收 3：切换语言后全 UI 无漏刷（图标 title/aria-label、收藏行 title、空态文案）
// 关键路径：停在设置视图切语言（旧实现只在列表视图重渲染行 → 此处必漏刷）
// ────────────────────────────────────────────────────────────────
test('验收3 停在设置视图切换语言 → 全 UI 无漏刷', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  const icon = wrapperFor(page, '#cc-strong').locator('.cch-btn');
  // 前置：无偏好 → auto 跟随浏览器 en-US → 英文
  await expect(icon).toHaveAttribute('title', ICON_EN);
  await expect(icon).toHaveAttribute('aria-label', ICON_EN);
  // 收藏中国 → 产生「收藏行 title」可断言面
  await page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav').click();
  await expect(page.locator('.cch-list[data-sec="favs"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveAttribute('title', RM_FAV_EN);
  // 停在设置视图再切语言
  await openSettingsView(page);
  await page.locator('#cch-pop ' + LOCALE_ROW + ' [data-locale="zh"]').click();
  // ① 图标 title / aria-label
  await expect(icon).toHaveAttribute('title', ICON_ZH);
  await expect(icon).toHaveAttribute('aria-label', ICON_ZH);
  // ② 收藏行 title（旧实现漏刷点之一；两个列表都要刷到）
  await expect(page.locator('.cch-list[data-sec="favs"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveAttribute('title', RM_FAV_ZH);
  await expect(page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveAttribute('title', RM_FAV_ZH);
  // ③ 空态文案（旧实现漏刷点之二）
  await page.locator('#cch-si').fill('zzzz-no-such-country');
  await expect.poll(() => textOf(page, '.cch-list[data-sec="favs"] .cch-empty')).toBe(NONE_ZH);
  await expect.poll(() => textOf(page, '.cch-list[data-sec="all"] .cch-empty')).toBe(NONE_ZH);
  // ④ 面板 chrome 同步
  await expect(page.locator('#cch-si')).toHaveAttribute('placeholder', SEARCH_ZH);
  await expect(page.locator('.cch-sec-all .cch-sec-hd')).toHaveText('全部');
  // ⑤ 设置视图内的语言选项文案亦为中文
  await expect(page.locator('#cch-pop ' + LOCALE_ROW + ' [data-locale="zh"]')).toHaveText(ZH);
});

// ────────────────────────────────────────────────────────────────
// 验收 4：菜单标签无需重载即跟随（GM_registerMenuCommand id 原地更新）
// ────────────────────────────────────────────────────────────────
test('验收4 菜单标签免重载即跟随（id 原地更新，不新增条目）', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openSettingsView(page);
  const before = await page.evaluate(() => ({
    nav: (window as any).__nav,
    count: (window as any).__cchMenuCount,
    ids: ((window as any).__cchMenuIds || []).slice(),
    titles: ((window as any).__cchMenu || []).map((c: any) => c.title),
  }));
  expect(before.nav).toBe(1);
  expect(before.count).toBe(4);
  expect(before.ids).toEqual(['cch-menu-restore', 'cch-menu-panel', 'cch-menu-settings', 'cch-menu-diag']);
  expect(before.titles).toContain(SETTINGS_EN);
  // 切到中文 → 菜单标签必须原地跟随（无 reload）
  await page.locator('#cch-pop ' + LOCALE_ROW + ' [data-locale="zh"]').click();
  const after = await page.evaluate(() => ({
    nav: (window as any).__nav,
    count: (window as any).__cchMenuCount,
    ids: ((window as any).__cchMenuIds || []).slice(),
    titles: ((window as any).__cchMenu || []).map((c: any) => c.title),
  }));
  expect(after.nav).toBe(1);                    // 未发生导航 / 重载
  expect(after.count).toBe(4);                  // 不新增条目
  expect(after.ids).toEqual(before.ids);        // id 集合与顺序不变
  expect(new Set(after.ids).size).toBe(4);      // 无重复 id
  expect(after.titles).toContain(SETTINGS_ZH);  // 标签已跟随
  expect(after.titles).toContain('打开区号面板');
  expect(after.titles).not.toContain(SETTINGS_EN);
});

// ────────────────────────────────────────────────────────────────
// 验收 5：入口把语言行滚入可见区 + 高亮衰减；已开面板原地复用不重复入栈
// ────────────────────────────────────────────────────────────────
test('验收5 入口滚入可见区 + 高亮衰减；已开面板原地复用不重复入栈', async ({ page }) => {
  const many = Array.from({ length: 40 }, (_, i) => 'exempt-' + (i + 1) + '.example.com');
  await boot(page, { rules: { version: 1, exempt: many, overrides: [] } });
  // 先手动开面板停在列表视图（= 「已开面板」前置态）
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-pop')).toHaveCount(1);
  await invokeMenuSettings(page);
  // 原地复用：不重建面板、不重复入栈
  await expect(page.locator('#cch-pop')).toHaveCount(1);
  await expect(page.locator('#cch-rules-view')).toHaveCount(1);
  await expect(page.locator(SETTINGS_VIEW)).toBeVisible();
  const row = page.locator('#cch-pop ' + LOCALE_ROW);
  await expect(row).toBeVisible();
  // 前置：40 条豁免确实把设置区撑出滚动（否则本用例不构成「滚入可见区」的证据）
  const geo = await row.evaluate((el) => {
    const sc = el.closest('.cch-rules-bd') as HTMLElement;
    const rb = el.getBoundingClientRect();
    const sb = sc.getBoundingClientRect();
    return { scrollTop: sc.scrollTop, scrollMax: sc.scrollHeight - sc.clientHeight,
             inside: rb.top >= sb.top - 1 && rb.bottom <= sb.bottom + 1 };
  });
  expect(geo.scrollMax).toBeGreaterThan(0);
  expect(geo.scrollTop).toBeGreaterThan(0);
  expect(geo.inside).toBe(true);
  // 高亮脉冲 → 衰减（~1.5s 后自行脱落）
  await expect(row).toHaveClass(/cch-flash/);
  await expect.poll(() => row.evaluate((el) => el.classList.contains('cch-flash')), { timeout: 4000 }).toBe(false);
  // 二次入口：仍只有一个面板，且高亮可重入（连续两次「设置」不吞第二次）
  await invokeMenuSettings(page);
  await expect(page.locator('#cch-pop')).toHaveCount(1);
  await expect(row).toHaveClass(/cch-flash/);
});

// ────────────────────────────────────────────────────────────────
// 验收 6：豁免域名数量不影响语言控件可达性（0 条 / 40 条两臂）
// ────────────────────────────────────────────────────────────────
for (const n of [0, 40]) {
  test('验收6 豁免域名 ' + n + ' 条时语言控件仍可达可切', async ({ page }) => {
    const exempt = Array.from({ length: n }, (_, i) => 'exempt-' + (i + 1) + '.example.com');
    await boot(page, { rules: { version: 1, exempt: exempt, overrides: [] } });
    await invokeMenuSettings(page);
    await expect(page.locator(SETTINGS_VIEW)).toBeVisible();
    const row = page.locator('#cch-pop ' + LOCALE_ROW);
    await expect(row).toBeVisible();
    await expect(row.locator('[data-locale]')).toHaveCount(3);
    // 可达 = 真能点到（被遮挡 / 被挤出视口会让 click 超时）
    await row.locator('[data-locale="en"]').click();
    await expect(row.locator('[data-locale="en"]')).toHaveClass(/on/);
    const prefs = await page.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('__cch_gm__') || '{}').cch_ui_prefs_v1 || 'null'));
    expect(prefs.locale).toBe('en');
  });
}

// ────────────────────────────────────────────────────────────────
// 本票 delta：不新建独立设置视图、不重排设置顺序、深链目标用稳定标识符
// ────────────────────────────────────────────────────────────────
test('delta 不新建独立设置视图、不重排设置顺序', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await openSettingsView(page);
  // ① 设置面就是既有的 #cch-rules-view（唯一 data-cch-view 节点），未新建第二个视图容器
  await expect(page.locator('#cch-pop [data-cch-view]')).toHaveCount(1);
  await expect(page.locator('#cch-pop #cch-rules-view')).toHaveCount(1);
  await expect(page.locator('#cch-pop [data-cch-view]')).toHaveAttribute('data-cch-view', 'settings');
  // ② 未重排：语言行仍排在「低调样式」行之后（未被前置到设置区首位）
  const rows = page.locator('#cch-pop .cch-rules-bd > .cch-rule-row');
  const idxLocale = await rows.evaluateAll((ns) => ns.findIndex((n) => n.hasAttribute('data-cch-section')));
  const idxLowkey = await rows.evaluateAll((ns) => ns.findIndex((n) => !!n.querySelector('#cch-lowkey-tg')));
  expect(idxLowkey).toBeGreaterThanOrEqual(0);
  expect(idxLocale).toBeGreaterThan(idxLowkey);
  // ③ 深链目标以稳定标识符定位（不是 id 字面量 / 排序位置）
  await expect(page.locator('#cch-pop ' + LOCALE_ROW)).toHaveCount(1);
});
