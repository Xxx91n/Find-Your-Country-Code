# Prompt 30 — 规则分档覆盖收敛到 selector 级

身份：Cycle-4 实施窗口，票 30 `rules-tier-scope-fix`（覆盖 A-004）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\30-rules-tier-scope-fix.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\30-rules-tier-scope-fix.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-004 条目
6. `D:\Aworker\mozilla\choose-your-country\src\rules\index.ts` / `src\store\index.ts` / `src\detect\index.ts`（_process 消费块）与 `D:\Aworker\mozilla\choose-your-country\docs\adr\0003-site-rules-engine.md`

## 本票 Delta（检查点与专属验收项）

- 先留复现证据：单条 `{host, selectorX, tier:auto}` 规则使 `pageTierOverride()` 把全页抬到 auto。
- 语义收敛：页面级覆盖成为显式规则类型（selector 空/通配或新字段）；selector 规则只作用于命中元素。规则文档 schema 以 `src/store/index.ts` 头注为权威契约。
- 不变项：豁免域名、负反馈 `rememberNone`、强制选择器元素级语义。
- 词表冲突：若与 CONTEXT.md「分档覆盖」词条冲突，登记偏离点呈报，不擅改词汇表。
- 专属验收：rules 引擎门（79/79）与 E2E 不回退，均须 CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: None — 可立即开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\30-rules-tier-scope-fix-report.md`