# 0014 — CI 证据闭环口径与 landing 模型的有意识偏离

状态：accepted | 日期：2026-09-18 | 来源：Cycle-8 grill T-09 Q3（**D-008 采纳**）；行业对标：`.scratch/cycle8-grill/research/q3-ci-evidence-loop.md`（9 条来源）

## 背景

Cycle-7 收口后首次取得 CI run（`337461e8`），但「何时 push、哪些分支先落地、run ID 作为闭环证据的口径」一直未定（`audit-closeout.md` §5 Q3）。Cycle-8 T-09 将 Q3 提交行业对标调研，用户于 2026-09-18 拍板**采纳**。

本仓现状：所有工作停在 `cch/**` 分支上、**未 push**（硬边界：未获授权不得 `land`／`push`）；门的触发面为 `pull_request` + `workflow_dispatch` + `push: branches: [main, cch/**]`（ADR-0006 决策 1 修订注记 / D-006 B⑨ 登记）。

## 决策

1. **口径分界：`push ≠ 落地`。** **落地事件只有一个 = required checks 绿后的合入**；**分支上的 run 只证明候选，不作闭环证据**。
2. **权威验收锚点 = 目标分支（`main`）上的成功 run**。闭环证据链一句话：`PR #N 承载 + required checks 在合入前全绿 + 落地为 main commit <sha> + 发版 v<x.y.z> 的 Release run <id>`。
3. **run ID 入账**：每次闭环在账本/报告登记 **run ID + 被验 sha**，**不登记「本地跑过」**。
4. **main 分支保护（GitHub 后台配置项）**：禁 force-push / 禁删除；`Require status checks to pass before merging`（**job 名全仓唯一**）；`Require branches to be up to date`。**不开 `Require approvals`**（单人仓库会造成自审自批形式主义或 admin 死锁）。
5. **合入方式**：只开 **squash merge**；Conventional Commits 标题进 `main`。
6. **不引入 merge queue**（它是 10+ 人并行合并的工具，单人无收益）。
7. **landing 模型：有意识偏离（documented deviation）。** 本仓版本控制**唯一入口是 GitButler（`but`）**，其 `land` 语义为**逐提交落地**，**无法产出**「一个 PR 恰成一个 main commit」的 squash 语义。因此**接受**「revert 单元 = 发版单元 = 证据单元」三者在 GitButler 模型下**不完全重合**，改用两条替代保证：① **一个逻辑单元一个提交**（提交信息自带验收口径）；② **每个发版点打 tag**（tag 是可回溯的发版/证据锚点）。

## 依据（全部 observed，见取证报告）

1. 分支模型：单人 = trunk-based + 短命分支（gitflow.dev 决策矩阵 Solo 行全 TBD；DORA 分支寿命 < 1 天）。
2. 触发三件套（`pull_request` + 票分支 `push` + `workflow_dispatch`）与 ADR-0006 决策 2 形态一致，属业界标准。
3. `Require status checks` 的 job 名唯一性与 up-to-date 机制（GitHub 官方文档）。
4. 单人 self-merge 的合法性前提 = checks 全绿 + 证据已复核（solo-maintainer 治理范本 #426 原文："Permit maintainer self-merge only after required checks are green and diff/acceptance evidence has been reviewed"）。
5. squash merge 是行业标准，其价值是「revert 单元 = 发版单元 = 证据单元」（humanwhocodes / dev.to 实证）。
6. 「每个变更保持可发布」与「何时真的发布」是**能力与决策的分离**（Fowler Release-Ready Mainline）。

## 反证条件（满足任一即重开本 ADR 相应条款）

1. 若 GitButler 支持 squash-on-land 或等价能力 → 重评决策 7（偏离可撤销）。
2. 若 `main` 上的 run 无法回溯到具体 PR / 验收面（例如 `main` 被直接 push）→ 重评决策 2。
3. 若分支 run 被实际用作合入前置（例如分支保护要求分支 run）→ 重评决策 1。
4. 若出现需要并行合并互踩的场景（多人/多代理同时合入）→ 重评决策 6（引入 merge queue）。

## 后果

- **本轮仍无 CI run**：未获 push/land 授权前，门禁证据只可能是**本地同口径复跑**；**不得**把本地输出称作「CI 闭环」（与 ADR-0006 后果 1、D-001⑤ 一致）。
- 授权 push 后：**分支 run = 增量确认**；合入后 **main run = 闭环证据**（登记 run ID）。
- main 分支保护为 **GitHub 后台人工配置项**（仓库内无法表达）⇒ 登记为待办（见 `.scratch/evidence/findings-register.md`）。
- 「revert 单元 ≠ 发版单元」的残差由「一逻辑单元一提交 + 每发版点打 tag」兜住。

## 参考

- 行业对标：`.scratch/cycle8-grill/research/q3-ci-evidence-loop.md`
- 上游：`docs/adr/0006-ci-hygiene-policy.md`（决策 2 与 monitor 例外）· `docs/adr/0010-release-gate.md`
- 账本：`.scratch/cycle8-grill/decision-ledger.md` D-008 · D-006 B⑨ · D-001⑤

---

## 带日期注记 — 反证条件 2 已触发并重评；决策 4 已执行（2026-09-18）

> 本节为**追加**；上方「背景」「决策」「反证条件」「后果」原文**保留不改**。

### 一、触发事实

2026-09-18 用户授权窗口内共执行 **3 次 `but land`**：

| 分支 | 落地 sha |
|---|---|
| `cch/17-cycle8-audit --whole-stack`（29 提交） | `a011e47c` |
| `cch/17-cycle8-statuscell` | `7aa75b29` |
| `cch/17-cycle8-closeout` | `71d2ac85` |

`but land` 的实现即**直接推送 `origin/main`**、**不产生 PR**（工具自述："lands … directly onto origin/main without a pull request"）。

⇒ **反证条件 2 成立**：「`main` 上的 run 无法回溯到具体 **PR**」（`main` 被直接 push）。

### 二、重评范围与结论

**范围**：仅 **决策 2** 证据链中的「`PR #N` 承载」要素。

**结论（用户 2026-09-18 拍板：加注记、决策 2 维持）**：**维持决策 2**，并将「PR 层缺失」记为**有意偏离（documented deviation）**。理由：

1. **本仓版本控制唯一入口 = GitButler（`but`）**，其 `land` 语义**无 PR 面**；改用 PR 即需改用裸 `git` / forge，违反硬边界。
2. **验收面可回溯性并未丧失**：每次落地的 sha 与**分支上 required checks 已全绿的同一 sha** 一致（`a011e47c` / `7aa75b29` / `71d2ac85`）⇒ 决策 1「落地事件 = required checks 绿后的合入」与决策 2 的**实质目的（run 可回溯到验收面）成立**；缺的仅是 **PR 这一载体形式**。
3. 残差由**替代保证**兜住：① 一逻辑单元一提交；② 每个发版点打 tag（决策 7）。

**登记**：`.scratch/evidence/findings-register.md` **FR-15**（开放，到期 2027-03-31）。

**本注记不改变**决策 1 / 3 / 5 / 6 / 7；账本 **D-008 保持 `current`** —— 本仓 `revised` 语义 = current 决策**被后续裁定推翻**；本次为「**维持 + 记录偏离**」，不构成推翻。

### 三、附：决策 4 已执行（同日）

main 分支保护已按决策 4 配置，回读证据 `protected = true`：

| 项 | 值 |
|---|---|
| `allow_force_pushes` | `false`（禁 force-push） |
| `allow_deletions` | `false`（禁删除） |
| `required_status_checks.strict` | `true`（Require branches to be up to date） |
| required contexts | **25 个** = 21 个票级门 + `typecheck` + `Regen lockfile from pinned package.json` + `e2e` + `Engine gate (36) + harness (25)` |
| `Require approvals` | **不开**（`required_pull_request_reviews: null`） |
| `enforce_admins` | `false`（ADR 未规定；避免管理员死锁） |

**`baseline`（Calibration Baseline）有意排除** —— 该 workflow 仅 `push: branches: [main]` 触发；若列为 required context，会形成「落地需该 check 通过、而该 check 只在落地之后才跑」的循环，**永久阻断落地**。

**残留风险（已登记）**：required context 以 **job 名** 为键；若未来某个票级门被重命名/删除，对应 context 将**永不上报** ⇒ 可能阻断落地。缓解：删去该 context，或 `DELETE /repos/{owner}/{repo}/branches/main/protection` 即时回滚。
