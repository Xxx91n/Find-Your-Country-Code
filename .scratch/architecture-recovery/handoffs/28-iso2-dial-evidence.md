# Handoff 28 — ISO2-value 下拉区号证据补全

> Cycle-4 | 票: issues/28-iso2-dial-evidence.md | 覆盖 A-002（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\28-iso2-dial-evidence.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\config.ts`
- `D:\Aworker\mozilla\choose-your-country\src\data\countries.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0001-scoring-engine-replaces-boolean-detection.md`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 复现先行：`<option value="us">United States (+1)</option>` 类下拉 value 不命中 DIAL_SET → plusDial=0 → 文本侧 parenDial 证据被 `if (st.plusDial > 0)` 嵌套吞掉。
- 修法：文本括号区号证据独立计分（不嵌 plusDial 门），L3 常量口径复用 `src/config.ts` 不新增魔法数。
- 护栏 1：裸国家选择器抑制（`country-semantic:suppress`：isoName≥0.5 且区号证据全空）保持有效——纯 ISO2 无区号证据下拉仍判 none。
- 护栏 2：共享区号（+1 二十余国）消歧不回退；listbox 侧 `pseudoOptionStats` 与原生 `optStats` 口径同步（票 13 检查点二）。
- 标定：以票 32 真实站点模式库为正例源，CI calibration baseline 为放行标准。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\28-iso2-dial-evidence-report.md`；GitButler 分支 `cch/28-iso2-dial-evidence`，版本控制遵循 WORKFLOW §4.2。