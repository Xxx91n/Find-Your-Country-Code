# Handoff 06 — 形态语料三层架构

> Cycle-6 | 票：`issues/06-form-corpus.md` | 覆盖 A-xxx：**A-030**
> 上游：`spec.md`（Cycle-6）+ `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016）+ `decision-ledger.md`（A-026…A-033）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\06-form-corpus.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\06-form-corpus.md`
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
- 目录**适配 ADR-0006 条款 5 的单一 `tests/` 根**；**不得新增顶层 `corpus/`**
- 原始快照**不入库**；库内只留指纹与元数据清单
- **不引入对象存储/S3**，复用既有仓库外 archive 模式
- 命名用「**形态语料**」，不得与既有「校准语料」混淆
- 纪律：**绝不为修绿而盲目更新快照**

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/06-form-corpus-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 50+ 报告链及 README 索引一致；若要求改回请显式指出）。
