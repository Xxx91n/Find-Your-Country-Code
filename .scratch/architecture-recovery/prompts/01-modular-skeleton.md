你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 01（模块化工程骨架迁移）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\01-modular-skeleton.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\01-modular-skeleton.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
5. D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js

本票专属 delta（详见 handoff，此处只列检查点）：
- 行为等价：迁移前后 test/ 三页（场景 A–E）表现一致；不顺手改检测/填充逻辑。
- 模块边界按 spec 的 Implementation Decisions；跨模块只走入口接口。
- release.yml 影响评估写入报告（验收项 3）。
- 专属验收：issue 内 4 条验收项全部真实执行并留证据（命令+退出码+关键输出）。

开工第一句：先复述你理解的阻塞与依赖状态（本票无阻塞，是首票；说明你如何确认这一点），再复述必读清单（路径+一句话职责），然后才开始动手。

版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\01-modular-skeleton-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
