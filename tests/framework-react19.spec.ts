// 票 15 React 19 受控组件 E2E：能力探测命中 → 强制 diff 兜底；填充后组件状态与提交值真实同步。
// fixture hermetic：React 19 不再发布 UMD，tests/server.mjs 现场把 npm 生产构建（react19/react-dom19
// 别名包）转译为 ESM 供给（/gen/react19/*），无外部 CDN。React 16–18 基线回归见 framework-inject.spec.ts。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 在目标元素上记录 input/change/blur 序列与冒泡/composed 事实（与票 09 spec 同法）
async function recordEvents(page: import('playwright/test').Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel as string);
    if (!el) throw new Error('element not found: ' + sel);
    (window as any).__events = [];
    (window as any).__evtMeta = null;
    ['input', 'change', 'blur'].forEach((t) =>
      el.addEventListener(t, (ev: Event) => {
        (window as any).__events.push(t);
        if (!(window as any).__evtMeta) (window as any).__evtMeta = { bubbles: ev.bubbles, composed: ev.composed };
      }));
  }, selector);
}

test.describe('React 19 受控组件（tests/fixtures/framework-react19.html）', () => {
  test('react19 页面健康：ESM 装载无 BOOT-ERROR + 扫描注入就绪', async ({ page }) => {
    await page.goto('/fixtures/framework-react19.html');
    await expect(page.locator('#r19-boot-error')).toBeHidden();
    await expect(wrapperFor(page, '#r19-select')).toHaveCount(1);
    await expect(wrapperFor(page, '#r19-input')).toHaveCount(1);
  });

  test('react19-select：面板选 +86 后 React 状态真实同步（探测兜底路径终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-react19.html');
    await expect(wrapperFor(page, '#r19-select')).toHaveCount(1);
    await openPanel(page, '#r19-select');
    await recordEvents(page, '#r19-select');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // DOM 终态 + React 组件状态终态 + 提交回读三重断言
    await expect(page.locator('#r19-select')).toHaveValue('+86');
    await expect(page.locator('#r19-state')).toHaveText('{"code":"+86","phone":""}');
    await page.locator('#r19-submit').click();
    await expect(page.locator('#r19-submitted')).toHaveText('{"code":"+86","phone":""}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });

  test('react19-input：面板选 +81 后 React 状态真实同步（探测兜底路径终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-react19.html');
    await expect(wrapperFor(page, '#r19-input')).toHaveCount(1);
    await openPanel(page, '#r19-input');
    await recordEvents(page, '#r19-input');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#r19-input')).toHaveValue('+81');
    await expect(page.locator('#r19-state')).toHaveText('{"code":"","phone":"+81"}');
    await page.locator('#r19-submit').click();
    await expect(page.locator('#r19-submitted')).toHaveText('{"code":"","phone":"+81"}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });
});
