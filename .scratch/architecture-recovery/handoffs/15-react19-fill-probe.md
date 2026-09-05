# Handoff:15 — React 19 填充能力探测兜底

**给谁**: 领取 15 号票的窗口(fresh context)。
**焦点**: 填充层能力探测 + 兜底,不改检测。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/15-react19-fill-probe.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/src/fill/index.ts(探测与兜底落点,修改对象)
7. D:/Aworker/mozilla/choose-your-country/tests/fixtures/framework-react.html(既有 React fixture 参照)
8. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-industry-models.md(§9 React 受控组件证据)

## 本票 delta

- 检查点一: 探测失败必须安全降级为现有路径,禁止探测本身引入新失败面。
- 检查点二: React 19 fixture 需 hermetic(本地 vendored 依赖或 CI 内固定版本),不给外部 CDN 加运行时依赖。
- 检查点三: textarea/select 各自原型路径保持既有行为,只增不改。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据(CI run)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/15-react19-fill-probe-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
