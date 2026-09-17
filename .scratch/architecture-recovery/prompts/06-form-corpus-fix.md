# 启动器 06-FIX — 形态语料三层架构（返工轮次 R1）

身份：你是 Cycle-6 票 06 的**返工修复窗口**（R1）。本票覆盖 A-xxx：A-030。

**阻塞项**：无（前置票 05 已复核通过）

**第一步（硬要求）**：先复核主 Agent 的检查结果，再动手。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\06-form-corpus.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\06-form-corpus.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0006-ci-hygiene-policy.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0008-real-site-testing-layers.md

本票 delta（返工轮次专属）:
- **本票为返工轮次 R1**。先复核主 Agent 的检查结果，**不得先改代码再回头找依据**。
- 主 Agent 已核实的缺陷（可直接复现）：`06-probe-real.mjs:28` `newPage({userAgent:UA})`（Chrome124）+ `:33-35` `domcontentloaded`→`networkidle(8000)`→`waitForTimeout(1500)`；而 `06-probe-mirrors.mjs:37-38` `goto(..., { waitUntil: 'load' })`→`waitForTimeout(1200)`，**全文无 UA**。
- 影响：报告 §3.1 的 headline 结论「镜像保真度在注入口径上 8/8 与真实页一致」**建立在一个未被控制为同口径的对比上**；报告陈述了它没有的控制。
- 处置（二选一，优先 (a)）：(a) **对齐两份探测的 UA 与等待策略后重跑双探测**，以受控结果重述 §3.1；(b) 若真实页不可达/被挑战致无法对齐，则**如实改写 §3.1** 描述实际条件差异，并明写由此产生的结论强度限制。
- 不得为了“凑 8/8”而调参：若受控重跑后一致性下降，**如实报出**并重新评估镜像保真度结论。
- 次要补正：报告称「渲染后 DOM 9」实为 **15**（9 主 + 6 帧）；issue 路径漏 `.scratch/architecture-recovery/` 前缀。
- 不得触碰其他票的工件（票 01–05/07/08）；不得削弱或删除门 `verify-ticket-06.mjs` 的任何断言。

开工第一句：先复述本票的阻塞项、必读清单与主 Agent 的检查结果，确认无误后再动手。

修复后重跑**同一套验收标准**（不得只跑失败项）：结构门 + 语料 spec + 全量 E2E + 类型门；并推送分支取 CI 证据。

收尾：报告**追加**写入 `research/window-reports/06-form-corpus-report.md`，新增节标题必须为 `## 返工轮次 R1`，**不得覆盖或删改原有内容**。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
