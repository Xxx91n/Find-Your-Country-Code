# Prompt 31 — 填充结果可观测 + 失败反馈闭环

身份：Cycle-4 实施窗口，票 31 `fill-feedback-loop`（覆盖 A-005）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\31-fill-feedback-loop.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\31-fill-feedback-loop.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-005 条目
6. `D:\Aworker\mozilla\choose-your-country\src\fill\index.ts` / `src\ui\index.ts`（toast/面板）/ `src\i18n.ts`

## 本票 Delta（检查点与专属验收项）

- 先留复现证据：`fillSelect` 无匹配静默降级「已复制」与真成功不可分；`fillInput` 格式猜错静默。
- 信号设计：布尔结果升级三态（成功 / 降级复制 / 失败）；用户面 toast 文案分层，测试面一个可读钩子（选更贴既有 seams 的，勿造两套）。
- 不动正确路径：iti 联动 / select 消歧 / input 格式推断逻辑原样，只增观测。
- 约束：不新增运行时依赖；i18n 双语言文案同步。
- 专属验收：iti/select/input 三策略引擎门与 E2E 不回退，均须 CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: None — 可立即开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\31-fill-feedback-loop-report.md`