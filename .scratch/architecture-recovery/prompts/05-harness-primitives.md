# 启动器 05 — harness 交互原语

身份：你是 Cycle-6 票 05 的实施子窗口。本票覆盖 A-xxx：A-029。

**阻塞项**：票 01（阶梯定义）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\05-harness-primitives.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\05-harness-primitives.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（issue 验收项之外的检查点）:
- 必须**从密封层起建**（现状 `tests/helpers/userscript.ts` 仅 48 行 / 4 导出，密封层本身就没有原语层）
- 两个 harness **收敛为同一份原语**，不得新造第二套
- GM 替身改为**记录 `{title, fn}` 且可调用**
- 断言改 web-first + `expect.soft` 一次收全量

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/05-harness-primitives-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
