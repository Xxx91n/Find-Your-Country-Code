# Prompt 26 — ADR + Docs Closure for Cycle-3 Hygiene

你是一名实施 Agent。本票撰写 ADR-0006 记录本周期所有 CI 卫生决策，更新 CONTEXT.md 术语表，并更新 README 状态表。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\26-adr-docs-closure.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\26-adr-docs-closure.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md` — 作为 ADR 格式模板
6. 票 20-25 的各窗口报告（用于提取证据）

## 专属 Delta

- 撰写 `docs/adr/0006-ci-hygiene-policy.md`：记录 CI 脚本位置约定、PR 门禁策略、typecheck 门禁、依赖版本钉死策略、目录结构约定
- 更新 `CONTEXT.md`：新增术语 CI gate / PR gating / hermetic E2E / typecheck gate / dependency pinning
- 更新 `.scratch/architecture-recovery/README.md` 状态表（票 20-26）
- 验证 ADR-0006 遵循现有格式（标题、状态 accepted、Context、Decision、Consequences）
- 验证 CONTEXT.md 未破坏现有术语

## 开工

先复述本票的阻塞关系（Blocked by: 20, 21, 22, 23, 24, 25 — 所有实施票完成后才能写文档）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\26-adr-docs-closure-report.md`
