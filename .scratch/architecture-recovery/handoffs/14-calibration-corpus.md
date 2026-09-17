# Handoff:14 — 校准语料与回归基线

**给谁**: 领取 14 号票的窗口(fresh context)。
**焦点**: 语料+harness+标定,只测不改检测行为。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/14-calibration-corpus.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/tests/fixtures/(语料来源,先盘点)
7. D:/Aworker/mozilla/choose-your-country/.github/workflows/release-dry-run.yml(既有验证链接线参照)
8. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/(harness 放这里,node 脚本防嵌套)

## 本票 delta

- 检查点一: 首次基线必须真实跑出(precision/recall 数字),跑不出数字=本票未完成。
- 检查点二: 标定脚本可重复运行,输出为「建议参数+报告」,不直接改写配置(参数变更另走 16 票或独立批准)。
- 检查点三: 语料 manifest 每条标注正/负与来源文件;新周期样本只加不删。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据(CI run/artifact)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/14-calibration-corpus-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
