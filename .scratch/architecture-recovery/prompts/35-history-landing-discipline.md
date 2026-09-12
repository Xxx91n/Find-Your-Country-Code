# Prompt 35 — 历史可查落地纪律

身份：Cycle-4 实施窗口，票 35 `history-landing-discipline`（覆盖 A-010；收口波，只读验证 + 纪律落档）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\35-history-landing-discipline.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\35-history-landing-discipline.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-010 条目
6. `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md`

## 本票 Delta（检查点与专属验收项）

- 只读验证：main 父链须含本周期票级提交、无新增无父 root commit；票 33 目标 tag 为 main 祖先（未发版记「待发版」不判红）。
- 验证不过 → 不重写历史凑绿，呈报证据待用户裁决。
- WORKFLOW §5 追加纪律条目（日期/教训/防再犯），与既有行格式一致。
- 不改业务代码；证据锚 commit sha。

## 开工第一句

先复述本票阻塞关系（Blocked by: 33 — 版本 bump 与全部合入完成后开工）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\35-history-landing-discipline-report.md`