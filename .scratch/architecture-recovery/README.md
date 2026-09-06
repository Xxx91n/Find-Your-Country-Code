# 架构恢复交付总览（Architecture Recovery）

> 生成：2026-09-03 | 大脑 Agent（AutoCoder）| 流程依据：WORKFLOW.md（本目录）
> 用途：多窗口人工派发的入口索引。开新窗口前先读本表对应票的行，再打开对应 prompts 文件粘贴给子窗口。

## 产物地图

| 类别 | 路径（相对本目录） | 说明 |
|---|---|---|
| 工作流 | `WORKFLOW.md` | S0–S8 流程、版本控制 §4.2、教训登记簿 §5、偏离点清单 §6（待用户逐条确认） |
| **票务状态表** | 下方「票务状态与 frontier」节 | 每票完成状态以窗口报告落盘+大脑复核为准，frontier 由此重算 |
| 规格 | `spec.md` | to-spec 产物：问题/方案/18 条用户故事/实施与测试决策/Out of Scope |
| 架构报告 | `report/architecture-review.md` + `.html` | 6 个候选 + Top 推荐（C1+C2 先行）；md 为权威 |
| 票据 | `issues/01…10-*.md`（10 份） | tracer-bullet 垂直切片，含 Blocked by 与验收清单 |
| 交接 | `handoffs/01…10-*.md`（10 份） | 每票 fresh-context 交接：必读清单 + delta + 报告要求 |
| 启动器 | `prompts/01…10-*.md`（10 份） | 开窗粘贴文本（≤60 行；违禁词已自检） |
| 调研 | `research/`（7 份 + skills/ 39 份副本 + scripts/） | 仓库勘察 / 误检测根因 / 行业模型 / atomcode 全景 / 基建 / skills 索引 |
| 验收 | `verification/consistency-report.md` | 程序化比对结果与不一致清单（258 项检查，0 问题） |
| 复现基准 | `research/scripts/misdetect-repro.mjs` | 误检测/漏检最小复现 harness（25 例，24 符合预期；02 号票的回归基准） |
| 窗口报告 | `research/window-reports/`（实施期生成） | 每票收尾必须落盘的报告 |

## 波次表（由 issue 的 Blocked by 字段推导，未新造顺序）

| Wave | 票 | Blocked by | 并行性 | 窗口启动器（相对本目录） |
|---|---|---|---|---|
| 1 | 01 模块化工程骨架迁移 | 无 | 单独先行（定义模块边界，是全部后续票的地基） | `prompts/01-modular-skeleton.md` |
| 2 | 02 多信号加权评分检测引擎 | 01 | Wave 2 三票可并行 | `prompts/02-scoring-engine.md` |
| 2 | 03 intl-tel-input 适配层独立化 | 01 | ↗ | `prompts/03-iti-adapter.md` |
| 2 | 06 Playwright E2E 测试基建 | 01 | ↗ | `prompts/06-playwright-e2e.md` |
| 3 | 04 可重评估扫描 + Shadow DOM 穿透 | 02 | Wave 3 三票可并行 | `prompts/04-rescan-shadow-dom.md` |
| 3 | 05 站点规则引擎 | 02 | ↗ | `prompts/05-site-rules-engine.md` |
| 3 | 09 框架注入加固 | 02 | ↗ | `prompts/09-framework-injection.md` |
| 4 | 07 面板 UI 升级 | 02, 05 | Wave 4 两票可并行 | `prompts/07-ui-upgrade.md` |
| 4 | 08 文档与决策记录 | 02, 05 | ↗ | `prompts/08-docs-adr.md` |
| 5 | 10 发布链路与版本策略适配 | 01, 09, 07 | 收口票（需 07 与 09 完成；实际发布另需用户确认） | `prompts/10-release-pipeline.md` |

波次推进纪律（详见 WORKFLOW §4.3）：每波开工前核对 blockers 完成状态（以各票报告落盘 `research/window-reports/` 为准）；同波各票互不堆叠、GitButler 并行分支互不影响。

## 大脑已声明的偏离点（等待用户确认，见 WORKFLOW §6）

D1 atomcode 直跑 CLI（无 ctx 承载）｜D2 架构报告落仓库而非临时目录｜D3/D4 grilling 访谈改为异步呈报｜D5 handoff 落仓库｜D6 票据落本地 .scratch 未接 tracker｜D7 /implement 改多窗口人工派发｜D8 HTML 报告外加 markdown 权威版。

## 票务状态与 frontier（大脑维护，随波次推进更新）

| 票 | 状态 | 报告 | 复核结论 | 波次 |
|---|---|---|---|---|
| 01 模块化工程骨架迁移 | **done（复核通过）** | `research/window-reports/01-modular-skeleton-report.md` | 59 项实物验证全过 + 行为对照独立复跑 ALL PASS + 3 笔提交范围合规 + but 分支落位确认 | 1 |
| 02 多信号加权评分检测引擎 | **done（复核通过）** | `research/window-reports/02-scoring-engine-report.md` | 引擎门 36/36、harness v2 25/25、E2E 20 passed 独立复跑全过；常量出处实读属实；红标摘除合规 | 2 |
| 03 intl-tel-input 适配层 | **done（修复版复核通过）** | `research/window-reports/03-iti-adapter-fix-report.md` | 四道门独立复跑全过（verify 9/9、E2E 20 passed、harness 25/25、build exit 0）；大脑终审探针真实页面 cn→jp 联动 confirmed（`verification/review-03fix.md`） | 2 |
| 04 可重评估扫描 + Shadow DOM 穿透 | **done（复核通过）** | `research/window-reports/04-rescan-shadow-dom-report.md` | 引擎门 12/12、E2E 33 passed 独立复跑、性能实测 49–62ms<350ms 窗口；`verification/review-wave3.md` | 3 |
| 05 站点规则引擎 | **done（复核通过）** | `research/window-reports/05-site-rules-engine-report.md` | 单元门 79/79、豁免/强制/分档三层接线源码实读、格式契约就绪（07 票消费）；`verification/review-wave3.md` | 3 |
| 06 Playwright E2E 测试基建 | **done（复核通过）** | `research/window-reports/06-playwright-e2e-report.md` | 一条命令 e2e 独立复跑 exit 0；hermetic 供给与红线契约属实；其 iti 假成功探针是发现 03 缺陷的决定性输入 | 2 |
| 07 面板 UI 升级 | **done（修复版复核通过）** | `research/window-reports/07-ui-upgrade-fix-report.md` | 四门独立复跑全绿（07 门 73/73、02 门 36/36、harness 25/25、05 门 79/79）+ E2E 42 passed + 终审探针真实页面负反馈全链路恢复；`verification/review-07fix.md` | 4 |
| 08 文档与决策记录 | **done（复核通过）** | `research/window-reports/08-docs-adr-report.md` | 门禁 ALL-PASS 复跑；4 条 ADR/CONTEXT.md 实物在库；过时表述清零；教训入 WORKFLOW §5 | 4 |
| 09 框架注入加固 | **done（复核通过）** | `research/window-reports/09-framework-injection-report.md` | 引擎门 36/36、React/Vue 三重断言 E2E 绿、注入收敛结构断言（fill .value= 恰1处/adapter 0处）；`verification/review-wave3.md` | 3 |
| 10 发布链路与版本策略适配 | **done（复核通过）** | `research/window-reports/10-release-pipeline-report.md` | 静态门 25/25 独立复跑；release.yml/dry-run/CONTRIBUTING/v1.4.0 bump 实物核验全过；用户已确认 v1.4.0；`verification/review-10.md` | 5 |

**frontier（最终）**：**10/10 票全部闭环 ✅**。剩余动作用户确认范畴：① cch/* 9 分支 → main 合并（触发 v1.4.0 正式发版）② GreasyFork 站内同步 ③ 远端分支清理。待办清单见 10 号报告 §6。
**复核记录**：第 2 波 `review-wave2.md`（03 不通过→修复）；03 修复版 `review-03fix.md`；第 3 波 `review-wave3.md`（04/05/09 全过）；第 4 波 `review-wave4.md`（08 过，07 不通过→修复）；07 修复版 `review-07fix.md`；第 6 波 `review-10.md`（10 过，全项目闭环）。
**复核记录**：第 2 波 `verification/review-wave2.md`（03 不通过→修复）；03 修复版 `verification/review-03fix.md`（通过）；第 3 波 `verification/review-wave3.md`（04/05/09 全过，无违规）。
**01 票复核遗留事项**：① release.yml 静默失效风险已登记（票 10 前置信号）；② `src/Find-Your-Country-Code.js` 自此为只读基准（02+ 票从 src/main.ts 出发）；③ `.gitattributes` CRLF 规范化未做，待后续卫生票决策；④ process 违规检查：本票无（开工复述合规、未越权提交他人改动、GM stub 属对照工具范畴）。

## 回滚

本目录整体未纳入版本跟踪（git 未跟踪 `.scratch/`），删除 `.scratch/architecture-recovery/` 即完全回滚大脑侧产物；代码侧回滚遵循 WORKFLOW §4.2（GitButler `but undo` / `but discard`）。

## 第二周期(心智模型 v2,2026-09-05)

> 输入: .scratch/mental-model-v2/report.md 宏观调查报告 | spec: spec.md(上一周期 spec 归档为 spec-cycle-v1.4.0-2026-09.md)
> 波次由 issue 的 Blocked by 字段推导,未新造顺序。发布门禁: 19 票完成 + 用户确认后执行发布动作(遵循 WORKFLOW §4.2)。

| Wave | 票 | Blocked by | 并行性 | 窗口启动器(相对本目录) |
|---|---|---|---|---|
| 1 | 11 | 无 | 同波互不堆叠,可并行 | `prompts/11-mental-model-docs.md`  |
| 1 | 12 | 无 | 同波互不堆叠,可并行 | `prompts/12-iframe-governance.md`  |
| 1 | 14 | 无 | 同波互不堆叠,可并行 | `prompts/14-calibration-corpus.md`  |
| 1 | 15 | 无 | 同波互不堆叠,可并行 | `prompts/15-react19-fill-probe.md`  |
| 1 | 16 | 无 | 同波互不堆叠,可并行 | `prompts/16-scoring-consistency.md`  |
| 1 | 17 | 无 | 同波互不堆叠,可并行 | `prompts/17-pseudo-select-forensics.md`  |
| 2 | 13 | 16 | 同波互不堆叠,可并行 | `prompts/13-visibility-l3-hardening.md`  |
| 3 | 18 | 13, 16, 17 | 同波互不堆叠,可并行 | `prompts/18-pseudo-select-e2e.md`  |
| 4 | 19 | 12, 13, 14, 15, 16, 18 | 同波互不堆叠,可并行 | `prompts/19-release-links.md` (发版波: 大脑/用户执行;发布前需全部实施票复核通过) |

票据 11–19 状态随窗口报告落盘更新;报告路径统一为 `research/window-reports/NN-slug-report.md`。自检报告: `research/launcher-selfcheck.md`。

## 票务状态与 frontier(第二周期)

| 票 | 状态 | 复核结论(首脑,2026-09-05) |
|---|---|---|
| 13 可见性闸门 + L3 加码 | done(复核通过,含检查点四 iti 防线 + residual 翻转) | verify-13.mjs 28 全 PASS + 3 CI run 全绿 + precision 1.0 |
| 18 伪 select e2e | **可开工(下一波)** | 13/16/17 全闭;按 ADR-0005 登记+手动召唤档位 |
| 14 校准语料 | done(复核通过) | 39 例语料 + CI 基线(precision 0.9474/recall 1.0)实证 |
| 15 React 19 兜底 | done(复核通过) | CI 33981972381 绿(52 例)+ _probe/forceDiff 实测 |
| 16 评分一致性 | done(复核通过,附 16-fix) | 短路摘除/L3 独立叠加/常量集中实证;语料再基线转跟进 |
| 17 伪 select 取证 | done(复核通过) | 样本库 5/15/5 + ADR-0005 实证;atomcode 交叉轮挂起(串行护栏) |
| 13 / 18 / 19 | pending | 13 可开工(16 已过);18 待 13+16+17;19 收口 |

**frontier(第二周期)**: 11/12/13/14/15/16/17 + 三个修复票全闭环。下一波 = 18(单票)。之后 19 收口 -> push。复核链: verification/review-mmv2-wave1.md + wave2-fix.md + wave3.md。
