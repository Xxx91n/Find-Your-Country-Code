# 启动器 02 — 设置面收口

身份：你是 Cycle-6 票 02 的实施子窗口。本票覆盖 A-xxx：A-026 · A-027。

**阻塞项**：None（可立即开工）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\02-settings-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\02-settings-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0003-site-rules-engine.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md

本票 delta（issue 验收项之外的检查点）:
- **不新建独立设置视图、不重排设置顺序**（用户裁定 ③）——若你认为必须新建，先停下来呈报
- GM 菜单「设置」项必须打开面板**并显式切到设置所在视图**（不能只开面板）
- 深链目标用**稳定标识符**，不得绑内部实现名或易变排序位置
- 不得改 `LOCALE_MODES` 取值语义与 `UI_PREFS_KEY` 持久化键
- 切换后必须**全量重渲染**，不得继续手工逐项刷新

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/02-settings-surface-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
