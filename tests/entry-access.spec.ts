// 票 37 [A-012/A-013] 入口可达性：GM 菜单「打开面板」全局入口 + lowkey 图标可见性重设计。
// 路径一：无任何图标的页面（best score <35 但 ≥25 有登记字段）经 GM 菜单命令开面板
//   （anchor=null 居中路径）并召唤已登记字段补挂图标。
// 路径二：lowkey 图标移入字段右缘盒内 —— 祖先 overflow:hidden 不再裁剪；
//   与高置信图标的视觉分层（静止态低权重 / 悬停恢复）保留。
import { test, expect } from 'playwright/test';
import { installUserscript, wrapperFor, openPanel } from './helpers/userscript';

// GM 菜单命令标题跨语言匹配（zh 含「面板」/ en 含「panel」）；stub 见 helpers/userscript.ts
async function invokeMenuOpenPanel(page: any): Promise<void> {
  const ok = await page.evaluate(() => {
    const menu = (window as any).__cchMenu || [];
    const cmd = menu.find((c: any) => /面板|panel/i.test(c.title));
    if (!cmd) return false;
    cmd.fn();
    return true;
  });
  expect(ok, 'GM 菜单应登记「打开面板」命令').toBe(true);
}

async function menuCount(page: any): Promise<number> {
  return page.evaluate(() => (window as any).__cchMenuCount || 0);
}

test.describe('票 37 [A-012] GM 菜单全局入口', () => {
  test.beforeEach(async ({ page }) => {
    await installUserscript(page);
  });

  // [票 02 A-026]：菜单新增唯一零置信度入口「设置」（本票前 GM 菜单无任何设置入口）
  test('菜单登记「设置」命令（票 02 零置信度入口）', async ({ page }) => {
    await page.goto('/fixtures/entry-access.html');
    await expect.poll(() => menuCount(page)).toBe(3);
    const titles = await page.evaluate(() => ((window as any).__cchMenu || []).map((c: any) => c.title));
    expect(titles.some((x: string) => /设置|settings/i.test(x)), 'GM 菜单应登记「设置」命令').toBe(true);
    const ids = await page.evaluate(() => (window as any).__cchMenuIds || []);
    expect(ids).toContain('cch-menu-settings'); // 稳定 id = 原地更新语义的前提
  });

  test('菜单登记「打开面板」命令；无图标页面经菜单开面板且居中', async ({ page }) => {
    await page.goto('/fixtures/entry-access.html');
    // 脚本就绪（菜单注册发生在脚本求值时）且整页无注入图标
    await expect.poll(() => menuCount(page)).toBe(3);
    await expect(page.locator('.cch-btn')).toHaveCount(0);
    await invokeMenuOpenPanel(page);
    const pop = page.locator('#cch-pop');
    await expect(pop).toBeVisible();
    // anchor=null 居中路径：面板中心 ≈ 视口中心，position:fixed
    const box = await pop.boundingBox();
    const vw = page.viewportSize()!;
    expect(box).not.toBeNull();
    expect(Math.abs(box!.x + box!.width / 2 - vw.width / 2)).toBeLessThan(30);
    expect(Math.abs(box!.y + box!.height / 2 - vw.height / 2)).toBeLessThan(30);
    expect(await pop.evaluate(el => getComputedStyle(el).position)).toBe('fixed');
  });

  test('低置信页面：菜单开面板 → 召唤已登记字段 → 补挂图标', async ({ page }) => {
    await page.goto('/fixtures/entry-access.html');
    await expect.poll(() => menuCount(page)).toBe(3);
    await expect(page.locator('.cch-btn')).toHaveCount(0); // 无任何图标
    await invokeMenuOpenPanel(page);
    // 已登记字段在面板内可见召唤入口
    await expect(page.locator('#cch-summon')).toBeVisible();
    await page.locator('#cch-summon').click();
    // 补挂图标：summon → force attach（高置信样式 + data-cch-summon 标记）
    const wrap = wrapperFor(page, '#ea-low');
    await expect(wrap).toHaveCount(1);
    await expect(wrap.locator('.cch-btn')).toHaveAttribute('data-cch-summon', '1');
    // 召唤后可经图标正常开面板（入口闭环）
    await wrap.locator('.cch-btn').click();
    await expect(page.locator('#cch-pop')).toBeVisible();
  });

  test('无目标字段时点国家行：needTarget 提示而非静默崩溃', async ({ page }) => {
    // GM 入口打开时 _target=null —— 行点击不得静默崩溃（入口语义无目标字段）
    await page.goto('/fixtures/entry-access.html');
    await expect.poll(() => menuCount(page)).toBe(3);
    await invokeMenuOpenPanel(page);
    await page.locator('.cch-row[data-iso="cn" i]').first().click();
    await expect(page.locator('#cch-toast')).toHaveClass(/on/);
    await expect(page.locator('#cch-pop')).toBeVisible(); // 面板保持打开
  });
});

test.describe('票 37 [A-013] lowkey 图标可见性', () => {
  test.beforeEach(async ({ page }) => {
    await installUserscript(page);
  });

  test('overflow:hidden 祖先内 lowkey 图标不被裁剪（盒内定位）', async ({ page }) => {
    await page.goto('/fixtures/lowkey-clip.html');
    const wrap = wrapperFor(page, '#lc-field');
    await expect(wrap).toHaveCount(1);
    const btn = wrap.locator('.cch-btn');
    await expect(btn).toHaveAttribute('data-cch-tier', 'lowkey');
    // 图标包围盒完全落在裁剪祖先盒内 = 未被裁剪
    // （旧 top:-12px;right:-12px 盒外定位此处必越界）
    const bb = await btn.boundingBox();
    const cb = await page.locator('.clip').boundingBox();
    expect(bb).not.toBeNull();
    expect(cb).not.toBeNull();
    expect(bb!.x).toBeGreaterThanOrEqual(cb!.x - 0.5);
    expect(bb!.y).toBeGreaterThanOrEqual(cb!.y - 0.5);
    expect(bb!.x + bb!.width).toBeLessThanOrEqual(cb!.x + cb!.width + 0.5);
    expect(bb!.y + bb!.height).toBeLessThanOrEqual(cb!.y + cb!.height + 0.5);
    // 可点击 = 可命中（被裁元素 playwright 无法点击）
    await btn.click();
    await expect(page.locator('#cch-pop')).toBeVisible();
  });

  // 返工轮次 R1：盒内 lowkey 图标开面板后不得压住相邻字段的图标（CI run 34845561008 同象）。
  test('盒内 lowkey 锚开面板不遮挡下一字段图标（相邻字段仍可点击开面板）', async ({ page }) => {
    await page.goto('/fixtures/lowkey-occlusion.html');
    const lowBtn = wrapperFor(page, '#oc-low').locator('.cch-btn');
    await expect(lowBtn).toHaveAttribute('data-cch-tier', 'lowkey');
    // lowkey 锚（盒内右缘）开面板 → 面板悬于其下
    await lowBtn.click();
    await expect(page.locator('#cch-pop')).toBeVisible();
    // 下一字段的 auto 图标若被面板压住，此处点击会 30s 超时（被 #cch-pop 子树拦截指针事件）
    await openPanel(page, '#oc-next');
  });

  test('lowkey 与 auto 分层语义保留；悬停恢复', async ({ page }) => {
    await page.goto('/fixtures/lowkey-clip.html');
    const lowkeyBtn = wrapperFor(page, '#lc-field').locator('.cch-btn');
    const autoBtn = wrapperFor(page, '#lc-auto').locator('.cch-btn');
    await expect(lowkeyBtn).toHaveAttribute('data-cch-tier', 'lowkey');
    await expect(autoBtn).toHaveAttribute('data-cch-tier', 'auto');
    // 静止态分层：lowkey opacity < 1，auto = 1
    expect(await lowkeyBtn.evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(1);
    expect(await autoBtn.evaluate(el => Number(getComputedStyle(el).opacity))).toBe(1);
    // 悬停恢复：hover → opacity 回到 1
    await lowkeyBtn.hover();
    await expect
      .poll(() => lowkeyBtn.evaluate(el => Number(getComputedStyle(el).opacity)))
      .toBe(1);
  });
});
