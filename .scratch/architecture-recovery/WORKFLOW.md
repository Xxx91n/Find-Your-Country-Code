# 架构恢复工作流（WORKFLOW）

> **生成依据**：ask-matt 主流程与路由表（含 Phase boundaries / Context hygiene）+ improve-codebase-architecture + to-spec + to-tickets + handoff + but(GitButler) + atomcode-research + ponytail(full)，结合本仓库约束固化：**大脑/子窗口双轨、GitButler 版本控制、atomcode 深度调研优先、多窗口人工派发**。
> **生成日期**：2026-09-03（Asia/Singapore）
> **裁决规则**：本文件与上述任一 skill 本体冲突时，**以 skill 为准**；本文件只承载"本地适配 + 路径固化 + 多窗口协作约定"。
> **教训机制**：任何阶段产生"爆炸教训"（返工 / 误判 / 护栏失效），当次会话结束前必须写回 §5，不许随会话蒸发。
> 路径约定：§3 表格内路径一律相对本仓库根（`D:\Aworker\mozilla\choose-your-country`）；窗口启动器（prompts/）内一律使用绝对路径。

---

## §1 角色与双轨

| 角色 | 职责 | 权限边界 |
|---|---|---|
| **大脑 Agent**（主窗口） | 宏观调查、候选遴选、深度调研调度、spec/tickets/handoff/prompts 生成、验收收口 | **不允许直接修改业务代码**；只写 `.scratch/architecture-recovery/` 内的产物 |
| **子代理**（大脑派出，会话内） | 细小问题的并行调研（本地证据 / web 检索），报告落盘 `research/` | 只读仓库 + 写 `research/` 报告 |
| **子窗口**（多窗口，人工派发） | 按票实施：TDD 红绿循环 → 实现 → code-review → GitButler 提交 | 只动本票授权的代码范围；开工前必须复述阻塞与必读清单 |

双轨规则：大脑与子窗口通过**磁盘产物**通信（handoff / issue / spec / WORKFLOW / ADR），不依赖对话记忆；"多窗口要引用的东西，不许死在对话里"。

## §2 工具约定（硬偏好）

1. **atomcode 深度调研优先**：一切"心智模型路线 / 工业级方案选型"级问题必须经 atomcode 深度调研（多源交叉验证 + 引用清单）。**串行硬护栏：同一工作区任意时刻至多 1 个 atomcode 调研在途**；失败按 atomcode-research 的续跑锚定（探测→轮询→找回→`-c` 续跑），禁止杀进程。子代理**禁止**并行发起 atomcode。
2. **ctx_batch_execute 的 shell 是 bash**：向 ctx 传命令时按 bash 语法书写（Windows 宿主上的 bash.exe 来自 Git Bash）；引号转义按 bash 规则，不用 PowerShell 反引号。
3. **codegraph CLI 探索仓库**：`codegraph init` → `status` → 结构/符号图查询；结论引用节点/边数作为证据。
4. **anysearch MCP 联网广泛搜索**：可用环境优先；不可用时回退原生 web_search，并在产物中注明回退。
5. **Ponytail full 模式**：梯子强制（YAGNI → 复用 → 标准库 → 平台原生 → 已装依赖 → 一行 → 最小实现）；"先读懂再偷懒"；非平凡逻辑必须留下一个可运行检查。禁止幻觉推理：每个外部事实标注 observed / cited / reproduced / candidate。
6. **node.js 防嵌套**：批量文件读写、聚合统计、程序化验收一律写 `.scratch/architecture-recovery/research/scripts/*.mjs` 用 node 执行；**禁止**在对话里内联超长 shell 管道（嵌套引号与超长输出会导致对话断开）。脚本 stdout 只输出紧凑摘要。
7. **本会话环境备注**（2026-09-03 实测）：ctx / anysearch MCP 在 OpenClaw 宿主不可用（atomcode 已直接跑通，绕过 ctx 承载；结果已索引落盘）。该回退已记入 §6 偏离点。

## §3 流程总览（从巡检到收口）

| # | 阶段 | 入口技能 | 产出物路径（相对仓库根） | 执行者 |
|---|---|---|---|---|
| S0 | 巡检与环境 | —（`but status` / `codegraph init`） | `.scratch/architecture-recovery/research/repo-survey.md` | 大脑 |
| S1 | 架构调查 | `improve-codebase-architecture`（Explore 步） | `research/repo-survey.md`、`research/misdetection-root-causes.md`、`research/industry-models.md` | 大脑 + 子代理 |
| S2 | 深度调研（心智模型对标） | `atomcode-research`（串行） | `research/atomcode-industry-models.md` | 大脑（或授权子窗口，一次一个） |
| S3 | 候选报告与遴选 | `improve-codebase-architecture`（报告 + grilling 步） | `report/architecture-review.md` + `report/architecture-review.html`；用户选定候选后进入 S4 | 大脑 → **用户确认** |
| S4 | 规格化 | `to-spec` | `spec.md` | 大脑 |
| S5 | 票据化 | `to-tickets` | `issues/NN-slug.md` + `README.md`（波次表） | 大脑 → 用户过目 |
| S6 | 交接与启动器 | `handoff`（每票一份） | `handoffs/NN-slug.md` + `prompts/NN-slug.md` | 大脑 |
| S7 | 实施 | `implement`（内部驱动 `tdd`，收尾 `code-review`） | 代码变更 + 每窗口报告文件 `research/window-reports/NN-slug-report.md` | 子窗口（人工派发） |
| S8 | 收口 | ask-matt Phase boundaries + 本文件 §7 | 波次表勾销、ADR/CONTEXT.md 增补、教训写回 §5 | 大脑 |

主线映射 ask-matt：`improve-codebase-architecture`（本次入口）→ 候选即 idea → 主流程 `grill-with-docs → to-spec → to-tickets → implement(tdd + code-review)`。词底层 `domain-modeling`（CONTEXT.md/ADR 纪律）与 `codebase-design`（deep module 词汇）贯穿 S3–S8。On-ramp：实施期发现难缠 bug → `diagnosing-bugs`；积压外部反馈 → `triage`。

## §4 实施约定

### §4.1 上下文卫生（ask-matt Phase boundaries 本地化）

- S1–S5 保持**同一不间断上下文**；到达 S5（票据发布）后即可清窗。
- 每个子窗口是天然 fresh context：只装 handoff + issue + 必读清单，装不下的部分**靠文件引用**，不靠转述。
- 单窗口逼近 smart zone（~150k tokens）时，在最近阶段边界 handoff 或 compact，不硬撑降级推理。

### §4.2 版本控制（GitButler，唯一权威）

- **一切 git 写操作用 `but`**：`but status` / `but diff` / `but commit -b <branch> -m "<msg>" [ids]` / `but push` / `but pr new`。禁止 `git add/commit/push/checkout/merge/rebase/stash/cherry-pick`。
- 每票一个 GitButler 分支（`but commit -b` 不存在即建），票与分支同名：`cch/<NN>-<slug>`；波次内各票**互不堆叠**（并行互不影响），确有依赖按 `but move <branch> --above <dependency>` 堆叠。
- 只读检查（`git log` / `git blame` / `git show --stat`）允许直接用 git。
- 冲突一律走 `but resolve` 流程（`but resolve conflicts <branch>` → `apply --ours/--theirs` 或直接编辑文件 → `finish`），禁止进入任何 git 冲突模式；工作区脏文件冲突：编辑文件后 `but resolve <path>`。
- 提交信息约定：`fix(cch-NN): <行为级描述>` / `refactor(cch-NN): …`；提交前跑本票验收清单；`but commit` 不需要额外验证 status/diff。
- 回滚：`but undo`（最近操作）或 `but discard <id>`；票级放弃 = `but uncommit <branch>` + `but discard`。

### §4.3 波次推进规则

- 波次**只从 issue 的 `Blocked by` 字段推导**，不新造顺序：Blockers 全空的票 = Wave 1；被 Wave N 票阻塞的票 = Wave N+1。波次表落 `README.md`。
- 每波启动前大脑核对：该波各票的 blockers 状态、handoff 与 prompts 文件存在且可解析。
- 子窗口报告落 `research/window-reports/`，大脑在收口阶段逐份核对后勾销波次表。

### §4.4 窗口启动器规范（prompts/NN-slug.md 硬规则）

1. 每份 ≤60 行；只含：一行身份、必读文件路径清单（绝对路径：handoff/issue/spec/WORKFLOW/相关 ADR）、本票专属 delta（检查点 + 专属验收项）、开工第一句（要求窗口先复述阻塞 + 必读清单再动手）、结尾声明必须生成报告文件到 `research/window-reports/NN-slug-report.md`。
2. **禁止复述**被引用文件已有条款：版本控制只写"遵循 WORKFLOW §4.2"，完成定义只写"遵循 handoff 内完成定义"；锚定权威文件路径，让模型读文件，不凭记忆合成。
3. **禁止出现** `worktree` / `git checkout` / `git branch` 等字样；版本控制方案以 §4.2 为唯一来源。
4. 派发提示词明确要求子窗口：调研级决断优先依赖 atomcode 深度调研（遵守串行护栏），并回顾项目内 docs/adr 与 CONTEXT.md 既有心智模型，对标工业级成熟方案后再动手。
5. 生成后逐份自检：无违禁词、无重复条款、所有路径可解析；自检报告落 `research/launcher-selfcheck.md`。

## §5 爆炸教训登记簿（持续追加，不许随会话蒸发）

| 日期 | 阶段 | 教训 | 防再犯 |
|---|---|---|---|
| 2026-09-03 | S1 | 首轮会话把 39 份 skill 全文内联读取，响应超载被截断（terminated），目标被误标 blocked | 一切批量读取走 node 脚本落盘 + 紧凑索引（§2.6）；对话内只保留摘要 |
| 2026-09-03 | S2 | OpenClaw 宿主无 ctx 工具，atomcode-research 默认载体不可用 | 按 skill 的 fallback 语义改为"直接 CLI 运行 + 手动落盘索引"，且保持串行；已记 §6 偏离点 D1 |
| 2026-09-03 | S3 | 两个并行调研子代理先后因模型配额耗尽 403 失败（GLM-5.3 free quota used up），T2 报告丢失但遗落了可修复的复现脚本（路径层级错） | 子代理产出要早落盘、增量落盘；失败后先抢救遗留物再重派；复现脚本入库前先跑通修路径 |
| 2026-09-03 | S7 | 验收脚本首轮报 80 问题，其中绝大多数是脚本自身解析缺陷（路径截断、中文标点、前向引用）而非产物缺陷——验收工具也要先自证 | 验收脚本先对已知好样本干跑，区分"工具误报"与"真实缺陷"再下结论 |
| 2026-09-04 | S7(票04) | 重写 _process 时把 iti 分支的 kind 统一算成 input，静默改掉了 kind→Fill 三策略分发的下游契约（面板填充不再联动插件选中态）；提交前 E2E 确定性红灯（2/2 复现）拦下，未进入提交 | 重写含下游分发的既有分支逻辑前，先枚举该分支变量的全部消费方；票级 E2E 回归组是提交红线，红灯先归因自身改动而非测试环境 |
| 2026-09-04 | S7(票08) | .gitignore 的 `docs/` 整目录忽略会静默吞掉新交付的 `docs/adr/`（文件落盘≠可入库，ADR 差点进不了版本库）；`dist/` 被忽略同理使 README 相对链接 `./dist/...` 成为仓库死链，CDN 链接指向冻结旧单文件也构成过时表述 | 文档类交付落盘后必须跑 `git check-ignore` + `git status` 核验真实可提交性；.gitignore 收窄为 `docs/*` + `!docs/adr/` 细粒度放行；用户文档内的产物链接一律指向 git 可达目标或构建指引 |

## §6 偏离点清单（呈报用户，逐条确认后才生效）

| # | 原流程（skill 原文） | 本地适配 | 原因 | 状态 |
|---|---|---|---|---|
| D1 | atomcode 必须经 ctx_batch_execute 承载（不可达时停下告知用户） | 本轮由大脑直接以 CLI 运行 atomcode（串行护栏照守），stdout 落盘 `research/atomcode-industry-models.md` | OpenClaw 宿主无 ctx 工具；"停下告知"会让目标整体停摆，已按 unblock 授权换路径 | 待确认 |
| D2 | improve-codebase-architecture 报告写到 OS 临时目录并当场打开 | 报告落仓库 `.scratch/architecture-recovery/report/`（md + html 双格式） | 多窗口/后续会话要引用，临时目录不可持久 | 待确认 |
| D3 | ask-matt S1 以 `/grill-with-docs` 用户访谈锐化 idea | 本次以"用户目标原文 + atomcode 深度调研 + 子代理证据"替代逐轮访谈；后续新 idea 仍回 grill-with-docs | 用户已在 goal 中给定痛点/偏好/身份约束，访谈冗余 | 待确认 |
| D4 | grilling loop 面向同窗口实时问答 | 候选遴选改为"报告 + 偏离点清单"异步呈报制 | 多窗口/异步工作模式 | 待确认 |
| D5 | handoff 写到 OS 临时目录 | handoff 落 `.scratch/architecture-recovery/handoffs/` | 同 D2，多窗口引用需持久路径 | 待确认 |
| D6 | to-tickets 在真实 tracker 发布 / 默认本地 `.scratch/<feature>/issues/` | 固化为本仓库 `.scratch/architecture-recovery/issues/`，未运行 setup-matt-pocock-skills（无 GitHub token 配置） | 票据先行落盘，后续可迁移 GitHub Issues | 待确认 |
| D7 | ask-matt 的 `/implement` 在同窗口逐票执行 | 改为多窗口人工派发（S6 生成 prompts 启动器，用户手动开窗） | 用户明确的多窗口工作方式 | 待确认 |
| D8 | improve-codebase-architecture 输出纯 HTML 报告（Tailwind+Mermaid CDN） | 保留 HTML（含 before/after 卡片）同时增加 markdown 摘要 | markdown 供子窗口低成本引用，HTML 供人审 | 待确认 |

## §7 验收与收口

1. **程序化比对**：node 脚本逐字段核对 {prompts ↔ handoffs ↔ issues ↔ spec} 的路径引用 / 标题 / 需求原文 / 阻塞边 / 验收清单，输出不一致清单；不接受"自述一致"。
2. **合规检查**：(a) prompts 内无 `worktree`/`git checkout`/`git branch` 违禁词；(b) prompts 不复述上游文件条款（只允许"遵循 §X"式引用）；(c) 所有引用路径可解析。
3. **收口动作**：波次表勾销；若本周期产生新领域词汇 → `CONTEXT.md`（无则懒创建）；产生"不可逆决策 / 被否决路线" → `docs/adr/NNNN-*.md`；教训写回 §5。
4. 回滚方案：整套架构恢复产物都在 `.scratch/architecture-recovery/`（未跟踪目录），整体删除即回滚；代码变更走 §4.2 的 `but undo` / `but discard`。
