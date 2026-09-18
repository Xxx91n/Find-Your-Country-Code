# Decision Ledger — Cycle-9 Grill（逐题台账）

> 用途：grill 过程中**每一条被用户确认的实质性结论**当场落盘，不依赖对话记忆。
> 生成：2026-09-18｜基线：`origin/main` = `752c4bb2`｜本会话分支：`cch/18-cycle9-grill`
> 上游：`.scratch/cycle8-grill/handoffs/2026-09-18-audit-closeout-handoff.md`（§0–§12.9）＋ `.scratch/evidence/findings-register.md`（FR/FC/FN）＋ `docs/adr/0001…0016`
> **输入缺口登记**：用户指定的 `test-results/锐.txt` **已不存在**（实证：工作区无、`git ls-tree HEAD` 零命中、广域搜索命中 7 个同名文件但**逐一判归属后全部属其它项目**，其中 `D:/Aworker/6F/.code-tmp/锐评.txt` 经 git remote 验证属独立仓库 `Xxx91n/6F`）。本轮**未获该输入**，未做任何锐评核验。
> 机制：ID 自 D-001 起递增（与 `.scratch/cycle6-grill/`、`cycle7-grill/`、`cycle8-grill/` 的 D-xxx 隔离）。
> 状态取值：`current`（已确认生效）／`revised`（被后续回答修订）／`stale`（被证伪或废弃）／`deferred`（登记在案，本周期不做）／`pending`（调研已出、待拍板）。
> 硬规则：**结论不许只活在对话里**；触发任何压缩／compact／handoff 动作前，先确认本台账已落盘到最新。

---

## 台账

| ID | 原问题 | 用户原回答原文 | 规范化需求 | 显式约束 / 负向需求 | 状态 |
|----|--------|---------------|-----------|--------------------|------|
| **D-001** | Q1 — 本轮的落点（目标函数）是哪一类？(A) 发版收割（按 ADR-0016 判据 7 收割一个版本，并入 GF 送达链核验）／ (B) 站点级语料建设（FR-11）／ (C) 收口债清账（FR 14 条签核 + ADR 形式债 4 篇 + `CONTRIBUTING.md` 漂移 + 备份 ref 清理）／ (D) B 侧能力再扩张 ／ (E) 组合 | `AC` | 本轮**同时**推进两条线：**（A）发版收割** —— 按 **ADR-0016 判据 7**（`commits > 30` 或 `diff 行数 > 2000` ⇒ 立即收割）收割一个版本；实测自 `v1.7.0` 以来 **66 提交 / 8481 diff 行**（超限 2.2× / 4.2×）；**并入 GF 送达链核验**（否则送不到用户）。**（C）收口债清账** —— FR-01…FR-07 · FR-09…FR-15（**14 条 open**）签核 ＋ **ADR 形式债 4 篇**（`0007`/`0008`/`0010`/`0011` 缺 MADR 状态行）＋ `CONTRIBUTING.md` 漂移（FR-13，未反映 ADR-0014/0016）＋ 备份 ref 清理（FR-03）。 | **① 排除 (B)**：本轮**不做**站点级语料建设（FR-11）—— 体量大（~3838 站点 + ~500 pilot）、依赖外部数据源与标注责任、且「库外归档载体」选型未定；**留作独立轮次**。**② 排除 (D)**：本轮不做 B 侧检测/功能面新能力扩张。**③ grill 期间不动 `src/` 源码**（沿用 cycle6/7/8 标准约束）。**④ 不设定其他目标**。**⑤ 硬边界沿用** `handoff §6`（`but` 唯一入口；未获授权不得 `land`/`push`；门禁证据只认 CI run/artifact；语料先行；`.scratch/` 为受管工件区、清理只允许触 `draft/`）。**⑥ 发版属 handoff §6 明文例外**（「本轮不发版」为 Cycle-7 D-018 的一次性裁定；若拍板收割则需你明确授权）——**未获授权前不得 bump 版本、不得打 tag、不得触发 release**。**⑦ GF 送达链未核验前不得声称「送达已闭合」**（cycle7 D-002③ 同向）。**⑧ FR 签核必须由授权人本人作出**（铁律：*auditors care about the trail, not the intent*；执行者自证无效）。**⑨ FR-03 备份 ref 清理属破坏性操作**，须你明确确认后方可执行。 | current |

---

## 覆盖率自评

- 已确认条目：**1**（D-001 = current）｜revised：0｜stale：0｜deferred：0｜pending：0
- 本问覆盖：Cycle-9 目标函数 = **已定**（A 发版收割 + C 收口债清账）
- 待决（frontier）：**A 侧**（版本号 SemVer / 收割范围 / ADR-0010 发布门触发口径 / GF 送达链核验口径）；**C 侧**（FR 14 条逐条处置 / ADR 形式债 4 篇补状态行的形式 / `CONTRIBUTING.md` 同步范围 / 备份 ref 去留）；A 与 C 的排序与耦合；本轮交付单位与验收面
