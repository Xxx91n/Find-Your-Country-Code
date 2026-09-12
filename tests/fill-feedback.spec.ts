// 票 31 · 填充结果可观测 + 失败反馈闭环（覆盖 A-005）
// ══════════════════════════════════════════════════════════════
// 复现基线：新行为断言曾按 fp-regression §6.2 维护契约标 test.fail() 默认红
// （复现证据：E2E run 34684194549 四条 ✘ expected-fail + 基线不变式 4 ✓）；
// 票 31 实施后标记已摘除转绿（维护契约同 06 报告 §6.2）。
// 基线不变式组（无标记、两版本恒绿）钉住「不动正确路径」：select 命中语义、
// input 格式推测结果、降级不写字段，三者实施前后必须一致。
// 证据：CI run ID 锚定（只认 CI 证据）。
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, openPanel } from './helpers/userscript';

// 降级复制态需要真实 clipboard-write 成功（headless 默认无该权限时 writeText 被拒 →
// 如实报 failed，恰证三态闭环；为让 copied 档可测，授予权限）
test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// 三态里 copied/failed 经剪贴板 promise 异步定态（成功档同步）——读钩子前等状态落定
async function pick(page: Page, target: string, query: string, iso: string): Promise<void> {
  await openPanel(page, target);
  await page.locator('#cch-si').fill(query);
  await page.locator(`.cch-row[data-iso="${iso}" i]`).click();
}

const lastFill = (page: Page) => page.evaluate(() => (window as any).__cchLastFill);
const toastText = (page: Page) => page.locator('#cch-toast');

test.describe('基线不变式（复现与实施两版本恒绿 —— 钉住正确路径不回退）', () => {
  test('select 命中：真填充，值写入 +86，成功文案 toast', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-ok', 'China', 'cn');
    await expect(page.locator('#fb-ok')).toHaveValue('+86');
    await expect(toastText(page)).toContainText(/已填入|Filled/);
  });

  test('select 无匹配：字段不被写入（降级不伤字段），提示复制类文案', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-nomatch', 'China', 'cn');
    await expect(page.locator('#fb-nomatch')).toHaveValue('');
    await expect(toastText(page)).toContainText(/已复制|copied/i);
  });

  test('input 格式推测语义不变：placeholder 无数字线索 → plus 写入 +86', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-diverge', 'China', 'cn');
    await expect(page.locator('#fb-diverge')).toHaveValue('+86');
  });

  test('input 格式推测语义不变：placeholder 数字开头 → digits 写入 86', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-digits', 'China', 'cn');
    await expect(page.locator('#fb-digits')).toHaveValue('86');
  });
});

test.describe('新行为：三态信号 + 格式分歧可观测（复现期默认红已摘标转绿）', () => {
  test('① select 无匹配 → 降级复制态可观测：__cchLastFill.status=copied + 分层文案', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-nomatch', 'China', 'cn');
    await page.waitForFunction(() => (window as any).__cchLastFill?.status === 'copied');
    // iso 为 Country.iso 数据源逐字透传（观测不加工），countries 表该字段是大写形态
    expect(await lastFill(page)).toMatchObject({ status: 'copied', kind: 'select', iso: 'CN' });
    await expect(toastText(page)).toContainText(/未匹配|No match/i);
  });

  test('② 期望 digits 得 plus → 格式分歧可观测：__cchLastFill.fmtDiff=true + 分歧文案', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-diverge', 'China', 'cn');
    expect(await lastFill(page)).toMatchObject({ status: 'filled', fmtDiff: true });
    await expect(toastText(page)).toContainText(/格式|format/i);
  });

  test('③ digits 推测命中数字约束 → 非分歧对照：fmtDiff=false + 纯成功文案', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await pick(page, '#fb-digits', 'China', 'cn');
    expect(await lastFill(page)).toMatchObject({ status: 'filled', fmtDiff: false });
    await expect(toastText(page)).toContainText(/已填入|Filled/);
  });

  test('④ 填充失败且剪贴板不可用 → 失败态可观测：status=failed + 失败文案', async ({ page }) => {
    await page.goto('/fixtures/fill-feedback.html');
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.reject(new Error('denied-by-test')) },
      });
    });
    await pick(page, '#fb-nomatch', 'China', 'cn');
    await page.waitForFunction(() => (window as any).__cchLastFill?.status === 'failed');
    expect(await lastFill(page)).toMatchObject({ status: 'failed', kind: 'select' });
    await expect(toastText(page)).toContainText(/失败|手动|failed|manually/i);
  });
});
