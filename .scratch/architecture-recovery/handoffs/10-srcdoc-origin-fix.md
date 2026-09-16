# Handoff 10 — 修复 `about:srcdoc` 帧跨帧 origin 校验误判

> Cycle-6 | 票：`issues/10-srcdoc-origin-fix.md` | 覆盖 A-xxx：**A-034**（P0）
> 上游：`research/window-reports/07-real-site-and-release-gate-report.md` §5（根因取证）+ `research/cycle6-wave4-review.md` §四（首脑独立复现）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\10-srcdoc-origin-fix.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\10-srcdoc-origin-fix.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-real-site-and-release-gate-report.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-wave4-review.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0010-release-gate.md`

**通用调研要求（本票适用，Cycle-6 各票一致 — 启动器只引用本 handoff，不复述）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0010）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

**本票 Delta（issue 验收项之外的检查点）:**
- **不得放宽跨帧来源校验**：票 24 的 `e.origin` 校验语义不变；**不得**以删除校验替代修复。
- **跨域顶层场景不得回归**：票 12 的跨域 fixture 既有拒绝语义必须保持（修复只允许纠正 `location.origin === "null"` 这一类的**误判**，不允许放宽到接受真实跨域来源）。
- 修法优先 `window.origin`；若采用回退分支，必须同时覆盖 `src/store/index.ts:67` 与 `:97`（BroadcastChannel 同源校验同面）。
- 复现证据必须包含**修复前**的红（L3/L4 失败）与**修复后**的绿（同一目标、同一阶梯），不接受仅"本地通过"。
- 真实站点层仍为 advisory（不进 `pull_request`）；发布门判据不变。

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `research/window-reports/10-srcdoc-origin-fix-report.md`；版本控制遵循 WORKFLOW §4.2。

**偏离点呈报:** 报告路径按本仓库既有约定 `research/window-reports/`（任务书原文写 `reports/NN-report.md`，与既有 50+ 报告链及 README 索引一致；若要求改回请显式指出）。
