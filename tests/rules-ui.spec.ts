// 票 07 面板 UI 升级 E2E：三档样式差异与可配置 / 负反馈一键写入即时抑制 /
// 规则管理查看删除 / 豁免即时拆图标 / 合成事件不外溢宿主表单。
// 运行：npm run e2e（先 vite build 出 dist 再 playwright test，CI 执行）。
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

type Seed = { rules?: unknown; prefs?: unknown };

// GM 种子必须在 userscript 注入前写入（localStorage 桶在 GM_STUB 首次读取前就绪）
async function boot(page: Page, seed: Seed = {}): Promise<void> {
  await page.addInitScript((s) => {
    // 种子只在首次导航生效：addInitScript 每次导航都会重跑，无条件覆写会把
    // 同测试内（负反馈/豁免开关/规则删除）写入的 GM 状态在 reload 时洗掉或回灌
    // （07-fix 取证）。一次性标记存 localStorage，随测试上下文自然隔离。
    if (!s.rules && !s.prefs) return;
    if (localStorage.getItem('__cch_seed_done__')) return;
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    if (s.rules) bucket['cch_site_rules_v1'] = JSON.stringify(s.rules);
    if (s.prefs) bucket['cch_ui_prefs_v1'] = JSON.stringify(s.prefs);
    localStorage.setItem('__cch_gm__', JSON.stringify(bucket));
    localStorage.setItem('__cch_seed_done__', '1');
  }, { rules: seed.rules ?? null, prefs: seed.prefs ?? null });
  await installUserscript(page);
  await page.goto('/fixtures/rules-ui.html');
}

async function gmDoc(page: Page): Promise<any> {
  return page.evaluate(() => {
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    return JSON.parse(bucket['cch_site_rules_v1'] || 'null');
  });
}

async function gmPrefs(page: Page): Promise<any> {
  return page.evaluate(() => {
    const bucket = JSON.parse(localStorage.getItem('__cch_gm__') || '{}');
    return JSON.parse(bucket['cch_ui_prefs_v1'] || 'null');
  });
}

async function openRules(page: Page): Promise<void> {
  await page.locator('#cch-rules-tg').click();
  await expect(page.locator('#cch-rules-view')).toBeVisible();
}

test('验收1 三档差异可见（dim 默认）：auto 全亮 / lowkey 低调 / none 不注入', async ({ page }) => {
  await boot(page);
  const autoBtn = wrapperFor(page, '#cc-strong').locator('.cch-btn');
  await expect(autoBtn).toHaveAttribute('data-cch-tier', 'auto');
  await expect(autoBtn).not.toHaveClass(/cch-btn-lowkey/);
  const lowBtn = wrapperFor(page, '#cc-mid').locator('.cch-btn');
  await expect(lowBtn).toHaveAttribute('data-cch-tier', 'lowkey');
  await expect(lowBtn).toHaveClass(/cch-btn-lowkey/);
  await expect(wrapperFor(page, '#plain-num')).toHaveCount(0);
  await expect(wrapperFor(page, '#phone')).toHaveCount(0);
});

test('验收1 可配置：hidden 模式中置信不注入，面板手动召唤补挂（高置信样式）', async ({ page }) => {
  await boot(page, { prefs: { version: 1, lowkeyMode: 'hidden' } });
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(1); // auto 档不受偏好影响
  await expect(wrapperFor(page, '#cc-mid')).toHaveCount(0);    // lowkey 档转召唤登记
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-summon')).toBeVisible();
  await page.locator('#cch-summon').click();
  const midBtn = wrapperFor(page, '#cc-mid').locator('.cch-btn');
  await expect(midBtn).toHaveAttribute('data-cch-tier', 'auto'); // 显式召唤 → 高置信样式
});

test('验收2 负反馈一键写入 none 规则并立即抑制该字段（无需刷新）', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await page.locator('#cch-fb').click();
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(0); // 即时拆图标
  await expect(page.locator('#cch-toast')).toContainText(/Remembered|已记住/);
  const doc = await gmDoc(page);
  expect(doc.overrides).toHaveLength(1);
  expect(doc.overrides[0]).toMatchObject({ selector: '#cc-strong', action: { tier: 'none' }, note: 'panel-negative-feedback' });
});

test('验收2 负反馈持久化：刷新后该字段仍被抑制，其他字段不受影响', async ({ page }) => {
  await boot(page);
  await openPanel(page, '#cc-strong');
  await page.locator('#cch-fb').click();
  await page.reload();
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(0);
  await expect(wrapperFor(page, '#cc-mid')).toHaveCount(1); // 同页其他字段照常
  // 幂等：重复负反馈不产生重复规则
  await openPanel(page, '#cc-mid');
  await page.locator('#cch-fb').click();
  const doc = await gmDoc(page);
  expect(doc.overrides).toHaveLength(2); // cc-strong + cc-mid 各一条
});

test('验收3 规则管理视图：查看覆盖规则并删除，删除后字段即时恢复注入', async ({ page }) => {
  await boot(page, {
    rules: { version: 1, exempt: [], global: null, overrides: [
      { id: 'r-seed', host: '127.0.0.1', selector: '#cc-strong', action: { tier: 'none' }, note: 'panel-negative-feedback', createdAt: 1, updatedAt: 1 },
    ] },
  });
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(0); // 种子规则生效
  await openPanel(page, '#cc-mid');
  await openRules(page);
  const row = page.locator('#cch-rules-view .cch-rule-row', { hasText: '#cc-strong' });
  await expect(row).toContainText('none');
  await expect(row).toContainText('panel-negative-feedback');
  await row.locator('.cch-rule-del').click();
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(1); // 重扫恢复（350ms 防抖内）
  await expect(wrapperFor(page, '#cc-strong').locator('.cch-btn')).toHaveAttribute('data-cch-tier', 'auto');
  const doc = await gmDoc(page);
  expect(doc.overrides).toHaveLength(0);
  await page.reload();
  await expect(wrapperFor(page, '#cc-strong')).toHaveCount(1); // 刷新后稳定
});

test('验收3 豁免开关：开启即时拆全部图标，刷新后检测完全跳过', async ({ page }) => {
  await boot(page);
  await expect(page.locator('.cch-btn')).toHaveCount(2); // cc-strong + cc-mid
  await openPanel(page, '#cc-strong');
  await openRules(page);
  await page.locator('#cch-exempt-tg').click();
  await expect(page.locator('.cch-btn')).toHaveCount(0); // detachAll 即时拆
  const doc = await gmDoc(page);
  expect(doc.exempt).toContain('127.0.0.1');
  await page.reload();
  await expect(page.locator('.cch-btn')).toHaveCount(0); // scan 入口短路
});

test('验收3 豁免域名列表可删除（含非当前站点域名）', async ({ page }) => {
  await boot(page, { rules: { version: 1, exempt: ['example.com'], global: null, overrides: [] } });
  await expect(page.locator('.cch-btn')).toHaveCount(2); // 当前站未豁免
  await openPanel(page, '#cc-strong');
  await openRules(page);
  const row = page.locator('#cch-rules-view .cch-rule-row', { hasText: 'example.com' });
  await row.locator('.cch-rule-del').click();
  const doc = await gmDoc(page);
  expect(doc.exempt).toHaveLength(0);
  await expect(page.locator('#cch-rules-view .cch-rule-row', { hasText: 'example.com' })).toHaveCount(0);
});

test('验收1 低调样式切换即时迁移：hidden 拆图标转召唤，dim 按低调样式补挂', async ({ page }) => {
  await boot(page);
  await expect(wrapperFor(page, '#cc-mid').locator('.cch-btn')).toHaveClass(/cch-btn-lowkey/);
  await openPanel(page, '#cc-strong');
  await openRules(page);
  await page.locator('#cch-lowkey-tg').click(); // dim → hidden
  await expect(wrapperFor(page, '#cc-mid')).toHaveCount(0);
  expect((await gmPrefs(page)).lowkeyMode).toBe('hidden');
  // 面板仍开着（同 anchor 再点=切换关闭），先点外部关闭再重开 → 召唤入口可见（登记恢复）
  await page.locator('h1').click();
  await openPanel(page, '#cc-strong');
  await expect(page.locator('#cch-summon')).toBeVisible();
  await page.locator('#cch-summon').click();
  await expect(wrapperFor(page, '#cc-mid')).toHaveCount(1);
  await openRules(page);
  await page.locator('#cch-lowkey-tg').click(); // hidden → dim：召唤登记已清空（summon 走 auto），无变化
  await expect(wrapperFor(page, '#cc-mid')).toHaveCount(1);
  expect((await gmPrefs(page)).lowkeyMode).toBe('dim');
});

test('验收5 面板交互不外溢宿主表单：无 submit、无字段事件、无状态污染', async ({ page }) => {
  await boot(page);
  const before = await page.evaluate(() => ({
    sel: (document.getElementById('cc-strong') as HTMLSelectElement).value,
    mid: (document.getElementById('cc-mid') as HTMLInputElement).value,
    phone: (document.getElementById('phone') as HTMLInputElement).value,
  }));
  await openPanel(page, '#cc-strong');
  await page.locator('#cch-si').fill('chi');   // 搜索框输入（面板内部）
  await openRules(page);                        // 齿轮切换视图
  await page.locator('#cch-rules-tg').click();  // 切回列表
  await page.locator('#cch-fb').click();        // 负反馈（拆图标 + 关面板）
  const leak = await page.evaluate(() => (window as any).__leak);
  expect(leak.submit).toBe(0);
  expect(leak.formInput).toBe(0);
  expect(leak.fieldEvents).toEqual([]);
  const after = await page.evaluate(() => ({
    sel: (document.getElementById('cc-strong') as HTMLSelectElement).value,
    mid: (document.getElementById('cc-mid') as HTMLInputElement).value,
    phone: (document.getElementById('phone') as HTMLInputElement).value,
  }));
  expect(after).toEqual(before); // 宿主字段状态零污染
});
