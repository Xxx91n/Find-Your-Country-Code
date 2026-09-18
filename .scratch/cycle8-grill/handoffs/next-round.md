# next-round.md — Cycle-8 常驻任务书

> **用途**：任意子 Agent 可独立依赖的常驻任务书。**不复制其他工件的正文**，只给「去哪找 ＋ 做什么 ＋ 覆盖哪些 D ＋ 完成判据」。
> **唯一数据源**：`.scratch/cycle8-grill/decision-ledger.md`（D-001…D-007，**7/7 current**）。**本文件不引入账本以外的结论。**
> 分支：`cch/17-cycle8-grill`（GitButler；与其他分支并行、互不影响）｜基线：`origin/main` = **`d075f01a`**（v1.7.0，**本轮不发版**）
> 生成：2026-09-18

---

## 0. 开工前必读（按序）

1. `.scratch/cycle8-grill/decision-ledger.md` —— **7 条 current 决策，唯一权威**
2. `.scratch/cycle8-grill/spec.md` —— S-01…S-05 · T-01…T-09 · D→去向对账
3. `docs/adr/0013-governed-artifact-area-and-evidence-trail.md` —— 本轮新增的治理决策（含事故回溯）
4. `.scratch/cycle7-grill/handoffs/audit-closeout.md` —— 环境禁忌与既有纪律（§2「不能动」结论 · §6 硬边界）
5. `CONTEXT.md` · `docs/adr/` —— 领域语言与既有决策（本轮已改：新增 0013；0006 加带日期修订注记；CONTEXT 加「受管工件区」）
6. `.scratch/cycle8-grill/research/` —— Q3（12 源）· Q4（14 源）行业对标存档

## 1. 硬边界（每票适用）

- 版本控制**唯一入口 `but`**；禁裸 `git` 写操作；**未获授权不得 `but land`／`but push`**。
- **A-010 / WORKFLOW §4.2 的 force-push 例外仅此一次**（仅修 `e63e8253` 的提交信息）；**不得据为先例**，后续一律仍走 `but`。
- **本轮不发版**（沿用 Cycle-7 D-018「累积再发」）；**ADR-0010 发布门不触发**。
- **不得降低任何既有门禁**；门禁证据只认 **CI run / artifact**。
- **语料先行**（无地基不立检测票）；**禁物理删除语料条目**（ADR-0008 决策 4）——到期以**状态位翻转**替代。
- **性能红线**（1000 节点 scan < 350ms）不得回退。
- 不得引入**远程网络面**（ADR-0003 被否决路线）与 **ML / 模型**（ADR-0001）。
- **`.scratch/` 是受管工件区**（ADR-0013）：不得当临时目录用；**清理只允许触 `draft/`**；决策账本不得置于任何被忽略目录。
- 4 个**反向断言门**（`verify-ticket-07/10/11/12` 断言 workflows 零 `.scratch/` 路径引用）**不得移除或削弱**。

## 2. 任务表（每项声明覆盖的 D-xxx）

| T | 任务 | 覆盖 D | 前置 | 完成判据（账本口径） |
|---|---|---|---|---|
| **T-01** | `.scratch/` 分区 `evidence/` vs `draft/` ＋ 边界 README ＋ 清理脚本白名单化 | **D-004** | — | 分区落盘；README 写明边界；清理脚本**只触 `draft/`** |
| **T-02** | 外部输入留痕三件套（入库 + SHA-256 + 来源 + 日期 + push） | **D-004** | T-01 | 规则落目录 README；已有外部输入补录哈希台账 |
| **T-03** | `git check-ignore -v` 防误吞门禁（**折叠进既有 workflow**，不新增文件） | **D-005** | — | CI 内断言关键路径**不被忽略** |
| **T-04** | 被忽略目录边界收口 | **D-005** | T-03 | 复核 `live-out/`（含基准则入库）；外部输入禁落被忽略目录；`docs/*` 定性修正为「合法、不重写」 |
| **T-05** | findings register 建立 | **D-007** | — | 带日期与复核期限的登记册；例外五要素（ID／理由／补偿控制／具名签核／到期日）齐备 |
| **T-06** | B⑧：ADR-0005「二次裁决的量化门槛」迁入 Notes 区 ＋ 更新 ADR 头部 `date` | **D-006** | — | 内容**逐字保留**，仅层级调整；ADR-0005 恢复 MADR 骨架 |
| **T-07** | B⑩：ADR-0008 加带日期 Notes（`verdict`↔`expect` 联动语义） | **D-006** | — | 不新立 ADR；注明本仓已具备机器校验（`32-real-site-corpus.mjs:193–201`） |
| **T-08** | C⑭：LF 清账（121 文件）＋ 新增 `.editorconfig` | **D-006** | — | 工作区 CRLF 归零；**不产生任何提交**（blob 已全 LF）；`.editorconfig` 防再漂移 |
| **T-09** | 下一轮 grill 4 问（Q3 CI 闭环形态 · Q5 T-13 门槛②可测化 · Q6 GF sync 人工确认 · Q7 交付单位） | **（未拍板）** | **先经用户拍板** | 4 问均已定稿并落账（D-008 起） |

**框架性／已完成的决策（不计入任务表）**：**D-001**（议程主轴）＝本文件整体 ＋ spec「Solution」；**D-002**（融合）＝**已完成**（提交 `uly`，E2E 149-0）；**D-003**（受管定性）＝**已在整理环节落**（`ADR-0013` + `ADR-0006 决策 1 带日期修订注记`）；**D-006 的 B⑨**（`push: cch/**` 登记）＝**已在整理环节落**（ADR-0006 注记）。

## 3. 波次与并行纪律

- 账本**未指派波次**（D-001…D-007 均未含波次字段）⇒ 默认全部并行；**有依赖时按下列硬约束排序**。
- **T-03 必须先于 T-04**（门禁需先就位才能兜住忽略边界）。
- **T-01 必须先于 T-02**（留痕三件套需先有 `evidence/` 分区）。
- **T-06 / T-07 不得同文件并发**（分属 ADR-0005 与 ADR-0008）。
- 波内并行不得跨分支改同一文件。

## 4. 不立票项与残留

**显式范围外（不立票）**：
- **分级豁免模型**（`TrackingOnly`：跟踪但不豁免）——本仓尚无「想记录但不放宽断言」的需求，登记为可选模板（D-007）。
- **再次重写历史** —— A-010 / WORKFLOW §4.2 已把例外限定为「仅此一次、仅此一个提交信息」（D-006 / A6）。

**残留（需用户裁定或后续轮次）**：
- **T-09 的 4 问未拍板**（Q3 / Q5 / Q6 / Q7）——账本中**无对应 D-xxx**。
- **输入缺口**：`test-results/锐.txt` **不可恢复**；本轮未做锐评核验。
- **F-1**：审计报告 §1.1/§1.2 三处 `dist` 数字互不闭合（差 1–3 B）——建议纳入「证据闭环」议题。
- **备份 ref 待清理**：`refs/backup/main-pre-rewrite`（本地）→ `b1fcf96d`。清场属**破坏性操作**，须用户明确确认后方可删。
- **旧 sha 上的 CI 记录已作废**（force-push 副产物；Actions 将对新 sha 重跑）。

## 5. suggested skills（下一轮开工按序加载）

- **`Skill: gitbutler`** —— 版本控制唯一入口；`land`／`push`／`pull`／冲突解收语义必读。
- **`Skill: grill/engineering/tdd`** —— 代码类票的红-绿-重构循环。
- **`Skill: grill/engineering/code-review`** —— 交付前双轴评审（Standards ＋ Spec）；**子代理必须按 `HEAD` 读文件**，不得读含未提交改动的脏工作区。
- **`Skill: grill/engineering/domain-modeling`** —— ADR / `CONTEXT.md` 维护（**T-06 · T-07 必用**）。
- **`Skill: grill/engineering/resolving-merge-conflicts`** —— 多分支并行下的冲突解收（逐 hunk 按意图解，**禁 `--abort`**）。
- **`Skill: atomcode-research`** —— 深度调研护栏（同一时刻至多 1 个在途，**禁杀进程**）。
- **`Skill: khazix/neat-freak`** —— 知识／治理收尾（下一轮收口时先做事实面对账，再做任务书）。
- **`Skill: grill/productivity/handoff`** —— 下一轮收口时再生成本文件。
