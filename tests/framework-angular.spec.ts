// 票 T2（#11）：Angular 20 最小 fixture 两枚——模板驱动 ngModel + 响应式自定义 CVA。
// E2E 证明原生事件序列（原型 value setter + input→change→blur）在 Angular 受控组件上
// 状态真实同步：select 经 SelectControlValueAccessor 的 change 监听、input 经
// DefaultValueAccessor / 自定义 CVA registerOnChange 的 input 监听写进组件/表单状态。
// fixture 应用源码 tests/fixtures/angular-apps/，server.mjs /gen/angular/ 路由现场
// esbuild JIT bundle（Angular 无 UMD，无法像 react/vue 直供构建产物）；zone.js 走 vendor 路由。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 在目标元素上记录 input/change/blur 序列与冒泡/composed 事实（与 framework-inject.spec.ts 同款）
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

test.describe('Angular 20 模板驱动 ngModel（tests/fixtures/framework-angular-ngmodel.html）', () => {
  test('ngmodel-select：面板选 +86 后组件状态真实同步（ngModel select 填充终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-angular-ngmodel.html');
    await expect(wrapperFor(page, '#a-select')).toHaveCount(1);
    await openPanel(page, '#a-select');
    await recordEvents(page, '#a-select');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // DOM 终态 + 组件状态终态（ngModel 绑定回读）+ 提交回读三重断言
    await expect(page.locator('#a-select')).toHaveValue('+86');
    await expect(page.locator('#a-state')).toHaveText('{"code":"+86","phone":""}');
    await page.locator('#a-submit').click();
    await expect(page.locator('#a-submitted')).toHaveText('{"code":"+86","phone":""}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });

  test('ngmodel-input：面板选 +81 后组件状态真实同步（ngModel input 填充终态）', async ({ page }) => {
    await page.goto('/fixtures/framework-angular-ngmodel.html');
    await expect(wrapperFor(page, '#a-input')).toHaveCount(1);
    await openPanel(page, '#a-input');
    await recordEvents(page, '#a-input');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#a-input')).toHaveValue('+81');
    await expect(page.locator('#a-state')).toHaveText('{"code":"","phone":"+81"}');
    await page.locator('#a-submit').click();
    await expect(page.locator('#a-submitted')).toHaveText('{"code":"","phone":"+81"}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });
});

test.describe('Angular 20 响应式自定义 CVA（tests/fixtures/framework-angular-cva.html）', () => {
  test('cva-input：面板选 +81 后 FormControl 状态真实同步（经 CVA registerOnChange）', async ({ page }) => {
    await page.goto('/fixtures/framework-angular-cva.html');
    await expect(wrapperFor(page, '#a-cva-input')).toHaveCount(1);
    // touched 前态：填充前未触碰（证明后述 true 来自填充序列的 blur，而非初始态）
    await expect(page.locator('#a-cva-touched')).toHaveText('false');
    await openPanel(page, '#a-cva-input');
    await recordEvents(page, '#a-cva-input');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // touched 后态：填充序列的 blur 经内层 input (blur) 绑定进 onTouched（CodeRabbit review 修正）
    await expect(page.locator('#a-cva-touched')).toHaveText('true');
    // DOM 终态 + FormControl 终态（form.value 回读）+ 提交回读三重断言
    await expect(page.locator('#a-cva-input')).toHaveValue('+81');
    await expect(page.locator('#a-cva-state')).toHaveText('{"dialCode":"+81"}');
    await expect(page.locator('#a-cva-touched')).toHaveText('true');
    await page.locator('#a-cva-submit').click();
    await expect(page.locator('#a-cva-submitted')).toHaveText('{"dialCode":"+81"}');
    expect(await page.evaluate(() => (window as any).__events)).toEqual(['input', 'change', 'blur']);
  });
});
