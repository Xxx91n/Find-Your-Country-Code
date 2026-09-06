你是「Find-Your-Country-Code 架构恢复」多窗口协作中的实施窗口，负责票 04（可重评估扫描 + Shadow DOM 穿透）。你是fresh上下文，靠读文件工作，不靠记忆。

必读文件（按序读完全部再动手）：
1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\04-rescan-shadow-dom.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\04-rescan-shadow-dom.md
3. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md
4. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md
5. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\industry-models.md
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
7. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md

本票专属 delta（详见 handoff，此处只列检查点）：
- open shadowRoot 递归穿透 + 每 root 单独 observer；重扫防抖。
- WeakSet 终态 → 属性指纹快照重评（双向：误挂移除/漏挂补上）。
- SPA 路由 hook（pushState/replaceState/popstate）定向重扫。
- 设计先写进报告再实现；性能基线（1000 节点防抖窗口）实测。
- 专属验收：issue 内 4 条验收项全部真实执行并留证据。

开工第一句：先复述阻塞与依赖状态（Blocked by: 02，确认 02 已完成再开工；未完成则停下并报告），再复述必读清单（路径+一句话职责），然后才开始动手。

深度调研约定：穿透细节证据不足时用 atomcode 深度调研（一次仅一个在途，串行），先查 research/ 既有调研。版本控制：遵循 WORKFLOW §4.2。完成定义：遵循 handoff 内的完成定义。

收尾必做：把实施报告写到
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\04-rescan-shadow-dom-report.md
（内容结构见 handoff「报告」节）。报告未落盘=票未完成。
