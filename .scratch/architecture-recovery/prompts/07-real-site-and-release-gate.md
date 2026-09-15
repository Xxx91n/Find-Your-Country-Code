# 启动器 07 — 真实站点层全阶梯 + 发布门

身份：你是 Cycle-6 票 07 的实施子窗口。本票覆盖 A-xxx：A-029。

**阻塞项**：票 06（形态语料）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\07-real-site-and-release-gate.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\07-real-site-and-release-gate.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（issue 验收项之外的检查点）:
- 真实站点层**跑全阶梯（含 L4）**，但**不进 `pull_request` 触发面**
- 失败**只告警不阻断合入**；阻断只发生在发布门
- 发布门不得被静默绕过（必须「绿」或「显式 ack + 立票」二选一）
- `observe` 挂账强制携带非空 reason + ticket

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/07-real-site-and-release-gate-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
