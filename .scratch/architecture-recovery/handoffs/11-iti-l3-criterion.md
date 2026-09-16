# Handoff 11 — 判定 ITI 形态下 L3 的正确可观测判据

> Cycle-6 | 票：`issues/11-iti-l3-criterion.md` | 覆盖 A-xxx：**A-035**（P1）
> 上游：`research/window-reports/07-real-site-and-release-gate-report.md` §5.2/§5.4（建议立票 2）+ `research/cycle6-wave4-review.md` §三

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\11-iti-l3-criterion.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\11-iti-l3-criterion.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-real-site-and-release-gate-report.md`
- `D:\Aworker\mozilla\choose-your-country\tests\ACCEPTANCE-SURFACE.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md`

**通用调研要求（本票适用，Cycle-6 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0010）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- **判定前不得以「改判据」方式消除红项**——本票的产出是**有据的判据判定**，不是把红变绿。
- 不得放宽 L3 的「写后读回」语义；不得删除任何既有断言（只升不降）。
- 判据变更必须给出**影响面清单**（哪些目标、哪些字段形态受影响），并证明 `mirror-control` 与普通 `input`/`select` 路径仍按原判据成立。
- ITI 官方语义依据须留痕（atomcode 调研或官方文档引用），不得凭记忆合成。
- 真实站点层仍为 advisory（不进 `pull_request`）；发布门判据不变。

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/11-iti-l3-criterion-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 50+ 报告链及 README 索引一致；若要求改回请显式指出）。
