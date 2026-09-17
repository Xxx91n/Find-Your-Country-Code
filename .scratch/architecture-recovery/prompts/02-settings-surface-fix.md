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
- 主 Agent 已核实的缺陷（可直接复现）：**cch/02 在 CI 上构建失败** —— run `35089321289`（cch/02 @ `b95f672f`）在 **Build userscript 步**报 `src/ui/index.ts (4:41): "DIAG_TRACE_PREF" is not exported by "src/config.ts"` → `✗ Build failed in 148ms`。
- **污染范围（已实物坐实，勿低估）**：cch/02 的 `src/ui/index.ts`（1,159 行）被扫入了**票 03 诊断面的整层**（`_diagLevel`/`_diagLayer` 态、摘要条、独立诊断视图、过滤器、`deps.Diag` 读面；`grep "票 03"` 命中 25+ 处），而该分支 `src/config.ts` **零** DIAG 常量、`src/types.ts` **零** Diag 类型、`src/main.ts` **零** Diag 注入、`src/diag/` 目录**不存在** ⇒ 该分支是**嵌合体**，不是「缺一个导出」。
- 引入点提示：该污染提交在分支上的实际 sha 是 **`06273351`**（fix(cch-02)）；先前引用的 `61f3ebe7` 是 rebase 前的孤儿提交，**不属于任何分支**（已核）。复核一律锚定推送后的分支对象。
- 处置方向：让 cch/02 **自身自洽可构建**。二选一：(a) 以本票基线（`06273351` 的父提交）的 `src/ui/index.ts` 为底，**只重放票 02 自己的 delta**（GM 菜单「设置」一级入口 + 三选一语言控件 + `[data-i18n*]` 全量重渲染 + 删除 `_applyLocaleText` + `.cch-sec[hidden]` 修复 + 菜单稳定 id），剔除被扫入的票 03 整层；(b) 若本票 UI 改动确实依赖诊断视图，则**明写依赖关系并补齐本票所需的最小自洽集**（config 常量 + types + 接线），不得留半层。
- **不得以「把 config.ts 的导出也补上」作为默认修法**——那会把票 03 的工件继续固化在本票里。
- **新增硬验收（本票专属）**：**逐分支构建必须绿** —— 在 cch/02 分支内容上跑 `npm run build` 必须 exit 0，且 `npm run typecheck` 必须 0 错（并集树绿不算数）。
- 不得触碰其他票的工件（票 01/03/04/05/06）；不得削弱或删除本票门 `verify-ticket-02-settings.mjs` 的任何断言。

开工第一句：先复述本票的阻塞项、必读清单与主 Agent 的检查结果，确认无误后再动手。

修复后重跑**同一套验收标准**：结构门 `verify-ticket-02-settings.mjs` + 本票 spec `settings-surface.spec.ts` + **逐分支 `npm run build`** + 全量 E2E + 类型门。

收尾：报告**追加**写入 `research/window-reports/02-settings-surface-report.md`，新增节标题必须为 `## 返工轮次 R2`，**不得覆盖或删改原有内容**。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
