# Handoff:16 — 检测评分一致性收尾

**给谁**: 领取 16 号票的窗口(fresh context)。
**焦点**: 评分体系收口: 消灭评分外短路,常量集中。是 13 与 18 的地基,先保证干净。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/16-scoring-consistency.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/src/detect/index.ts(评分主路径,修改对象)
7. D:/Aworker/mozilla/choose-your-country/src/config.ts(常量单一来源)
8. D:/Aworker/mozilla/choose-your-country/src/iti-adapter/index.ts(iti 识别现状,待并入评分)

## 本票 delta

- 检查点一: iti 并入评分后,误报防线(L3/L4)对 iti 路径同等生效;改完跑既有误报样本全不注入。
- 检查点二: L3 罚分独立叠加后,既有 25 例 harness 必须全绿(不能为了叠加放松任一误报防御)。
- 检查点三: 常量迁移只搬不调(数值语义不变),如确需调值必须写进报告并给出语料依据。
- 专属验收: issue 内 4 条验收项全部真实执行并留证据(CI run)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/16-scoring-consistency-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
