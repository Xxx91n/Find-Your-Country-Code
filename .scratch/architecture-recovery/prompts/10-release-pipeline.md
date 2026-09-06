你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 10（发布链路与版本策略适配）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\10-release-pipeline.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\10-release-pipeline.md
3. D:\Aworker\mozilla\choose-your-country\.github\workflows\release.yml
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\01-modular-skeleton-report.md（01 未完成时本票阻塞，按 issues/01 验收 3 为准并报告）
5. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- release.yml 适配构建产物路径；dry-run/fork 验证优先，不碰真实 main 发布。
- beta 发布为人工确认动作：票内只做就绪准备，实际发布前须用户点头。
- 版本号跳跃策略（1.3.4 → 2.0.0 取舍）写报告供用户决策。
- 专属验收：issue 内 4 条验收项全部真实执行并留证据（实际发布除外）。

开工第一句：先复述阻塞与依赖状态（Blocked by: 01、09、07，确认三者已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\10-release-pipeline-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
