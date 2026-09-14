# 启动器 39 — 真实站点层启用

身份：你是 Cycle-5 票 39 的实施子窗口。本票覆盖 A-xxx: A-016。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\39-real-site-enablement.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\39-real-site-enablement.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 跳过条目必须携带非空 reason + ticket
- 不得让 flaky 真实站点污染密封 E2E
- 若目标站点不可达/改版，如实登记并降级为 observe，不伪造绿

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/39-real-site-enablement-report.md`（本仓库既有约定路径）。
