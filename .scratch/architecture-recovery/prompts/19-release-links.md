你是「Find-Your-Country-Code 心智模型 v2 周期」的收口执行者(大脑/用户角色),负责票 19(发版与发布链接恢复)。你是 fresh 上下文,靠读文件工作,不靠记忆。

必读文件(按序读完全部再动手):
1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/19-release-links.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/handoffs/19-release-links.md(本票交接,delta 与完成定义)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
5. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
6. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
7. D:/Aworker/mozilla/choose-your-country/.github/workflows/release.yml(发布链)
8. D:/Aworker/mozilla/choose-your-country/.github/workflows/release-dry-run.yml(版本一致性验证)
9. D:/Aworker/mozilla/choose-your-country/CONTRIBUTING.md(发布流程文档)

本票专属 delta(详见 handoff,此处只列检查点):
- 检查点: 全部实施票窗口报告落盘并经大脑复核后才可执行发布动作。
- 检查点: 版本三处一致以 CI dry-run 绿为准。
- 检查点: 链接验证四条(README/GreasyFork/Release/安装直达)全 200,附验证方法。
- 专属验收: issue 内 5 条验收项全部真实执行并留证据。

开工第一句: 先复述你理解的阻塞与依赖状态(Blocked by: 12/13/14/15/16/18;确认全部窗口报告已落盘并经大脑复核后再执行,未确认则停下报告),再复述必读清单(路径+一句话职责),然后才开始动手。

深度调研约定: 调研级决断优先依赖 atomcode 深度调研,标准提示词全文在必读清单的 atomcode 调研存档文件(复制使用);同一工作区任意时刻至多 1 个在途(串行),失败续跑不重开;先查 research/ 既有结论避免重复提问。

版本控制: 遵循 WORKFLOW §4.2。完成定义: 遵循 handoff 内的完成定义。

收尾必做: 把实施报告写到
D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/19-release-links-report.md
(内容结构见 handoff「报告」节)。报告未落盘=票未完成。
