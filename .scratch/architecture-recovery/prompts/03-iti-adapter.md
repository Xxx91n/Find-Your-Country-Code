你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 03（intl-tel-input 适配层独立化）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\03-iti-adapter.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\03-iti-adapter.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
5. D:\Aworker\mozilla\choose-your-country\test\cch-test-page2.html
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- 三层顺序不可颠倒：setNumber 优先 → 方法名双名探测（setSelectedCountry/setCountry）→ 双代类名 DOM 兜底。
- 版本覆盖表逐版本给依据（v16/17/18/25/26/27/28/29）；覆盖不了的如实标注缺口。
- 场景 C（iti@18.2.1）注入与填充联动全绿。
- 专属验收：issue 内 5 条验收项全部真实执行并留证据。

开工第一句：先复述阻塞与依赖状态（Blocked by: 01，确认 01 已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

深度调研约定：版本矩阵证据不足时用 atomcode 深度调研（一次仅一个在途，串行），先查 research/ 既有矩阵避免重复提问。版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\03-iti-adapter-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
