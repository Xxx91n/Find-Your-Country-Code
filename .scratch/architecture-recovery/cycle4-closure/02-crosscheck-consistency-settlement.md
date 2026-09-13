# Cycle-4 收口审计 — 02 交叉核对 + 三层一致性 + 账本结算

## 交叉核对（node 程序化，`reports ↔ README ↔ issue ↔ ledger`）

脚本对 9 票 × {报告存在性 / A-xxx 覆盖 / issue 勾选 / README 状态行 / 报告路径可达 / ledger 终态} 全量比对：

- **矛盾清单：1 条 → 已闭合。**
  - [28] issue AC5 标 `[~]`（部分完成）而 README=done。闭合条件「合入 main 后共享 E2E 转绿」现成立：本地复跑 80/80 + CI run 34735968078 success（审计收口 2026-09-13）→ `[~]`→`[x]` 并附证。
- 6 个关键 run ID 交叉出现核验（dry-run/EG 最终头/release/calibration/verify-27）在对应报告中各命中 ≥1 次，无孤儿引用。

## 三层文档一致性（CONTEXT.md / docs/adr / 代码）

| 漂移 | 处置 |
|---|---|
| CONTEXT.md「分档覆盖」词条仍写「页面级规则…」（票 30 前语义，D-30a） | ✅ 已改写：scope 显式化 + floor≠ceiling 禁令，指回 ADR-0007/0008 |
| ADR-0003「页面级分档覆盖」语义被票 30 取代 | ✅ 新增 **ADR-0007**（accepted，标注取代 ADR-0003 该语义；不重写历史 ADR） |
| 票 32/27R1 决策（真实站点三层塔 + CDP NOT-ADOPTED + 证据去重）未沉淀 | ✅ 新增 **ADR-0008** + **docs/architecture-recovery-cycle4-decisions.md**（10 项 implemented 决策摘要；文件名入既有 .gitignore 白名单） |
| 其余 23 术语逐条对代码抽查 | 未发现新漂移 |

## 账本结算

`decision-ledger.md`：A-001…A-010 状态列统一置 **implemented（Cycle-4 收口审计 2026-09-13）**——`current=0`。本周期无 deferred/stale 记录（所有登记项均闭环）。账本文件随 `.scratch/` 留档（已入库跟踪态，历史可查；不删除、不重写）。
