# Cycle-9 Spec — 发版收割（A）＋ 收口债清账（C）

> **数据源**：`.scratch/cycle9-grill/decision-ledger.md`（D-001…D-005，**5/5 current**）。**本 spec 不引入账本以外的任何结论。**
> 生成：2026-09-18｜分支：`cch/18-cycle9-grill`｜基线：`origin/main` = `752c4bb2`（v1.7.0，**未发版**）
> 上游输入：`.scratch/cycle8-grill/handoffs/2026-09-18-audit-closeout-handoff.md`（§0–§12.9）· `.scratch/evidence/findings-register.md` · `docs/adr/0001…0016`
> **输入缺口登记**：用户指定的 `test-results/锐.txt` **已不存在**（第二次连续）；广域搜索命中的同名文件经 `git remote` 验证**均属其它项目**。本轮未做锐评核验。

---

## Problem Statement

Cycle-8 把「采纳」推到「纸面闭环」（ADR + 机器门 + 零依赖脚本），但**成果从未送达用户**：
- `package.json` 仍 **1.7.0**；自 `v1.7.0` 以来已积压 **66 提交 / 8481 diff 行** —— **ADR-0016 判据 7 已触发**（`commits > 30` 或 `diff > 2000` ⇒ 立即收割）。
- findings register 自身已漂移：**4 条实质闭环但未回写**（FR-04 / FR-05 / FR-06 / FR-15）。
- 另有形式债与文档漂移：**ADR `0007`/`0008`/`0010`/`0011` 缺 MADR 状态行**；`CONTRIBUTING.md` 未反映 ADR-0014/0016；`package-lock.json` 根 version 停在 `1.5.0`（vs `package.json` 1.7.0）。

## Solution

本轮**同时**推进两条线（D-001）：
- **A｜发版收割**：按 ADR-0016 判据 7 收割 **v1.8.0**；**先补跑 fresh `real-site-smoke`** 使发布门依据覆盖当前 `main`。
- **C｜收口债清账**：findings register 回写 ＋ 9 条待签核 ＋ ADR 形式债 ＋ `CONTRIBUTING.md` 同步 ＋ 备份 ref 删除 ＋ lockfile 对齐。
- **排除**：站点级语料建设（FR-11）与 B 侧能力扩张（D-001①②）。

## 交付口径

- **版本号 = `v1.8.0`**（MINOR）：自 v1.7.0 的 66 提交 **breaking = 0** ＋ 有新增能力（D-002①）。
- **收割范围 = 自 `v1.7.0` 全部 66 提交，一次收割**（D-002②）。
- **时序 = A 先、C 随后（同一轮内）**（D-002⑤）。
- **诚实边界**：GF 送达**不得声称已闭合**（Sync ≤ 1 次/天）；补跑 sha（`752c4bb2`）**≠ 发版 sha**，不得声称「补跑验证了被发版的代码」（D-004③④）。

## Implementation Decisions（S-xx）

| S | 条目 | 覆盖 D | 一句话 |
|---|---|---|---|
| **S-01** | 发版收割口径 | D-002 | v1.8.0 · 66 提交一次收割 · 先补跑 real-site-smoke（红则 ADR-0010 ack）· Glog 双语 · A 先 C 后 |
| **S-02** | register 回写与签核 | D-003①② | FR-04/05/06/15 转 closed（记 FC-10…FC-13）；9 条待签核由用户一次性签核并逐条列明 |
| **S-03** | ADR 形式债与文档同步 | D-003③④ | `0007`/`0008`/`0010`/`0011` 补 MADR 状态行（只加不改）；`CONTRIBUTING.md` 指向 ADR-0014/0016 |
| **S-04** | 备份 ref 追溯面与删除 | D-003⑤ | 先写 3 个旧 sha + tree 等价事实入 register，再删 `refs/backup/main-pre-rewrite` |
| **S-05** | lockfile 版本对齐 | D-003⑥ | `package-lock.json` 根 version 随 bump 对齐（属发版必需的机械同步） |
| **S-06** | Glog 双语文案 | D-005① | 5 条用户可见变更，中英逐条对应 |
| **S-07** | 执行授权与验收面 | D-004 | 一次性全授权 6 项；ack 条件触发 + 当场确认；硬验收；诚实边界 |
| **S-08** | 收口形态 | D-005② | 账本结算 + 再生 handoff + 实施报告（报告须标注时点） |

## 计划表

| T | 任务 | 覆盖 D | 波次 | 完成判据（账本口径） |
|---|---|---|---|---|
| **T-01** | 补跑 `real-site-smoke`（`workflow_dispatch` on `main`） | D-002③ · D-004① | W1 | 取得 run ID + 结论并**原样登记（含红）** |
| **T-02** | *（条件）* 补跑红 → 拟写 ack 文本 → **停下呈报** → 你确认 → 写入 | D-002③ · D-004② | W1 | ack 四要素齐备（reason ≥20 / ticket 可解析 / runId 一致 / acknowledgedBy 具名） |
| **T-03** | bump `package.json` 1.7.0→1.8.0 ＋ lockfile 对齐 ＋ Glog 双语新节 | D-002①②④ · D-003⑥ · D-005① | W2 | 版本真源唯一；Glog 中英逐条对应（5 条）；lockfile 根 version = 1.8.0 |
| **T-04** | 提交 → `push` → `land` → 验 `release-gate` + Release `v1.8.0` + `.user.js` 附件 | D-004①③④ | W2 | gate=green（或具名 ack）；tag `v1.8.0` + Release + 附件 |
| **T-05** | 写 register 追溯面 → 删 `refs/backup/main-pre-rewrite` | D-003⑤ · D-004⑦ | W3 | 追溯面（3 旧 sha + tree 等价）已入 register；ref 已删；**不得声称旧 sha 仍可恢复** |
| **T-06** | C 侧清账：register 回写 ＋ ADR 状态行 ＋ `CONTRIBUTING.md` 同步 | D-003①③④ | W3 | register 15 条全有终态且全部具名签核；ADR 16 篇全有状态行；CONTRIBUTING 指向 ADR-0014/0016 |
| **T-07** | 清账 `push` ＋ `land` | D-004① | W3 | 清账落地 `main`；**不触发 release**（paths 不含 `package.json`） |
| **T-08** | 收口：重跑硬验收 ＋ 账本结算 ＋ 实施报告 ＋ 再生 handoff | D-004④⑤ · D-005② | W4 | 硬验收全绿；无去向记录 = 0；报告显式标注时点 |
| **T-09** | 下一轮 frontier（FR-11 站点级语料 / B 侧能力面） | **（未拍板）** | — | **本项未拍板**（D-001 已排除本轮）；账本中**无对应 D-xxx** |

## Out of Scope

| 项 | 理由 | 账本依据 |
|---|---|---|
| 站点级语料建设（FR-11，~3838 站点 + ~500 pilot） | 体量大、依赖外部数据源与标注责任、库外归档载体未选 | D-001① |
| B 侧检测/功能面新能力扩张 | 本轮聚焦收割与清账 | D-001② |
| 再次重写历史 | A-010 / WORKFLOW §4.2 的 force-push 例外**已用尽**（仅修 `e63e8253` 提交信息） | D-002 负向 · D-004① |
| 发版夹带 C 侧清账内容 | 发版只带版本 bump 必需的机械同步（lockfile 对齐） | D-002⑦ |
| **新增 ADR** | 本轮 5 条决策均为一次性执行动作或既有 ADR 的实例；**「难逆转 / 无上下文则费解 / 真实取舍」三条不同时成立**（domain-modeling「Offer ADRs sparingly」） | 域建模判断（本 spec 显式声明） |
| **新增 CONTEXT.md 术语** | 账本无一条授权新增术语；`findings register` 已由 **ADR-0013 决策 6** 定义（属 ADR 层）；「发版收割」「补跑」「追溯面」均为 ADR-0016/ADR-0010 的实例或一次性动作 | 域建模判断（本 spec 显式声明） |

## 对账（D-xxx → 去向）

| D | 去向 |
|---|---|
| D-001 | Spec「Solution」＋ Out of Scope（排除 B/D） |
| D-002 | **S-01** ＋ 计划表 **T-01**（W1）· **T-02**（W1）· **T-03**（W2）· **T-04**（W2） |
| D-003 | **S-02/S-03/S-04/S-05** ＋ 计划表 **T-03**（⑥）· **T-05**（⑤）· **T-06**（①②③④） |
| D-004 | **S-07** ＋ 计划表 **T-01**（①）· **T-02**（②）· **T-04**（①③④）· **T-05**（⑦）· **T-07**（①）· **T-08**（④⑤） |
| D-005 | **S-06/S-08** ＋ 计划表 **T-03**（①）· **T-08**（②） |

**无去向记录清单：空**（5/5 均有去向）。

## Further Notes

- **本轮是首次发版**（自 Cycle-7 D-018 起连续两轮「累积再发」）。发版后 `package.json` = 1.8.0，最新 Release = v1.8.0。
- **域建模结论（显式声明，非静默跳过）**：本轮**不新增 ADR、不新增 CONTEXT.md 术语**（理由见 Out of Scope）。
- **观察项（登记，不立票）**：「发版前补跑 fresh real-site-smoke」本轮为**一次性选择**（D-002③ 取 (b)）；若后续形成**惯例**，届时再评估是否写入 ADR-0010（属新增范围，本轮不做）。
- **时点证据（须在 W4 报告中固定）**：补跑 run ID / 发版 sha / Release 链接 / GF 同步状态。
- **`package-lock.json` 根 version 漂移**为本轮**新发现**（v1.7.0 时已存在，A-020 曾登记「未随 1.5.0 同步」）。
