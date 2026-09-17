# 启动器 10 — 修复 `about:srcdoc` 帧跨帧 origin 校验误判

身份：你是 Cycle-6 票 10 的实施子窗口。本票覆盖 A-xxx：A-034（**P0**）。

**阻塞项**：票 07（真实站点层与发布门）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\10-srcdoc-origin-fix.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\10-srcdoc-origin-fix.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-real-site-and-release-gate-report.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-wave4-review.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0010-release-gate.md

本票 delta（issue 验收项之外的检查点）:
- **不得放宽跨帧来源校验**（票 24 语义不变）；**不得**以删除校验替代修复
- 票 12 的跨域顶层 fixture 既有拒绝语义不得回归——只纠正 `location.origin === "null"` 类**误判**
- 修法优先 `window.origin`；若用回退分支，须同时覆盖 `src/store/index.ts:67` 与 `:97`
- 复现证据须含**修复前红**与**修复后绿**（同目标同阶梯），不接受仅"本地通过"
- 真实站点层保持 advisory（不进 `pull_request`）；发布门判据不变

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/10-srcdoc-origin-fix-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
