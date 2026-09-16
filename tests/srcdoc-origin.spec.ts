// ══════════════════════════════════════════════════════════════
// srcdoc-origin.spec.ts — 票 10 / A-034：about:srcdoc 帧跨帧 origin 校验误判
//
// 缺陷（真实站点层票 07 首次暴露）：srcdoc 帧内 location.origin 被 Chrome 序列化为字符串 "null"，
// 而帧文档真实 origin 继承自父级（window.origin 可读出）⇒ main.ts:134 的同源判据判真且不等
// ⇒ 顶层 FRAME_FILL_MSG 被静默丢弃（无写入 / 无事件 / 无 toast / 也无异常）。
//
// 升塔纪律（WORKFLOW §4.5.1）：该形态由塔尖首次暴露 ⇒ 先沉淀为本 fixture + 本用例，
// 确认修复前确定性红灯，再改脚本；修复后转绿即该缺陷的永久覆盖。
// 只断言外部可观测结果（DOM value / 事件序列 / 反馈文本 / 异常计数），不断言实现细节。
// ══════════════════════════════════════════════════════════════
import { test, expect } from 'playwright/test';
import type { Frame, Page } from 'playwright/test';
import {
  installUserscript,
  waitForInjection,
  openPanelRemote,
  selectCountry,
  recordFieldEvents,
  readFieldEvents,
  readHostValue,
  feedbackToast,
} from './helpers/userscript';

const FIXTURE = '/fixtures/srcdoc-frame.html';
const CHILD_SEL = '#srcc-cc';
const TOP_SEL = '#top-cc';

/** srcdoc 子帧句柄（srcdoc iframe 在初始 HTML 内，故由元素句柄取，不依赖 frameattached 时序）。 */
async function srcdocFrame(page: Page): Promise<Frame> {
  const handle = await page.waitForSelector('#f-srcdoc');
  const f = await handle.contentFrame();
  if (!f) throw new Error('srcdoc frame 未就绪');
  await f.waitForLoadState();
  return f;
}

test.describe('票 10 / A-034 — about:srcdoc 帧跨帧 origin 校验误判', () => {
  test.beforeEach(async ({ page }) => {
    await installUserscript(page);
  });

  test('根因前提：srcdoc 帧 location.origin 为字符串 null，window.origin 为继承的真实 origin', async ({ page }) => {
    await page.goto(FIXTURE);
    const child = await srcdocFrame(page);
    const expected = new URL(page.url()).origin;
    const probe = await child.evaluate(() => {
      let topReadable = false;
      try { topReadable = typeof window.top?.location.href === 'string'; } catch {}
      return {
        href: location.href,
        locOrigin: location.origin,
        winOrigin: window.origin,
        topReadable,
      };
    });
    expect(probe.href, 'srcdoc 帧 URL').toBe('about:srcdoc');
    expect(probe.locOrigin, 'srcdoc 帧 location.origin 被序列化为字符串 null').toBe('null');
    expect(probe.winOrigin, 'srcdoc 帧 window.origin 为继承的真实 origin').toBe(expected);
    expect(probe.locOrigin === probe.winOrigin, '两者不等 ⇒ 以 location.origin 为操作数的同源判据必然误判').toBe(false);
    expect(probe.topReadable, '顶层可读 ⇒ isTopFrameSameOrigin() 判真').toBe(true);
  });

  test('跨帧填充链路：srcdoc 帧图标 → 顶层代开面板 → 选国 → 子帧 L3 写入 + L4 反馈', async ({ page }) => {
    await page.goto(FIXTURE);
    const child = await srcdocFrame(page);
    await waitForInjection(child, CHILD_SEL);
    await recordFieldEvents(child, CHILD_SEL, ['input', 'change']);
    await openPanelRemote(child, CHILD_SEL, page);
    await selectCountry(page, 'cn', { query: 'China' });
    // 跨帧链路是**异步**的：顶层 postMessage(FRAME_FILL_MSG) 之后**立即**关闭面板
    // （ui/index.ts:820-821），子帧的 message 任务 + Fill.run 在其后执行
    // ⇒ selectCountry 返回（面板已 detach）≠ 子帧写入完成。故 L3/L4 一律用
    // **web-first 重试断言**，禁一次性读值（票 06 R1 同类竞态教训：本地快、CI 慢即翻红）。
    await expect(child.locator(CHILD_SEL), 'L3 srcdoc 帧宿主字段 value 应写入区号')
      .toHaveValue('+86', { timeout: 10_000 });
    await expect.poll(async () => (await readFieldEvents(child)).slice(), {
      message: 'L3 srcdoc 帧应派发 input/change 事件',
      timeout: 10_000,
    }).toEqual(expect.arrayContaining(['input', 'change']));
    await expect(feedbackToast(child), 'L4 srcdoc 帧应出现填充反馈')
      .toContainText('+86', { timeout: 10_000 });
  });

  test('L0 静默健康：缺陷态不产生未捕获异常（L0 绿不足以判生效）', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.goto(FIXTURE);
    const child = await srcdocFrame(page);
    await waitForInjection(child, CHILD_SEL);
    await openPanelRemote(child, CHILD_SEL, page);
    await selectCountry(page, 'cn', { query: 'China' });
    expect(errs, 'L0 pageerror 应为 0').toEqual([]);
  });

  test('来源锚点未放宽：srcdoc 帧仍拒绝非顶层来源的填充指令', async ({ page }) => {
    await page.goto(FIXTURE);
    const child = await srcdocFrame(page);
    await waitForInjection(child, CHILD_SEL);
    await recordFieldEvents(child, CHILD_SEL, ['input', 'change']);
    const syntheticSourceIsNull = await child.evaluate(() => {
      const ev = new MessageEvent('message', {
        data: { __cch: 'cch-frame-v1', type: 'fill', iso: 'CN' },
        origin: location.origin,
      });
      window.dispatchEvent(ev);
      return ev.source === null;
    });
    expect(syntheticSourceIsNull, '合成事件无 source（非 window.top）').toBe(true);
    expect(await readHostValue(child, CHILD_SEL), '非顶层来源的填充指令不得生效').toBe('');
    expect(await readFieldEvents(child), '非顶层来源不得触发字段事件').toEqual([]);
  });

  test('票 12 delta：顶层仍拒绝非嵌入来源的跨域开面板请求（入站校验未放宽）', async ({ page }) => {
    await page.goto(FIXTURE);
    await waitForInjection(page, TOP_SEL);
    const popupPromise = page.waitForEvent('popup');
    await page.evaluate(() => {
      window.open('http://127.0.0.1:' + (Number(location.port) + 1) + '/fixtures/iframe-child.html', 'cch-probe-popup');
    });
    const popup = await popupPromise;
    await popup.waitForLoadState();
    await popup.evaluate(() => { window.opener?.postMessage({ __cch: 'cch-frame-v1', type: 'open' }, '*'); });
    // 先等「降级提示」出现 —— 它证明该消息确已抵达顶层并被校验路径处理（而非「还没到」）；
    // 再断言面板未打开（否则 count=0 会因时序而假通过）。
    await expect(feedbackToast(page), '应降级为可见提示（不放宽、不静默）').toContainText(/verified|无法验证/);
    await expect(page.locator('#cch-pop'), '非嵌入来源的开面板请求不得生效').toHaveCount(0);
    await popup.close();
  });
});
