// 票 09 框架注入加固 E2E：React 18 受控组件 + Vue 3 v-model 值同步 + 三类元素统一注入。
// fixture 本地 vendored（tests/server.mjs /vendor/react|react-dom|vue 路由，hermetic 无外网）。
// React 19 未专项核验（atomcode 缺口 5）——本 spec 仅以 React 18.3.1 UMD 为验收基线。
// 证据源：research/atomcode-industry-models.md 核心结论 9（native setter + 事件序列行业共识）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 在目标元素上记录 input/change/blur 序列与冒泡/composed 事实
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

test.describe('React 18 受控组件（tests/fixtures/framework-react.html）', () => {
  test('react-select：面板选 +86 后 React 状态真实同步（受控 select 填充终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-react.html');
    await expect(wrapperFor(page, '#r-select')).toHaveCount(1);
    await openPanel(page, '#r-select');
    await recordEvents(page, '#r-select');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // DOM 终态 + React 组件状态终态 + 提交回读三重断言
    await expect(page.locator('#r-select')).toHaveValue('+86');
    await expect(page.locator('#r-state')).toHaveText('{"code":"+86","phone":""}');
    await page.locator('#r-submit').click();
    await expect(page.locator('#r-submitted')).toHaveText('{"code":"+86","phone":""}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });

  test('react-input：面板选 +81 后 React 状态真实同步（受控 input 填充终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-react.html');
    await expect(wrapperFor(page, '#r-input')).toHaveCount(1);
    await openPanel(page, '#r-input');
    await recordEvents(page, '#r-input');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#r-input')).toHaveValue('+81');
    await expect(page.locator('#r-state')).toHaveText('{"code":"","phone":"+81"}');
    await page.locator('#r-submit').click();
    await expect(page.locator('#r-submitted')).toHaveText('{"code":"","phone":"+81"}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });
});

test.describe('Vue 3 v-model（tests/fixtures/framework-vue.html）', () => {
  test('vue-select：面板选 +86 后 v-model 状态同步', async ({ page }) => {
    await page.goto('/fixtures/framework-vue.html');
    await expect(wrapperFor(page, '#v-select')).toHaveCount(1);
    await openPanel(page, '#v-select');
    await recordEvents(page, '#v-select');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#v-select')).toHaveValue('+86');
    await expect(page.locator('#v-state')).toHaveText('{"code":"+86","phone":""}');
    await page.locator('#v-submit').click();
    await expect(page.locator('#v-submitted')).toHaveText('{"code":"+86","phone":""}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });

  test('vue-input：面板选 +81 后 v-model 状态同步', async ({ page }) => {
    await page.goto('/fixtures/framework-vue.html');
    await expect(wrapperFor(page, '#v-input')).toHaveCount(1);
    await openPanel(page, '#v-input');
    await recordEvents(page, '#v-input');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#v-input')).toHaveValue('+81');
    await expect(page.locator('#v-state')).toHaveText('{"code":"","phone":"+81"}');
    await page.locator('#v-submit').click();
    await expect(page.locator('#v-submitted')).toHaveText('{"code":"","phone":"+81"}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });
});

test.describe('统一注入层（tests/fixtures/unified-inject.html）', () => {
  test('三类元素事件序列一致（input→change→blur），冒泡且 composed 到达 form', async ({ page }) => {
    await page.goto('/fixtures/unified-inject.html');
    await expect(wrapperFor(page, '#s-dial')).toHaveCount(1);
    await expect(wrapperFor(page, '#i-dial')).toHaveCount(1);

    await openPanel(page, '#s-dial');
    await page.locator('.cch-row[data-iso="gb" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#s-dial')).toHaveValue('+44');
    expect(await page.evaluate(() => (window as any).__seq['s-dial'])).toEqual(['input', 'change', 'blur']);
    expect(await page.evaluate(() => (window as any).__bubbles['s-dial'])).toBe(true);
    expect(await page.evaluate(() => (window as any).__composed['s-dial'])).toBe(true);

    await openPanel(page, '#i-dial');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#i-dial')).toHaveValue('+86');
    expect(await page.evaluate(() => (window as any).__seq['i-dial'])).toEqual(['input', 'change', 'blur']);
    expect(await page.evaluate(() => (window as any).__bubbles['i-dial'])).toBe(true);
    expect(await page.evaluate(() => (window as any).__composed['i-dial'])).toBe(true);
  });
});
