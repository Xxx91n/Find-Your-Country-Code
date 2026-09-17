你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 02（多信号加权评分检测引擎）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\02-scoring-engine.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\02-scoring-engine.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\industry-models.md
5. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
7. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- L0–L4 五层瀑布与分级行动；权重/阈值显式常量并注明调研出处。
- 误报 5 类样本逐条落 fixture 断言（不自动注入档）；06 号票基建未就绪时用本地静态页人工验证并在报告声明。
- 检测核心纯函数；UI 只做分档挂点（完整 UI 属 07）。
- 专属验收：issue 内 6 条验收项全部真实执行并留证据。

开工第一句：先复述阻塞与依赖状态（Blocked by: 01，确认 01 已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

深度调研约定：证据不足的调研级决断必须用 atomcode 深度调研（一次仅一个在途，串行），先查 .scratch/architecture-recovery/research/ 既有调研避免重复提问。版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\02-scoring-engine-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
