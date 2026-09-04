// 误报回归组：
// 误报 5 类样本断言“不插图标”——票 02（五层评分引擎）落地后已转绿，test.fail 标记已按
// 06 报告 §6.2 的维护契约摘除（引擎级证据：research/scripts/verify-ticket-02.mjs 36/36）。
// shadow DOM 样本断言“穿透识别”，默认红保留，待票 04 转绿。
// iti v18.2.1 填充缺口，默认红保留，待票 03 转绿。
// 证据源：.scratch/architecture-recovery/research/misdetection-root-causes.md §2/§4（reproduced 样本）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('误报 5 类（票 02 评分引擎，已转绿）', () => {
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
    test(`${id} ${desc}`, async ({ page }) => {
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

test.describe('票 02 分级行为接线（三档注入样式 + 面板召唤入口）', () => {
  test('L0 标准信号：autocomplete tel-country-code/country/country-name 一票强注入（issue 验收 4）', async ({ page }) => {
    await page.goto('/fixtures/autocomplete.html');
    // L0 强信号字段注入（tel-country-code 100 分 auto；country 100 分 auto；country-name 100 分 auto）
    await expect(wrapperFor(page, '#l0-tcc')).toHaveCount(1);
    await expect(wrapperFor(page, '#l0-country')).toHaveCount(1);
    await expect(wrapperFor(page, '#l0-country-name')).toHaveCount(1);
    // tel 主号本身不注入（type=tel 仅 10 分锚语义）
    await expect(wrapperFor(page, '#l0-tel')).toHaveCount(0);
    // autocomplete=off：L0 不加分，但 L1 关键词+L2 锚仍生效 → 低调注入
    // （行业先例：KeePassXC 忽略 off 仍显示图标，industry-models.md M4 引 keepassxc-browser#2929 cited）
    await expect(wrapperFor(page, '#l0-off')).toHaveCount(1);
    // 无信号字段不注入
    await expect(wrapperFor(page, '#l0-plain')).toHaveCount(0);
  });

  test('高置信 auto 档正常样式，中置信 lowkey 档低调样式', async ({ page }) => {
    await page.goto('/test/test-page.html');
    // #country-code（84 分）= auto；#area-code（68 分）= lowkey（低视觉权重样式挂点 [SP US17]）
    await expect(wrapperFor(page, '#country-code').locator('.cch-btn')).not.toHaveClass(/cch-btn-lowkey/);
    await expect(wrapperFor(page, '#area-code').locator('.cch-btn')).toHaveClass(/cch-btn-lowkey/);
    await expect(wrapperFor(page, '#area-code').locator('.cch-btn')).toHaveAttribute('data-cch-tier', 'lowkey');
  });

  test('低置信字段不注入但登记；面板出现召唤入口，点击后补挂', async ({ page }) => {
    await page.goto('/fixtures/fp-regression.html');
    // fp-country（国家语义 none 档，44 分）已登记；正例控件可开面板
    await expect(wrapperFor(page, '#fp-country')).toHaveCount(0);
    await wrapperFor(page, '#fp-control').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    const summon = page.locator('#cch-summon');
    await expect(summon).toBeVisible(); // [SP US18] 面板可手动召唤
    await summon.click();
    await expect(wrapperFor(page, '#fp-country')).toHaveCount(1);
    // 召唤后入口消失
    await expect(summon).toHaveCount(0);
  });
});

test.describe('iti v18.2.1 填充联动（票 03 适配层修复，已转绿）', () => {
  test('面板选 Japan 后 iti 插件选中态应同步为 jp/+81（票 03 修复闭环）', async ({ page }) => {
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
