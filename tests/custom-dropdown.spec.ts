// 票 29 E2E: 无 ARIA 手写自定义下拉（div 触发器 + ul>li 选项面板，无 role=combobox /
// 无 aria-controls）端到端。基线口径与票 18 一致：ADR-0005 档位上限 = 登记 + 手动召唤
// （不自动注入图标、不自动填充）；登记候选经面板召唤后由 fillPseudo 按 li 回退定位选项。
// fixture 为 hermetic 复刻（CI 无外部网络依赖）。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('无 ARIA 手写自定义下拉（票 29 / A-003）', () => {
  test('验收1 ADR-0005 档位: 不自动注入图标; 原生 anchor select 正样本不回归', async ({ page }) => {
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    await expect(wrapperFor(page, '#cc-custom')).toHaveCount(0);
    await expect(wrapperFor(page, '#anchor-cc')).toHaveCount(1);
  });

  test('验收2 登记 + 召唤 + 填充: 面板召唤 → 选 Canada → li 点击选值 → 承值 CA', async ({ page }) => {
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    // 登记进召唤面（ADR-0005 档位下不出图标，但召唤入口可见）
    await openPanel(page, '#anchor-cc');
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    // 召唤后按 auto 档挂图标
    await expect(wrapperFor(page, '#cc-custom')).toHaveCount(1);
    // 旧面板仍锚在 anchor 上：先 toggle 关闭，再点召唤出的图标把面板重绑到自定义下拉
    await wrapperFor(page, '#anchor-cc').locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    await openPanel(page, '#cc-custom');
    await page.locator('#cch-si').fill('Canada');
    await page.locator('.cch-row[data-iso="ca" i]').click();
    await expect(page.locator('#cch-pop')).toHaveCount(0);
    // 无 aria-controls 可解 → fill 侧 li 回退定位选项并点击
    await expect(page.locator('#custom-carrier')).toHaveValue('CA', { timeout: 5000 });
  });

  test('验收3 负例: 导航菜单（无区号证据）与不可聚焦容器均不登记', async ({ page }) => {
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    await openPanel(page, '#anchor-cc');
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    // 内容门槛（custom:gate:no-dial-evidence）与可聚焦闸门拦截
    await expect(wrapperFor(page, '#site-nav')).toHaveCount(0);
    await expect(wrapperFor(page, '#static-list')).toHaveCount(0);
    // 正例仍在（证明上述 0 不是"整体没登记"造成的假阴性）
    await expect(wrapperFor(page, '#cc-custom')).toHaveCount(1);
  });

  test('验收4 性能: 1000 节点（含 50 个可聚焦 div 容器）单次 scan < 350ms', async ({ page }) => {
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    await page.locator('#bulk-add').click();
    await expect(page.locator('#bulk div').first()).toBeAttached();
    // 注入触发 MutationObserver 防抖重扫，等待采样
    await page.waitForFunction(() => window.__cchPerf && window.__cchPerf.scans > 0, null, { timeout: 5000 });
    const perf = await page.evaluate(() => (window as unknown as {
      __cchPerf: { scans: number; totalMs: number; maxMs: number; samples: number[] };
    }).__cchPerf);
    console.log('[cch-29 perf] 1000 节点（含 50 个可聚焦 div 容器）scan 实测: scans=' + perf.scans +
      ' maxMs=' + perf.maxMs + ' avgMs=' + (perf.scans ? (perf.totalMs / perf.scans).toFixed(2) : 'n/a') +
      ' samples=[' + perf.samples.join(',') + ']');
    expect(perf.scans).toBeGreaterThan(0);
    expect(perf.maxMs).toBeLessThan(350);
  });
});
