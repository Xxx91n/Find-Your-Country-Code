// 票 04 验收组：DOM 复用重评（双向纠正）/ SPA 路由重扫（三 API）/ 性能基线（1000 节点防抖窗口）。
// shadow DOM 穿透断言在 fp-regression.spec.ts（票 06 预留用例，本票转绿）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('DOM 复用重评（属性指纹变化 → 双向纠正）', () => {
  test('区号 select 被框架复用为月份枚举 → 图标移除（误挂纠正）', async ({ page }) => {
    await page.goto('/fixtures/dom-reuse.html');
    await expect(wrapperFor(page, '#reuse-sel')).toHaveCount(1);
    await page.locator('#to-excluded').click();
    await expect(wrapperFor(page, '#reuse-sel')).toHaveCount(0, { timeout: 3000 });
  });

  test('普通 select 被框架复用为区号字段 → 图标补上（漏挂纠正）', async ({ page }) => {
    await page.goto('/fixtures/dom-reuse.html');
    await expect(wrapperFor(page, '#late-sel')).toHaveCount(0);
    await page.locator('#to-included').click();
    await expect(wrapperFor(page, '#late-sel')).toHaveCount(1, { timeout: 3000 });
  });

  test('字段被禁用 → 图标移除；重新启用 → 图标补回', async ({ page }) => {
    await page.goto('/fixtures/dom-reuse.html');
    await expect(wrapperFor(page, '#reuse-sel')).toHaveCount(1);
    await page.locator('#reuse-sel').evaluate((el) => { el.disabled = true; });
    await expect(wrapperFor(page, '#reuse-sel')).toHaveCount(0, { timeout: 3000 });
    await page.locator('#reuse-sel').evaluate((el) => { el.disabled = false; });
    await expect(wrapperFor(page, '#reuse-sel')).toHaveCount(1, { timeout: 3000 });
  });
});

test.describe('SPA 路由 hook（pushState / replaceState / popstate）', () => {
  test('pushState 路由切换后新视图字段被重扫注入', async ({ page }) => {
    await page.goto('/fixtures/spa-router.html');
    await expect(page.locator('.cch-btn')).toHaveCount(0);
    await page.locator('#ps-btn').click();
    await expect(wrapperFor(page, '#ps-code')).toHaveCount(1, { timeout: 3000 });
  });

  test('replaceState 路由切换后新视图字段被重扫注入', async ({ page }) => {
    await page.goto('/fixtures/spa-router.html');
    await expect(page.locator('.cch-btn')).toHaveCount(0);
    await page.locator('#rs-btn').click();
    await expect(wrapperFor(page, '#rs-code')).toHaveCount(1, { timeout: 3000 });
  });

  test('popstate（浏览器返回）后路由视图字段被重扫注入', async ({ page }) => {
    await page.goto('/fixtures/spa-router.html');
    await expect(page.locator('.cch-btn')).toHaveCount(0);
    await page.locator('#ps-btn').click(); // 先 push 一条历史
    await expect(wrapperFor(page, '#ps-code')).toHaveCount(1, { timeout: 3000 });
    await page.goBack(); // 同文档历史回退 → popstate → 懒渲染 view-po
    await expect(wrapperFor(page, '#po-code')).toHaveCount(1, { timeout: 3000 });
  });
});

test.describe('重扫防抖 + 性能基线（1000 节点级）', () => {
  test('静态 ~1200 节点页面检出字段；增量注入 200 节点后在防抖窗口内检出新字段', async ({ page }) => {
    await page.goto('/fixtures/perf-1000.html');
    await page.waitForFunction(() => window.__cchPerf && window.__cchPerf.scans > 0);
    await expect(wrapperFor(page, '#perf-code')).toHaveCount(1);
    const before = await page.evaluate(() => ({ scans: window.__cchPerf.scans, nodes: document.getElementsByTagName('*').length }));
    expect(before.nodes).toBeGreaterThanOrEqual(1000);
    await page.locator('#perf-add').click();
    await expect(wrapperFor(page, '#perf-code2')).toHaveCount(1, { timeout: 3000 });
    const after = await page.evaluate(() => ({ scans: window.__cchPerf.scans, maxMs: window.__cchPerf.maxMs, nodes: document.getElementsByTagName('*').length }));
    expect(after.scans).toBeGreaterThan(before.scans);
    // 性能基线：任意单次 scan 耗时 < 350ms 防抖窗口（RESCAN_DEBOUNCE_MS）
    expect(after.maxMs).toBeLessThan(350);
  });

  test('路由 hook 引擎级归因：无 DOM 变更时 pushState/replaceState/popstate 仍触发重扫', async ({ page }) => {
    // 归因口径：perf 页无路由 handler、页面静态 → 扫描计数增长只能来自路由 hook（MO 无触发源）
    await page.goto('/fixtures/perf-1000.html');
    await page.waitForFunction(() => window.__cchPerf && window.__cchPerf.scans > 0);
    await page.waitForTimeout(600); // 静置过初始防抖窗口
    const n0 = await page.evaluate(() => window.__cchPerf.scans);
    await page.evaluate(() => history.pushState({}, '', '?hook-ps'));
    await page.waitForTimeout(600);
    const n1 = await page.evaluate(() => window.__cchPerf.scans);
    expect(n1).toBeGreaterThan(n0);
    await page.evaluate(() => history.replaceState({}, '', '?hook-rs'));
    await page.waitForTimeout(600);
    const n2 = await page.evaluate(() => window.__cchPerf.scans);
    expect(n2).toBeGreaterThan(n1);
    await page.goBack(); // popstate（本页无 handler → 无 DOM 变更）
    await page.waitForTimeout(600);
    const n3 = await page.evaluate(() => window.__cchPerf.scans);
    expect(n3).toBeGreaterThan(n2);
  });
});
