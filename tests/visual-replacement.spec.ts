// ══════════════════════════════════════════════════════════════════
// visual-replacement.spec.ts — 票 08（阶段 B）/ A-032
// 视觉替换型隐藏原生 select 的**两个子形态各一 fixture**（升塔纪律 §4.5：先沉淀再修）
//
// 形态：组件库把**承载值的原生 select** 隐藏、由可见替身展示与交互。
//   子形态 A：width/height 1px（非零尺寸）+ clip + clip-path + aria-hidden（Select2 实测）
//   子形态 B：display:none（Chosen 实测）
//
// 断言口径 = 票 13 检查点一（本票 delta「不得改变既有豁免语义」）：
//   ① 闸门只降**注入档位** —— 隐藏承值 select 不注入图标
//      （否则图标落在 1px / 零尺寸盒上，用户不可达）；
//   ② 闸门不改**检测登记** —— 该字段仍须可经面板召唤并被真实填充
//      （视觉替换型站点是正样本：填原生 select 即组件库的标准写入通路）。
//
// 裁定权在页面侧外部可观测结果（D-002）：宿主 value + change 事件 + 页面回声；
//   脚本自报（signals / toast）只进诊断面，不作断言。
// 断言一律 expect.soft（一次收全量，不中断）。
// 原语唯一实现 = tests/helpers/primitives.mjs（本 spec 只经 ./helpers/userscript 门面调用）。
// ══════════════════════════════════════════════════════════════════
import { test, expect } from 'playwright/test';
import {
  installUserscript, wrapperFor, openPanel, selectCountry, recordFieldEvents,
  softHostValue, softFieldEvent,
} from './helpers/userscript';

const SUB_SHAPES = [
  { key: 'A', sel: '#vrs-a-native', echo: '#vrs-a-echo', label: 'width:1px + aria-hidden（Select2 机理）' },
  { key: 'B', sel: '#vrs-b-native', echo: '#vrs-b-echo', label: 'display:none（Chosen 机理）' },
];

test.beforeEach(async ({ page }) => {
  await installUserscript(page);
});

test.describe('A-032 视觉替换型隐藏承值原生 select（两子形态）', () => {
  for (const s of SUB_SHAPES) {
    test('子形态 ' + s.key + ' · ' + s.label + '：闸门降档（不注入）+ 登记不回退（可召唤可填充）', async ({ page }) => {
      await page.goto('/fixtures/visual-replacement-hidden-select.html');
      // 事件面证据：先在宿主字段上装记录器（必须在填充动作之前）
      await recordFieldEvents(page, s.sel, ['input', 'change']);

      // ① 闸门降档：隐藏承值 select 不得被注入图标
      await expect.soft(wrapperFor(page, s.sel),
        '子形态 ' + s.key + ' 隐藏承值 select 不应被注入图标（闸门降档）').toHaveCount(0);

      // ② 登记不回退：面板召唤入口可达 → 召唤 → 图标挂上
      await openPanel(page, '#vrs-visible');
      await expect(page.locator('#cch-summon'),
        '子形态 ' + s.key + ' 面板应出现召唤入口（登记非空）').toBeVisible();
      await page.locator('#cch-summon').click();
      await expect(wrapperFor(page, s.sel),
        '子形态 ' + s.key + ' 召唤后应挂上图标（闸门未误杀登记）').toHaveCount(1);

      // ③ 可真实填充：面板选国 → 宿主 value + change 事件 + 页面侧回声（外部可观测）
      // 面板在召唤后仍保持打开（召唤按钮自身不关面板），先在面板外单击关闭，
      // 再点召唤出的图标重新绑定到该隐藏字段（与票 13 验收 2 同路径）。
      // 面板关闭契约 = document 上的 mousedown 且 target 不在面板内（src/ui/index.ts _bindPopupEvents）；
      // 在 body 上派发真实 mousedown 模拟「点面板外」（不做 hit-test，避免面板遮挡导致的位置依赖）。
      await page.evaluate(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
      await expect(page.locator('#cch-pop'), '面板应在面板外 mousedown 后关闭').toHaveCount(0);
      await openPanel(page, s.sel);
      await selectCountry(page, 'cn');
      await softHostValue(page, s.sel, 'CN');
      await softFieldEvent(page, 'change', 1);
      await expect.soft(page.locator(s.echo),
        '子形态 ' + s.key + ' 页面侧回声应反映写入（外部可观测）').toHaveText('CN');
    });
  }
});
