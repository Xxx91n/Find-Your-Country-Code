# Handoff 49 — Cycle-6 全周期归档（2026-09-17）

> 下会话用途：Cycle-7 开工 / land 与发布 / 常规维护 / backlog 立票。**本文只做索引与恢复锚点，细节一律读引用路径。**
> 生成者：Cycle-6 收口票 09（`issues/09-cycle6-closeout.md`）。上游：`spec.md`（Cycle-6）+ `decision-ledger.md`（A-026…A-036）+ `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016）。

## 1. 终态（一句话）

Cycle-6「可配置 + 可解释 + 可证明」十二票中 **01–11 已实现并复核通过**；**票 12（A-036）尚未开工**（blocked by 票 10，而票 10 已闭环 ⇒ 可立即开工）；**全周期尚未 land 进 `origin/main`，也未发版**。账本：**A-026…A-035 = 10/10 implemented**、**A-036 = current（未结算）**；**D-001…D-016 = 16/16 落定**。

## 2. 交付终态（逐票 + 证据锚点）

> 证据口径：行为面只认 CI run（WORKFLOW §8.1），run ID 为 `gh run list --branch cch/<分支>` 在**该分支 tip sha** 上的实际输出；票 04 为纯文档，走 §8.2 本地硬验收例外。

| 票 | 覆盖 A | 状态 | 实施提交 | 分支 tip（远端） | 终端 CI（run ID / 结论） |
|----|--------|------|----------|------------------|--------------------------|
| 01 | A-029 · A-030 | done（W1 复核通过） | 见报告 | `ca6403a7` | Typecheck 35125983470 · Engine Gates 35125983700 · Lockfile 35125983551 · E2E 35125983491 全 success |
| 02 | A-026 · A-027 | done（R2 去污染后复核通过） | 见报告 | `a80756ad` | Verify Ticket 02 35125953578 · Typecheck 35125953583 · Engine Gates 35125953475 · Lockfile 35125953636 · E2E 35125953713 全 success |
| 03 | A-028 | done（W1 复核通过） | 见报告 | `29baf181` | Verify Ticket 03 35125966038 · Typecheck 35125966027 · Engine Gates 35125966044 · Lockfile 35125966074 · E2E 35125966036 全 success |
| 04 | A-033 | 实现属实（W1 复核）；**issue 未勾销（P-4 未处置）** | `8aa956fa` | **未推送** | **无 CI**（纯文档；ADR-0010 + CONTEXT.md 28→35） |
| 05 | A-029 | done（W2 复核通过） | 见报告 | `129d78c3` | Verify Ticket 05 35125996879 · Typecheck 35125996944 · Engine Gates 35125996833 · Lockfile 35125996955 · E2E 35125997105 全 success |
| 06 | A-030 | done（R1 复核通过） | `4a9b3187` | `8d787e5d` | Verify Ticket 06 35126009237 · Typecheck 35126009215 · Engine Gates 35126009244 · Lockfile 35126009280 · E2E 35126009260 全 success |
| 07 | A-029 | done（W4 复核通过） | `d5c6f415` | `fd02901f` | Verify Ticket 07 35126019730 · Typecheck 35126019653 · Engine Gates 35126019700 · Lockfile 35126019619 · E2E 35126019528 全 success |
| 08 | A-031 · A-032 | done（W5 复核通过） | `41ad7dcd` | `747763fd` | Verify Ticket 08 35127030983 · Typecheck 35127030929 · Engine Gates 35127030931 · Lockfile 35127030909 全 success；**E2E 35127030916 failure（已归因，见 §5.3）** |
| 09 | （无；收口层） | 本票闭环 | 见 §9 | 本票分支 | 纯文档，无行为面门 |
| 10 | A-034（P0） | done（W5 复核通过） | `16485782` | `6a95417b` | Verify Ticket 10 35155127276 · Typecheck 35155127240 · Engine Gates 35155127159 · Lockfile 35155127162 · E2E 35155127289 全 success；Real-site smoke（advisory）35154465918 success @ `62f2292a` |
| 11 | A-035（P1） | done（W5 复核通过） | `0f195075` | `8a27ad34` | Verify Ticket 11 35126031083 · Typecheck 35126031223 · Engine Gates 35126030960 · Lockfile 35126030899 · E2E 35126031201 全 success |
| 12 | A-036 | **ready-for-agent（未开工）** | — | 未推送 | — |

## 3. 账本结算

- **A 台账**（`.scratch/architecture-recovery/decision-ledger.md`）：A-026…A-035 = **10/10 implemented**（A-026 按 D-010 修订后口径，仅保留「GM 菜单设置项」）；**A-036 = current（未结算）**——归并行票 12，收口票 09 不承载、不代签。结算节见该文件 `## Cycle-6 结算`。
- **D 账本**（`.scratch/cycle6-grill/decision-ledger.md`）：D-001…D-016 = **16/16 落定**（13 current + 3 revised 均转 implemented，修订后口径生效）。结算节见该文件 `## Cycle-6 结算`。
- 对账闸：A-026…A-036 共 11 条，**全部有票去向；无去向记录 0 条**。

## 4. 权威文件索引

- 工作流：`.scratch/architecture-recovery/WORKFLOW.md`（§4.2 版本控制 / §4.5 升塔纪律 / §8 证据边界）
- Spec：`.scratch/architecture-recovery/spec.md`（Cycle-6；Cycle-5 已归档 `spec-cycle5.md`）
- 账本：`.scratch/architecture-recovery/decision-ledger.md` + `.scratch/cycle6-grill/decision-ledger.md`
- 票与报告：`issues/01-12-<slug>.md` / `research/window-reports/01-12-<slug>-report.md` / `handoffs/` / `prompts/`（含返工版 `02-settings-surface-fix.md`、`06-form-corpus-fix.md`）
- 复核报告：`research/cycle6-wave{1,2,3,3-r1,4,5}-review.md` · `research/cycle6-r2-review.md`
- 验收面单一来源（测试侧）：`tests/ACCEPTANCE-SURFACE.md`（17 项 + 1 诊断项 · L0–L4 · 持久化 · 跨隔离上下文 #14）
- 新 ADR：`docs/adr/0010-release-gate.md`（发布门；**不改写 ADR-0008 第二层**）
- 词表：`CONTEXT.md`（28 → **35** 条，含 7 条新术语）
- 形态语料：`tests/corpus/forms/`（镜像 9 + 骨架 8 + `manifest.json` 指纹 + 仓外 archive）
- 交互原语：`tests/helpers/primitives.mjs`（密封与 live 两 harness 同源）
- 发布门实现：`.github/workflows/release.yml`（`release-gate` job + `needs`）· `tests/scripts/release-gate.mjs`
- 真实站点层：`.github/workflows/real-site-smoke.yml`（schedule + workflow_dispatch，**无 `pull_request`**）

## 5. 未闭合项与 frontier（下会话第一动作）

### 5.1 唯一在途实施票

**票 12（A-036）**：启动器 `prompts/12-rules-limit-fidelity.md`。内容 = 裁定 `RULES_MAX_OVERRIDES` 强制点（写路径 vs 读路径）+ 补齐 `tests/scripts/verify-ticket-05.mjs` 的 BC 替身克隆保真度（现为**假绿**：缺 `origin` + 缺结构化克隆）。完成后 A-036 才能转 implemented。

### 5.2 land 与发布（需用户逐次授权）

- 当前 `origin/main` **未含 Cycle-6 任何提交**；land 会触发 `release.yml` ⇒ **不可逆、须用户明确授权**（WORKFLOW §8.2.4）。
- 栈拓扑：`cch/47 → 48 → 02 → 03 → 01 → 05 → 06 → 07`（线性），`04` 独立未推送，`08 / 10 / 11` 在另一段。**land 前必须处理 §5.3 的重挂问题。**

### 5.3 已知红与归因（§8.1.3 留痕）

- **`cch/08` tip `747763fd` 的 E2E = failure**（run 35127030916，唯一失败用例 `tests/srcdoc-origin.spec.ts:64`，L3 未写入）。**归因②（非票 08 自身改动）**：该密封用例属票 10，而票 08 快照里是**修复前版本**（读侧竞态）；票 10 已在自身分支修复并转绿（`08d40362` / `4caa6fbc`；tip `6a95417b` E2E run 35155127289 success）。
- **land 前置动作**：把 `cch/08` 重挂到 `cch/10` 终态之上（或按栈序确保 10 的修复先于 08），否则该红随快照进入 main。

### 5.4 过程违规（未追认，须裁决）

| 编号 | 内容 | 处置建议 |
|------|------|----------|
| P-2 | 票 01–06 早期无 CI 证据（远端零 `cch/*` 时期） | 已由后续推送补齐（§2 表）；历史窗口不再追 |
| P-4 | **票 04 issue 5 项未勾销**，且无提交触碰过该 issue | 实现经实物复核属实（ADR-0010 + 7 术语）；**收口票未代勾**（跨票工件纪律）；建议由大脑在 land 时一并勾销 |
| P-13 / P-20 | **本地 tip ≠ 远端 tip**（如 `cch/08` 本地 `fc2e3e67` vs 远端 `747763fd`；`cch/11` 本地 `842d75e7` vs 远端 `8a27ad34`） | 跨支终态一律以 CI 为准；推送前须重新对齐 |
| P-17 | 票 07 窗口**强推**改写 8 支已发布远端 ref（5 支旧 sha 非新 tip 祖先） | 已由票 07 报告「附：首脑补正」更正表述；是否追认待用户 |
| P-19 | 票 11 §8「本票不产生远端写」与实物不符 | 已追加「附：首脑补正」 |

### 5.5 收口票自身偏离点

见 `research/window-reports/09-cycle6-closeout-report.md` §偏离点（任务书 delta 写 A-026…A-033，实物账本已扩到 A-036；报告路径按本仓约定）。

## 6. Backlog（待用户决定是否立票）

| # | 项 | 来源 | 建议 |
|---|----|------|------|
| C6-1 | **A-036 未结算**（规则上限强制点 + BC 替身保真度） | 票 10 §6.1/§6.2 | 票 12 已立，直接开工 |
| C6-2 | **票 04 issue 未勾销**（P-4） | W1 复核 | land 时由大脑补勾 |
| C6-3 | **cch/08 需重挂到 cch/10 终态之上**（否则 E2E 红随快照入 main） | 本收口核验 | land 前必办 |
| C6-4 | 票 01/02/03/05/06 早期「无 CI 证据」报告表述残留 | 本收口核验 | 文档卫生（一行级），可随 land 一并补正 |
| C6-5 | 本地/远端 tip 漂移（P-13/P-20） | 多轮复核 | 推送前统一 `but pull` 对齐 |
| C6-6 | 真实站点层 `observe` 挂账条目随周期增长 | 票 07 | 按 ADR-0010 保持「非空 reason + ticket」强制 |
| C6-7 | `verify-30.yml` 的 typecheck 作业仍为私有复刻 | Cycle-5 C5-10 | 门禁碎片收口候选 |

## 7. 环境备忘

- 远端：`git@github-Xxx91n:Xxx91n/Find-Your-Country-Code.git`；发布链：push main → build → 自动 tag/Release（`release.yml`，含发布门）。
- 版本真源唯一：`package.json`（`vite.config.ts` 从它读取注入 `@version`）；bump 只改一处。**Cycle-6 未 bump 版本**（当前仍 1.6.0）。
- 证据铁律：行为面只认 CI run/artifact（§8.1）；本地只读复核限 §8.2 闭集；远端写须逐次授权（§8.2.4）。
- 归档位置在仓库外：`D:/Aworker/mozilla/choose-your-country-evidence-archive/`（**勿删**）。
- **本工作区 shell 禁忌**（WORKFLOW §5 已登记）：重定向统一用 `>/dev/null`，**禁用 `>nul`** —— 仓库根出现 0 字节 `nul` 会让 `but status` / `but diff` 一律报 `os error 1`，并阻断所有并行窗口提交。
- 工具文件写入陷阱（§5 已登记）：写 JS/TS 工具文件时中文与换行用真实字符，只有正则反斜杠才转义；写完自检 `\uXXXX` 字面计数 == 0 + `node --check` + 跑一次文本型结构门。

## 8. Suggested skills（下会话）

- `$but` — 全部版本控制（land / push / branch 操作）
- `$handoff` — 下一轮收口复用
- `$atomcode-research` — 新设计问题调研（**串行护栏：同工作区任意时刻至多 1 个在途**）
- `$to-spec` / `$to-tickets` / `$implement` — backlog 立票流程
- `$improve-codebase-architecture` — 下一轮架构调查

## 9. 本归档 handoff 的自证（fresh context 可恢复性）

fresh context 仅凭本文件应能回答：① 本轮交付了什么（§2）；② 哪些还没完（§5.1 票 12）；③ 下一步动作与授权边界（§5.2 land）；④ 有哪些已知红与违规（§5.3 / §5.4）；⑤ 权威文件在哪（§4）。
所有引用路径均为相对仓库根 `D:/Aworker/mozilla/choose-your-country`；本文件不含任何密钥/凭据。
