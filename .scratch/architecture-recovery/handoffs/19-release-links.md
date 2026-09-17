# Handoff:19 — 发版与发布链接恢复

**给谁**: 领取 19 号票的窗口(fresh context)。
**焦点**: 发版与链接恢复;本票由大脑/用户执行,不做业务代码。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/19-release-links.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/.github/workflows/release.yml(发布链)
7. D:/Aworker/mozilla/choose-your-country/.github/workflows/release-dry-run.yml(版本一致性验证)
8. D:/Aworker/mozilla/choose-your-country/CONTRIBUTING.md(发布流程文档)

## 本票 delta

- 检查点一: 全部实施票(12/13/14/15/16/18)窗口报告落盘并经大脑复核后才可执行发布动作。
- 检查点二: 发布动作遵循 WORKFLOW §4.2;版本三处一致以 CI dry-run 绿为准。
- 检查点三: 链接验证四条(README/GreasyFork/Release/安装直达)全 200,附验证方法。
- 检查点四: 收口前统一 workflow 触发面与 install 口径(e2e.yml --legacy-peer-deps、calibration-baseline 触发面扩 main),并按栈序合并 Wave1 实施链(拓扑与 lkq 风险见 verification/review-mmv2-wave1.md §4)。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/19-release-links-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
