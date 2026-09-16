// ══════════════════════════════════════════════════════════════════
// corpus-forms.spec.ts — Cycle-6 票 06 / A-030 形态语料（owned 指定页）断言
//
// 本 spec 是「形态语料 = 断言主力」的可执行证据：
//   ① L0 静默健康：8 个镜像页全程 pageerror = 0（验收面 §3.2）
//   ② 检测基线（recorded）：每页注入面与**已记录基线**一致 —— 基线锁定的意义是
//      **让「未注入」显式可见**，而不是把它当期望；翻转（修好）必须显式改基线
//      （对标 tests/corpus/manifest.json 的 realSiteForms[].baseline 机制：
//       漂移即 CI 红，这是设计意图，不是噪声）。
//   ③ L1–L4 全链路：在**当前可注入**的 owned 页上跑完整阶梯
//      （注入 → 档位 → 面板 → 搜索 → 选国 → 写入 → 事件 → 反馈）。
//   ④ 跨隔离上下文：CodePen 嵌套帧（验收面 #14）—— 子帧 L1 + 顶层面板 + 子帧写入。
//
// 断言纪律（验收面 §1 / D-002）：裁定权在**页面侧外部可观测结果**；
//   脚本自报（__cchLastFill / toast 文案 / signals）只进日志与诊断面。
// 断言一律 web-first locator + expect.soft（一次收全量，不中断）。
//
// 原语唯一实现 = tests/helpers/primitives.mjs；本 spec 只经 ./helpers/userscript 门面调用。
// ══════════════════════════════════════════════════════════════════
import { test, expect } from 'playwright/test';
import {
  installUserscript, waitForInjection, openPanel, searchType, selectCountry,
  readHostValue, readTier, readFeedback, recordFieldEvents, countFieldEvents,
  panel, wrapperFor, softInjected, softTier, softHostValue, softFieldEvent, softFeedback,
} from './helpers/userscript';

const MIRRORS = '/corpus/forms/mirrors/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/**
 * 检测基线（**recorded**，2026-09-16，commit 前实测）。
 * 语义：**只记录现状**，不把未注入当期望；本周期不预先修检测（D-001 阶段 B / D-016）。
 * 翻转基线必须显式改本表并附归因（禁止为修绿静默更新）。
 * 实测口径：镜像页与**真实页**同口径探测结果一致（8/8 一致，见窗口报告 §实测）。
 */
const BASELINE: Record<string, { wrappers: number; tier?: string; target?: string; childFrame?: boolean }> = {
  'iti-v29': { wrappers: 1, tier: 'auto', target: '#phone' },
  'rpn-input': { wrappers: 0 },
  'codepen-iti-v17': { wrappers: 1, tier: 'auto', target: '.tel-input', childFrame: true },
  'mui-autocomplete': { wrappers: 0 },
  'element-plus-select': { wrappers: 0 },
  'antd-select': { wrappers: 0 },
  'chosen-select': { wrappers: 0 },
  'heroku-signup': { wrappers: 0 },
};

const PAGES = Object.keys(BASELINE);

async function gotoMirror(page: import('playwright/test').Page, id: string) {
  await page.goto(MIRRORS + id + '.html', { waitUntil: 'load' });
}

// 每条用例前装 GM 替身 + 注入构建产物（页面导航前）
test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

// ── ① L0 静默健康（8/8） ──

test.describe('L0 静默健康 · 8 个镜像页全程 pageerror = 0', () => {
  for (const id of PAGES) {
    test('L0 · ' + id, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 120)));
      await page.setExtraHTTPHeaders({ 'user-agent': UA });
      await gotoMirror(page, id);
      // 等注入窗口结束（等待式守卫：任意 .cch-wrapper 或网络空闲）
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(600); // 仅用于让异步扫描落定；非断言等待（L2 等待一律可见状态迁移）
      expect.soft(errors, id + ' 全程不应有未捕获异常（实测：' + (errors.join(' | ') || 'none') + '）').toEqual([]);
    });
  }
});

// ── ② 检测基线（recorded） ──

test.describe('检测基线（recorded · 本周期只记录，翻转归票 08）', () => {
  for (const id of PAGES) {
    test('baseline · ' + id, async ({ page }) => {
      await gotoMirror(page, id);
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(600);

      const base = BASELINE[id];
      const scope = base.childFrame ? page.frameLocator('#result') : page;
      const wrappers = await scope.locator('.cch-wrapper').count();
      expect.soft(wrappers, id + ' 注入面应与记录基线一致（baseline=' + base.wrappers + '）').toBe(base.wrappers);

      if (base.wrappers > 0 && base.target) {
        expect.soft(await readTier(scope, base.target), id + ' 记录档位应保持')
          .toBe(base.tier);
      } else {
        // 未注入不是「期望」，而是**本周期实测到的缺口**（阶段 B 输入）——
        // 此处只断言该页确实存在可检测的表单区域（防镜像页退化为空白页）
        const region = await page.locator('form, .iti, .PhoneInput, .MuiAutocomplete-root, .el-select, .ant-select, .chosen-container').count();
        expect.soft(region, id + ' 应存在可检测的表单区域（未注入是已记录缺口，非空白页）').toBeGreaterThan(0);
      }
    });
  }
});

// ── ③ L1–L4 全链路（当前可注入的 owned 页） ──

test.describe('L1–L4 全链路 · owned 镜像页（iti v29）', () => {
  test('iti-v29 · 注入 → 档位 → 面板 → 搜索 → 选国 → 写入 + 事件 + 反馈', async ({ page }) => {
    await gotoMirror(page, 'iti-v29');

    await test.step('L1 元素已注入', async () => {
      await waitForInjection(page, '#phone');
      await softInjected(page, '#phone');
      await softTier(page, '#phone', 'auto');
    });

    await test.step('L3 事件面挂载（写入判据来源）', async () => {
      await recordFieldEvents(page, '#phone');
    });

    await test.step('L2 交互可驱动：开面板 → 搜索 → 选国', async () => {
      await openPanel(page, '#phone');
      await expect.soft(panel(page), 'open 后面板 #cch-pop 应可见').toBeVisible();
      await searchType(page, 'china');
      await selectCountry(page, 'cn');
      await expect.soft(panel(page), 'select 后面板应从 DOM 移除').toHaveCount(0);
    });

    await test.step('L3 写入结果正确（页面侧可观测）', async () => {
      await softHostValue(page, '#phone', '+86');
      expect.soft(await readHostValue(page, '#phone'), '宿主字段应写入 +86').toBe('+86');
      await softFieldEvent(page, 'input', 1);
      await softFieldEvent(page, 'change', 1);
      expect.soft(await countFieldEvents(page, 'change'), 'change 计数应 ≥1').toBeGreaterThanOrEqual(1);
    });

    await test.step('L4 用户反馈出现（页面侧可观测）', async () => {
      const fb = await readFeedback(page);
      expect.soft(fb.present, '#cch-toast 应已出现（实测 ' + JSON.stringify(fb) + '）').toBe(true);
      await softFeedback(page, /已填入|Filled/);
    });
  });
});

// ── ④ 跨隔离上下文（嵌套帧，验收面 #14） ──

test.describe('跨隔离上下文 · CodePen 嵌套帧（双端断言）', () => {
  test('codepen-iti-v17 · 子帧 L1 + 顶层面板 + 子帧写入', async ({ page }) => {
    await gotoMirror(page, 'codepen-iti-v17');

    // FrameLocator 只支持 locator 面；事件/读值原语需 Frame 对象（.evaluate 面）。
    // 先经 FrameLocator 等待子帧注入（等待式守卫），再取 Frame 承载 evaluate 类原语。
    const childLoc = page.frameLocator('#result');
    await waitForInjection(childLoc, '.tel-input');
    const child = page.frames().find((f) => f.url().includes('codepen-iti-v17-child'));
    expect.soft(child, '应能定位到子帧 Frame 对象').toBeTruthy();
    if (!child) return;

    await test.step('子帧端 L1：元素已在子帧注入', async () => {
      expect.soft(await wrapperFor(child, '.tel-input').count(), '子帧内应注入 .cch-wrapper').toBe(1);
      expect.soft(await readTier(child, '.tel-input'), '子帧注入档位应为 auto').toBe('auto');
    });

    await test.step('顶层端：子帧图标点击 → 顶层代开面板', async () => {
      await child.locator('.cch-btn').first().click();
      await expect.soft(panel(page), '子帧点击后**顶层**应出现面板（面板宿主仅顶层）').toBeVisible();
    });

    await test.step('子帧端 L3：顶层选国 → 子帧执行填充（链路两端均断言）', async () => {
      await recordFieldEvents(child, '.tel-input');
      await searchType(page, 'china');
      await selectCountry(page, 'cn');
      // 跨帧写入是**异步**结果（顶层选国 → postMessage → 子帧 Fill.run），
      // 且面板 detach 早于子帧落值：必须用 web-first 断言**等待**，不得在
      // selectCountry 返回后立即读值（R1：CI 上该竞态曾使本步读到空串而本地绿；
      // 验收面 §4.2 L2 同时禁止固定 sleep —— 等待一律靠可见状态/轮询）
      await softHostValue(child, '.tel-input', '+86');
      await expect.poll(() => countFieldEvents(child, 'change'), {
        timeout: 5000,
        message: '子帧字段应派发 change ≥1（跨帧异步结果，轮询等待）',
      }).toBeGreaterThanOrEqual(1);
    });
  });
});
