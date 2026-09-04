// 绿色回归组：场景 A–E 自动断言，基线 = 01 迁移后行为（src/Find-Your-Country-Code.js v1.3.4 等价）。
// 覆盖：图标出现 / 面板开合 / 搜索过滤 / 填充终态与事件 / toast / 收藏持久化 / 动态注入。
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

async function recordEvents(page: Page, selector: string): Promise<void> {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel as string);
    if (!el) throw new Error('element not found: ' + sel);
    (window as any).__events = [];
    ['input', 'change', 'blur'].forEach((t) =>
      el.addEventListener(t, () => (window as any).__events.push(t)));
  }, selector);
}

test.describe('test-page.html（基础三场景）', () => {
  test('3 个区号下拉注入图标，普通 tel 输入不注入', async ({ page }) => {
    await page.goto('/test/test-page.html');
    await expect(page.locator('.cch-btn')).toHaveCount(3);
    await expect(wrapperFor(page, '#country-code')).toHaveCount(1);
    await expect(wrapperFor(page, '#country-code-phone')).toHaveCount(1);
    await expect(wrapperFor(page, '#area-code')).toHaveCount(1);
    await expect(wrapperFor(page, '#phone')).toHaveCount(0);
  });

  test('面板开合：图标点击切换 + 点击面板外部关闭', async ({ page }) => {
    await page.goto('/test/test-page.html');
    const btn = wrapperFor(page, '#country-code').locator('.cch-btn');
    await btn.click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await btn.click(); // 同一图标再次点击 = 关闭
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await btn.click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    await page.locator('h1').click(); // 外部 mousedown 关闭
    await expect(page.locator('#cch-pop')).toHaveCount(0);
  });

  test('搜索过滤 → 选择中国填充 +86，input/change/blur 事件各触发一次，toast 提示', async ({ page }) => {
    await page.goto('/test/test-page.html');
    await openPanel(page, '#country-code');
    await page.locator('#cch-si').fill('China');
    await expect(page.locator('.cch-row[data-iso="cn" i]')).toBeVisible();
    await recordEvents(page, '#country-code');
    await page.locator('.cch-row[data-iso="cn" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#country-code')).toHaveValue('+86');
    const events = await page.evaluate(() => (window as any).__events);
    expect(events).toEqual(['input', 'change', 'blur']);
    await expect(page.locator('#cch-toast')).toContainText('+86');
  });

  test('收藏中国 → 刷新后仍保持（GM 存储 → localStorage 替身）', async ({ page }) => {
    await page.goto('/test/test-page.html');
    await openPanel(page, '#country-code');
    // scope 到 all 区：收藏后 Favorites 区也会出现同一国家的行
    await page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav').click();
    await expect(page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveClass(/on/);
    await page.reload();
    await openPanel(page, '#country-code');
    await expect(page.locator('.cch-list[data-sec="all"] .cch-row[data-iso="cn" i] .cch-fav')).toHaveClass(/on/);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('__cch_gm__') || '{}'));
    const data = JSON.parse(stored['cch_v33'] || '{}');
    expect(Array.isArray(data.favs) ? data.favs.length : 0).toBe(1);
  });
});

test.describe('cch-test-page.html（检测矩阵 + Case11 动态）', () => {
  test('8 个应触发字段注入；Case9 省份 / Case10 单选项 负例不注入', async ({ page }) => {
    await page.goto('/test/cch-test-page.html');
    await expect(page.locator('.cch-btn')).toHaveCount(8);
    await expect(wrapperFor(page, '#c1_code')).toHaveCount(1); // Case1 name 关键词
    await expect(wrapperFor(page, '#dialCode')).toHaveCount(1); // Case2 id 关键词
    await expect(wrapperFor(page, '.phone-code-selector')).toHaveCount(1); // Case3 class 关键词
    // Case5 纯形态学：wrapper 会把 select 移出原父容器，不能用祖先链定位，改查自身最近的 wrapper
    const case5 = page.locator('.test-card', { hasText: 'Case 5' }).locator('select');
    await expect(case5).toHaveCount(1);
    expect(await case5.evaluate((el) => !!el.closest('.cch-wrapper'))).toBe(true);
    await expect(wrapperFor(page, 'select[data-name="area-code"]')).toHaveCount(1); // Case8 data-name
    await expect(wrapperFor(page, '#c9_province')).toHaveCount(0); // 负例：省份
    await expect(wrapperFor(page, '#c10_sel')).toHaveCount(0); // 负例：仅 1 个选项
  });

  test('Case11 动态注册表单：MutationObserver 防抖后 8 → 9', async ({ page }) => {
    await page.goto('/test/cch-test-page.html');
    await expect(page.locator('.cch-btn')).toHaveCount(8);
    await page.locator('#loadFormBtn').click();
    await expect(page.locator('.cch-btn')).toHaveCount(9, { timeout: 5000 }); // 页面 500ms 注入 + 脚本 350ms 防抖
    await expect(wrapperFor(page, 'select[name="phone-code"]')).toHaveCount(1);
    await expect(wrapperFor(page, '#dyn_country')).toHaveCount(0); // 国家下拉（非区号）不注入
  });
});

test.describe('cch-test-page2.html（场景 A–E）', () => {
  test('场景 A/B/C/E 检测矩阵：13 个字段注入（intl-tel-input 走本地 vendored 18.2.1）', async ({ page }) => {
    await page.goto('/test/cch-test-page2.html');
    // A：原生 select（+XX 值 / ISO 值 / 横排电话行）
    await expect(wrapperFor(page, '#sel-a1')).toHaveCount(1);
    await expect(wrapperFor(page, '#sel-a2')).toHaveCount(1);
    await expect(wrapperFor(page, '#sel-a3')).toHaveCount(1);
    // B：input 关键词
    await expect(wrapperFor(page, '#inp-b1')).toHaveCount(1);
    await expect(wrapperFor(page, '#inp-b2')).toHaveCount(1);
    await expect(wrapperFor(page, '#callingCode')).toHaveCount(1);
    // 票 02 起基线 12→13：#phonePrefix 由漏检（harness N4：INPUT_KW 无 prefix）转为低调注入
    await expect(wrapperFor(page, '#phonePrefix')).toHaveCount(1);
    // C：intl-tel-input 实例（C1 单个 + C2 双实例）
    await expect(wrapperFor(page, '#iti-phone-1')).toHaveCount(1);
    await expect(wrapperFor(page, '#iti-phone-2')).toHaveCount(1);
    await expect(wrapperFor(page, '#iti-phone-3')).toHaveCount(1);
    // E：综合注册表单（select + input + iti 各一）
    await expect(wrapperFor(page, '#reg-sel')).toHaveCount(1);
    await expect(wrapperFor(page, '#reg-dialcode')).toHaveCount(1);
    await expect(wrapperFor(page, '#reg-iti')).toHaveCount(1);
    await expect(page.locator('.cch-btn')).toHaveCount(13, { timeout: 10_000 });
  });

  test('场景 C 填充链路：面板选 Japan → toast 提示 +81、面板关闭（v18.2.1 基线）', async ({ page }) => {
    await page.goto('/test/cch-test-page2.html');
    await page.getByRole('button', { name: 'intl-tel-input' }).click(); // 切 tab，图标才可见可点
    await openPanel(page, '#iti-phone-1');
    await page.locator('#cch-si').fill('Japan');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#cch-toast')).toContainText('+81');
    // 注：当前引擎的 fillIti 在 v18.2.1 上不改变插件选中态（getInstance 不在 factory、
    // .instances 不在 factory、DOM 点击不同步选中）——“实例应同步 jp/+81”作为默认红断言
    // 收录在 fp-regression.spec.ts，待票 03（iti 适配层）转绿。
  });

  test('场景 D 动态注入：select/input/iti 三种字段自动补挂 3 个图标', async ({ page }) => {
    await page.goto('/test/cch-test-page2.html');
    await page.getByRole('button', { name: '动态注入' }).click(); // 切到动态 tab
    await page.getByRole('button', { name: '+ 注入 <select> 区号' }).click();
    await page.getByRole('button', { name: '+ 注入 <input> 区号' }).click();
    await page.getByRole('button', { name: '+ 注入 intl-tel-input' }).click();
    await expect(page.locator('#dynamic-zone .cch-btn')).toHaveCount(3, { timeout: 5000 });
  });
});

test.describe('tests/fixtures/dynamic-inject.html（动态注入回归样本）', () => {
  test('注入区号下拉后 MutationObserver 自动挂图标（当前行为绿）', async ({ page }) => {
    await page.goto('/fixtures/dynamic-inject.html');
    await expect(page.locator('.cch-btn')).toHaveCount(0); // 注入前无图标
    await page.locator('#inject-btn').click();
    await expect(wrapperFor(page, '#dyn-phone-code')).toHaveCount(1, { timeout: 5000 });
  });
});
