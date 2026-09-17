# Handoff:17 — 组件库伪 select 取证与 ADR-0005

**给谁**: 领取 17 号票的窗口(fresh context)。
**焦点**: 纯取证+决策记录,不写业务代码;ADR-0005 是 18 票的闸门。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/17-pseudo-select-forensics.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/docs/adr/0004-pseudo-select-recognition-deferred.md(解冻条件原文)
7. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/(探针脚本放这里)

## 本票 delta

- 检查点一: 取证结论必须逐库给「可识别信号 + 不可靠信号 + 值承载方式」三栏,不能只有截图。
- 检查点二: aria snapshot 样本放 research/pseudo-select-samples/(本票新建),探针可复现。
- 检查点三: ADR-0005 只写「实现/缓议」二选一 + 反证条件,不预写实现方案(那是 18 票的事)。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/17-pseudo-select-forensics-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
