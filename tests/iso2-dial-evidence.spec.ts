// 票 28 E2E：ISO2 作 value + 选项文本括号区号的下拉（A-002）被识别为区号字段；
// 护栏1 纯 ISO2 国家选择器仍不注入（「国家选择器 ≠ 区号字段」抑制保持有效）；
// 护栏2 共享区号（+1 多国）注入不回退且消歧落点正确。
// 基线口径：注入 = .cch-wrapper 出现（lowkey 低调注入同样挂 wrapper）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('票 28 ISO2-value 括号区号证据（A-002）', () => {
  // 正例对照先行：证明扫描确实运行过，之后「无图标」断言才有效
  test('对照：普通区号下拉注入（证明扫描已运行）', async ({ page }) => {
    await page.goto('/fixtures/iso2-dial-evidence.html');
    await expect(wrapperFor(page, '#ctrl-dial')).toHaveCount(1);
  });

  test('A-002 正例：ISO2 作 value + 文本括号区号下拉被识别为区号字段并低调注入', async ({ page }) => {
    await page.goto('/fixtures/iso2-dial-evidence.html');
    await expect(wrapperFor(page, '#iso2-paren')).toHaveCount(1);
  });

  test('护栏1：纯 ISO2 国家选择器（无括号区号）仍不注入', async ({ page }) => {
    await page.goto('/fixtures/iso2-dial-evidence.html');
    await expect(wrapperFor(page, '#iso2-plain')).toHaveCount(0);
  });

  test('护栏2：共享区号 +1（US/CA）下拉注入不回退，且消歧落点至 Canada', async ({ page }) => {
    await page.goto('/fixtures/iso2-dial-evidence.html');
    await expect(wrapperFor(page, '#shared-dial')).toHaveCount(1);
    await openPanel(page, '#shared-dial');
    await page.locator('#cch-si').fill('Canada');
    await page.locator('.cch-row[data-iso="ca" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    const idx = await page.evaluate(() => (document.querySelector('#shared-dial') as HTMLSelectElement).selectedIndex);
    expect(idx).toBe(1);
  });
});
