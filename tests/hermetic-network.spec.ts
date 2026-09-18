// 票 39 delta 精化 / D-012 正向补偿自证：密封层运行时网络封锁。
//
// 不变量（CONTEXT.md「密封 E2E」）：密封层不触真实站点与外网 —— 供给边界。
// 引用位文本断言（verify-ticket-39 G4e）可被字符串拼接绕过；本 spec 证明封锁钉在
// **请求层**：非本地 origin 一律被 abort 且被记录，本地供给照常放行。
// 两者互补：文本断言管「写没写」，运行封锁管「发不发得出去」。
import { test, expect } from 'playwright/test';
import { installUserscript, blockedRequests, wrapperFor } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('密封层运行时网络封锁（票 39 delta / D-012）', () => {
  test('正向：非本地 origin 的可发起引用被 abort 且被记录', async ({ page }) => {
    await page.goto('/fixtures/network-canary.html');
    await expect.poll(
      () => blockedRequests(page).some((u) => u.includes('external.invalid')),
      { message: 'canary 页的 external.invalid 请求应被运行时封锁 abort 并记录' },
    ).toBe(true);
    await expect(page.locator('#canary-field')).toBeAttached();
  });

  test('负向对照：本地供给不被阻断，注入照常成立', async ({ page }) => {
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    await expect(wrapperFor(page, '#anchor-cc')).toHaveCount(1);
    expect(blockedRequests(page)).toHaveLength(0);
  });
});
