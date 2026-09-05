// 票 12 E2E：iframe 帧治理（同源 + 跨域 fixture）。
// 覆盖：@match 命中即注入前提（同/跨域子帧都有图标）、面板宿主仅顶层（子帧无 #cch-root/#cch-pop）、
// 子帧检测与填充行为同源（远程面板 → postMessage → 子帧 Fill.run，值与事件序列断言）、
// 跨帧存储一致（顶层收藏 → 子帧面板可见）、跨域双向 postMessage。
import { test, expect } from 'playwright/test';
import { installUserscript, userscriptCode } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 子帧 frame 定位器（按 URL 段匹配，同源/跨域通用）
function childFrame(page, urlPart: string) {
  return page.frameLocator(`iframe[src*="${urlPart}"]`);
}


test.describe('平台元数据（票 12 验收 1/检查点三）', () => {
  test('产物头：@match 全帧 + 无 @noframes + GM_registerMenuCommand 入 grant', () => {
    const code = userscriptCode();
    expect(code).toMatch(/@match\s+\*:\/\/\*\//);              // @match 命中任意 http(s) URL(含子帧)
    expect(code).not.toMatch(/@noframes/);                        // 显式全帧启用:不设 @noframes
    expect(code).toMatch(/@grant\s+GM_registerMenuCommand\b/);   // 菜单命令权限列入 grant
  });
});

for (const fixture of ['iframe-same-origin.html', 'iframe-cross-origin.html']) {
  test.describe(`iframe 帧治理（${fixture}）`, () => {
    test('顶层与子帧各自检测注入；面板宿主仅顶层渲染', async ({ page }) => {
      await page.goto('/fixtures/' + fixture);
      // 顶层字段注入
      await expect(wrapperTop(page)).toHaveCount(1);
      // 子帧字段注入（@match 命中子帧 URL 即注入的直接证据）
      const childSel = childFrame(page, 'iframe-child').locator('#child-cc');
      await expect(childSel).toHaveCount(1);
      await expect(childFrame(page, 'iframe-child').locator('.cch-wrapper')).toHaveCount(2);
      // 面板宿主仅顶层：顶层可有 #cch-root（面板打开时创建），子帧文档永远没有
      await childSel.locator('..').locator('.cch-btn').click();
      await expect(page.locator('#cch-pop')).toBeVisible(); // 面板出现在顶层文档
      const childHasHost = await childFrame(page, 'iframe-child').locator('#cch-root, #cch-pop').count();
      expect(childHasHost).toBe(0);
    });

    test('子帧填充：远程面板选国家 → postMessage 回子帧 → 值与事件序列正确', async ({ page }) => {
      await page.goto('/fixtures/' + fixture);
      const childSel = childFrame(page, 'iframe-child').locator('#child-cc');
      await childSel.locator('..').locator('.cch-btn').click();
      await expect(page.locator('#cch-pop')).toBeVisible();
      await page.locator('#cch-si').fill('China');
      await page.locator('.cch-row[data-iso="cn" i]').click();
      // 终态：子帧 select 值 = +86
      await expect(childSel).toHaveValue('+86');
      // 事件序列在子帧内记录（填充发生在子帧,行为同源）
      const seq = await childFrame(page, 'iframe-child').locator('body').evaluate(() => (window as any).__seq);
      expect(seq).toEqual(['input', 'change', 'blur']);
    });
  });
}

test.describe('跨帧存储一致性', () => {
  test('顶层收藏 → 子帧远程面板可见同一份收藏（GM 存储同源读取）', async ({ page }) => {
    await page.goto('/fixtures/iframe-same-origin.html');
    // 顶层开面板收藏中国
    await wrapperTop(page).locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav').click();
    await expect(page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveClass(/on/);
    await page.keyboard.press('Escape');
    await page.locator('h1').click(); // 关面板
    // 子帧开面板：收藏区出现中国（读同一 GM 存储）
    await childFrame(page, 'iframe-child').locator('#child-cc').locator('..').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await expect(page.locator('.cch-list[data-sec="favs"] .cch-row[data-iso="cn" i]')).toBeVisible();
  });
});

test.describe('菜单命令注册（元数据 grant + 顶层注册）', () => {
  test('GM_registerMenuCommand 仅顶层注册一次', async ({ page }) => {
    await page.goto('/fixtures/iframe-same-origin.html');
    await expect(wrapperTop(page)).toHaveCount(1); // 等脚本就绪
    const topCount = await page.evaluate(() => (window as any).__cchMenuCount || 0);
    expect(topCount).toBe(1);
    const childCount = await childFrame(page, 'iframe-child').locator('body').evaluate(() => (window as any).__cchMenuCount || 0);
    expect(childCount).toBe(0);
  });
});

function wrapperTop(page: any) {
  return page.locator('.cch-wrapper', { has: page.locator('#top-cc') });
}
