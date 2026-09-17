# 启动器 38 — 分发最后一公里

身份：你是 Cycle-5 票 38 的实施子窗口。本票覆盖 A-xxx: A-011。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\38-distribution-last-mile.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\38-distribution-last-mile.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md

本票 delta（检查点 / 专属验收，issue 验收项之外）:
- 禁止设计 CI 主动 POST 到 GF 的步骤（GF 无写入 API）
- 不得违反 GF 三条硬规则（禁 minify / 单文件 ≤2MB / 更新检查 ≤1 次/天）
- 发布动作须用户确认；本票只做到“闸门 + 链接 + 同步配置”
- 版本真源唯一（package.json）

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/38-distribution-last-mile-report.md`（本仓库既有约定路径）。
