# Handoff 05 — harness 交互原语

> Cycle-6 | 票：`issues/05-harness-primitives.md` | 覆盖 A-xxx：**A-029**
> 上游：`spec.md`（Cycle-6）+ `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016）+ `decision-ledger.md`（A-026…A-033）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\05-harness-primitives.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\05-harness-primitives.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md`

**通用调研要求（本票适用，Cycle-6 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0009）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- 必须**从密封层起建**（现状 `tests/helpers/userscript.ts` 仅 48 行 / 4 导出，密封层本身就没有原语层）
- 两个 harness **收敛为同一份原语**，不得新造第二套
- GM 替身改为**记录 `{title, fn}` 且可调用**
- 断言改 web-first + `expect.soft` 一次收全量

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/05-harness-primitives-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 50+ 报告链及 README 索引一致；若要求改回请显式指出）。
