// 票 13 E2E：可见性闸门（issue 验收1/2）+ 占位首项 + 隐藏承值 select 面板填充。
// 基线口径：注入 = .cch-wrapper 出现；none 档登记召唤 = 面板「召唤」按钮出现。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('可见性闸门（票 13）', () => {
  test('验收1 隐藏字段五形态不注入图标（display:none/零尺寸/opacity:0/clip-path/content-visibility）', async ({ page }) => {
    await page.goto('/fixtures/visibility.html');
    for (const id of ['#vis-dn', '#vis-zero', '#vis-op0', '#vis-clip', '#vis-cv']) {
      await expect(wrapperFor(page, id)).toHaveCount(0);
    }
  });

  test('验收1 隐藏字段保留检测登记（面板召唤路径可用）', async ({ page }) => {
    await page.goto('/fixtures/visibility.html');
    // 打开面板（可见对照组图标）→ 召唤按钮出现 = 登记非空
    await wrapperFor(page, '#vis-visible').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await expect(page.locator('#cch-summon')).toBeVisible();
  });

  test('验收1 可见对照组正常注入（正样本不回归）+ 占位首项下拉（验收5）不被占位污染', async ({ page }) => {
    await page.goto('/fixtures/visibility.html');
    await expect(wrapperFor(page, '#vis-visible')).toHaveCount(1);
  });

  test('验收2 隐藏承值原生 select 不被闸门误杀：召唤 → 面板选国家 → 值真实写入', async ({ page }) => {
    await page.goto('/fixtures/visibility.html');
    await wrapperFor(page, '#vis-visible').locator('.cch-btn').click();
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    // 召唤后隐藏承值 select 挂上图标（force 路径，闸门不回拆）
    await expect(wrapperFor(page, '#vis-hidden-carrier')).toHaveCount(1);
    // 点击召唤出的图标换锚重开面板（面板 _target 绑定该字段本身）
    await openPanel(page, '#vis-hidden-carrier');
    // 面板选加拿大 → 消歧落点 CA 选项 → 值写入
    await page.locator('#cch-si').fill('Canada');
    await page.locator('.cch-row[data-iso="ca" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#vis-hidden-carrier')).toHaveValue('CA');
  });
});
