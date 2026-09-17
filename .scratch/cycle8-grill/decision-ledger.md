# Decision Ledger — Cycle-8 Grill（逐题台账）

> 用途：grill 过程中**每一条被用户确认的实质性结论**当场落盘，不依赖对话记忆。
> 生成：2026-09-18｜基线：`origin/main` = `b1fcf96d`｜本会话分支：`cch/17-cycle8-grill`
> 上游：`.scratch/cycle7-grill/handoffs/audit-closeout.md`（§1–§9）＋ `.scratch/cycle7-grill/reports/2026-09-17-audit-report.md`（唯一新增权威结论）
> **输入缺口登记**：用户指定的 `test-results/锐.txt` **已不存在**（实证：工作区无、`git ls-tree HEAD` 零命中、`git log --diff-filter=D` 零命中、广域搜索零命中；成因 = `.gitignore:25` 忽略 `test-results/` ⇒ 从未入库、删除无痕、**不可恢复**）。本轮**未获该输入**，未做任何锐评核验。
> 机制：ID 自 D-001 起递增（与 `.scratch/cycle6-grill/`、`.scratch/cycle7-grill/` 的 D-xxx 隔离）。
> 状态取值：`current`（已确认生效）／`revised`（被后续回答修订）／`stale`（被证伪或废弃）／`deferred`（登记在案，本周期不做）／`pending`（调研已出、待拍板）。
> 硬规则：**结论不许只活在对话里**；触发任何压缩／compact／handoff 动作前，先确认本台账已落盘到最新。

---

## 台账

| ID | 原问题 | 用户原回答原文 | 规范化需求 | 显式约束 / 负向需求 | 状态 |
|----|--------|---------------|-----------|--------------------|------|
| **D-001** | Q1 — 本轮 grill 的**输入面**怎么定？(A) 你重新提供锐评，我先逐条实物核验 / (B) 锐评确已作废，以 `audit-closeout.md` §5 的 Q1–Q8 为议程 / (C) 其他 | `B，同时未提交的变更融合一下，不要孤立了，这个是上次grill省下的` | 采纳 **(B)**：本轮议程主轴＝「**收口治理 + 证据闭环**」，以 `.scratch/cycle7-grill/handoffs/audit-closeout.md` §5 的 **Q1–Q8** 为起点；工作集＝审计收口**遗留 9 项**：**A 组第 6 项**（t16 提交信息票数口径 13→15/15）＋ **B 组 4 项**（⑦ `.scratch/` 成 CI 依赖三选一；⑧ ADR-0005 非 Notes H2 节合规化；⑨ `verify-tickets.yml` 的 `push: cch/**` 触发面显式登记；⑩ `32-real-site-corpus.mjs` verdict↔expect 谓词变更是否需 ADR 追加）＋ **C 组 4 项**（⑪ T-15 波次授权留痕；⑫ T-14② 语义裁定授权留痕；⑬ 并行在途 T-12 缺口 2a/2b 验收纳管；⑭ CRLF 漂移 121 文件处置授权）。 | **① 锐评输入面关闭**：不得再以 `test-results/锐.txt` 为依据引用任何结论（文件不可恢复）；本台账已如实登记该缺口，**不得凭记忆补写锐评内容**。**② grill 期间不动 `src/` 源码**（沿用前两轮标准约束）。**③ 不设定其他目标**。**④ 议程不扩面**：不在本轮新开 `improve-codebase-architecture` 宏观调查。**⑤ 硬边界沿用** `audit-closeout.md` §6（`but` 唯一入口；未授权不得 `land`/`push`；门禁证据只认 CI run/artifact；语料先行；`.scratch/` 入 Git 不得当临时目录）。 | current |
| **D-002** | （Q1 附带指令）工作区 4 项**并行在途未提交变更**（上次 grill 省下的 T-12 缺口 2a/2b 工作流）如何处置？ | （同上 verbatim：`B，同时未提交的变更融合一下，不要孤立了，这个是上次grill省下的`） | **融合（fuse）**：把该 4 项在途变更**纳入本会话工作流并正式提交**，消除「孤立在途」状态：`M src/detect/index.ts` · `M tests/scripts/verify-ticket-29.mjs` · `?? tests/contenteditable-scan.spec.ts` · `?? tests/fixtures/contenteditable-dial.html`。融合后工作区 `git status --porcelain` 应为空。 | **① 提交前必须走审计报告 §6.4 的同一套验收**（含 `verify-29` 断言变更复核）——**未跑通不得提交**。**② 不得改写／回退该工作流的内容语义**（只做验证 + 提交；若发现其内容不完整或自相矛盾，**停下呈报**，不得自行补写）。**③ 不得 `but land`／`but push`**（未获授权；D-001⑤）。**④ 不得把它提交到与本会话无关的分支**（消除孤立＝进本会话分支）。**⑤ 不得降低任何既有门禁**。 | current |

---

## 覆盖率自评

- 已确认条目：**2**（D-001 · D-002 = current）｜revised：0｜stale：0｜deferred：0｜pending：0
- 本问覆盖：Cycle-8 输入面 = **已定**（B）＋ 并行在途融合指令 = **已定**
- 待决（frontier）：审计遗留 9 项逐条处置（A6 / B⑦⑧⑨⑩ / C⑪⑫⑬⑭）；`audit-closeout` §5 的 Q3–Q8（CI 闭环形态 · 交付单位 · CRLF 清账 · T-13 门槛可测化 · GF sync 人工确认 · T-12 缺口归属）
