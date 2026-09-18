# 0016 — 发版节奏：有节奏的批量 + 安全补丁豁免

状态：accepted | 日期：2026-09-18 | 来源：Cycle-8 grill T-09 Q7（**D-011 采纳**）；行业对标：`.scratch/cycle8-grill/research/q7-release-cadence.md`（16 条来源）

## 背景

Cycle-7 **D-018** 裁定「本轮不发版本、变更累积了再发」，Cycle-8 沿用（本轮不发版）。但 D-018 是**本轮（cycle-scoped）**裁定而非永久政策，且「累积」**无节奏、无上限、无补丁豁免**。T-09 Q7 把「交付单位」提交行业对标调研，用户于 2026-09-18 拍板**采纳**。

## 决策

1. **交付单位 = 有节奏的批量**（不是「每 commit 即发」，也不是「攒很久才爆发」）：每个变更合入主干即**保持可发布**（continuous delivery），但**按固定节奏收割**成对外版本。
2. **固定节奏 = 双周至月度**（Fowler 的 "hard but plausible" 区间；后续按发布摩擦变化调整）。
3. **补丁豁免（判据 5）**：**安全修复与严重 bug 的 patch 版本随时就绪随时发，不排队**。该豁免**优先于**节奏点与积累阈值。
4. **意图积累（changesets 式）**：发布意图随变更记录、与「何时收割」解耦；收割时人工审阅 changelog、一次性 bump。
5. **积累上限（判据 7）**：`commits > 30` 或 `diff 行数 > 2000` ⇒ **立即收割**，不再等节奏点。阈值登记于 `tests/scripts/51-release-readiness.mjs` 的 `LIMITS`。
6. **breaking 归位（判据 6）**：breaking change 只进批量点，附迁移指南；**永不藏进 patch**。
7. **消费者边界（判据 1）**：本仓分发面（脚本平台自动更新的用户）是**外部无法协同升级的下游** ⇒ **严格 SemVer + 意图积累式批量**，**禁止全自动 patch 直发**。
8. **机器实现**：`tests/scripts/51-release-readiness.mjs` —— **advisory（monitor 类，默认不阻断）**：输出上一 tag 以来累积量、类型分布、breaking/security 信号、diff 行数与收割建议。
9. **与 D-018 的关系（张力 T-3 的裁定）**：Cycle-7 D-018 的「本轮不发版」是**本轮一次性**裁定；其「累积再发」的**永久化形态**即本 ADR，且**附加安全补丁豁免**（D-018 原文未含豁免 ⇒ 本 ADR 是其**扩展**，非推翻）。

## 依据（全部 observed）

1. 「Release early, release often」的真实含义是**早建发布管线**而非「每 commit 必发」（OSS Watch）；实证研究的「发布频率↔市场份额」是**曲线关系**（过频反噬）。
2. 时间驱动是默认形态：GitLab 每月 22 号固定发版 + patch 随时发；Open edX 经验区间 3–9 个月。
3. 每变更即时发的适用条件极窄：npm 生态约 **44% 的 breaking change 出现在 minor/patch**；升级疲劳已是商业痛点。
4. 批量发布的现代形态是「意图积累 + 定期收割」（changesets 与 semantic-release 的核心分歧 = **发布时机决定权留给维护者**）。
5. 发布摩擦是核心物理量（Fowler：**正确方向是消除摩擦而不是迁就摩擦**）。
6. 「每个变更可发布，但每个变更不必发布」= 能力与决策的分离（Fowler Release-Ready Mainline）。
7. 补丁豁免是共识（GitLab / OSS Watch）：安全修复与严重 bug **不排队**。

## 反证条件（满足任一即重开本 ADR 相应条款）

1. 若实测「累积 > 30 提交」在双周内高频触发 ⇒ 节奏点太稀，重评决策 2/5。
2. 若发布摩擦降到接近零（构建/发布全自动且测试可信）⇒ 重评决策 1（可提速至更高频）。
3. 若下游承受力被低估（用户反馈版本噪音）⇒ 重评决策 2（周期拉长）。
4. 若本仓开始对外发布库（可被依赖的产物）⇒ 重评决策 7（消费者边界升级为包生态语义）。

## 后果

- **本轮仍不发版**（沿用 Cycle-8 交付口径）；ADR-0010 发布门**不触发**；本 ADR 为**下一轮起的常态政策**。
- `tests/scripts/51-release-readiness.mjs` 首次运行即报：自 `v1.7.0` 以来 **52 提交 / 6604 diff 行** ⇒ **已超积累上限**（判据 7）⇒ 下一轮应优先收割一个版本。
- 新增零依赖脚本 `tests/scripts/51-release-readiness.mjs`，其自检挂接进 `engine-gates.yml`。
- 「意图积累」目前以 **Conventional Commits 类型**承载（本仓已在用）；**未引入** changesets 等外部工具（依「依赖只经显式请求」纪律）。

## 参考

- 行业对标：`.scratch/cycle8-grill/research/q7-release-cadence.md`
- 上游：`docs/adr/0010-release-gate.md`（发布门）· `docs/adr/0006-ci-hygiene-policy.md`（决策 2 发版系 workflow 例外）· `.scratch/cycle7-grill/decision-ledger.md` D-018
- 账本：`.scratch/cycle8-grill/decision-ledger.md` D-011
