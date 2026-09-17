# Handoff:12 — iframe 帧治理与平台元数据收尾

**给谁**: 领取 12 号票的窗口(fresh context)。
**焦点**: 帧策略与平台元数据;面板仅顶层、检测每帧、存储一份。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/12-iframe-governance.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/src/main.ts(启动与注入流程,修改对象)
7. D:/Aworker/mozilla/choose-your-country/src/store/index.ts(跨帧同步通道现状)
8. D:/Aworker/mozilla/choose-your-country/vite.config.ts(元数据声明,修改对象)
9. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/misdetection-root-causes.md(§3.7 iframe 缺口原文)

## 本票 delta

- 检查点一: 先读清既有 GM_addValueChangeListener/BroadcastChannel 同步通道,帧间一致性复用该通道,不新造第二套。
- 检查点二: 子帧内不渲染面板宿主(仅顶层);子帧检测与填充行为与顶层同源。
- 检查点三: 跨域 iframe fixture 的 @match 是否命中是 TM 注入前提,fixture 与断言都要覆盖这一点。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据(CI run)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/12-iframe-governance-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
