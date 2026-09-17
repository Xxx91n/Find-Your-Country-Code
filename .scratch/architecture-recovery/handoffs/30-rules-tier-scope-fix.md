# Handoff 30 — 规则分档覆盖收敛到 selector 级

> Cycle-4 | 票: issues/30-rules-tier-scope-fix.md | 覆盖 A-004（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\30-rules-tier-scope-fix.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\src\rules\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\store\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0003-site-rules-engine.md`
- `D:\Aworker\mozilla\choose-your-country\tests\rules-ui.spec.ts`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 复现先行：单条 `{host, selectorX, tier:auto}` 规则 → `pageTierOverride()` 不看 selector 返回 'auto' → `_process` 把全页元素抬档。
- 收敛语义：页面级覆盖须成为显式规则类型（selector 空/通配或新增字段）；普通 selector 规则只作用于命中元素。规则文档 schema 以 `src/store/index.ts` 头注为权威契约，动格式先对照。
- 不变项：豁免域名（整站跳过）、负反馈 `rememberNone`、强制选择器元素级语义。
- CONTEXT.md「分档覆盖」词条若与新语义冲突，登记为偏离点呈报大脑，不擅改词汇表。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\30-rules-tier-scope-fix-report.md`；GitButler 分支 `cch/30-rules-tier-scope-fix`，版本控制遵循 WORKFLOW §4.2。