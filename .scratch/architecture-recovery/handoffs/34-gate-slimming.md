# Handoff 34 — 门禁减肥

> Cycle-4 | 票: issues/34-gate-slimming.md | 覆盖 A-008, A-009（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\34-gate-slimming.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-13.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-16.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-18.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\e2e.yml`
- `D:\Aworker\mozilla\choose-your-country\tests\scripts\verify-ticket-02.mjs`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 先清点后摘除：逐文件 diff verify-13/16/18 的 engine-gates 重复项（verify-ticket-02.mjs + misdetect-repro-v2.mjs），列「公共 vs 专属」清单留报告，再抽 `engine-gates.yml` 公共 workflow——专属断言一律保留。
- 新 workflow 触发面 = pull_request + push(main, cch/**)（与 CONTEXT.md「CI 门禁」定义一致）；release 系 workflow 不碰。
- e2e.yml 补 `push: main` 触发面，与票 21 已有 PR 门控并存不冲突。
- 脚本位置纪律：workflow 只引 `tests/scripts/`，禁引 `.scratch/`（ADR-0006 决策 1）。
- 若合并暴露 verify-15 预存红门（cycle-3 遗留 F-1）：登记报告，不扩权修复（非本票授权面）。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\34-gate-slimming-report.md`；GitButler 分支 `cch/34-gate-slimming`，版本控制遵循 WORKFLOW §4.2。