# Handoff 31 — 填充结果可观测 + 失败反馈闭环

> Cycle-4 | 票: issues/31-fill-feedback-loop.md | 覆盖 A-005（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\31-fill-feedback-loop.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\src\fill\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\ui\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\i18n.ts`
- `D:\Aworker\mozilla\choose-your-country\src\iti-adapter\index.ts`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 复现先行：`fillSelect` 无匹配返回 false → toast「已复制」静默降级，用户无法区分「填充成功」与「降级复制」；`fillInput` 按 placeholder 猜格式，猜错静默。
- 信号设计（最小实现）：把 `Fill.run` 的布尔结果升级为三态（成功 / 降级复制 / 失败）——用户面 toast 文案分层，测试面留一个可读钩子（返回值或 `window.__cchLastFill` 类，选更贴既有 seams 的一个，勿造两套）。
- 不动正确路径：iti 联动、select 消歧、input 格式推断逻辑保持原样，只增观测。
- i18n 双语言文案同步补（`t()` 键），不新增运行时依赖。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\31-fill-feedback-loop-report.md`；GitButler 分支 `cch/31-fill-feedback-loop`，版本控制遵循 WORKFLOW §4.2。