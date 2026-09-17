# Handoff 33 — 版本 bump 交付闭环

> Cycle-4 | 票: issues/33-version-bump-delivery.md | 覆盖 A-007（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\33-version-bump-delivery.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\package.json`
- `D:\Aworker\mozilla\choose-your-country\vite.config.ts`
- `D:\Aworker\mozilla\choose-your-country\greasyfork\Glog.md`
- `D:\Aworker\mozilla\choose-your-country\greasyfork\Glog_EN.md`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\release-dry-run.yml`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 目标版本号由大脑在开工指令中给定（票面不预设）；三处同步 = package.json + vite.config.ts + Glog/Glog_EN changelog 头条。
- dry-run CI 先行：release-dry-run 绿（三处版本一致 + tag 状态校验）才可提交合入；红则归因后重跑。
- 本票范围止于 bump + dry-run 绿：真实发版（tag / GitHub Release / GreasyFork 同步）须用户明确确认，由大脑收口执行，不在本票权限内。
- 前置校验：开工前核对 27/28/29/30/31/32 六票报告均已落盘且复核通过（Blocked by 全清），否则停下呈报。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\33-version-bump-delivery-report.md`；GitButler 分支 `cch/33-version-bump-delivery`，版本控制遵循 WORKFLOW §4.2。