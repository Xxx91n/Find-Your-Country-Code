# Prompt 28 — ISO2-value 下拉区号证据补全

身份：Cycle-4 实施窗口，票 28 `iso2-dial-evidence`（覆盖 A-002）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\28-iso2-dial-evidence.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\28-iso2-dial-evidence.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-002 条目
6. `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`（optStats / L3 结算块）与 `D:\Aworker\mozilla\choose-your-country\docs\adr\0001-scoring-engine-replaces-boolean-detection.md`

## 本票 Delta（检查点与专属验收项）

- 先留复现证据：`<option value="us">United States (+1)</option>` 类下拉文本区号证据被 `if (st.plusDial > 0)` 嵌套吞掉。
- 修法：文本侧 parenDial 独立计分；分值全部复用 `src/config.ts` L3 常量，不新增魔法数。
- 护栏 1：`country-semantic:suppress` 保持有效——纯 ISO2 无区号证据的国家选择器仍判 none。
- 护栏 2：共享区号（+1）消歧不回退；`pseudoOptionStats` 与 `optStats` 口径同步（票 13 检查点二）。
- 专属验收：正例源用票 32 模式库；CI calibration baseline 绿 + E2E 绿，均须 CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: 32 — 需 ISO2-value 括号区号真实形态语料已入模式库）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\28-iso2-dial-evidence-report.md`