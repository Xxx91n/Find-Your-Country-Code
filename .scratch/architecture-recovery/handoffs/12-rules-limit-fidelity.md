# Handoff 12 — 规则上限强制点裁定 + BC 替身克隆保真度修复

> Cycle-6 | 票：`issues/12-rules-limit-fidelity.md` | 覆盖 A-xxx：**A-036**
> 上游：`research/window-reports/10-srcdoc-origin-fix-report.md` §6.1/§6.2（缺口发现与 A/B 对照实验）+ `research/cycle6-wave5-review.md`（首脑复核判定）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\12-rules-limit-fidelity.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\12-rules-limit-fidelity.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\10-srcdoc-origin-fix-report.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-wave5-review.md`
- `D:\Aworker\mozilla\choose-your-country\src\store\index.ts`
- `D:\Aworker\mozilla\choose-your-country\tests\scripts\verify-ticket-05.mjs`

**通用调研要求（本票适用，Cycle-6 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0010）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- **不得以「保留假绿」方式回避**：本票的核心是让断言反映**真实保证**；靠替身别名旁路维持 S4 绿属禁止项。
- **不得放宽或删除任何既有断言**；`verify-05` 的 100/100 基线必须在**保真度修正后**仍然成立（若因保真度修正而暴露真实缺口，须**修实现**而非改断言）。
- 替身保真度修正须与 `SELF_ORIGIN`（票 10）的既有修正**同源定义**，不得出现第二套 origin 取值。
- 强制点裁定须**有据**：给出工业界语义或本仓既有语义依据；若裁定为「读路径强制」，须在 CONTEXT/文档层显式说明（不得只留在代码注释）。
- 证据只认 CI run；真实站点层（advisory）如受影响须如实登记，不得伪造绿。

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/12-rules-limit-fidelity-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 60+ 报告链及 README 索引一致；若要求改回请显式指出）。
