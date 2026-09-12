# Handoff 32 — 真实站点抽样语料 + 覆盖回归

> Cycle-4 | 票: issues/32-real-site-corpus.md | 覆盖 A-006（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\32-real-site-corpus.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\tests\corpus\manifest.json`
- `D:\Aworker\mozilla\choose-your-country\tests\scripts\14-calibration-harness.mjs`
- `D:\Aworker\mozilla\choose-your-country\tests\server.mjs`
- `D:\Aworker\mozilla\choose-your-country\playwright.config.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle4-atomcode-findings.md`（本周期两路调研浓缩：四层测试组合拳 + libphonenumber 语义混同图谱）

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 模式库为票 27/28/29 的复现基线：三类真实形态（弱信号 input / ISO2-value 括号区号下拉 / 无 ARIA 自定义下拉）各入 corpus，标注期望 tier 与信号归因，先跑出「当前实现漏检」证据。
- 真实站点冒烟分层：密封 E2E（CI 必跑、零外网）不动；真实站点层 = 低频 / `workflow_dispatch` 手动触发 / 可跳过白名单 / 失败 advisory 不阻断 PR，证据进 run artifact。
- CDP `Autofill.trigger` 断言先评估适配度再采用（浏览器原生 autofill 与 userscript 注入语义有别），不硬套；行业参照（Bitwarden test-the-web / Mozilla form-fill-examples / web.dev autofill-measure 状态机）以 atomcode 调研结论为准。
- 语料改动不得悄悄引入回归：calibration-baseline workflow 跑前后 precision/recall 对照。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\32-real-site-corpus-report.md`（含 27/28/29 复现基线小节）；GitButler 分支 `cch/32-real-site-corpus`，版本控制遵循 WORKFLOW §4.2。