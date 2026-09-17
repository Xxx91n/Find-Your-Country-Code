你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 07（面板 UI 升级）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\07-ui-upgrade.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\07-ui-upgrade.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\05-site-rules-engine-report.md（05 未完成时按 issues/05 验收 4 为准并注明）
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
5. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- 三档置信样式差异 + 低置信手动召唤 + "这不是区号字段"负反馈即时生效 + 规则可视化管理。
- 体验红线：搜索/收藏/双语/动态渲染不回退（逐条回归）。
- 合成事件不外溢宿主表单。
- 专属验收：issue 内 5 条验收项全部真实执行并留证据。

开工第一句：先复述阻塞与依赖状态（Blocked by: 02、05，确认两者已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

深度调研约定：交互设计证据不足时用 atomcode 深度调研（一次仅一个在途，串行），先查 research/ 既有调研。版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-ui-upgrade-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
