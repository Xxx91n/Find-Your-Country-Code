// 票 12 [D-013/D-014] contenteditable 区号字段：**扫描层（候选集）**端到端闭环。
//
// 背景：T-12 向 SCAN_SELECTORS 加了 contenteditable 复合描述符，但三个 ce-* 语料用例
// （tests/corpus/manifest.json）无 tabindex、且只被 harness 喂给 scoreElement —— 扫描层
// （候选采集）从未端到端跑过。本 spec 在「真实 DOM + 真引擎（dist 产物）+ 真
// MutationObserver」下补齐这个闭环，并锁定两个缺口修正：
//   · 缺口 2a：:not([contenteditable="false"]) —— 非可编辑元素不得入候选集；
//   · 缺口 2b：contenteditable 进 OBSERVED_ATTRS 与 _fingerprint —— 翻转即重扫 + 重评。
//
// 可观测面 = window.__cchDiag().counters（票 03 [A-028] 恒开计数器，页面侧机器可读）：
//   · candidates：scan() 每次扫描的候选命中数累加（候选集 = 本票被测面）；
//   · scored    ：评分引擎实跑次数（指纹变化才重评 → 缺口 2b 的重评证据）。
// 单次扫描命中数 = 「用观测面属性（body[title]）触发一次重扫，取计数器增量 / 扫描增量」；
// 元素级归因 = 全量单扫命中数 − 移除该元素后的单扫命中数（差分）。
//
// 为何正例不直接断言「图标已注入」：_process 的 kind 分派只认 SELECT/INPUT/pseudo，
// 非表单宿主（p/div）无 kind ⇒ inject:no-kind 短路，不挂图标。这是**注入层**的既有边界，
// 不在票 12（候选集扩展）范围内 —— 本 spec 断言票 12 真正交付的面：候选集归属；
// 评分档位（ce-dial-positive = lowkey）由语料 + 14-calibration-harness 在评分层锁定。
import { test, expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { installUserscript, wrapperFor } from './helpers/userscript';

type Counters = { scans: number; candidates: number; scored: number };

async function counters(page: Page): Promise<Counters> {
  return page.evaluate(() => {
    const c = (window as any).__cchDiag().counters;
    return { scans: c.scans, candidates: c.candidates, scored: c.scored };
  });
}

/** 等扫描面静默：连续两次采样键相同（采样间隔 700ms > RESCAN_DEBOUNCE_MS=350ms）。 */
async function settle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const w = window as any;
    const c = w.__cchDiag().counters;
    const key = c.scans + '|' + c.candidates + '|' + c.scored;
    if (w.__cchSettleKey === key) return true;
    w.__cchSettleKey = key;
    return false;
  }, null, { timeout: 15000, polling: 700 });
}

/** 单次 scan 的候选命中数：用观测面属性触发一次重扫，取计数器增量 / 扫描增量。 */
async function perScanCandidates(page: Page): Promise<number> {
  const before = await counters(page);
  await page.evaluate(() => { document.body.setAttribute('title', 'cch-scan-probe-' + Date.now()); });
  await page.waitForFunction((s) => (window as any).__cchDiag().counters.scans > s, before.scans, { timeout: 8000 });
  const after = await counters(page);
  const ds = after.scans - before.scans;
  expect(ds, '探针应恰好触发扫描').toBeGreaterThan(0);
  return (after.candidates - before.candidates) / ds;
}

/** 元素级候选集归因：逐个移除 ids，差分得到每个元素的候选命中贡献。 */
async function contributionsOf(page: Page, ids: string[]): Promise<Record<string, number>> {
  await settle(page);
  let prev = await perScanCandidates(page);
  const out: Record<string, number> = {};
  for (const id of ids) {
    const removed = await page.evaluate((i) => {
      const el = document.getElementById(i);
      if (!el) return false;
      el.remove();
      return true;
    }, id);
    expect(removed, 'fixture 必须含 #' + id).toBe(true);
    await settle(page);
    const cur = await perScanCandidates(page);
    out[id] = prev - cur;
    prev = cur;
  }
  return out;
}

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('contenteditable 区号字段扫描层（票 12 / D-014）', () => {
  test('验收1 正例入候选集：inputmode=tel / autocomplete=tel / role=textbox 三条复合描述符各命中一次', async ({ page }) => {
    await page.goto('/fixtures/contenteditable-dial.html');
    // 注入路径活性对照：原生 select 正样本仍被注入（证明后续 0 不是「整页失效」的假阴性）
    await expect(wrapperFor(page, '#anchor-cc')).toHaveCount(1);
    const c = await contributionsOf(page, ['ce-dial', 'ce-autocomplete', 'ce-richtext-textbox']);
    expect(c['ce-dial'], '#ce-dial 应被复合描述符收进候选集（contenteditable + tabindex=0 + inputmode=tel）').toBe(1);
    expect(c['ce-autocomplete'], '#ce-autocomplete 应被复合描述符收进候选集（autocomplete=tel）').toBe(1);
    expect(c['ce-richtext-textbox'], '#ce-richtext-textbox 应被 role=textbox 分支收进候选集').toBe(1);
  });

  test('验收2 反例不入候选集：无 tel 先验 / 不可聚焦 / contenteditable="false"（缺口 2a）', async ({ page }) => {
    await page.goto('/fixtures/contenteditable-dial.html');
    const c = await contributionsOf(page, ['ce-richtext', 'ce-no-tabindex', 'ce-false']);
    expect(c['ce-richtext'], '富文本编辑器（无 tel 先验）不得入候选集 —— 候选爆炸防线').toBe(0);
    expect(c['ce-no-tabindex'], '不可聚焦（无 tabindex=0）的 contenteditable 不得入候选集').toBe(0);
    expect(c['ce-false'], 'contenteditable="false" 必须被 :not 排除（缺口 2a）').toBe(0);
  });

  test('验收3 缺口 2b：contenteditable 翻转触发重扫 + 重评（OBSERVED_ATTRS 与指纹同步）', async ({ page }) => {
    await page.goto('/fixtures/contenteditable-dial.html');
    await settle(page);
    const before = await counters(page);
    await page.locator('#ce-toggle').click();
    let reevaluated = true;
    try {
      await page.waitForFunction((s) => (window as any).__cchDiag().counters.scored > s, before.scored, { timeout: 6000 });
    } catch {
      reevaluated = false;
    }
    const after = await counters(page);
    expect(reevaluated && after.scored > before.scored,
      '翻转 contenteditable 应触发重扫并重评（scored ' + before.scored + ' → ' + after.scored + '）').toBe(true);
    // 翻转后 #ce-dyn 才被复合描述符命中：候选贡献 1（div[tabindex=0]）→ 2（+ contenteditable 复合）
    const c = await contributionsOf(page, ['ce-dyn']);
    expect(c['ce-dyn'], '翻转后 #ce-dyn 应同时命中 div[tabindex=0] 与 contenteditable 复合描述符').toBe(2);
  });
});
