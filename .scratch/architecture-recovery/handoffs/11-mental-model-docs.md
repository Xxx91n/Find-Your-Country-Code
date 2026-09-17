# Handoff:11 — 心智模型文档化沉淀

**给谁**: 领取 11 号票的窗口(fresh context)。
**焦点**: 只改 CONTEXT.md 文档,不动任何代码;交叉引用必须真实可解析。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/11-mental-model-docs.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/industry-models.md(三支柱出处)
7. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/misdetection-root-causes.md(误报根因,新术语背景)
8. D:/Aworker/mozilla/choose-your-country/docs/adr/0001-scoring-engine-replaces-boolean-detection.md(既有 ADR 用语参照)
9. D:/Aworker/mozilla/choose-your-country/CONTEXT.md(修改对象,先通读)

## 本票 delta

- 新增章只做「对照与引用」,不复制调研全文;每个论断一行,附证据文件相对路径。
- 五个新术语必须带 Avoid 项,格式与既有词条一致(中英对照、定义、Avoid)。
- 检查点: 写完跑一次「文内路径逐一 fs 存在性检查」,全过才算完成,检查脚本与方法写进报告。
- 专属验收: issue 内 4 条验收项全部真实执行并留证据。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/11-mental-model-docs-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
