# Handoff 02 — 设置面收口

> Cycle-6 | 票：`issues/02-settings-surface.md` | 覆盖 A-xxx：**A-026 · A-027**
> 上游：`spec.md`（Cycle-6）+ `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016）+ `decision-ledger.md`（A-026…A-033）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\02-settings-surface.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\02-settings-surface.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0003-site-rules-engine.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md`

**通用调研要求（本票适用，Cycle-6 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0009）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- **不新建独立设置视图、不重排设置顺序**（用户裁定 ③）——若你认为必须新建，先停下来呈报
- GM 菜单「设置」项必须打开面板**并显式切到设置所在视图**（不能只开面板）
- 深链目标用**稳定标识符**，不得绑内部实现名或易变排序位置
- 不得改 `LOCALE_MODES` 取值语义与 `UI_PREFS_KEY` 持久化键
- 切换后必须**全量重渲染**，不得继续手工逐项刷新

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/02-settings-surface-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 50+ 报告链及 README 索引一致；若要求改回请显式指出）。
