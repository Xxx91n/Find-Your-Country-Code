# 启动器 08 — 阶段 B：失效驱动修复

身份：你是 Cycle-6 票 08 的实施子窗口。本票覆盖 A-xxx：A-031 · A-032。

**阻塞项**：票 07（真实站点层与发布门）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\08-phase-b-failure-fixes.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\08-phase-b-failure-fixes.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0009-evidence-quantity-tier-boundary.md

本票 delta（issue 验收项之外的检查点）:
- **语料先行**：三个新形态先入语料再评估，不得先改检测代码
- 视觉替换型隐藏 select 的**两个子形态各建 fixture**（`width:1px+aria-hidden` 与 `display:none`）
- 不得改变可见性闸门对「隐藏但承载值的原生 select」的既有豁免语义
- 性能红线（1000 节点 scan < 350ms）不回退

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/08-phase-b-failure-fixes-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
