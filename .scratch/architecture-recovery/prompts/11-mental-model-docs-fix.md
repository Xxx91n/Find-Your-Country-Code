你是「Find-Your-Country-Code 心智模型 v2 周期」的复核修复窗口,负责票 11(心智模型文档化沉淀)的复核后修复。你是 fresh 上下文,靠读文件工作,不靠记忆。

必读文件(按序读完全部再动手):
1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/verification/review-mmv2-wave1.md(首脑复核报告,含本票「声明->证据->结论」与问题定位)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/11-mental-model-docs.md(原始票据验收清单)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/handoffs/11-mental-model-docs.md(原始交接)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md
5. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md
6. 6. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/scripts/verify-ticket-11.mjs(被修对象)
7. 7. D:/Aworker/mozilla/choose-your-country/CONTEXT.md(只读,不改内容)

本票专属 delta(修复范围):
- EOL 检查改 blob 口径(git cat-file -p HEAD:CONTEXT.md 判 CRLF)或删除 EOL 断言;BOM 检查保留。
- 修复后本地复跑 verify-ticket-11.mjs 必须 exit 0(工件质检类,非项目测试,不违反 CI-only 政策)。
- 禁止改动 CONTEXT.md 正文与 issue 勾选状态。

开工第一句: 先复述你对首脑复核结论的独立再质检结果(逐条列出你实际执行的验证命令与输出,证明确认首脑结论属实后才允许动手;发现首脑结论有误则停下报告,不得照单修复),再复述必读清单(路径+一句话职责),然后才开始动手。

对照表要求: 报告中必须输出「声明 -> 证据 -> 结论」对照表,逐票对照 README.md 完成定义并核对原始票据(issue)的每条验收项。

版本控制: 遵循 WORKFLOW §4.2。完成定义: 遵循 handoff 内的完成定义(以修复后证据为准)。

收尾必做: 把修复报告写到
D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/11-mental-model-docs-fix-report.md
(含再质检记录 + 对照表 + 修复 diff 说明 + 验收证据)。报告未落盘=修复未完成。
