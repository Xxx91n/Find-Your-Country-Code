# Handoff 37 — 入口可达性

> Cycle-5 | 票: `issues/37-entry-point-accessibility.md` | 覆盖 A-xxx: **A-012, A-013**
> 上游：`spec.md`（Cycle-5）+ `decision-ledger.md`（A-011…A-025）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\37-entry-point-accessibility.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md`

**通用调研要求（本票适用，Cycle-5 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0008）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- 不改评分引擎、不改 SCORE_AUTO/SCORE_LOWKEY、不改注入档位判定
- 面板仍只在顶层帧渲染
- 不得引入高饱和/动画（横幅盲区反模式）
- 入口不得与豁免/负反馈语义冲突

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/37-entry-point-accessibility-report.md`；版本控制遵循 WORKFLOW §4.2。
