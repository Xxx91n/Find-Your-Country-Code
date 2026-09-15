# 窗口报告 01 — 验收面与断言阶梯定义（A-029 · A-030）

> 票：`issues/01-acceptance-surface-and-ladder.md` | 分支：`cch/01-acceptance-surface-and-ladder` | 日期：2026-09-16（Asia/Singapore）
> 基线：`cch/48-cycle6-ticketing` head `6d0563d9`（本票堆叠于其上；`git merge-base HEAD 6d0563d9` = `6d0563d9`）
> 提交锚点：`ecd38b13`（分支 `cch/01-acceptance-surface-and-ladder`；锚点回写提交见分支 head）
> 性质：**只产出定义**——零 harness、零源码改动。

---

## 1 结论摘要

本票把「所有工具是否生效」从模糊说法变成可执行定义，交付**单一测试约定** `tests/ACCEPTANCE-SURFACE.md`：

1. **验收面 = 17 项用户可见工具 + 1 项诊断**（`__cchLastFill` 按 D-002 / D-006 移出验收面），逐项带「页面侧外部可观测」可执行判据（选择器 / 属性 / 事件 / 计数）。
2. **断言阶梯 L0–L4 五级成文**（静默健康 → 元素已注入 → 交互可驱动 → 写入结果 + 持久化 → 用户反馈出现），并逐级给出层归属。
3. **两层都跑全阶梯**（D-004 用户裁决）；差别只在**阻断语义**（owned 页 PR 阻断 vs 真实站点 advisory）；阻断只发生在**发布门**（D-005）。
4. **持久化**定为 6 项有状态工具的通用判据（收藏 / 负反馈 / 豁免 / 规则 / 低调样式 / 语言），四步闭环且不得只读 storage 自证。
5. **跨隔离上下文链路**单列为独立验收项（#14），要求断言链路**两端的写入结果**。
6. **环境真实性约束成文**：L2 以上必须真实浏览器 runtime；headless 必须 full Chromium（`headless_shell` 会静默空转仍全绿）。

**零业务代码改动**（`git diff` 对 `src/` 为空，见 §4.2 第 7 条）。

---

## 2 复现基线（动手前先留证据）

| 项 | 观测值 | 命令 |
|---|---|---|
| 基线 head | `e4e605ad`（workspace commit） | `git rev-parse HEAD` |
| 依赖分支 head | `6d0563d9`（`cch/48-cycle6-ticketing`） | `git log --format=%H -1 6d0563d9` |
| 合并基 | `6d0563d9`（本票为 cch/48 后代） | `git merge-base HEAD 6d0563d9` |
| 密封层原语层 | `tests/helpers/userscript.ts` **47 行 / 4 导出** | `wc -l` + `grep -c '^export '` |
| 真实站点层交互原语 | `.click(` / `.fill(` / `locator(` 命中 **0** | `grep -c` on `tests/live/live-smoke.mjs`（270 行） |
| 密封 spec 数 | **16** | `ls tests/*.spec.ts | wc -l` |
| 票级 verify 脚本数 | **22** | `ls tests/scripts/ | wc -l` |

基线印证 `research/cycle6-investigation.md` §2 的「L3 覆盖 2/18」：密封层本身无原语层（票 05 起点），真实站点层无任何交互原语。

---

## 3 交付物

| 路径 | 内容 | 行数 / 字节 | SHA-256 |
|---|---|---|---|
| `tests/ACCEPTANCE-SURFACE.md` | **验收面与断言阶梯权威定义**（本票主交付物） | 203 / 17898 | `f2d9c292…d9de29b` |
| `.scratch/architecture-recovery/research/atomcode-01-acceptance-surface-and-ladder.md` | atomcode 调研记录（cited 外部依据） | 123 / 11617 | `0940564e…4bd9b3cd` |
| `.scratch/architecture-recovery/research/window-reports/01-acceptance-surface-and-ladder-report.md` | 本报告 | — | — |
| `spec.md` S-03 | 增补一行指针（不重写 S-03 正文） | +1 行 | — |
| `issues/01-acceptance-surface-and-ladder.md` | 6 条验收项勾销 + 证据 | — | — |

---

## 4 验收项逐条勾销

### 4.1 提交锚点

本票提交：`cch/01-acceptance-surface-and-ladder` @ `ecd38b13`（交付提交；锚点回写见分支 head）。
依赖分支：`cch/48-cycle6-ticketing` @ `6d0563d9`。

### 4.2 逐条

| # | 验收项 | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| 1 | 17 项验收 + 1 项诊断逐项写明外部可观测判据 | `tests/ACCEPTANCE-SURFACE.md` §2.1 / §2.2 | `grep -c '^| [0-9]* |' tests/ACCEPTANCE-SURFACE.md`；`grep -c '^| D1 |' …` | `17`；`1` |
| 2 | L0–L4 五级定义成文 + 每级层归属明确 | §4.1（五级表）/ §4.2（层归属表，逐级两列） | `grep -c '^| \*\*L[0-4]\*\* |' …` | `5` |
| 3 | 持久化列为有状态工具的通用判据 | §3.1（四步闭环 + 适用 6 项 + 禁止只读 storage 自证） | `grep -c '持久化' …`；`grep -c 'cch_ui_prefs_v1\|cch_site_rules_v1\|cch_v33' …` | `≥8`；`3` |
| 4 | 跨隔离上下文链路单列独立验收项 + 两端写入结果 | §2.1 第 14 项 + §3.3（链路 A/B 双端断言） | `grep -n '链路 A' …`；`grep -n '链路 B' …` | 各命中 1 行 |
| 5 | 环境真实性约束（L2+ 真实 runtime / headless full Chromium） | §4.3（4 条，含 `headless_shell` 陷阱） | `grep -c 'headless_shell' …` | `2` |
| 6 | 声明覆盖 A-xxx：A-029 · A-030 | 文件头 + §6 来源 + 本报告头 | `head -4 tests/ACCEPTANCE-SURFACE.md` | 头行含「覆盖 A-029 · A-030」 |
| 7 | 本票只产出定义（零 harness / 零源码改动） | 本票 diff 面 | `git status --short`；`git diff --stat -- src tests/*.spec.ts tests/helpers` | 本票新增文件仅 §3 表前 2 行 + 本报告；`src/` 与既有 spec/helper **零改动**（`git status` 中 `src/` 的 2 个 M 属**并行票 03** 在途改动，非本票） |

---

## 5 atomcode 深度调研（串行护栏，本会话 1 次）

- 载体：`ctx_batch_execute`（`atomcode -p`，`concurrency: 1`，`timeout: 600000`）——本会话**仅 1 次在途**，未并行发起第二个调研。
- 三引擎覆盖（Exa / Tavily / AnySearch），angles 全五类，关键结论均 ≥2 独立信源，**总体 Confidence：高**。
- 落盘：`research/atomcode-01-acceptance-surface-and-ladder.md`（123 行，含 15 条来源清单与信息缺口）。
- 对标结论已落入定义文档：外部可观测判据（Chrome 官方口径）→ §1；持久化四步闭环（extensionbooster）→ §3.1；双端断言（Assrt）→ §3.3；headless full Chromium（Playwright / Chrome 官方）→ §4.3。
- 辩证披露：本仓库 L0–L4 与调研的 L0–L5「测试层次」轴**正交**，已在调研记录 §2.2 尾注明映射关系，不混用。

---

## 6 偏离点（呈报用户）

| # | 偏离 | 原因 | 状态 |
|---|---|---|---|
| O1 | 定义文档落 `tests/ACCEPTANCE-SURFACE.md`（而非 `docs/`） | `docs/*` 被 `.gitignore` 整目录忽略（仅 `!docs/adr/` + 2 个白名单），落 `docs/` 会重演 WORKFLOW §5 登记的「文档类交付被静默吞掉」教训；`tests/` 为受跟踪路径，且本文件性质即「测试约定」。**未新增任何 `.gitignore` 通配**（遵 §5 教训）。与 ADR-0006 条款 5 不冲突：未新增第二个 tests 根，仅新增一个约定文档；Playwright `testMatch: /.*\.spec\.ts/` 不会误收。 | 待确认 |
| O2 | `spec.md` 增补 1 行指针 → 本票必须**堆叠于 `cch/48` 之上** | `spec.md` / `issues/01` / `handoffs/01` / `prompts/01` 均为 `cch/48` 产物，不堆叠则本票基线缺文件（WORKFLOW §5 已登记同类教训）。符合 §4.2「确有依赖按 `but move <branch> --above <dependency>` 堆叠」。 | 待确认 |
| O3 | 报告路径 `research/window-reports/` | handoff 已声明该偏离（任务书原文写 `reports/NN-report.md`）；沿用既有 50+ 报告链与 README 索引。 | 沿用 |
| O4 | 只提交本票文件，不动并行票在途改动 | 工作区同时存在**票 03（诊断面）**在途改动（`src/config.ts`、`src/types.ts`、`research/atomcode-03-diagnostics-surface.md`、`prompt-03-atomcode.md`）。GitButler 选定提交只取本票路径。 | 已执行 |
| O5 | 手稿基线微差：handoff/issue 记 `tests/helpers/userscript.ts` 为「48 行」，实测 **47 行** | `wc -l` = 47；4 导出不变。属表述微差，不影响票 05 起点判定。 | 已登记 |

---

## 7 证据边界登记（WORKFLOW §8.2 本地硬验收四要素）

1. **为何不可 CI 化**：本票为**纯定义 / 文档交付**，无可执行行为面，无 CI 可复现的断言对象（§8.1.1 的「可 CI 复现」前提不成立）。本票**未**以本地结果替代任何可 CI 化验收。
2. **命令原文**：见 §4.2 各行「只读验证命令」列（均为 `grep` / `wc` / `ls` / `git status` 类只读命令）。
3. **输出摘要**：见 §4.2 各行「输出摘要」列。
4. **复核窗口 / 复核人**：大脑在 S8 收口阶段逐份核对（WORKFLOW §4.3）；本报告为**待复核**产物，未经复核不得视为闭环。

---

## 8 遗留与后续

- **本票提交 sha 回写**：交付提交 `ecd38b13` 已回写至 §4.1 与 `issues/01`；提交内容无法自引用自身 sha，故回写落在紧随其后的小提交（见分支 head）。
- **待回写**：`tests/scripts/verify-ticket-31.mjs` 仍以 `__cchLastFill` 为断言依据（§2.2 约束已登记）；回写属票 05 / 07 范围，本票不越界改动。
- **下游约束**：票 05（W2，blocked by 01）按 §3.3 建双端断言原语；票 06（W3）按 §4.2 建 owned 语料；票 07（W4）按 §4.2 第 3 条实现发布门；§2.1 第 14 项直接约束票 05 的原语集。
- **observe 挂账载体**：§4.2「observe 挂账强制携带非空 reason + ticket」的载体实现属票 07。
