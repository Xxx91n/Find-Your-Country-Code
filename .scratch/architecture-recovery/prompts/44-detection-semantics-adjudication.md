# 启动器 44 — 检测语义裁决与语料先行

身份：你是 Cycle-5 票 44 的实施子窗口。本票覆盖 A-xxx: A-022, A-023。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\44-detection-semantics-adjudication.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\44-detection-semantics-adjudication.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 禁借补分越线（floor 不抬 ceiling）
- 语料先行：无地基不立检测改动
- 性能红线 1000 节点 scan < 350ms
- 产品语义裁决结果需用户确认后方可实施

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/44-detection-semantics-adjudication-report.md`（本仓库既有约定路径）。
