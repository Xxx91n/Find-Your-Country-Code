# Prompt 34 — 门禁减肥

身份：Cycle-4 实施窗口，票 34 `gate-slimming`（覆盖 A-008, A-009）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\34-gate-slimming.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\34-gate-slimming.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-008 / A-009 条目
6. `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-13.yml` / `verify-16.yml` / `verify-18.yml` / `e2e.yml`
7. `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md` — 脚本位置与 PR 门控纪律

## 本票 Delta（检查点与专属验收项）

- 先清点后摘除：逐文件 diff verify-13/16/18 中 engine-gates 重复项，「公共 vs 专属」清单留报告，再抽 `engine-gates.yml`；专属断言一律保留。
- 新 workflow 触发面 = pull_request + push(main, cch/**)；release 系 workflow 不碰。
- e2e.yml 补 `push: main`，与既有 PR 门控并存。
- 脚本纪律：workflow 只引 `tests/scripts/`。
- 预存红门（verify-15 / F-1）如被合并暴露：登记报告，不扩权修复。
- 专属验收：抽公共前后票级回归项数对照 + 全 workflow 绿，均须 CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: None — 可立即开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\34-gate-slimming-report.md`