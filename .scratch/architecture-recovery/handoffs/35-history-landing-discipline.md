# Handoff 35 — 历史可查落地纪律

> Cycle-4 | 票: issues/35-history-landing-discipline.md | 覆盖 A-010（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\35-history-landing-discipline.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 收口纪律票：只读验证 + 教训落档，不改业务代码；落地动作本身由大脑按 WORKFLOW §4.2 执行。
- 若验证发现历史仍被 squash 成单 root commit：不重写历史「凑绿」（历史重写不可逆），如实呈报证据，交用户裁决。
- WORKFLOW §5 条目须含日期 / 教训 / 防再犯三字段，与既有行格式一致。

**完成定义:** issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要）；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\35-history-landing-discipline-report.md`；GitButler 分支 `cch/35-history-landing-discipline`，版本控制遵循 WORKFLOW §4.2。