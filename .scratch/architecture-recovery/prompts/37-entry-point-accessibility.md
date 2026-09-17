# 启动器 37 — 入口可达性

身份：你是 Cycle-5 票 37 的实施子窗口。本票覆盖 A-xxx: A-012, A-013。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\37-entry-point-accessibility.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\37-entry-point-accessibility.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 不改评分引擎、不改 SCORE_AUTO/SCORE_LOWKEY、不改注入档位判定
- 面板仍只在顶层帧渲染
- 不得引入高饱和/动画（横幅盲区反模式）
- 入口不得与豁免/负反馈语义冲突

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/37-entry-point-accessibility-report.md`（本仓库既有约定路径）。
