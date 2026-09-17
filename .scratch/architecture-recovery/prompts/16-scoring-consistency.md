你是「Find-Your-Country-Code 心智模型 v2 周期」多窗口协作中的实施窗口,负责票 16(检测评分一致性收尾)。你是 fresh 上下文,靠读文件工作,不靠记忆。

必读文件(按序读完全部再动手):
1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/16-scoring-consistency.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/handoffs/16-scoring-consistency.md(本票交接,delta 与完成定义)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
5. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
6. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
7. D:/Aworker/mozilla/choose-your-country/src/detect/index.ts(评分主路径,修改对象)
8. D:/Aworker/mozilla/choose-your-country/src/config.ts(常量单一来源)
9. D:/Aworker/mozilla/choose-your-country/src/iti-adapter/index.ts(iti 识别现状,待并入评分)

本票专属 delta(详见 handoff,此处只列检查点):
- 检查点: iti 并入评分后,误报防线(L3/L4)对其同等生效;既有误报样本全不注入。
- 检查点: L3 罚分独立叠加后,既有 25 例 harness 全绿,不放松任一误报防御。
- 检查点: 常量迁移只搬不调;如确需调值,报告给出语料依据。
- 专属验收: issue 内 4 条验收项全部真实执行并留证据(CI run)。

开工第一句: 先复述你理解的阻塞与依赖状态(本票无阻塞(Wave 1),说明你如何确认这一点),再复述必读清单(路径+一句话职责),然后才开始动手。

深度调研约定: 调研级决断优先依赖 atomcode 深度调研,标准提示词全文在必读清单的 atomcode 调研存档文件(复制使用);同一工作区任意时刻至多 1 个在途(串行),失败续跑不重开;先查 research/ 既有结论避免重复提问。

版本控制: 遵循 WORKFLOW §4.2。完成定义: 遵循 handoff 内的完成定义。

收尾必做: 把实施报告写到
D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/16-scoring-consistency-report.md
(内容结构见 handoff「报告」节)。报告未落盘=票未完成。
