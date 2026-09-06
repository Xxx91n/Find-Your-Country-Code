// 票 18 E2E: 伪 select 两形态端到端 + 否决组（ADR-0005 登记+手动召唤档）。
// 基线口径: 伪 select 不自动注入图标（ADR-0005 cap）; 登记候选经面板「召唤」后按 force
// 路径挂图标; 填充经面板选国家后由 fillPseudo 按形态分发（select-only=listbox 点击选值,
// 可编辑型=隐藏承值 input 原生 setter+事件）。fixture 为 17 票取证 observed 结构的
// hermetic 复刻（CI 无外部网络依赖,与 framework-react 系 fixture 同口径）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('伪 select 端到端（票 18）', () => {
  test('验收3 select-only 型: ADR 档位不注入 → 召唤 → 面板选 Canada → listbox 点击选值 → 承值 CA', async ({ page }) => {
    await page.goto('/fixtures/pseudo-mui.html');
    // ADR-0005 档位: 伪 select 不自动注入图标; anchor 原生 select 正常注入（正样本不回归）
    await expect(wrapperFor(page, '#cc-mui')).toHaveCount(0);
    await expect(wrapperFor(page, '#anchor-cc')).toHaveCount(1);
    // 登记 → 面板召唤入口可见
    await openPanel(page, '#anchor-cc');
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    await expect(wrapperFor(page, '#cc-mui')).toHaveCount(1);
    // 召唤图标 → 面板绑定伪 select 触发器 → 选 Canada
    await openPanel(page, '#cc-mui');
    await page.locator('#cch-si').fill('Canada');
    await page.locator('.cch-row[data-iso="ca" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // fillPseudo select-only 路径: 开面板 + 点击选值 → 组件承值实变（US→CA,17 票 observed 同象）
    await expect(page.locator('#mui-carrier')).toHaveValue('CA', { timeout: 5000 });
    await expect(page.locator('#cc-mui')).toContainText('Canada');
  });

  test('验收2/3 可编辑型: 召唤 → 面板选 Canada → 隐藏承值 input 原生 setter + input/change 事件', async ({ page }) => {
    await page.goto('/fixtures/pseudo-react-select.html');
    await page.evaluate(() => {
      var c = document.getElementById('rs-carrier');
      c.addEventListener('input', function () { c.dataset.events = (c.dataset.events || '') + 'input,'; });
      c.addEventListener('change', function () { c.dataset.events = (c.dataset.events || '') + 'change,'; });
    });
    await expect(wrapperFor(page, '#rs-input')).toHaveCount(0);
    await openPanel(page, '#anchor-cc');
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    await expect(wrapperFor(page, '#rs-input')).toHaveCount(1);
    await openPanel(page, '#rs-input');
    await page.locator('#cch-si').fill('Canada');
    await page.locator('.cch-row[data-iso="ca" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await expect(page.locator('#rs-carrier')).toHaveValue('CA', { timeout: 5000 });
    await expect(page.locator('#rs-carrier')).toHaveAttribute('data-events', /input,change,/);
  });

  test('验收1 否决组: 搜索型 typeahead 不登记不注入; 通用 combobox（无国家上下文）不登记', async ({ page }) => {
    await page.goto('/fixtures/pseudo-negative.html');
    await expect(wrapperFor(page, '#site-search')).toHaveCount(0);
    await expect(wrapperFor(page, '#generic-combo')).toHaveCount(0);
    // 搜索型展开（选项证据面出现）→ 重扫后仍不注入不登记（veto 路径实测）
    await page.locator('#site-search').click();
    await page.waitForTimeout(600);
    await expect(wrapperFor(page, '#site-search')).toHaveCount(0);
    // 登记面为空 → 面板召唤按钮隐藏
    await openPanel(page, '#anchor-cc');
    await expect(page.locator('#cch-summon')).toBeHidden();
  });
});
