// 默认红回归组（TDD 红，不是基建失败）：
// 误报 5 类样本断言“不插图标”，当前引擎会误插 → 用例失败（被 test.fail 标记为预期红）。
// 待票 02（评分引擎）修复后断言转绿 → Playwright 将报 unexpectedly passed（红名单需要摘除标记）。
// shadow DOM 样本断言“穿透识别”，待票 04 转绿。
// 证据源：.scratch/architecture-recovery/research/misdetection-root-causes.md §2/§4（reproduced 样本）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('误报 5 类（默认红，待票 02 转绿）', () => {
  // 正例控件先行：证明扫描确实运行过，之后 5 类的“无图标”断言才有效
  test.beforeEach(async ({ page }) => {
    await page.goto('/fixtures/fp-regression.html');
    await expect(wrapperFor(page, '#fp-control')).toHaveCount(1);
  });

  for (const [id, desc, target] of [
    ['fp-1', '① prefix 歧义：称谓下拉 name="prefix" 不插图标（F1）', '#fp-prefix'],
    ['fp-2', '② 裸词“区号”：固话本地区号下拉 010/020/0755/021 不插图标（F4）', '#fp-area-local'],
    ['fp-3', '③ 纯数字选项形态学：时区下拉 GMT+8… 不插图标（F5）', '#fp-timezone'],
    ['fp-4', '④ 国家选择混同：name="country" ISO 值下拉不插图标（F2）', '#fp-country'],
    ['fp-5', '⑤ class 子串撞库：class 含 hidden（→idd）数量下拉不插图标（F6）', '#fp-qty'],
  ] as const) {
    test.fail(`${id} ${desc}`, async ({ page }) => {
      await expect(wrapperFor(page, target)).toHaveCount(0);
    });
  }
});

test.describe('shadow DOM 漏检（默认红，待票 04 转绿）', () => {
  test.fail('open shadow root 内的区号下拉应被识别并注入图标', async ({ page }) => {
    await page.goto('/fixtures/shadow-dom.html');
    // Playwright locator 自动穿透 open shadow root
    await expect(page.locator('.cch-btn')).toHaveCount(1, { timeout: 3000 });
  });
});

test.describe('iti v18.2.1 填充缺口（默认红，待票 03 转绿）', () => {
  test.fail('面板选 Japan 后 iti 插件选中态应同步为 jp/+81（现状：仅 toast，实例不变）', async ({ page }) => {
    await page.goto('/test/cch-test-page2.html');
    await page.getByRole('button', { name: 'intl-tel-input' }).click();
    await openPanel(page, '#iti-phone-1');
    await page.locator('#cch-si').fill('Japan');
    await page.locator('.cch-row[data-iso="jp" i]').click();
    const data = await page.evaluate(() => {
      const w = window as any;
      const iti = w.intlTelInputGlobals || w.intlTelInput; // v18.2.1 静态方法在 globals 上
      const c = iti.getInstance(document.getElementById('iti-phone-1')).getSelectedCountryData();
      return { iso2: c.iso2, dialCode: c.dialCode };
    });
    expect(data).toEqual({ iso2: 'jp', dialCode: '81' });
  });
});
