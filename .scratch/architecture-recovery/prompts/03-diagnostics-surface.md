# 启动器 03 — 诊断面

身份：你是 Cycle-6 票 03 的实施子窗口。本票覆盖 A-xxx：A-028。

**阻塞项**：None（可立即开工）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\03-diagnostics-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\03-diagnostics-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0001-scoring-engine-replaces-boolean-detection.md

本票 delta（issue 验收项之外的检查点）:
- 面板与机器可读输出必须从**同一份**诊断数据渲染（不得各自采集）
- **error/warn 与计数器恒开**，只有全链路 trace 门控（「零开销」指高开销诊断，不是零可观测）
- 入口收敛为**一个** GM 菜单项
- fail 记录的 reason 必须指向**已验证因果**
- 诊断不得挂运行热路径（1000 节点 scan < 350ms 不回退）

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/03-diagnostics-surface-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
