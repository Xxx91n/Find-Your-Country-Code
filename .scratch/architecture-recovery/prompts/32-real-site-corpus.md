# Prompt 32 — 真实站点抽样语料 + 覆盖回归

身份：Cycle-4 实施窗口，票 32 `real-site-corpus`（覆盖 A-006；本票是 27/28/29 的地基，优先开工）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\32-real-site-corpus.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\32-real-site-corpus.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-006 条目
6. `D:\Aworker\mozilla\choose-your-country\tests\corpus\manifest.json` / `tests\scripts\14-calibration-harness.mjs` / `playwright.config.ts` / `docs\adr\0006-ci-hygiene-policy.md`
7. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle4-atomcode-findings.md` — 本周期两路调研浓缩（模式库/冒烟分层/CDP 断言参照）

## 本票 Delta（检查点与专属验收项）

- 模式库三类真实形态入 corpus（弱信号 input / ISO2-value 括号区号下拉 / 无 ARIA 自定义下拉），各标注期望 tier 与信号归因。
- 先产出 27/28/29 的复现基线：当前实现对三类形态的漏检证据，报告单列小节。
- 冒烟分层红线：密封 E2E 不触外网语义不动；真实站点层 = 低频/手动触发 + 可跳过白名单 + 失败 advisory 不阻断 PR。
- CDP `Autofill.trigger` 先评估适配度再采用，不硬套。
- 专属验收：calibration-baseline 前后 precision/recall 对照绿，CI-only 证据（run ID）。

## 开工第一句

先复述本票阻塞关系（Blocked by: None — 可立即开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\32-real-site-corpus-report.md`