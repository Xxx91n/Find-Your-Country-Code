# 2026-09-18-cycle9-closeout-handoff.md —— Cycle-9 收口交接（交给下一窗口）

> 用途：下一窗口的**唯一入口**。**不复制其他工件正文**，只给「去哪找 ＋ 现状 ＋ 下一步」。
> 生成：2026-09-18｜基线：`origin/main` = `752c4bb2` → 终态 `28dda083`
> 上游：`.scratch/cycle9-grill/decision-ledger.md`（D-001…D-005 全 current）· `.scratch/cycle9-grill/spec.md` · `.scratch/cycle9-grill/reports/2026-09-18-report.md`（本轮逐任务证据）· `.scratch/evidence/findings-register.md`（§十 为本轮新增）

## 0. 一句话现状

**Cycle-9 已完整收口**：A（发版收割）＋ C（收口债清账）两条线均落地，硬验收本地与 CI 全绿，`v1.8.0` 已发布。**下一轮方向（T-09）未拍板，不得抢跑。**

## 1. 必读（按序，不要重复调研）

1. `.scratch/cycle9-grill/reports/2026-09-18-report.md` —— 本轮逐任务证据（命令 ＋ 输出摘要）与硬验收总表
2. `.scratch/cycle9-grill/decision-ledger.md` —— D-001…D-005（唯一权威）
3. `.scratch/evidence/findings-register.md` —— **§十 为本轮新增**；§二 原文保留未改，终态看 §10.2
4. `.scratch/README.md` —— 受管区边界图
5. `CONTEXT.md` · `docs/adr/` —— 领域语言与决策（本轮已规范化 `0007`/`0008`/`0010`/`0011` 状态行）

## 2. 本轮结果（已完成，不需重做）

| 面 | 结果 |
|---|---|
| A · 发版 | `v1.8.0`（tag → `8032490e`）＋ Release ＋ `.user.js` 附件（171,172 B） |
| A · 发布门 | **绿**（run `35354287491` = T-01 补跑）；**未使用 ack**（`acknowledged` 仍为 `false`） |
| C · register | FR-04/05/06/15 转 closed（FC-10…FC-13）＋ FR-03/FR-13 转 closed（FC-14/FC-15）；9 条签核逐条列明 |
| C · ADR | 16 篇全有状态行（`0007`/`0008`/`0010`/`0011` 已规范化） |
| C · CONTRIBUTING | 新增「发版节奏」→ ADR-0016；「发布链路」→ ADR-0014 |
| C · 备份 ref | `refs/backup/main-pre-rewrite` **已删**；追溯面 = register **§10.1** |

## 3. 时点快照（**不得当作可复跑期望值** · FR-12 教训）

- 补跑 run ID：**`35354287491`**（headSha `752c4bb2`）
- 发版 sha：**`8032490e`**（≠ 补跑 sha）
- 清账后 main：**`28dda083`**
- Release：`https://github.com/Xxx91n/Find-Your-Country-Code/releases/tag/v1.8.0`
- **GF 同步状态：待验（≤ 1 天）** —— GreasyFork 为拉取式镜像，**不得声称已送达 v1.8.0**

## 4. 残留与开放项

- **T-09 下一轮方向未拍板**（FR-11 站点级语料 / B 侧能力面）—— 账本**无对应 D-xxx**，**先经用户拍板**。
- **FR-01 · FR-02 · FR-09 · FR-10 · FR-11 · FR-12 · FR-14（7 条 open，均已具名签核）** 到期 **2027-03-31**，**绝不自动续期**。
- **`test-results/锐.txt` 不可恢复**（第二次连续缺失）—— 不得凭记忆补写锐评。
- **GF 同步待验**（见 §3）。
- **`greasyfork/GREADME*.md` 内「观测于 2026-09-17 / 1.7.0」段落已陈旧**，本窗口**未改写**（改写需重新观测）—— 观察项。
- **FC-09 未入 register §三 索引**（登记在 §九，Cycle-8 遗留）—— 观察项。

## 5. 下一步（顺序不可颠倒）

1. **等用户拍板 T-09 方向**（不得代替用户立票）。
2. 拍板后：按 `grill` 流程落账本（D-006 起）→ spec → 任务书。
3. 若仅需验证 GF 送达：次日跑 `node tests/scripts/38-gf-alignment-check.mjs`（只读、advisory）。

## 6. 硬边界（每票适用，无变更）

- 版本控制**唯一入口 `but`**；禁裸 `git` 写操作（例外仅限本轮已用的 `git update-ref -d` 删 ref，已登记）。
- **A-010 / WORKFLOW §4.2 的 force-push 例外已用尽**，不得据为先例。
- **授权为一次性、仅限本轮**；后续 push/land/发版**需重新授权**。
- **ack 不得由 Agent 代签**（ADR-0010 条款 2）。
- **GF 送达不得声称已闭合**（Sync ≤ 1 次/天）。
- **不得为凑硬验收绿而降低任何门禁/断言**。
- 语料先行；**禁物理删除语料条目**；性能红线（1000 节点 scan < 350ms）不回退；**不得引入远程网络面与 ML**。
- `.scratch/` 是**受管工件区**（ADR-0013）：清理只允许触 `draft/`；账本不得置于任何被忽略目录。
- 4 个反向断言门（`verify-ticket-07` G4v · `10` G7e · `11` G7 · `12` G7e）不得移除或削弱；`.github/workflows/*.yml` 禁止出现 `.scratch/` 路径引用。

## 7. suggested skills（下一窗口按序加载）

- **`Skill: gitbutler`** —— 版本控制唯一入口；`land`/`push`/`pull`/冲突解收语义必读。
- **`Skill: grill/engineering/domain-modeling`** —— ADR / `CONTEXT.md` 维护（只加不改）。
- **`Skill: grill/engineering/code-review`** —— 交付前双轴评审；子代理必须按 `HEAD` 读文件。
- **`Skill: grill/engineering/diagnosing-bugs`** —— 出现红门时的归因（先建红色反馈环再猜因）。
- **`Skill: grill/productivity/handoff`** —— 下轮收口时再生交接。
- **`Skill: atomcode-research`** —— 深度调研护栏（同一时刻至多 1 个在途，**禁杀进程**）。

## 8. 本窗口实测踩过的坑（下窗口必读）

- **坑 A** —— 报告内引用的 run ID / sha / Release 链接均为**时点快照**，不得当作 CI 断言期望值（同 FR-12）。
- **坑 B** —— `git update-ref -d` 是删 ref 的**唯一路径**（`but` 无等价命令）；**已用尽且已登记**，不得据为先例。
- **坑 C** —— 任务书 T-05 措辞「旧 tip tree == 当前 main tree」仅在**重写时点**成立；当前 main 已前进，**不得延伸解读**（见 register §10.1）。
- **坑 D** —— 账本记「4 篇 ADR 缺 MADR 状态行」为**措辞不准**；实际债是**字段顺序 ＋ 分隔符**（见 register §10.3）。
- **坑 E** —— `ctx_batch_execute` 的 shell 包装会**污染以 `for` 开头的命令**；把循环放在 `cd … &&` 之后。
