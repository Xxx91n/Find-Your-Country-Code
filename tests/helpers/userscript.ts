// ══════════════════════════════════════════════════════════════════
// userscript.ts — 密封层门面 + 断言 adapter（票 05 / A-029）
//
// 交互原语的**唯一实现**在 ./primitives.mjs（密封层与 live 层共用同一份文件，不新造第二套）。
// 本文件只承担两件密封层专有的事：
//   ① 原语再导出 —— 保持既有 `from './helpers/userscript'` 导入面与 4 个既有导出名
//      （userscriptCode / installUserscript / wrapperFor / openPanel）不变；
//   ② 断言 adapter —— web-first + expect.soft 一次收全量。
// 共享层零 expect（依据见 atomcode-05-harness-primitives.md §2.2）：
// 断言只住在这里（密封层）与 live-smoke.mjs（自建软收集器），不进共享层。
// ══════════════════════════════════════════════════════════════════
import { expect } from 'playwright/test';
import type { Page } from 'playwright/test';
import { BUTTON_SELECTOR, feedbackToast, menuCommands, readFieldEvents, wrapperFor } from './primitives.mjs';

export * from './primitives.mjs';

// ── 断言 adapter：web-first locator + expect.soft（一次收全量） ──
// 真实站点一次访问成本高（验收面 §4 / D-004），故断言一律 soft：不中断，收全量失败。

/** 目标字段应被 .cch-wrapper 包裹（L1 元素已注入）。 */
export async function softInjected(scope: Page, target: string, timeout = 5000): Promise<void> {
  await expect.soft(wrapperFor(scope, target), `字段 ${target} 应被 .cch-wrapper 包裹（L1）`)
    .toHaveCount(1, { timeout });
}

/** 目标字段图标档位应为 tier（auto / lowkey）。 */
export async function softTier(scope: Page, target: string, tier: string): Promise<void> {
  await expect.soft(wrapperFor(scope, target).locator(BUTTON_SELECTOR), `字段 ${target} 档位应为 ${tier}`)
    .toHaveAttribute('data-cch-tier', tier);
}

/** 宿主字段 value 应为期望值（L3 写入结果正确）。 */
export async function softHostValue(scope: Page, target: string, value: string): Promise<void> {
  await expect.soft(scope.locator(target), `宿主字段 ${target} 的 value 应为 ${JSON.stringify(value)}`)
    .toHaveValue(value);
}

/** 宿主字段应派发 type 事件 ≥ min 次（L3 事件面）。 */
export async function softFieldEvent(scope: Page, type: string, min = 1): Promise<void> {
  const events: string[] = await readFieldEvents(scope);
  const n = events.filter((e) => e === type).length;
  expect.soft(n, `宿主字段应派发 ${type} ≥${min} 次（实测 ${n}，序列 [${events.join(',')}]）`)
    .toBeGreaterThanOrEqual(min);
}

/** 填充反馈（#cch-toast）文本应匹配 re（L4 用户反馈出现）。 */
export async function softFeedback(scope: Page, re: RegExp): Promise<void> {
  await expect.soft(feedbackToast(scope), `#cch-toast 文本应匹配 ${re}`).toContainText(re);
}

/** GM 菜单应登记匹配 re 的命令，且其 fn 可调用（验收面 #13）。 */
export async function softMenuCallable(scope: Page, re: RegExp): Promise<void> {
  const cmds: Array<{ id: string | null; title: string; callable: boolean }> = await menuCommands(scope);
  const hit = cmds.find((c) => re.test(c.title));
  expect.soft(hit, `GM 菜单应登记匹配 ${re} 的命令（已登记：${cmds.map((c) => c.title).join(' / ')}）`).toBeTruthy();
  expect.soft(hit ? hit.callable : false, `GM 菜单命令 ${re} 的 fn 应可调用`).toBe(true);
}
