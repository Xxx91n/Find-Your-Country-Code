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

本目录产物已随 19 票收口归档入库（cch-19 归档提交，2026-09-06）；回滚 = revert 对应归档提交；代码侧回滚遵循 WORKFLOW §4.2（GitButler `but undo` / `but discard`）。

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
| 18 伪 select 端到端 | done(复核通过) | verify-ticket-18 35 PASS + CI 双绿(59 passed)+ ADR-0005 档位实证(登记不注入) |
| 14 校准语料 | done(复核通过) | 39 例语料 + CI 基线(precision 0.9474/recall 1.0)实证 |
| 15 React 19 兜底 | done(复核通过) | CI 33981972381 绿(52 例)+ _probe/forceDiff 实测 |
| 16 评分一致性 | done(复核通过,附 16-fix) | 短路摘除/L3 独立叠加/常量集中实证;语料再基线转跟进 |
| 17 伪 select 取证 | done(复核通过) | 样本库 5/15/5 + ADR-0005 实证;atomcode 交叉轮挂起(串行护栏) |
| 19 发版与发布链接恢复 | done(复核通过,周期收官,2026-09-06) | gh release v1.4.0 Latest(2026-09-06T13:23:45Z,附件 @version 1.4.0 实测);版本三处一致(pkg 1.4.0 / vite 1.4.0 / Glog 双语 v1.4.0 12 条);4 链接 200(README raw/GF 页/Release 页/GF install);4 CI run success(dry-run 34035726335 + release 34035951623 + E2E 34035724870 + calibration 34035796148);workflow 口径统一(calibration 零依赖已澄清);origin/main 领先本地 43 提交;GreasyFork @1.3.4 待维护者手动 |

**frontier(第二周期)**: **19 闭环 = 心智模型 v2 周期收官 ✅**(11-19 + 11fix/12fix/16fix 全闭环)。发布: v1.4.0(2026-09-06,GitHub Release Latest)。复核链: verification/review-mmv2-wave1.md + wave2-fix.md + wave3.md + wave4.md + wave5.md。收口报告: research/window-reports/19-release-links-report.md。

### 周期总结(2026-09-06,大脑收口)

- **交付**: 五层评分引擎检测(v1.3.4 布尔版 → 评分版)之上,补齐 iframe 帧治理(12)、可见性闸门 + L3 加码(13)、校准语料与 precision/recall 基线(14)、React 19 填充兜底(15)、评分一致性收尾(16)、伪 select 取证 + ADR-0005(17)与 ARIA 语义层端到端(18),文档沉淀(11),最终发布 v1.4.0(19)。
- **发布证据链**: 版本三处一致 dry-run 34035726335 → 发布 run 34035951623 → Release v1.4.0(附件 @version 1.4.0 实测)→ 四链接 200(README/GF 页/Release+附件/安装直达)。
- **CI 门禁**: 每票 ticket-scoped verify workflow + 全量 E2E;收口时 main 上 Calibration Baseline 首跑绿(34035796148,触发面扩 main 生效)。
- **遗留(用户/后续)**: ① GreasyFork 站内同步(@1.3.4 → 1.4.0,维护者手动,凭证门控);② 真实站点冒烟(18 报告建议);③ 17 票 atomcode 交叉验证轮(串行护栏挂起,可选);④ 本地 main ref 与 origin/main 分叉待对齐(见 19 报告 §6);⑤ .gitattributes CRLF 规范化(01 票遗留,未动)。

## 第三周期（仓库工程卫生, 2026-09-11）

> 输入: .scratch/architecture-recovery/research/cycle3-investigation.md（锐评1.txt 取证 + atomcode 行业调研）
> Spec: spec.md（上一周期 spec 归档为 spec-cycle2.md）
> Tickets: issues/20-26*.md

### 波次表（从 issue Blocked by 推导）

| 波次 | 票 | 依赖 | 焦点 |
|------|----|------|------|
| **W1** | 20, 22, 23, 24, 25 | 均 None — 可并行开工 | CI 脚本迁移 + 死代码删除 + TS strict + 安全加固 + 依赖/目录卫生 |
| **W2** | 21 | 20 | PR 触发器（需先完成 CI 脚本迁移） |
| **W3** | 26 | 20, 21, 22, 23, 24, 25 | ADR + 文档收口（全部实施票完成后写文档） |

### 票务状态与 frontier

| 票 | 状态 | 报告路径 | 复核结论 | 波次 |
|----|------|----------|----------|------|
| 20 CI 脚本迁移 | **done（复核通过）** | research/window-reports/20-ci-script-relocation-report.md | — | W1 |
| 21 PR 触发器 | **done（复核通过）** ✅ | research/window-reports/21-pr-triggers-report.md | — | W2 |
| 22 死代码清理 | **done（复核通过）** | research/window-reports/22-dead-code-elimination-report.md | — | W1 |
| 23 TS strict + typecheck | **done（复核通过）** | research/window-reports/23-ts-strict-typecheck-report.md | — | W1 |
| 24 安全加固 | **done（复核通过）** ✅ | research/window-reports/24-security-hardening-report.md | — | W1 |
| 25 依赖/目录卫生 | **done（复核通过）** | research/window-reports/25-dependency-directory-hygiene-report.md | — | W1 |
| 26 ADR + 文档收口 | **done（复核通过）** ✅ | research/window-reports/26-adr-docs-closure-report.md | ADR-0006 落库（accepted，五项决策+反证条件）+ CONTEXT.md 工程门禁节 5 术语（23 旧术语零回归）+ 票 20-26 状态表更新；遗留登记 F-1/typecheck flag/lockfile | W3 |

### 发起窗口的 prompts

| Prompt | 路径 |
|--------|------|
| 20-ci-script-relocation | `.scratch/architecture-recovery/prompts/20-ci-script-relocation.md` |
| 21-pr-triggers | `.scratch/architecture-recovery/prompts/21-pr-triggers.md` |
| 22-dead-code-elimination | `.scratch/architecture-recovery/prompts/22-dead-code-elimination.md` |
| 23-ts-strict-typecheck | `.scratch/architecture-recovery/prompts/23-ts-strict-typecheck.md` |
| 24-security-hardening | `.scratch/architecture-recovery/prompts/24-security-hardening.md` |
| 25-dependency-directory-hygiene | `.scratch/architecture-recovery/prompts/25-dependency-directory-hygiene.md` |
| 26-adr-docs-closure | `.scratch/architecture-recovery/prompts/26-adr-docs-closure.md` |

### atomcode 调研引用

本周期可复用的 atomcode 提示词位于：
- `.scratch/architecture-recovery/research/atomcode-testing-strategies.md` — 油猴测试策略全景调研（11 原文 + 8 搜索级参考，Exa+Tavily+AnySearch 三引擎交叉验证）
- `.scratch/architecture-recovery/research/cycle3-investigation.md` — 锐评1.txt 16 条指控取证记录

## 第四周期（真实网站生效闭环，2026-09-12）

> 输入: `research/cycle4-investigation.md`（锐评2 取证 + 「大多数网页不生效」痛点根因 G1–G5）+ `research/cycle4-atomcode-findings.md`（两路 atomcode 调研纪要）
> Spec: `spec.md`（上一周期 spec 已归档 `spec-cycle3.md`）| 对账闸: `decision-ledger.md`（A-001…A-010，无去向记录清单为空）
> Tickets: `issues/27-35*.md`（9 张，票 35 为交叉核对轮补立）| 自检: `research/launcher-selfcheck.md` + 交叉核对: `research/cycle4-crosscheck-report.md`

### 波次表（从 issue Blocked by 推导，未新造顺序）

| 波次 | 票 | Blocked by | 并行性 | 焦点（覆盖 A-xxx） |
|------|----|-----------|--------|-------------------|
| **W1** | 30, 31, 32, 34 | 均 None — 可并行开工 | 互不堆叠 | 规则分档收敛（A-004）＋ 填充反馈闭环（A-005）＋ **真实站点语料地基（A-006）** ＋ 门禁减肥（A-008/A-009） |
| **W2** | 27, 28, 29 | 32 | 语料落盘后三票可并行 | 检测覆盖率：弱信号阈值（A-001）＋ ISO2 括号区号证据（A-002）＋ 候选集扩展（A-003） |
| **W3** | 33 | 27,28,29,30,31,32 | 收口波 | 版本 bump 交付（A-007）；真实发版须用户确认 |
| **W4** | 35 | 33 | 收口纪律波（只读验证 + 教训落档） | 历史可查落地纪律（A-010）：非 squash + 只读 `git log`/`git merge-base` 验证 + WORKFLOW §5 固化 |

A-010（main 历史归零）由票 35 承接（交叉核对轮补立）：非 squash 落地 + 只读验证 + 教训写回 WORKFLOW §5；已归零的旧历史不重写（不可逆）。本周期吸收 Backlog 项 #3（真实站点冒烟）→ 票 32。

### 票务状态与 frontier（第四周期）

| 票 | 覆盖 | 状态 | 报告路径 | 波次 |
|----|------|------|----------|------|
| 27 检测覆盖率下限补强 | A-001 | **done（R1 返修复核通过：P8 跨线→同源去重，路线 B）** | research/window-reports/27-detection-coverage-floor-report.md | W2 |
| 28 ISO2-value 下拉区号证据补全 | A-002 | **done（复核通过；AC5 `[~]` 合入后闭合）** | research/window-reports/28-iso2-dial-evidence-report.md | W2 |
| 29 扫描候选集扩展 | A-003 | **done（复核通过；contenteditable 弱化呈报）** | research/window-reports/29-scan-candidates-expansion-report.md | W2 |
| 30 规则分档覆盖收敛到 selector 级 | A-004 | **done（复核通过）** | research/window-reports/30-rules-tier-scope-fix-report.md | W1 |
| 31 填充结果可观测 + 失败反馈闭环 | A-005 | **done（复核通过）** | research/window-reports/31-fill-feedback-loop-report.md | W1 |
| 32 真实站点抽样语料 + 覆盖回归 | A-006 | **done（复核通过）** | research/window-reports/32-real-site-corpus-report.md | W1 |
| 33 版本 bump 交付闭环 | A-007 | **done（复核通过；发版待用户确认）** | research/window-reports/33-version-bump-delivery-report.md | W3 |
| 34 门禁减肥 | A-008, A-009 | **done（R1+R2 复核通过）** | research/window-reports/34-gate-slimming-report.md | W1 |
| 35 历史可查落地纪律 | A-010 | **done（收口执行，大脑）** | research/window-reports/35-history-landing-discipline-report.md | W4 |

### 发起窗口的 prompts

| 票 | 启动器 |
|----|--------|
| 27 | `prompts/27-detection-coverage-floor.md` |
| 28 | `prompts/28-iso2-dial-evidence.md` |
| 29 | `prompts/29-scan-candidates-expansion.md` |
| 30 | `prompts/30-rules-tier-scope-fix.md` |
| 31 | `prompts/31-fill-feedback-loop.md` |
| 32 | `prompts/32-real-site-corpus.md` |
| 33 | `prompts/33-version-bump-delivery.md` |
| 34 | `prompts/34-gate-slimming.md` |
| 35 | `prompts/35-history-landing-discipline.md` |
| 34-fix | `prompts/34-gate-slimming-fix.md`（返工轮：同红三联修复，与 W2 并行） |

### Wave-1 复核结论（首脑，2026-09-12，`verification/review-wave1-cycle4.md`）

- **30 / 31 / 32：done（复核通过）**；**34：done（复核通过，带返工轮）**——A-008 统一载体因 main 预存红三联（verify-ticket-02 裸求值 TS 注解 / lockfile 失同步 / e2e ERESOLVE）暂不可用，返工启动器已发。
- 过程呈报（未追认）：票 31 D-31a 越票面改共享安装面（.npmrc + typecheck.yml）；票 34 验收④以同红对照替代全绿；票 32 D7 smoke 无 CI run（合入 main 后补首跑）。
- **frontier（重算）**：W1 ✅ → **W2 可开工：票 27 / 28 / 29**（blocked by 32 ✅）。票 34 返工轮与 W2 并行；33 仍被 27-32 阻塞（须含 34 返工合入）；35 被 33 阻塞。

### Wave-2 复核结论（首脑，2026-09-12，`verification/review-wave2-cycle4.md`）

- **27 / 28 / 29：done（复核通过）**；**34：done（R1+R2 复核通过）**——A-008 统一载体转绿（Engine Gates 34694435559 / Lockfile Regen 34693757830 / E2E 34694435571 / Typecheck 34695478812+34698250826 全 success），返工报告按约定追加 R1/R2 节未覆盖。
- 关键量化：A-001 弱信号 30→38(lowkey) 且全语料 recall 恢复 1.0000；A-002 ISO2 括号下拉 14→38；A-003 无 ARIA 下拉入候选+登记面（档位守 ADR-0005），性能 14-73ms ≪ 350ms。
- 待闭合/弱化（登记不阻塞）：28 AC5 `[~]`（E2E 以 29 栈全量 70 passed 间接取证，合入 main 后共享 E2E 转绿闭合）；29 contenteditable 未扩（D-29d 无语料地基）；typecheck.yml 注释称 npm ci 实为 npm install（文档债）；当前各远端头非全绿（栈卫生/安装共因，绿证据定格历史头）。
- 过程呈报（不追认）：lockfile 双轨重复修复 + 27「经授权代解」34/29 lockfile（授权来源待追认）；多窗口推送竞态连锁 D-27b/D-29g/D-29i；每票私有 E2E 作业模式与 A-008 方向相悖（收口并回）。
- **frontier（重算）**：W2 ✅ → **W3 可开工：票 33（版本 bump）**——六实施票 blocked-by 全清。前置：最终合序栈全绿复核（33 dry-run 承担）+ typecheck 注释顺手修正。**34-fix 启动器已执行完毕（R1+R2），关闭。** 35（W4）被 33 阻塞。

### Wave-3 复核结论（首脑，2026-09-12，`verification/review-wave3-cycle4.md`）

- **33：done（复核通过）**——三处 1.5.0 一致（33 栈 blob 直读 + 工作树双验）、dry-run 红→绿→复跑绿四轮 gh 实证（34704984108/34705250821 failure → 34705359110/34705751488 success）、远端零 v1.5.0 tag、发版权限边界守住。A-007 实现闭环（达用户的最后一步=合入+发版，待用户）。
- 过程呈报（不追认）：D-33a 越票面修 release-dry-run.yml（客观闭合 cch-25 移除 legacy-peer-deps 的 dry-run 回归债，需追认）；D-33c 经 33 栈视图核验属实（不一致债确在 34-gate-slimming 栈版本）。
- 遗留登记：最终合序栈全绿复核未闭合（33 栈不含 30/31/34 独立栈，合入时须重跑全门）；**合入 main 将自动创建 release v1.5.0（不可逆，须用户明确确认）**；lockfile 根 version 与 typecheck 注释债随收口处理。
- **frontier（重算）**：W3 ✅ → **W4：票 35（历史可查落地纪律）为最后一票，前提是用户授权合入 main（含发版 v1.5.0）**。授权前无新实施票可开工。用户决策点：① 追认 D-33a + W2 lockfile 代解授权；② 授权 land 顺序与 release；③ 35 随合入后执行只读验证。

### Cycle-4 收口状态（2026-09-12，用户授权后执行）

- **合入完成**：11 支 land 零冲突零 squash（main head `019f228e`，父链完整，唯一 root 仍为周期前 7dbc6fc）；**release v1.5.0 已发布**（tag @019f228e，run 34708428429 success）。票 33 抬栈顶殿后防半成品发版。追认记录：D-33a + D-27e（用户 2026-09-12「确认」）。
- 最终门：E2E/Typecheck/Calibration/Lockfile Regen/Release 全绿；**Engine Gates 独红**（P8 跨线，票 27 attr:phrase 组合效应）→ 返修轮在途：`prompts/27-detection-coverage-floor-fix.md`（37 行合规）。
- **票 35 done**（大脑收口执行）：只读验证 + WORKFLOW §5 两教训落档（合入纪律 + 跨栈组合验证）。
- **账本**：A-002…A-010 = done；A-001 = current（待 27-fix R1 三门绿）。
- **frontier（最终）**：**W4 ✅ → 全周期仅剩 27-fix R1 一票一窗**：`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\27-detection-coverage-floor-fix.md`（合序栈复跑 Engine Gates + verify-27/28/29 + Calibration，报告追加 R1 节）。

### 27-fix R1 复核 + Cycle-4 全周期闭环（首脑，2026-09-13）

- **27-fix R1：done（复核通过）**。实物核验：去重实现落位 `src/detect/index.ts:460-468`（L3 之后结算，`plusDial>0||parenDial>0` 时属性短语 0 分留痕 `dedup(opts-dial)`）；三常量（SCORE_AUTO/SCORE_LOWKEY/L1_ATTR_PHRASE_SCORE）实读未动；G9 锁定组存在（verify-27 81→86）；影响面普查 36 例仅 P8 一例漂移（与红基线 run 34708464239 吻合）。**七门 gh 独立实证 @a56f2da5 全 success**（EG 34735967970 / V27 34735967988 / V28 34735990282 / V29 34735992783 / Calib 34735996427 / TC 34735968024 / E2E 34735968078）。
- 裁决采**路线 B**（floor 不抬 ceiling；改自身泄漏不改他票注册表；真实站点行为不变），与首轮 config 注释「不扩大 66-68 分正例越线」一致——复核认可。诚实标注在案：本轮 atomcode `--no-tools` 零抓取，仅方向性支撑，决定性依据为仓内实证。
- **合入完成**：fix 支 land main（ff，`0604af71 parents:a56f2da5`，父链完整零 squash），合入后最终头**全门绿**（E2E/EG/Calibration/Typecheck/Lockfile/Release-dedup 逐项 success），远端 fix 支已自动清理。
- **账本**：A-001…A-010 = **10/10 done，current 清零**。
- **frontier（终态）**：**Cycle-4 全周期闭环 ✅**（票 27-35 + 27R1 + 34R1/R2 + brain-docs×2，共 13 支 land main；release v1.5.0 已发布）。遗留（用户决策，均不自动扩权）：① GreasyFork 站内同步 @1.4.0→1.5.0（凭证门控）；② 远端已合并 `origin/cch/*` 分支清理；③ 每票私有 E2E 作业并回统一 e2e；④ typecheck.yml 注释/命令一行修正 + D-33b lockfile 根 version（随下周期）；⑤ P1/P8 语义同证据档位不一致的独立裁决（27R1 §6 建议，禁借补分越线）。
- 遗留（用户决策，不自动扩权）：GreasyFork 站内同步（@1.4.0→1.5.0，凭证门控）、远端已合并分支清理、每票私有 E2E 作业并回统一 e2e、typecheck.yml 注释/命令一行修正、D-33b lockfile 根 version 随下周期处理。

### Cycle-4 收口审计（审计 Agent，2026-09-13，`cycle4-closure/01-03.md`）

- **硬验收本地重跑全绿**（goal 授权覆盖 CI-only，偏离已记录）：build 121.7KB @version=1.5.0 / typecheck 0 错 / E2E **80/80（50.2s）** / 门脚本 verify-02 36/36、harness F1–F8 不注入、verify-27 86/86、28 19/19、29 PASS、31 48/48、05 100/100、32 契约 PASS、calibration PASS；关键声明 rg 抽查与实物零矛盾。
- **交叉核对**：矛盾 1 条（28 AC5 `[~]`）闭合——合入后共享 E2E 转绿实证（run 34735968078 + 本地 80/80）。
- **三层一致性**：CONTEXT「分档覆盖」词条已修；新增 ADR-0007（scope 显式化，取代 ADR-0003 页面级语义）+ ADR-0008（真实站点测试塔 + CDP NOT-ADOPTED + floor≠ceiling 去重）；10 项 implemented 决策摘要沉淀 `docs/architecture-recovery-cycle4-decisions.md`（入既有白名单，零 .gitignore 变更）。
- **账本结算**：A-001…A-010 = **implemented 10/10**、current 清零；账本随 `.scratch/` 原地归档。
- **合并**：`but pull` 无新上游；13 支已全部在 main。收口产物提交本地分支 `cch/cycle4-closure`，**未 land 未 push——停边界等指令**。
- **Backlog B-1…B-10**（GreasyFork / 远端支清理 / 私有 E2E 并回 / verify-09~18 私有装载器残留+F-1 / typecheck 注释+lockfile / P1-P8 档位裁决 / contenteditable 语料先行 / 真实站点启用 / peer 根修 / CI-only 审计授权条款化）：详见 `cycle4-closure/03-backlog-and-merge-state.md`。

## 第五周期（送达 + 可见 + 可信，2026-09-14）

> 输入: `research/cycle5-investigation.md`（Cycle-5 架构大脑调查：4 次 atomcode 全景调研 + 4 个子代理并行只读审计 + codegraph 结构图 119 files/1,693 nodes/4,469 edges）+ `cycle4-closure/03-backlog-and-merge-state.md`（B-1…B-10）
> Spec: `spec.md`（上一周期 spec 已归档 `spec-cycle4.md`）| 对账闸: `decision-ledger.md`（A-011…A-025 共 15 条，无去向记录为空）
> Tickets: `issues/36-45*.md`（10 张）| 自检: `research/launcher-selfcheck.md` | 对账报告: `research/cycle5-reconciliation-report.md`

### 波次表（从 issue Blocked by 推导，未新造顺序）

| 波次 | 票 | Blocked by | 并行性 | 焦点（覆盖 A-xxx） |
|------|----|-----------|--------|-------------------|
| **W1** | 36, 37, 40, 42, 43, 44 | 36←无； 37←无； 40←无； 42←无； 43←无； 44←无 | 同波互不堆叠，可并行 | 门禁完整性返修（A-014, A-015, A-020） ＋ 入口可达性（A-012, A-013） ＋ 帧治理降级反馈（A-017） ＋ 语言切换收口（A-019） ＋ 依赖根修（A-021） ＋ 检测语义裁决与语料先行（A-022, A-023） |
| **W2** | 38, 39 | 38←36； 39←40 | 同波互不堆叠，可并行 | 分发最后一公里（A-011） ＋ 真实站点层启用（A-016） |
| **W3** | 41 | 41←36,37,38,39,40,42,43,44 | 单票 | 过程证据出仓与升塔纪律（A-018） |
| **W4** | 45 | 45←41 | 单票 | 仓库与流程收口（A-024, A-025） |

### 票务状态与 frontier（第五周期）

| 票 | 覆盖 | 状态 | 报告路径 | 波次 |
|----|------|------|----------|------|
| 36 门禁完整性返修 | A-014, A-015, A-020 | **done（复核通过）** — 12 CI run 实物全 success；A-020 跨票承载于 43 | `research/window-reports/36-gate-integrity-repair-report.md` | W1 |
| 37 入口可达性 | A-012, A-013 | **done（R1 复核通过）** — CI 先红(34845561008)后绿(0350110f/19d0b83b 各 5 run success)；修复 _pos 盒内锚点；本地 E2E 95 passed + verify-37 20/20 | `research/window-reports/37-entry-point-accessibility-report.md` | W1 |
| 40 帧治理降级反馈 | A-017 | **done（复核通过）** — 4 CI run 实物全 success | `research/window-reports/40-frame-governance-degradation-report.md` | W1 |
| 42 语言切换收口 | A-019 | **done（复核通过，含 R1）** — R1 返工后 7 run 实物 success | `research/window-reports/42-locale-switch-report.md` | W1 |
| 43 依赖根修 | A-021 | **done（复核通过）** — 4 CI run success；提交信息转义缺陷另计 | `research/window-reports/43-dependency-peer-rootfix-report.md` | W1 |
| 44 检测语义裁决与语料先行 | A-022, A-023 | **done（复核通过）** — 补 CI 后 4 run 全 success（无专属 verify-44 门，共享工作流覆盖） | `research/window-reports/44-detection-semantics-adjudication-report.md` | W1 |
| 38 分发最后一公里 | A-011 | **done（复核通过）** — 补 CI 后 5 run 全 success（含 Verify-38 与 E2E 80 passed）；GF 侧 Sync 仍待用户开通 | `research/window-reports/38-distribution-last-mile-report.md` | W2 |
| 39 真实站点层启用 | A-016 | **done（复核通过）** — 7 run 实物全 success（含 Real-site smoke ×2）；live 启用数 0→2 | `research/window-reports/39-real-site-enablement-report.md` | W2 |
| 41 过程证据出仓与升塔纪律 | A-018 | **done（复核通过）** — 归档实测：`git ls-files .scratch` 397→210；仓库外归档 200 文件+MANIFEST(199 sha256)；WORKFLOW §4.5 升塔纪律已入；.gitignore 零改动；纯删除 14409 行 | `research/window-reports/41-process-evidence-archive-report.md` | W3 |
| 45 仓库与流程收口 | A-024, A-025 | **done（复核通过）** — A-024 清理集实物为 **∅**（远端 9 支 0/9 MERGED；台账登记的 11 支 Cycle-4 支经逐名核验 11/11 已 ABSENT，属台账失真）；**零删除**；A-025 WORKFLOW §8 两子节 10 条款已入 | `research/window-reports/45-repo-process-closeout-report.md` | W4 |

### 发起窗口的 prompts

| 票 | 启动器 |
|----|--------|
| 36 | `prompts/36-gate-integrity-repair.md` |
| 37 | `prompts/37-entry-point-accessibility.md` |
| 40 | `prompts/40-frame-governance-degradation.md` |
| 42 | `prompts/42-locale-switch.md` |
| 43 | `prompts/43-dependency-peer-rootfix.md` |
| 44 | `prompts/44-detection-semantics-adjudication.md` |
| 37-FIX | `prompts/37-entry-point-accessibility-fix.md`（返工轮次 R1） |
| 38 | `prompts/38-distribution-last-mile.md` |
| 39 | `prompts/39-real-site-enablement.md` |
| 41 | `prompts/41-process-evidence-archive.md` |
| 45 | `prompts/45-repo-process-closeout.md` |

### 对账闸与自检

- **对账闸（Step 0）**：登记 A-011…A-025（15 条，状态 current）；**无去向记录清单为空，准予立票**。报告 `research/cycle5-reconciliation-report.md`。
- **启动器自检**：10/10 PASS（行数 ≤23、违禁词 0、复述条款 0、handoff 通用调研要求各 1 次、路径全可解析、A-xxx 均已声明）。报告 `research/launcher-selfcheck.md`。
- **B-1…B-10 backlog**：10/10 全部有去向（B-1→A-011/票38、B-2→A-024/票45、B-3→A-015/票36、B-4→A-014/票36、B-5→A-020/票36、B-6→A-022/票44、B-7→A-023/票44、B-8→A-016/票39、B-9→A-021/票43、B-10→A-025/票45）。

### W1 复核结论（首脑，2026-09-14）

> 报告：`research/cycle5-wave1-review.md`（声明→证据→结论对照表 + 账本维度 + 过程违规）

- **实现层：W1 六票全部通过**（无源码返工）。实物验证：12 个票级门实跑全绿（09=36/36、13=28、15=28、18=35、37=20、42=42、02=36+G10 5/5、05=100、27=90、28=19、29=PASS、31=48）；全量 E2E **94 passed**；CI run 实物：36=12/40=4/42=7(抽验)/43=4 均 success。

- **账本：6 票 10 条 A-xxx 均得实现证据**；弱化项：A-012/A-013（票37）、A-022/A-023（票44）**无 CI 证据**（未推送）；A-020 跨票承载于 43。

- **过程违规（单独呈报，未代为追认）**：P-1 票 37/44 未推送无 CI 证据（违反 CI-only）；P-2 cch/43 提交信息为字面量 \uXXXX 转义不可读；P-3 cch/44 提交缺 `fix(cch-44):` 前缀；P-4 3 个 issue 勾选未提交；P-5 波内堆叠（36→43、37→42）；P-6 票37 报告以 but ID 充 commit。

- **返工判定：无源码层面问题，不重发修复版启动器**；待处置均为证据/过程项。

**frontier（W1 复核后重算）**：W1 实现层全清 → **W2 可开工：票 38（←36 ✅）、票 39（←40 ✅）**，两票可并行。W3（41）待 W2；W4（45）待 41。

---
### W2 复核结论（首脑，2026-09-14）

> 报告：`research/cycle5-wave2-review.md`

- **实现层：票 39 完全通过**（commit bb0e8f1d 实物；site-manifest live 启用数 **0→2** 实物；harness 嵌套帧/pageerror/有头 xvfb 均实读；反检测红线守住：零 UA 伪造；7 run 全 success 含 Real-site smoke ×2）。

- **票 38：实现属实但证据不闭合**。实物验证：闸门脚本 129 行 + GF 只读校验 125 行 + 两 workflow + 手册 + .gitignore + 版本真源收敛 + README releases/latest 均属实；delta「零 CI→GF POST」实读确认（无 POST/PUT，仅 GET）；本地闸门 15/15 绿 + 反向 `--tag v9.9.9` exit 1。但分支**不在远端**，**零 CI 证据**；AC#1 GF 侧 Sync 待用户开通。

- **账本**：A-016 ✅ implemented；A-011 ⚠️ **部分完成 + 证据弱化**。

- **过程违规（未追认）**：P-1（重复）票 38 未推送无 CI；P-8 票 38 堆叠于 cycle5-ticketing；P-9 未提交记账文件增至 4 个（issues/36/39/42/43）；P-10 报告路径差异（已按约定处理）。

- **返工判定：无源码层面问题，不重发修复版启动器**。

**frontier（W2 复核后重算）**：W2 实现层全清 → **W3 可开工：票 41（←36,37,38,39,40,42,43,44 均已落盘）**。W4（45）待 41。

⚠️ **开 41 前建议**：票 41 会归档 .scratch 冻结证据，而 37/38/44 的 CI 证据尚未补齐（P-1）——**先补 push 取 CI，再归档**。

---
### W2 补 CI 证据 + 票 37 返工轮次 R1（首脑复核，2026-09-14）

- **CI 证据补齐（授权 push 三支）**：票 38 5 run 全 success（head 67b7aaec）；票 44 4 run 全 success（head a8ee1a83）；票 37 5 run 终态落档但 **E2E 失败**。

- **票 37 失败（已实物复核）**：run `34845561008`，`tests/pseudo-select.spec.ts:46` 点击超时 30000ms，Playwright 日志 57 次重试均为 `#cch-pop`/`#cch-sw` 子树拦截指针事件；全量 88 passed / 1 failed。

- **非 flaky 旁证**：同一 spec 在票 38（E2E 34845596301）与票 44（E2E 34845607981）分支均 **通过**（✓ 43），失败仅出现在含票 37 改动的分支。

- **根因（R1 窗口独立归因）**：A-013 把 lowkey 图标由盒外 `right:-12px` 移入盒内 `right:6px`，包围盒左缘左移 ≈18px；面板按锚点左缘定位随之左移，把「面板左缘 vs 相邻字段图标右缘」的横向余量由 ≈27px 压到 ≈11px。余量是**字体度量相关**量——本地 Windows 10.9px（绿），Linux CI 漂移 >11px 即翻负（红）。**既非 flaky 也非 auto 图标被改位。**

- **修复**：`src/ui/index.ts` `_pos()`——锚点为字段盒内图标时，面板左缘改锚到**字段右缘 + 8px**（余量恢复 ≈47px）；盒外 auto 路径零改动。未改图标定位、未削弱/删改任何断言或用例、未回退 A-012/A-013。

- **R1 验收**：`verify-ticket-37.mjs` **20 PASS/0 FAIL**；`npx playwright test` **95 passed**（本地实物复跑）；`npm run typecheck` 0 错；CI 修复头 `0350110f` 与最终头 `19d0b83b` **各 5 run 全 success**（含 E2E 90 passed，票 18 pseudo-select ✓）。

- **R1 增量**：新增密封回归 `tests/fixtures/lowkey-occlusion.html` + `entry-access.spec.ts:102` 用例（修前确定性红、修后绿）——把 CI-only 失败落成本地可复现断言；未触碰票 18 任何文件。

- **报告**：R1 节已**追加**写入原 `research/window-reports/37-entry-point-accessibility-report.md`（未覆盖原记录）。

**frontier（重算）**：W1 + W2 全部**实现层与 CI 证据均闭合** → **W3 可开工：票 41**（←36,37,38,39,40,42,43,44 均已落盘且 CI 已补）。W4（票 45）待 41。

**仍待用户动作**：① 票 38 的 GF 侧 Sync 开通（手册 `docs/greasyfork-sync-setup.md`）；② 票 41 由用户手动开；③ P-2/P-3 已推送提交信息是否改写。

---
### W3 复核结论（票 41，首脑，2026-09-14）

- **票 41 复核通过（实物验证）**：commits `fff188b8`/`d7322ae5`/`b7b1f0a2` 均存在；`git ls-files .scratch` = **210**（报告 397→209→210 含本票报告）；WORKFLOW **§4.5 升塔纪律** 已入；`.gitignore` 对 41 零改动（diff 空）；仓库外归档目录 + `ARCHIVE-MANIFEST.json`（199 条 sha256）均存在，实际 200 文件；归档主体 `191 files changed, 22 insertions, 14409 deletions`（纯删除主导，符 spec「纯删除优先」）；现役流程文件 WORKFLOW/spec/ledger/README 均在，issues=45 / handoffs=46 / prompts=54 / window-reports=50。

- **数据保全核验（我重点查）**：41 把 Cycle-5 大脑产物从工作树归档出去了（wave1/wave2 复核、审计报告、对账报告等）——逐件回查归档，**10/10 均在归档且 sha256 已录、字节数一致**（如 wave1-review 11098B / audit 7545B / investigation 17316B / HTML 45355B）；且这些文件已提交在 `cch/cycle5-ticketing`，历史可取回。**无丢失。**

- **残留 D-1（41 自报，已确认属实）**：11 文件未能归档（`report/architecture-review-cycle5.html`、`research/cycle5-investigation.md`、`research/atomcode-43-*.md`、`research/scripts/39-*.mjs`×8）——它们由独立成栈的 `cch/39`/`cch/43`/`cch/36-cycle5-brain` 创建，不在 41 分支基线内；待那三支落地后作为收尾项归档。

- **过程违规（未追认）**：P-11 票 41 **未推送**（`ls-remote` 空）→ 无 CI 证据（D-3 自报，纯文档改动）；P-12 票 41 **堆叠于 cch/44** 之上（D-2 自报，真实文件依赖）。

### 票 38 GF 同步落地结论（用户提问答复，2026-09-14）

- **旧 URL 已死**：`raw.githubusercontent.com/Xxx91n/Find-Your-Country-Code/refs/heads/main/src/Find-Your-Country-Code.js` → **HTTP 404**（实测），且 `src/Find-Your-Country-Code.js` 本地已不存在——架构已由「单文件手写源码」改为 Vite 构建产物，旧路径自然失效。

- **正确 URL（实测 HTTP 200，`@version 1.5.0`，121,447 B）**：`https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest/download/find-your-country-code.user.js`

- **为何用 releases/latest 而非 raw**：`dist/` 不入 main（`raw .../main/dist/...` → 404 实测），而 release 流水线在每次合入 main 后自动把构建产物挂到 Release；`/releases/latest/download/<asset>` 是 GitHub 官方的「最新版资产」固定链。

- **闭环**：GF 侧开启 Sync from external URL 指向上述 URL → GF 拉取到 `version 1.5.0` → 用户更新检查看到新版本（修复 A-011 送达断点）。

**frontier（41 复核后重算）**：W3 ✅ → **W4 可开工：票 45（仓库与流程收口，A-024/A-025，←41 ✅）**。

---
### W4 复核结论 + Cycle-5 全周期收口（首脑，2026-09-14）

> 报告：`research/cycle5-wave4-review.md`

- **票 45 复核通过**：commit `741c2807`/`7035300d` 实物；WORKFLOW **§8 证据边界**（`§8.1 CI-only 政策` 5 条 + `§8.2 本地硬验收边界` 5 条，共 22 行）实读属实；远端 `main` 未动。

- **本轮最有价值的一次“不执行”**：A-024 字面要求「清理 11 支已合并分支」，票 45 **未盲删**——逐名实测发现那 11 支早已 ABSENT，而远端现存的 9 支 `cch/*` **0/9 MERGED**（全是在途交付的唯一远端副本）。照字面执行将不可逆摧毁 Cycle-5 全部在途工作。**台账前提被实物证伪，已写回 WORKFLOW §5 教训。**

- **账本终态：A-011…A-025 = 15/15 implemented**（无 deferred、无无去向）。

- **过程违规（未追认）**：P-11 票41 未推送无 CI；P-13 票45 未推送无 CI；P-14 票45 堆叠于41（5 层栈）；P-15 A-024 台账数字失真（已由 45 写回教训，需追认）。

- **返工判定：无源码层面问题，不重发修复版启动器。**

### Cycle-5 frontier（终态）

| 波次 | 票 | 状态 |
|------|----|------|
| W1 | 36 / 37(R1) / 40 / 42 / 43 / 44 | ✅ done（含 CI 证据） |
| W2 | 38 / 39 | ✅ done（含 CI 证据；38 GF 侧 Sync 待用户） |
| W3 | 41 | ✅ done（未推送） |
| W4 | 45 | ✅ done（未推送） |

**无剩余实施票**。下一动作不是新票，而是 **land 到 main**：远端 9 支 `cch/*` **0/9 MERGED**，`origin/main` 仍停 `e2a10d8e`——**land 将自动触发 release，属不可逆、需用户明确授权**。

**待用户动作（按优先级）**：① 授权 land Cycle-5（或指定合并序）；② GF 脚本页填新同步 URL `https://github.com/Xxx91n/Find-Your-Country-Code/releases/latest/download/find-your-country-code.user.js`；③ 授权 push cch/41+cch/45 补 CI；④ P-2/P-3 是否改写已推送提交信息；⑤ D-1 11 文件补归档。

---
### 辩证校正（入档）

- 锐评 Round 3「git 历史第三次归零 / tag 非 main 祖先」经实测**证伪**（origin/main 有父提交、163 commits、v1.3.4/v1.4.0/v1.5.0 均为祖先）——**未登记为 A、不立票**。
- 「在 release.yml 加 GF 发布步骤」经深度调研**推翻**（GF 无写入 API），已改写为拉取模型（A-011 显式约束）。

---
## Backlog (跨周期遗留 + Cycle-3 新增遗留 — 等用户决定是否立票)

### 跨周期遗留（mmv2）
1. GreasyFork 站内同步（@1.3.4 → 1.4.0，凭证门控）
2. 本地 main ref 对齐（3ccfee2 vs origin 0759913+）
3. 真实站点冒烟（iframe / 伪 select / React 19）
4. 票 17 atomcode 交叉验证轮（可选）

### Cycle-3 新增遗留（F-1 / F-2 / F-3）
5. **F-1**: verify-15 S4 预存门漂移（main baseline run 34606594163 failure）
6. **F-2**: typecheck.yml --legacy-peer-deps 残留 1 处
7. **F-3**: lockfile 待 CI 实证

### 合并待办（PAUSED — 等用户明确指令）
8. but pull 同步远端最新
9. 按栈序逐支合并：cch/20 → 22 → 23 → 25 → 24 → 21 → 26
10. but push 到 origin — **PAUSED**
11. but land 到 main — **PAUSED**
