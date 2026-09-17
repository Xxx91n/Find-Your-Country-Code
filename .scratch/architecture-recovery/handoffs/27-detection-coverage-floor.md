# Handoff 27 — 检测覆盖率下限补强

> Cycle-4 | 票: issues/27-detection-coverage-floor.md | 覆盖 A-001（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\27-detection-coverage-floor.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\src\config.ts`
- `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0001-scoring-engine-replaces-boolean-detection.md`
- `D:\Aworker\mozilla\choose-your-country\tests\corpus\manifest.json`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 复现先行：`<input name="countryCode">` / `placeholder="Country code"` 类弱信号形态当前 30 分（< SCORE_LOWKEY=35）落 none——留复现证据再动手。
- 改法选项（择一或组合，标定记录必留）：① attrStr 强短语组补分（与 label 强短语区分）；② 单强关键字 + tel 语义在无锚时入低置信档；③ 阈值重调（最后手段，全局副作用大）。
- 误报护栏：L4 排除层与裸词降权链保持有效；新增正例不得把「本地固话区号 / 语言前缀」类负例抬回 lowkey。
- `SCORE_AUTO` 不动；`SCORE_LOWKEY` 任何调整须全量 corpus precision/recall 标定数据背书。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\27-detection-coverage-floor-report.md`；GitButler 分支 `cch/27-detection-coverage-floor`，版本控制遵循 WORKFLOW §4.2。