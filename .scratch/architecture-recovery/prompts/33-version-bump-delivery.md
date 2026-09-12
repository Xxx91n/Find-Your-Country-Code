# Prompt 33 — 版本 bump 交付闭环

身份：Cycle-4 实施窗口，票 33 `version-bump-delivery`（覆盖 A-007；收口波，六票未全绿不得开工）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\33-version-bump-delivery.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\33-version-bump-delivery.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-007 条目
6. `D:\Aworker\mozilla\choose-your-country\package.json` / `vite.config.ts` / `greasyfork\Glog.md` / `greasyfork\Glog_EN.md` / `.github\workflows\release-dry-run.yml`

## 本票 Delta（检查点与专属验收项）

- 前置核对：27/28/29/30/31/32 六票报告落盘且复核通过、Blocked by 全清，否则停下呈报。
- 目标版本号由大脑在开工指令中给定（票面不预设）；三处同步 = package.json + vite.config.ts + Glog/Glog_EN 头条。
- dry-run CI 先行：三处一致 + tag 状态校验绿才可合入。
- 权限边界：真实发版（tag / GitHub Release / GreasyFork）须用户确认，不在本票范围。
- 专属验收：dry-run run ID + 三处版本一致证据。

## 开工第一句

先复述本票阻塞关系（Blocked by: 27,28,29,30,31,32 — 全部实施票复核通过后方可开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\33-version-bump-delivery-report.md`