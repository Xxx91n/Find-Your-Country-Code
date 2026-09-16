# 启动器 02-FIX — 设置面收口（返工轮次 R2）

身份：你是 Cycle-6 票 02 的**返工修复窗口**（R2）。本票覆盖 A-xxx：A-026 · A-027。

**阻塞项**：无

**第一步（硬要求）**：先复核主 Agent 的检查结果，再动手。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\02-settings-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\02-settings-surface.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0003-site-rules-engine.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-wave3-r1-review.md

本票 delta（返工轮次专属）:
- **本票为返工轮次 R2**。先复核主 Agent 的检查结果，**不得先改代码再回头找依据**。
- 主 Agent 已核实的缺陷（可直接复现）：**cch/02 在 CI 上构建失败** —— CI run `35089321289`（cch/02 @ b95f672f）在 **Build userscript 步**报 `src/ui/index.ts (4:41): "DIAG_TRACE_PREF" is not exported by "src/config.ts"` → `✗ Build failed in 148ms`。
- 逐分支矩阵（`config.ts` 导出数 / `ui/index.ts` 引用数）：cch/01=1/3 ✓ · **cch/02=0/2 ✗** · cch/03=1/3 ✓ · cch/05=1/3 ✓ · cch/06=1/3 ✓。
- 引入点：`git log -S DIAG_TRACE_PREF cch/02 -- src/config.ts` = **空**（从未导出）；`git log -S DIAG_TRACE_PREF cch/02 -- src/ui/index.ts` = `61f3ebe7`（fix(cch-02)）。该提交新增了**票 03 的 import 与注释块**（5 处「票 03 [A-028]」行），但未同步添加配套导出。
- 处置方向：让 cch/02 **自身自洽可构建**。二选一：(a) **首选**：把 `61f3ebe7` 中**属于票 03 的改动从本票提交中剔除**（`src/ui/index.ts` 的票 03 import/注释块、`tests/entry-access.spec.ts`、`tests/iframe.e2e.spec.ts`），使本票只留自己的改动；(b) 若剔除后本票自己的 UI 改动确实依赖诊断视图，则**补齐本票所需的最小自洽集**并明写依赖关系。
- **不得以「把 config.ts 的导出也补上」作为默认修法**——那会把票 03 的工件继续留在本票里，使跨票污染固化。
- **新增硬验收（本票专属）**：**逐分支构建必须绿** —— 在 cch/02 分支内容上跑 `npm run build` 必须 exit 0（并集树绿不算数）。
- 不得触碰其他票的工件（票 01/03/04/05/06）；不得削弱或删除本票门 `verify-ticket-02-settings.mjs` 的任何断言。

开工第一句：先复述本票的阻塞项、必读清单与主 Agent 的检查结果，确认无误后再动手。

修复后重跑**同一套验收标准**：结构门 `verify-ticket-02-settings.mjs` + 本票 spec `settings-surface.spec.ts` + **逐分支 `npm run build`** + 全量 E2E + 类型门。

收尾：报告**追加**写入 `research/window-reports/02-settings-surface-report.md`，新增节标题必须为 `## 返工轮次 R2`，**不得覆盖或删改原有内容**。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
