// 票 40 E2E：嵌套帧治理降级反馈（三层嵌套 + shadow 包裹 + 校验失败降级）。
// 覆盖：孙帧（跨域·第三层）点图标 → 顶层开面板；孙帧远程面板选国 → postMessage 回孙帧填充；
// shadow 包裹跨域帧点图标 → 顶层开面板；外来 window 伪造 open 消息 → 校验拒绝 +
// 顶层可见 toast（不再静默 return，校验语义不放松）。
import { test, expect } from 'playwright/test';
import { installUserscript } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 跨域端口 = 主端口 + 1（tests/server.mjs 双端口同 handler）
const ALT = 'http://127.0.0.1:' + (Number(process.env.E2E_PORT || 4273) + 1);

function midFrame(page: any) { return page.frameLocator('iframe[src*="iframe-mid.html"]'); }
function midXFrame(page: any) { return page.frameLocator('#f-mid-x'); }
function grandXFrame(page: any) { return midXFrame(page).frameLocator('iframe[src*="iframe-child"]'); }
function grandFrame(page: any) { return midFrame(page).frameLocator('iframe[src*="iframe-child"]'); }
// shadow 包裹帧：playwright css 定位器默认穿透 open shadowRoot
function shadowFrame(page: any) { return page.frameLocator('#f-shadow-x'); }
function wrapperTop(page: any) {
  return page.locator('.cch-wrapper', { has: page.locator('#top-cc') });
}

test.describe('三层嵌套帧治理（票 40）', () => {
  test('孙帧（跨域·第三层）注入图标并点击 → 顶层开面板', async ({ page }) => {
    await page.goto('/fixtures/iframe-nested.html');
    await expect(wrapperTop(page)).toHaveCount(1);
    // 孙帧内脚本注入（@match 命中即注入）
    await expect(grandFrame(page).locator('.cch-wrapper')).toHaveCount(2);
    await grandFrame(page).locator('#child-cc').locator('..').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    // 面板宿主仍仅顶层：孙帧文档无宿主节点
    expect(await grandFrame(page).locator('#cch-root, #cch-pop').count()).toBe(0);
  });

  test('孙帧远程面板选国 → postMessage 回孙帧填充（值 + 事件序列）', async ({ page }) => {
    await page.goto('/fixtures/iframe-nested.html');
    await grandFrame(page).locator('#child-cc').locator('..').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await page.locator('#cch-si').fill('China');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(grandFrame(page).locator('#child-cc')).toHaveValue('+86');
    const seq = await grandFrame(page).locator('body').evaluate(() => (window as any).__seq);
    expect(seq).toEqual(['input', 'change', 'blur']);
  });

  test('shadow 包裹的跨域帧点图标 → 顶层开面板', async ({ page }) => {
    await page.goto('/fixtures/iframe-nested.html');
    await expect(wrapperTop(page)).toHaveCount(1);
    await expect(shadowFrame(page).locator('.cch-wrapper')).toHaveCount(2);
    await shadowFrame(page).locator('#child-cc').locator('..').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
  });
  test('跨域中间帧下游的孙帧点图标 → 顶层开面板（跨域 Window 索引枚举）', async ({ page }) => {
    await page.goto('/fixtures/iframe-nested.html');
    await expect(wrapperTop(page)).toHaveCount(1);
    // mid-x 与顶层跨域（4274），其内孙帧与 mid-x 同源（仍与顶层跨域）——
    // 顶层读不进 mid-x 的 document，只能经跨域 Window 索引枚举到孙帧
    await expect(grandXFrame(page).locator('.cch-wrapper')).toHaveCount(2);
    await grandXFrame(page).locator('#child-cc').locator('..').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
  });

  test('外来 window 伪造 open 消息 → 校验拒绝 + 顶层可见 toast（不静默、不放宽）', async ({ page }) => {
    await page.goto('/fixtures/iframe-nested.html');
    await expect(wrapperTop(page)).toHaveCount(1); // 等脚本就绪
    // 弹窗不是本页嵌套帧——票 24 威胁模型的「弹窗/无关 window 伪造」路径；
    // 弹窗用跨域 URL，使 e.origin 强校验必然失败、只剩来源锚点一关
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.evaluate((alt) => { window.open(alt + '/fixtures/iframe-child.html', '_blank'); }, ALT),
    ]);
    await popup.waitForLoadState('domcontentloaded');
    await popup.evaluate(() => {
      if (window.opener) window.opener.postMessage({ __cch: 'cch-frame-v1', type: 'open' }, '*');
    });
    await expect(page.locator('#cch-toast')).toBeVisible();
    await expect(page.locator('#cch-toast')).not.toBeEmpty();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await popup.close();
  });
});
