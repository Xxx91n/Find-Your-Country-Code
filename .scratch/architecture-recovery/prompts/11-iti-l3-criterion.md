# 启动器 11 — 判定 ITI 形态下 L3 的正确可观测判据

身份：你是 Cycle-6 票 11 的实施子窗口。本票覆盖 A-xxx：A-035（P1）。

**阻塞项**：票 07（真实站点层与发布门）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\11-iti-l3-criterion.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\11-iti-l3-criterion.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-real-site-and-release-gate-report.md
- D:\Aworker\mozilla\choose-your-country\tests\ACCEPTANCE-SURFACE.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（issue 验收项之外的检查点）:
- **判定前不得以「改判据」方式消除红项**——产出是**有据的判据判定**，不是把红变绿
- 不得放宽 L3 的「写后读回」语义；不得删除任何既有断言（只升不降）
- 判据变更必须给出**影响面清单**，并证明 `mirror-control` 与普通 `input`/`select` 路径仍按原判据成立
- ITI 官方语义依据须留痕（调研或官方文档引用），不得凭记忆合成
- 真实站点层保持 advisory（不进 `pull_request`）；发布门判据不变

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/11-iti-l3-criterion-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
