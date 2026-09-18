# next-round.md — Cycle-9 常驻任务书

> **用途**：任意子 Agent 可独立依赖的常驻任务书。**不复制其他工件的正文**，只给「去哪找 ＋ 做什么 ＋ 覆盖哪些 D ＋ 完成判据」。
> **唯一数据源**：`.scratch/cycle9-grill/decision-ledger.md`（D-001…D-005，**5/5 current**）。**本文件不引入账本以外的结论。**
> 分支：`cch/18-cycle9-grill`（GitButler）｜基线：`origin/main` = `752c4bb2`（v1.7.0，**待收割 v1.8.0**）
> 生成：2026-09-18

---

## 0. 开工前必读（按序）

1. `.scratch/cycle9-grill/decision-ledger.md` —— **5 条 current 决策，唯一权威**（含「带日期更正注记」：D-002 的变更集 4→5 条）
2. `.scratch/cycle9-grill/spec.md` —— S-01…S-08 · T-01…T-09 · D→去向对账 · Out of Scope
3. `.scratch/evidence/findings-register.md` —— FR/FC/FN 全量（本轮需回写）
4. `.scratch/cycle8-grill/handoffs/2026-09-18-audit-closeout-handoff.md` —— 环境禁忌与既有纪律（§6 硬边界）
5. `CONTEXT.md` · `docs/adr/` —— 领域语言与既有决策（本轮拟改：`0007`/`0008`/`0010`/`0011` 补状态行）
6. `.scratch/README.md` —— 受管区边界图

## 1. 硬边界（每票适用）

- 版本控制**唯一入口 `but`**；禁裸 `git` 写操作。
- **A-010 / WORKFLOW §4.2 的 force-push 例外已用尽**，不得据为先例。
- **授权为一次性、仅限本轮**（D-004①）；**ack 不得由 Agent 代签**（D-004②）。
- **GF 送达不得声称已闭合**（Sync ≤ 1 次/天）；**补跑 sha ≠ 发版 sha**（D-004③④）。
- **不得为凑硬验收绿而降低任何门禁/断言**（D-004⑥）。
- **删除备份 ref 前必须先写追溯面**（D-004⑦）。
- 语料先行；禁物理删除语料条目；性能红线（1000 节点 scan < 350ms）不回退；不得引入远程网络面与 ML。
- `.scratch/` 是**受管工件区**（ADR-0013）：清理只允许触 `draft/`；决策账本不得置于任何被忽略目录。
- 4 个反向断言门（`verify-ticket-07` G4v · `10` G7e · `11` G7 · `12` G7e）不得移除或削弱；`.github/workflows/*.yml` 禁止出现 `.scratch/` 路径引用。

## 2. 任务表（每项声明覆盖的 D-xxx）

| T | 任务 | 覆盖 D | 波次 | 前置 | 完成判据 |
|---|---|---|---|---|---|
| **T-01** | 补跑 `real-site-smoke`（`workflow_dispatch` on `main`） | **D-002③** · **D-004①** | W1 | — | 取得 run ID + 结论并**原样登记（含红）** |
| **T-02** | *（条件）* 补跑红 → 拟写 ack → **停下呈报** → 用户确认 → 写入 | **D-002③** · **D-004②** | W1 | T-01 | ack 四要素齐备（reason ≥20 / ticket 可解析 / runId 一致 / acknowledgedBy 具名）；**不得代签** |
| **T-03** | bump `package.json` → 1.8.0 ＋ `package-lock.json` 对齐 ＋ Glog 双语新节 | **D-002①②④** · **D-003⑥** · **D-005①** | W2 | T-01（绿或 ack） | 版本真源唯一；Glog 中英逐条对应（5 条）；lockfile 根 version = 1.8.0 |
| **T-04** | 提交 → `push` → `land` → 验 gate + Release | **D-004①③④** | W2 | T-03 | `release-gate` = green（或具名 ack）；tag `v1.8.0` + Release + `.user.js` 附件 |
| **T-05** | 写 register 追溯面 → 删 `refs/backup/main-pre-rewrite` | **D-003⑤** · **D-004⑦** | W3 | T-04 | 追溯面（3 旧 sha `e63e8253`/`337461e8`/`b1fcf96d` + 「旧 tip tree == 当前 main tree」）已入 register；ref 已删；**不得声称旧 sha 仍可恢复** |
| **T-06** | C 侧清账：register 回写 ＋ ADR 状态行 ＋ `CONTRIBUTING.md` 同步 | **D-003①③④** | W3 | T-05 | FR-04/05/06/15 转 closed（FC-10…FC-13）；9 条签核逐条列明；ADR 16 篇全有状态行；CONTRIBUTING 指向 ADR-0014/0016 |
| **T-07** | 清账 `push` ＋ `land` | **D-004①** | W3 | T-06 | 清账落地 `main`；**不触发 release**（paths 不含 `package.json`） |
| **T-08** | 收口：重跑硬验收 ＋ 账本结算 ＋ 实施报告 ＋ 再生 handoff | **D-004④⑤** · **D-005②** | W4 | T-07 | 硬验收全绿；无去向记录 = 0；报告显式标注时点 |
| **T-09** | 下一轮 frontier（FR-11 站点级语料 / B 侧能力面） | **（未拍板）** | — | **先经用户拍板** | 账本中**无对应 D-xxx**；**不得抢跑** |

**框架性／已完成决策（不计入任务表）**：**D-001**（目标函数 = A+C）＝本文件整体 ＋ spec「Solution」＋ Out of Scope。

## 3. 波次与并行纪律（D-002⑤ · D-004③）

- **W1**：T-01（→ 条件 T-02）。**必须最先** —— 发布门依据须覆盖当前 `main`。
- **W2**：T-03 → T-04。**不得与 W3 混同一次 landing**（D-002⑦：发版不得夹带 C 侧清账）。
- **W3**：T-05 → T-06 → T-07。
- **W4**：T-08。
- **硬约束**：T-02 仅在补跑红时发生且**必须停下呈报**；**T-03 的 land 是唯一触发 release 的动作**；T-07 的 land **不得**含 `package.json` 变更；T-05 必须先写追溯面再删 ref。

## 4. 不立票项与残留

**显式范围外（不立票）**：
- 站点级语料建设（FR-11）—— D-001① 排除本轮。
- B 侧能力扩张 —— D-001② 排除本轮。
- 新增 ADR / 新增 CONTEXT.md 术语 —— 域建模判断（spec Out of Scope 有理由）。
- 「发版前补跑」惯例化 —— 观察项，若成惯例再评估（属新增范围）。

**残留（需用户裁定或后续轮次）**：
- **T-09 未拍板**（下一轮方向）—— 账本中无对应 D-xxx。
- **输入缺口**：`test-results/锐.txt` **不可恢复**（第二次连续缺失）。
- **FR-01…FR-03 · FR-09…FR-14（10 条 open）** 到期 **2027-03-31**，**绝不自动续期**。
- **GF 同步状态**：发版后须**待验（≤ 1 天）**，不得声称已送达 v1.8.0。

## 5. suggested skills（下一轮开工按序加载）

- **`Skill: gitbutler`** —— 版本控制唯一入口；`land`/`push`/`pull`/冲突解收语义必读。
- **`Skill: grill/engineering/domain-modeling`** —— ADR / `CONTEXT.md` 维护（T-06 补状态行必用；**只加不改**）。
- **`Skill: grill/engineering/code-review`** —— 交付前双轴评审；**子代理必须按 `HEAD` 读文件**。
- **`Skill: grill/engineering/diagnosing-bugs`** —— 补跑红时的归因（先建红色反馈环再猜因）。
- **`Skill: grill/productivity/handoff`** —— 下轮收口时再生成本文件（**本仓例外：写受管区**）。
- **`Skill: khazix/neat-freak`** —— 收尾时先做**事实面对账**。
- **`Skill: atomcode-research`** —— 深度调研护栏（同一时刻至多 1 个在途，**禁杀进程**）。
