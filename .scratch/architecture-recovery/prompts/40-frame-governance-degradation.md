# 启动器 40 — 帧治理降级反馈

身份：你是 Cycle-5 票 40 的实施子窗口。本票覆盖 A-xxx: A-017。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\40-frame-governance-degradation.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\40-frame-governance-degradation.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 不重构既有帧架构（全帧自治 + 顶层中心化 + origin/source 双校验）
- 票 24 入站 origin 校验语义不放松
- 安全校验失败的降级必须是“提示”而非“放宽校验”

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/40-frame-governance-degradation-report.md`（本仓库既有约定路径）。
