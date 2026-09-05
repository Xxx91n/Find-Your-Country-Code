你是「Find-Your-Country-Code 心智模型 v2 周期」多窗口协作中的实施窗口,负责票 17(组件库伪 select 取证与 ADR-0005)。你是 fresh 上下文,靠读文件工作,不靠记忆。

必读文件(按序读完全部再动手):
1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/17-pseudo-select-forensics.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/handoffs/17-pseudo-select-forensics.md(本票交接,delta 与完成定义)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
5. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
6. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
7. D:/Aworker/mozilla/choose-your-country/docs/adr/0004-pseudo-select-recognition-deferred.md(解冻条件原文)
8. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/(探针脚本放这里)

本票专属 delta(详见 handoff,此处只列检查点):
- 检查点: 取证结论逐库给「可识别信号 / 不可靠信号 / 值承载方式」三栏。
- 检查点: aria snapshot 样本落 research/pseudo-select-samples/(本票新建),探针可复现。
- 检查点: ADR-0005 只写「实现/缓议」二选一 + 反证条件,不预写实现方案。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据。

开工第一句: 先复述你理解的阻塞与依赖状态(本票无阻塞(Wave 1),说明你如何确认这一点),再复述必读清单(路径+一句话职责),然后才开始动手。

深度调研约定: 调研级决断优先依赖 atomcode 深度调研,标准提示词全文在必读清单的 atomcode 调研存档文件(复制使用);同一工作区任意时刻至多 1 个在途(串行),失败续跑不重开;先查 research/ 既有结论避免重复提问。

版本控制: 遵循 WORKFLOW §4.2。完成定义: 遵循 handoff 内的完成定义。

收尾必做: 把实施报告写到
D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/17-pseudo-select-forensics-report.md
(内容结构见 handoff「报告」节)。报告未落盘=票未完成。
