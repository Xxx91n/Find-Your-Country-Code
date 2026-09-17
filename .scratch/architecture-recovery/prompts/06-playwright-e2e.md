你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 06（Playwright E2E 测试基建 + fixture 扩容）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\06-playwright-e2e.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\06-playwright-e2e.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\infra-patterns.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md
5. D:\Aworker\mozilla\choose-your-country\test\test-page.html
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- 基建票不改脚本源码；一条命令跑起全部 E2E。
- 场景 A–E 自动断言以 01 迁移后行为为基准。
- 误报 5 类 + shadow DOM + 动态注入 fixture 就绪；误报用例默认红（TDD 红，不是失败）。
- 专属验收：issue 内 4 条验收项全部真实执行并留证据。

开工第一句：先复述阻塞与依赖状态（Blocked by: 01，确认 01 已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\06-playwright-e2e-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
