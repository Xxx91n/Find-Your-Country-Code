# 启动器 36 — 门禁完整性返修

身份：你是 Cycle-5 票 36 的实施子窗口。本票覆盖 A-xxx: A-014, A-015, A-020。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\36-gate-integrity-repair.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\36-gate-integrity-repair.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 只修装载与口径，不得删除或弱化任何断言
- 若某门因源码头变更本身已失效，如实呈报，不“凑绿”
- node 升级需核对 `stripTypeScriptTypes` 可用性下限（≥22.13）
- 不得触碰 release.yml 触发语义

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/36-gate-integrity-repair-report.md`（本仓库既有约定路径）。
