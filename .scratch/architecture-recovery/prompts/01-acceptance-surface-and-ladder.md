# 启动器 01 — 验收面与断言阶梯定义

身份：你是 Cycle-6 票 01 的实施子窗口。本票覆盖 A-xxx：A-029 · A-030。

**阻塞项**：None（可立即开工）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\01-acceptance-surface-and-ladder.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\01-acceptance-surface-and-ladder.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0001-scoring-engine-replaces-boolean-detection.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（issue 验收项之外的检查点）:
- 本票只产出**定义**，不建 harness、不改源码
- 17 项 + 1 项诊断的清单必须逐项带「页面侧外部可观测」判据（不得只写工具名）
- L4 纳入自动化（用户裁决覆盖调研建议）；真实站点跑全阶梯但 advisory
- 环境真实性约束（L2 以上真实 runtime / headless 必须 full Chromium）必须成文

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/01-acceptance-surface-and-ladder-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
