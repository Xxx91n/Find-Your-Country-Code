// 票 14③ 性能测量地基（D-019③）—— 隔离 `_fingerprint` -> `_hiddenByStyle` 的
// getComputedStyle / getBoundingClientRect 强制样式/布局成本，为「detect:823 getComputedStyle
// 入指纹」的优化提供**可复跑基线**；同时守护 A-003/A-023 性能红线（1000 节点 scan < 350ms）不回退。
//
// 原理：src/detect/index.ts 的 `_fingerprint()`（:829）对每个候选元素调用 `_hiddenByStyle()`，
// 后者用 `el.ownerDocument.defaultView.getComputedStyle(el)`（:663）+ `getBoundingClientRect()`（:677）
// 判定可见性 —— 两者均会强制样式重算/布局。本 spec 在 document-start 包装这两个 API 计数计时，
// 从而把「指纹路径的强制样式成本」从整体 scan 耗时中隔离出来。
//
// 采样窗口（关键）：必须先等首扫完成、重置计数器，再注入 1000 节点，
// 只统计「注入后的那次重扫」—— 否则测到的是页面首扫（候选极少）而非目标样本。
import { test, expect } from 'playwright/test';
import { installUserscript } from './helpers/userscript';

type PerfStats = { scans: number; totalMs: number; maxMs: number; samples: number[] };
type GcsStats = { calls: number; ms: number; rectCalls: number; rectMs: number };
type Win = { __cchPerf: PerfStats; __gcsStats: GcsStats };

test.describe('票 14③ 性能测量地基：指纹内 getComputedStyle 成本隔离', () => {
  test('1000 节点：scan 耗时 + 强制样式调用数/累计耗时（红线 < 350ms）', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __gcsStats: GcsStats };
      w.__gcsStats = { calls: 0, ms: 0, rectCalls: 0, rectMs: 0 };
      const origGcs = window.getComputedStyle.bind(window);
      window.getComputedStyle = ((...args: Parameters<typeof origGcs>) => {
        const t = performance.now();
        const r = origGcs(...args);
        w.__gcsStats.calls += 1;
        w.__gcsStats.ms += performance.now() - t;
        return r;
      }) as typeof window.getComputedStyle;
      const origRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const t = performance.now();
        const r = origRect.call(this);
        w.__gcsStats.rectCalls += 1;
        w.__gcsStats.rectMs += performance.now() - t;
        return r;
      } as typeof Element.prototype.getBoundingClientRect;
    });
    await installUserscript(page);
    await page.goto('/fixtures/custom-dropdown-no-aria.html');
    // 1) 等首扫完成（候选极少，不是目标样本）
    await page.waitForFunction(() => (window as unknown as Win).__cchPerf.scans > 0, null, { timeout: 5000 });
    const scansBefore = await page.evaluate(() => (window as unknown as Win).__cchPerf.scans);
    // 2) 重置计数器，隔离「注入 1000 节点后的重扫」
    await page.evaluate(() => {
      (window as unknown as Win).__gcsStats = { calls: 0, ms: 0, rectCalls: 0, rectMs: 0 };
    });
    // 3) 注入 1000 节点 -> MutationObserver 防抖重扫
    await page.locator('#bulk-add').click();
    await expect(page.locator('#bulk div').first()).toBeAttached();
    await page.waitForFunction(
      (n) => (window as unknown as Win).__cchPerf.scans > n,
      scansBefore,
      { timeout: 8000 },
    );
    const out = await page.evaluate(() => {
      const w = window as unknown as Win;
      return { perf: w.__cchPerf, gcs: w.__gcsStats };
    });
    // 分母必须是「注入后的那次重扫」本身，而非 __cchPerf.maxMs（那是页面首扫）——
    // 否则 share 会被首扫耗时稀释，测出的占比失真。samples 末项 = 最新一次 scan。
    const postBulkMs = out.perf.samples.length ? out.perf.samples[out.perf.samples.length - 1] : 0;
    const forcedMs = out.gcs.ms + out.gcs.rectMs;
    const share = postBulkMs > 0 ? (forcedMs / postBulkMs) * 100 : 0;
    console.log('[cch-t14c perf] post-bulk scan: scans=' + out.perf.scans + ' maxMs=' + out.perf.maxMs +
      ' | getComputedStyle calls=' + out.gcs.calls + ' cumMs=' + out.gcs.ms.toFixed(2) +
      ' | getBoundingClientRect calls=' + out.gcs.rectCalls + ' cumMs=' + out.gcs.rectMs.toFixed(2) +
      ' | postBulkMs=' + postBulkMs + ' forcedMs=' + forcedMs.toFixed(2) + ' share=' + share.toFixed(1) + '%' +
      ' | samples=' + JSON.stringify(out.perf.samples));
    expect(out.perf.scans).toBeGreaterThan(0);
    expect(out.perf.maxMs).toBeLessThan(350);
    // 测量面必须真的命中指纹路径（否则本 spec 失去意义）
    expect(out.gcs.calls).toBeGreaterThan(0);
  });
});
