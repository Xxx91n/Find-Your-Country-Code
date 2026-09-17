# Handoff:18 — 伪 select 端到端识别与填充

**给谁**: 领取 18 号票的窗口(fresh context)。
**焦点**: 依 ADR-0005 二选一执行;缓议则取消并如实报告。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/18-pseudo-select-e2e.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/docs/adr/ 目录下由 17 票落盘的 ADR-0005(开工前必须确认已存在,不存在则停下报告)
7. D:/Aworker/mozilla/choose-your-country/src/detect/index.ts(ARIA 语义层落点,修改对象)
8. D:/Aworker/mozilla/choose-your-country/src/fill/index.ts(伪 select 填充策略落点,修改对象)

## 本票 delta

- 检查点一: 开工第一件事=读 ADR-0005 裁决;「缓议」则本票取消,报告写清理由,不硬做。
- 检查点二: ARIA 语义层必须复用 L3 内容验证口径,不能为新控件类型开新的误报后门。
- 检查点三: 与 13、16 票共享 detect 文件——开工前确认 13 与 16 已合入(Blocked by),基于最新基座修改。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据(CI run)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/18-pseudo-select-e2e-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
