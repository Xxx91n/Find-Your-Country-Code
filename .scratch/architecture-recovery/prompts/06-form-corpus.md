# 启动器 06 — 形态语料三层架构

身份：你是 Cycle-6 票 06 的实施子窗口。本票覆盖 A-xxx：A-030。

**阻塞项**：票 05（交互原语）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\06-form-corpus.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\06-form-corpus.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（issue 验收项之外的检查点）:
- 目录**适配 ADR-0006 条款 5 的单一 `tests/` 根**；**不得新增顶层 `corpus/`**
- 原始快照**不入库**；库内只留指纹与元数据清单
- **不引入对象存储/S3**，复用既有仓库外 archive 模式
- 命名用「**形态语料**」，不得与既有「校准语料」混淆
- 纪律：**绝不为修绿而盲目更新快照**

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/06-form-corpus-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
