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
| **D-003** | Q2 — `.scratch/` 的定位怎么定：**受管工件**还是**可抛弃现场**？(A) 迁出恢复可抛弃 / (B) 承认受管 / (C) 仅降级 advisory / (D) 其他；若取 (A)，受管集是移出还是原地分区标注？ | `这个不能抛弃需要进git跟踪` | 采纳「**受管**」定性：**否决 (A) 的「回归可抛弃」前提，亦否决 (C) 的降级路线**（C 经取证仅覆盖 1/5 门）。`.scratch/` **不可抛弃**，其内容**必须保持 Git 跟踪**；**原地保留**（不移出）。⇒ 等价于审计选项 **(b) 承认受管**。落地动作：① 修订 **ADR-0006 决策 1** 中与事实相反的「降级为可抛弃调研现场」表述，将 `.scratch/architecture-recovery/`（`issues/` + `research/`）明确为**受管工件**（与 `tests/`、`docs/` 同级）；② B⑦ 的 **5 个 CI 门**对 `.scratch/` 的读取转为**合法依赖**并显式登记。 | **①** 不得再把 `.scratch/` 当临时目录／可抛弃现场使用（`audit-closeout` §6 既有边界现升为**定性**）；**②** `.scratch/` 的删除／清理须走正常评审，**不得随手清理**；**③** **不得移除或削弱 4 个反向断言门**（`verify-ticket-07/10/11/12` 的 G4v／G7／G7e 断言 workflows 零 `.scratch/` 路径引用）——「受管」**不等于**「允许 workflow 直接引路径」；**④** 不得借本裁定夹带 `.gitignore` 的其它改动（须另案）；**⑤** 决策账本（唯一权威需求面）**不得置于任何被忽略目录**。 | current |
| **D-004** | `.scratch/` **受管区内部治理**：分区、外部输入留痕、事故回溯 | ① 判据**不是目录名**，而是「人写/裁决产物 vs 工具可再生成」＋「是否被构建/验证链消费」；CI 门禁读的文件**自动升级为受管**（Go 生态共识：**从不允许「构建悄悄依赖本地可再生不成的东西」**）。推荐**分区**：`evidence/`（不可再生，永不清理）vs `draft/`（真可抛弃，允许清理），边界写进目录 README，清理脚本**只允许触碰 `draft/`**。④ 外部输入三层留痕：入库+Git 历史即留痕 → 不可变留痕（WORM/内容寻址，合规级）→ 异地冗余；**单人项目轻量等价物 = SHA-256 + 来源 URL + 抓取日期记台账 + push 到远端**（“证据只存在一份于本地可清理目录且从未 push，等于没有”）。行动清单第 3 项：补**事故回溯 ADR**（ADR 惯例本身即为这类事设计）。 | **无 current 冲突**；**强印证 D-003**（受管定性）；**D-003④** 明确 `.gitignore` 其它改动须另案 ⇒ 本条的「分区」**不是** `.gitignore` 改动，属受管区内部治理，**在 D-003 授权范围内** | 采纳三项：① `.scratch/` 内部分区 `evidence/` vs `draft/` ＋ 边界写入目录 README ＋ 清理脚本白名单化到 `draft/`；② **外部输入留痕三件套**（入库 + SHA-256 + 来源 + 日期 + push）；③ 补**事故回溯 ADR**（锐评原文丢失：内容摘要 + 流程修正）。另采纳行动清单第 4 项：**CI 依赖的票据文件从隐式依赖改为目录 README 显式声明 + 门禁失败信息指向来源** | current |
| **D-005** | **被忽略目录的处置**（Q3 原题的作用域；即 D-003④ 所指的「另案」） | ② 判据表：构建产物 **忽略**（入库是反模式）；测试报告/覆盖率/浏览器报告 → **CI artifacts + `expire_in`**（**CI 平台就是业界的「产物归档层」**），不进 git；运行日志忽略；**真实站点冒烟输出分裂**（纯诊断忽略／**构成判据则入库**，同 golden file）；第三方输入不可再生 → 入库。③ 白名单写法**在官方范例形态下合法**（gitignore 官方自己给出该范例），**不能一刀切说它错**；错在「写在**会被清理的目录**上 + 无 `check-ignore` 验证」。防误吞标准手法 = **CI 内跑 `git check-ignore -v` 断言关键路径不被忽略**。 | **无 current 冲突**；**本项正是 D-003④ 的「另案」** | 采纳 (A) 作用域：① `dist/` · `test-results/` · `playwright-report/` · `live-out/` **保持忽略**（符合业界共识）；② **但复核 `live-out/`**——若含「站点行为基准」则按 golden file 规则**晋升入库**；③ **不可再生的外部输入一律进受管区**（不得落在任何被忽略目录）；④ **新增防误吞门禁**：CI 加 `git check-ignore -v` 断言关键路径不被忽略（与 D-006 的 doc-facts lint 同族机制，**折叠进既有 workflow**，不新增文件）；⑤ `docs/*` 宽忽略**定性修正**：本仓写法**落在合法形态内**，**不重写**，仅由 ④ 的门禁兜住 | current |
| **D-006** | 审计遗留 **7 项**逐条处置（A6 / B⑧ / B⑨ / B⑩ / C⑪ / C⑫ / C⑭） | **Tl;dr：业界对「已交付、已验证、仅过程形式有瑕疵」的项，主流是登记为已归档偏差（documented deviation），而非回退或重做**；前提是偏差被落盘、可追溯、有时效。逐项：② ADR 追加内容**不改决策**→带日期注记（**并更新 ADR 头部 `date` 字段**）；改决策→新 ADR。③ 分支通配符是**官方推荐形态**；触发面变更应显式留痕，**登记载体不必新开 ADR**。④ 业界镜像 = dotnet Known Issues（单一数据源派生豁免位）+ `TrackingOnly`（跟踪但不豁免）。⑤ 追认**必须由授权人本人作出**，禁执行者自证。⑥ 工作区 CRLF 是**正常预期行为不是缺陷**，一次性机械清账 + **`.editorconfig`**。⑦ findings register + 分级豁免 | **张力⑤（实质）**：调研 ① 推荐「单人仓库倾向重写」，而本仓 **A-010（implemented）** 显式约束为「版本控制遵循 WORKFLOW §4.2（**禁 force-push**）；**已归零旧历史不重写（不可逆）**」，票 35 handoff 亦写「**不重写历史「凑绿」**」；且 A-010 的**设立动机**正是「历史曾被两次强推归零」⇒ 为修一条提交信息而重写历史**与 A-010 的动机直接相悖**。**未静默采纳。** | 逐项口径见下方专表；**A6 = 授权 force-push 重写提交信息**（**用户显式指令**；**推翻 A-010 的「禁 force-push」条款**，须同步落 A-010 带日期修订注记）；**C⑪ = 用户已答「有」⇒ 确有授权**（驳回调研①） | current |
| **D-007** | 研究 ⑦ 的两项「未采纳心智模型」是否纳入 | **1. 已知残留登记册（findings register）+ 例外生命周期**：每条发现 → 编号、负责人、处置决定（fix / accept / defer）、证据链接、**到期复核日**；例外五要素 = 发现 ID、理由、补偿性控制、具名签核、**到期日（绝不自动续期，到期强制重审）**。**2. 分级豁免模型**（`TrackingOnly`）：从二元「豁免/不豁免」演进为**分级**：豁免（转绿）vs **仅跟踪**（保持红但记录统计） | **无 current 冲突**；与 **D-003（cycle7，豁免到期重裁）** 同向；本仓现状：审计发现散落于审计报告 §6 / backlog / 账本，**无统一登记册** | 采纳 **1**（立 findings register：把本轮「登记类」项收进一个**带日期与复核期限**的登记文件，不散落各处）；**2 暂不采纳**（本仓尚无「想记录但不放宽断言」的需求，登记为可选模板） | current |

---

---

## 执行证据 — D-002 融合（2026-09-18 · 本会话）

### 验收（审计报告 §6.4 同一套，逐条实测，非转述）

| 项 | 命令 | 结果 | 判定 |
|---|---|---|---|
| 类型门 | `npm run typecheck` | exit **0** | ✅ |
| 构建 | `npm run build` | exit **0**；`dist/find-your-country-code.user.js` = **171,172 B** | ✅ |
| 产物确定性 | 连续两次 build + sha256 | `c324c47a481e…` **两次一致** | ✅ 确定性已验证 |
| 票级审计 | `verify-ticket-runner.mjs --audit` | **AUDIT 19 passed / 0 failed** | ✅ |
| 21 道门 | `--list` 逐个 `--run` | **20 pass / 1 fail**（唯一红 = **票 39**，与审计 §2「不能动」结论一致） | ✅ 无新增红 |
| 校准语料 | `14-calibration-harness.mjs` | precision=**1.0000** recall=**1.0000**（TP=31 FP=0 FN=0） | ✅ 不回退 |
| 真实站点层 | `32-real-site-corpus.mjs` | cases 56→**63**，precision/recall/f1 均 **1.0000**，**gate=pass** | ✅ |
| 文档事实面 | `doc-facts.mjs` | OK（**23 selectors / 4 menu commands**） | ✅ |
| 勾销对账 | `issue-checkbox-audit.mjs` | 勾选 **5/5**，与报告自述一致 | ✅ |
| 豁免元数据 | `corpus-exemption-lint.mjs` | **7 PASS / 0 FAIL**（owner/reviewBy 2027-03-31/reason 齐全未过期） | ✅ |
| GF 对齐 | `38-gf-alignment-check.mjs` | `RESULT: OK（对齐）` | ✅ |
| 国家数据 | `verify-ticket-02.mjs` | exit 0 | ✅ |
| E2E | `npm run e2e` | **149 passed / 0 failed**（1.6m）—— 恰为提交态 146 + 本 spec 3 用例 | ✅ |
| 卫生 | `git diff --check` | 净（exit 0） | ✅ |

### 行尾与编码（对 D-002 的“未制造混合行尾”取证）

| 文件 | 总行数 | CRLF | 裸 LF | 结论 | BOM |
|---|---|---|---|---|---|
| `src/detect/index.ts` | 1023 | **0** | 1023 | **纯 LF** | false |
| `tests/scripts/verify-ticket-29.mjs` | 205 | **0** | 205 | **纯 LF** | false |
| `tests/contenteditable-scan.spec.ts`（新） | 118 | **0** | 118 | **纯 LF** | false |
| `tests/fixtures/contenteditable-dial.html`（新） | 57 | **0** | 57 | **纯 LF** | false |

> 另：HEAD blob 亦为纯 LF（`src/detect/index.ts` CRLF=0 / 61,226 B；`verify-ticket-29.mjs` CRLF=0 / 12,431 B）。⇒ 本 4 文件**不属** CRLF 漂移集，本融合**未制造混合行尾**。
> 工作区文件 mtime = 2026-09-17 22:25–22:28（**早于**审计窗口 00:22）⇒ 审计时该工作流**已定稿**，本轮只验证 + 提交，未改写任何语义。

### 提交结果

| commit | 内容 | 范围 |
|---|---|---|
| `osz` | `docs(cch-17)` 本账本落盘 | `.scratch/cycle8-grill/decision-ledger.md` |
| `uly` | `fix(cch-17-t12)` 融合 T-12 缺口 2a/2b 工作流 | `src/detect/index.ts` · `tests/scripts/verify-ticket-29.mjs` · `tests/contenteditable-scan.spec.ts` · `tests/fixtures/contenteditable-dial.html` |

- 分支：`cch/17-cycle8-grill`（**未 `land`／未 `push`** —— 符合 D-002③）。
- 工作区：`but status` = `zz [uncommitted] (no changes)` ⇒ **「孤立在途」状态已消除**（D-002 目标达成）。
- **C 组第 ⑬ 项（并行在途 T-12 缺口 2a/2b 验收纳管）已由 D-002 执行闭环**（验收已跑、已提交；残留仅「未 push ⇒ 无 CI run」）。

## 本轮新发现（登记，待裁定去向）

- **F-1（审计报告 errata 候选）**：审计报告三处数字互不闭合 —— §1.1 实测提交态 `dist` = **169,993 B**；§1.2 实测工作区 = **171,171 B**，但其算术又写「171,171 − 1,181 = **169,990 B**」；本轮实测工作区 = **171,172 B**（两次构建 sha256 一致）。三处差 **1–3 B**。疑因 §1.2 用「报告四舍五入值 169,990」作提交态基数，而非 §1.1 的实测 169,993。⇒ 建议纳入「证据闭环」议题：**审计报告自身的数字自洽性**亦需可复跑口径。
- **F-2（已闭环）**：工作区由「4 项孤立在途」→ 干净（`zz [uncommitted] (no changes)`）。
- **F-3（与既有决策一致）**：`.github/workflows` 实测 **11 个**，与 D-004「30 → 合并、不设数量 KPI」的落地结果一致（审计 §3 D-004 亦记 30→11）。

---

---

## 议题取证 — B⑦ `.scratch/` 的 CI 依赖面普查（2026-09-18，实物）

> 口径：逐个脚本读源码，区分「**真数据依赖**（删目录即 FAIL）」／「**反向断言**（检查 workflow 不含 `.scratch/`）」／「**纯注释或示例串**」三类。

| 脚本 | 性质 | 真数据依赖的读取面 | CI 挂接点 |
|---|---|---|---|
| `verify-ticket-06.mjs` | **真依赖** | `FILES.probeCommon/probeMirrors/probeReal` = `.scratch/…/research/scripts/06-probe-{common,mirrors,real}.mjs`；`existsSync` 失败即 **`process.exit(1)`**（S0 自证） | `verify-tickets.yml` → plan ticket **06** |
| `verify-ticket-08.mjs` | **真依赖** | `readFileSync(.scratch/…/issues/08-phase-b-failure-fixes.md)` | plan ticket **08** |
| `verify-ticket-10.mjs` | **真依赖** | `read(.scratch/…/research/scripts/10-probe-srcdoc-origin.mjs)` + `read(.scratch/…/issues/10-srcdoc-origin-fix.md)` | plan ticket **10** |
| `verify-ticket-12.mjs` | **真依赖** | `read(.scratch/…/issues/12-rules-limit-fidelity.md)` + `read(.scratch/…/research/window-reports/12-rules-limit-fidelity-report.md)` | plan ticket **12** |
| `issue-checkbox-audit.mjs` | **真依赖** | `readdirSync(.scratch/architecture-recovery/issues/)` + `…/research/window-reports/`；缺目录即 **`process.exit(1)`** | **`engine-gates.yml`**（独立 step） |
| `verify-ticket-07.mjs` | 反向断言 | — （只断言 workflows 零 `.scratch/` 引用） | plan ticket 07 |
| `verify-ticket-11.mjs` | 反向断言 | — （同上） | plan ticket 11 |
| `verify-ticket-05.mjs` | 纯注释 | — （仅迁入历史的注释） | plan ticket 30 |
| `release-gate.mjs` | **非依赖** | — （`fs` 调用只涉 ACK_PATH 与夹具；:99 的 `.scratch/…` 是**示例 JSON 字符串**） | `release.yml` |

### 结论（对审计口径的实质修正）

- **F-4（审计范围声明偏窄）**：审计 §4.6 将本项叙述为「**T-07 的 CI 门**依赖 `.scratch/`（未披露的架构副作用）」，读起来指向 Cycle-7 T-07 引入。**实测**：真数据依赖为 **5 个 CI 脚本**，其中 **4 个（06/08/10/12）是 Cycle-4/Cycle-5 存量票级门**，仅 1 个（`issue-checkbox-audit.mjs`）属 Cycle-7 T-07。⇒ 该耦合是**存量且更宽**，**非 T-07 引入**。
- **F-5（方案 (c) 不充分）**：审计选项 (c)「`issue-checkbox-audit` 降为 advisory」只覆盖 **1/5**；另 4 个门仍硬依赖 ⇒ **单独选 (c) 不能闭合本项**。
- **F-6（`release-gate.mjs` 不是依赖）**：排除后，`.scratch/` 的真实 CI 耦合面是 **5 个脚本 + 7 类被读文件**（issues/08·10·12、research/scripts/06-probe-×3·10-probe-×1、window-reports/12-…），**非整个 3.0 MB / 331 文件**。
- **F-7（既有先例）**：本仓已有「过程证据**归档出工作树**」的先例（票 41 / A-018：归档至仓库外 `…-evidence-archive\`，历史副本 commit `b7b1f0a2`）⇒ 「迁出」路径在本仓**不是新机制**。
- **存量量级**：`.scratch/` = **3.0 MB / 331 文件**；`issues/` = **57 文件**；`.scratch/` **已入 Git**（`.gitignore` 未忽略）。
- **ADR-0006 决策 1 原文**：仅字面约束「`.github/workflows/*.yml` 禁止出现 `.scratch/` 路径引用」——**字面已满足**（workflows 零命中）；其**意图**（`.scratch/` 可抛弃、不再是 CI 单点故障）由上述 5 个脚本**未满足**。

---

---

## 议题取证 — `.scratch/` 的 Git 跟踪实况（2026-09-18，实物）

| 指标 | 实测 |
|---|---|
| `.scratch/` 磁盘文件数 | **331** |
| `.scratch/` Git 跟踪数 | **331** |
| 未跟踪但未忽略 | **0** |
| 被忽略（`.scratch/` 下） | **0** |
| 嵌套 `.gitignore`（`.scratch/` 下） | **无** |
| `.git/info/exclude` | **空** |

⇒ **F-8**：`.scratch/` **已经是 331/331 全量 Git 跟踪**（`git check-ignore` 对账本、票据、窗口报告均返回 NOT IGNORED）。故「需要进 Git 跟踪」在本条上**当前状态已满足**；D-003 的**实际增量是「定性修订 + ADR 落文」**（把既成事实升为条款），而非新增跟踪。

**本仓当前被忽略的目录（非 node_modules）——真正的「未跟踪面」**：

| 目录 | `.gitignore` 行 | 性质 |
|---|---|---|
| `test-results/` | 25 | Playwright 运行产物（**锐评文件曾存放于此，已永久丢失**） |
| `playwright-report/` | 26 | 运行产物 |
| `dist/` | 22 | 构建产物 |
| `live-out/` | 29 | 真实站点冒烟运行产物（票 39） |
| `docs/*`（白名单：`docs/adr/`、`docs/architecture-recovery-*.md`、`docs/greasyfork-sync-setup.md`） | 12-15 | 其余 `docs/` 被忽略 |
| `.codegraph/codegraph.db` | （全局/未列） | 工具缓存 |

⇒ 待裁定：本原则是否延伸到上述**被忽略目录**（即「不可再生的外部输入」是否必须进受管区）。

---

## 一致性对撞明细（Q3 调研 对 D-001…D-003）

| current 记录 | 对撞结果 |
|---|---|
| **D-001**（议程 = 收口治理 + 证据闭环） | **一致且同向**；调研 ④ 与行动清单全部落在「证据闭环」主轴上 |
| **D-002**（融合在途变更） | 无涉 |
| **D-003**（`.scratch/` 受管、不可抛弃、原地保留、保持 Git 跟踪） | **强印证**：调研 ① 「CI 门禁读的文件自动升级为受管」与本条同构；D-003④（`.gitignore` 另案）被 D-005 承接；D-003⑤（账本不得置于被忽略目录）与调研 ④ 一致 |

### 与已 accepted ADR／既有纪律的张力

- **ADR-0006 决策 1**（「`.scratch/architecture-recovery/research/scripts/` 降级为可抛弃调研现场」）：调研口径**直接反驳**该表述（“业界心智下这些文件自动升级为受管”）。但 **D-003 已授权修订该表述** ⇒ **不是新张力**，属 D-003 的落地内容。
- **ADR-0008 决策 4**（语料 append-only）／**ADR-0009**（冻结档位）：无涉。
- **CONTEXT.md 35 术语**：调研新增概念（受管工件 / 可抛弃区 / 证据留痕 / 防误吞门禁）按 **D-009 / D-013 纪律均为机制**，**不入术语表** ⇒ 不触 7 条上限。

### 编排 Agent 对调研的两处修正（已写入调研存档）

- **修正-1**：调研 ③ 称其陷阱 1「与本仓库事故机制同构」——**实物反驳**：`test-results/`（锐评殒命处）是**整目录忽略**，**不是**白名单结构；白名单在 `docs/*` + 三行 `!` 例外。⇒ 锐评事故属 **②/④**（不可再生证据落在被忽略区且无留痕），**不是** ③ 的父目录排除陷阱。两问题独立。
- **修正-2**：调研说白名单写法「不能一刀切说它错」——**本仓 `docs/*` 恰好落在合法形态内**（宽模式行 12、`!` 例外行 13–15，顺序正确），且 `docs/` **不是会被清理的目录**。⇒ 其风险等级**低于**编排 Agent 原先的判断；要补的是 **`check-ignore` 门禁**，**不是**改写写法。

---

---

### D-006 逐项合成口径

| # | 项 | 合成处置 | 调研依据 |
|---|---|---|---|
| **A6** | t16 提交信息（13→15/15） | **授权 force-push 重写提交信息**（**用户显式指令**；**推翻 A-010「禁 force-push」**，须先落 A-010 带日期修订注记；驳回调研 ① 的重写推荐仅因本仓 A-010 反向约束，现由用户裁定覆盖）（**驳回调研 ①**） | Git 官方「pushed as final unless good reason」；本仓 A-010 动机即「防历史不可信」 |
| **B⑧** | ADR-0005 非 Notes H2 节 | **迁入 Notes 区**（`## 二次裁决的量化门槛` → Notes 下的 `###` 子节，内容逐字保留）**＋ 同步更新 ADR 头部 `date` 字段** | MADR：小幅澄清/补充→带日期注记，**不改正文**；不建议新增正文 H2 节 |
| **B⑨** | `verify-tickets.yml` 的 `push: cch/**` | **显式登记，不收窄**；载体 = 在 **ADR-0006 加一行带日期注记**（**不新开 ADR**） | 通配符是官方推荐形态（封闭集合才用枚举）；触发面变更属「管道行为契约变更」，应可见可追溯 |
| **B⑩** | `32-real-site-corpus.mjs` verdict↔expect 谓词 | **ADR-0008 加带日期 Notes 登记联动语义**，**不新立 ADR**；**并注明本仓已具备机器校验**（`:193–201`）⇒ **领先业界基线**，剩余缺口仅文档化 | dotnet Known Issues：联动约束应**代码化**；本仓已满足，无需新增校验 |
| **C⑪** | T-15 波次授权留痕 | **用户已答「有」⇒ 确有授权**；由用户作出追认，标注 **retroactive**；**我仅可代笔记录**，不得单方面补录 | 铁律：*auditors care about the trail, not the intent*；**执行者自证在审计上无效** |
| **C⑫** | T-14② 语义裁定授权留痕 | 同上（由你追认） | 同上 |
| **C⑭** | CRLF 漂移 121 文件 | **一次性清账**＋**新增 `.editorconfig`（`end_of_line = lf`）**；清账方式 = **纯字节级 LF 归一**（就地对 121 文件重写），**不用** `git reset --hard`／`git rm -r --cached .` | 业界：工作区 CRLF 是**正常预期行为**；一次性机械清账，不长期登记 |

### 对撞明细（Q4 调研 对 D-001…D-005）

| current 记录 | 对撞结果 |
|---|---|
| **D-001**（议程 = 收口治理 + 证据闭环） | **一致且同向**；Q4 七项均为「收口」面 |
| **D-002**（融合在途变更） | 无涉（其 C⑬ 已闭环） |
| **D-003**（`.scratch/` 受管、不可抛弃、保持 Git 跟踪） | 一致；D-006 不涉 `.scratch/` 定位 |
| **D-004**（受管区内部治理：分区 + 留痕三件套 + 事故回溯 ADR） | **强同向**：调研 ⑦ 的 findings register 与 D-004② 的「外部输入留痕三件套」同构；**D-006 的 D-007 采纳项可直接复用 D-004 的留痕机制** |
| **D-005**（被忽略目录处置） | 无涉；Q4 未触及忽略规则 |

### 与已 accepted ADR／既有纪律的实质冲突（已登记，未静默采纳）

- **张力⑤（本轮首次触到 A 台账的 implemented 纪律）**：调研 ① 推荐「单人仓库倾向重写已推送提交信息」；本仓 **A-010（implemented）** 显式约束「**禁 force-push**；已归零旧历史不重写（不可逆）」，**WORKFLOW §4.2** 同向。⇒ **用户已显式拍板：授权 force-push 重写**，**推翻 A-010 的「禁 force-push」约束**。落地要求：① 先在 A-010 落**带日期修订注记**（不重写原文）；② 重写前**建备份 ref**；③ 用 `--force-with-lease`；④ 重写后**逐提交校验 tree 不变**（只改 message）。
- **ADR-0006 决策 1**：D-003 已授权修订「可抛弃调研现场」表述 ⇒ 非新张力。
- **ADR-0008 / ADR-0009**：B⑩ 的处理为「带日期 Notes 登记」，不触语料 append-only 与冻结档位。
- **CONTEXT.md 35 术语**：Q4 新增概念（findings register / 分级豁免）按 **D-009／D-013 纪律为机制**，**不入术语表** ⇒ 不触 7 条上限。

---

---

## 执行证据 — D-006 / A6 force-push 重写（2026-09-18 · 本会话）

| 项 | 结果 |
|---|---|
| 规则修订（**前置**） | `A-010` 追加带日期修订注记；`WORKFLOW §4.2` 追加「**一次性例外**」注记（原文保留、不删改）—— commit `kot` |
| 备份 ref | `refs/backup/main-pre-rewrite` → `b1fcf96d27cd762dc2edf2ed4e2b34e3b5116a71` |
| 旧 sha（3 个） | `e63e8253`（t16）· `337461e8`（t17）· `b1fcf96d`（t18） |
| 新 sha（3 个） | `6fbca4c7`（t16）· `d856d75f`（t17）· `d075f01a`（t18） |
| 重写方式 | `git commit-tree`（保留 author/committer 身份与日期）+ `git update-ref`（**未 checkout、未动工作区**） |
| 校验（逐提交） | tree **逐一相同**（`361075d9…` / `f79f7f20…` / `a4c9f253…`）；author/committer **完全保留**；t17/t18 **正文逐字相同**；t16 正文按口径改正 |
| 最终内容一致性 | `main` 的 tree == `backup` 的 tree == `a4c9f2535c2ef08b47355246687331529bf9dda8` ⇒ **内容零变化** |
| 推送 | `git push --force-with-lease origin main` → `+ b1fcf96d...d075f01a main -> main (forced update)`，**exit 0** |
| 推送后核验 | `origin/main` = `d075f01a` = 本地 `main`；`but pull` → 3 upstream commits，`cch/17-cycle8-grill` **rebased 成功**（12 提交完好） |
| 旧 sha 可解析性 | 本地 `git cat-file -t` 对 3 个旧 sha 均返回 `commit`（备份 ref 保活） |
| 消息改动（**唯一内容差异**） | 旧：`13 张票（12 完整 + T-14 部分）` → 新：`15/15 票（T-01…T-15）`；其余字句**逐字保留** |

> **限制与提醒**：本仓 `main` 为 **PUBLIC** 分支，本次重写使已 clone 者失效、并作废这 3 个 sha 上的 CI 记录（Actions 将对新 sha 重跑）。A-010 与 WORKFLOW §4.2 的修订注记已把本例外**严格限定为「仅此一次、仅此一个提交信息」**，不得据为先例。

---

## 覆盖率自评

- 已确认条目：**7**（D-001…D-007 = current）｜revised：0｜stale：0｜deferred：0｜pending：**0**
- 本问覆盖：输入面（B）· 融合（闭环）· `.scratch/` 定性（D-003）· Q3 作用域（D-004·D-005）· **Q4 审计遗留 7 项（D-006）+ 新增心智模型（D-007）** 均已定稿
- **审计遗留 9 项进度**：**A6 已闭环（force-push 完成）** · B⑦ 已拍板（D-003）· B⑧⑨⑩ 已拍板（D-006）· C⑪⑫ 已闭环（追认落盘）· **C⑬ 已闭环（D-002）** · C⑭ 已拍板（D-006）
- 待决（frontier）：**D-006 未执行的落地项**（B⑧ ADR-0005 迁 Notes + 更新 `date`；B⑨ ADR-0006 注记；B⑩ ADR-0008 注记；C⑭ LF 清账 + `.editorconfig`）· **D-003 的落地项**（ADR-0006 决策 1 修订）· **D-004/D-005 的落地项**（`.scratch/` 分区 + 留痕三件套 + 事故回溯 ADR + `check-ignore` 门禁）· `audit-closeout` §5 的 **Q3 · Q5 · Q6 · Q7** · 新登记 **F-1…F-8**

---

## T-09 四问深度调研与编排侧对撞（2026-09-18 · 本会话）

> **依据**：`handoffs/next-round.md` §2 T-09（「4 问均已定稿并落账（D-008 起）」）＋ 用户本会话指令（提交 atomcode 深度调研；对撞后**禁止静默改向**）。
> **载体**：`atomcode -p`（Exa + Tavily + AnySearch + Patchright；**只读联网**，无法读本仓文件）⇒ **「回顾账本 / ADR / CONTEXT」由编排侧承担**（见下方逐问对撞表）；「工业界成熟心智模型」由 atomcode 承担。
> **串行护栏**：4 问**逐问串行**提交（同一时刻至多 1 个在途），**未并发**。
> **存档**：`research/q3-ci-evidence-loop.md` · `research/q5-site-level-threshold-measurability.md` · `research/q6-distribution-sync-confirmation.md` · `research/q7-release-cadence.md`
> **本段为纯追加**：上方 D-001…D-007 原文与状态**未动**。

### 一、编排侧对撞 — 逐问

| Q | 调研核心结论（1 句） | 受影响 current 记录 | 对撞判定 |
|---|---|---|---|
| **Q3** | 单人仓库也走 trunk-based + 短命分支 + PR 门禁 + **squash merge**；**main 上的绿 run** 才是权威验收锚点（分支 run 只证明候选）；`push ≠ 落地` | D-001⑤（门禁证据只认 CI run/artifact）· D-006 B⑨（`push: cch/**` 触发面登记）· ADR-0006 决策 2（PR 门控）· ADR-0010 | **同向，无冲突**（三处均被调研正面印证）。**新张力 T-1**：本仓 landing 模型 = GitButler **逐提交 land**（Cycle-7 落地 19 分支/16 栈，多提交），而调研的 squash 单提交模型要求「revert 单元 = 发版单元 = 证据单元」⇒ 两者**不成立** |
| **Q5** | 站点级 FPR 是稀有二项事件：**rule of three** 定零事件上界（1‰ 需 n ≥ **3000** 站点零误报）→ 分层 Wilson → **OC 双点（AQL/LTPD）** → SRE 燃烧率渐进处置；且门槛应设在 **auto 档**，lowkey 只监控不阻断 | ADR-0005（门槛①②）· ADR-0005 Notes（T-13 实测）· ADR-0009（档位冻结）· ADR-0008 决策 1（真实站点层不进 PR）· ADR-0010（发布门） | **同向，无冲突**：调研的「阻断发版」落在**已有** ADR-0010 发布门，**不触碰** ADR-0008 决策 1 的 PR 排除条款；「门槛设在 auto 档」是对门槛①②口径的**收窄澄清**（原文未指定档位）。**新张力 T-2**：~3000 站点语料在「受管区（D-003/D-005③）＋ 忽略边界（D-005）＋ CONTEXT「形态语料·原始快照不入库」＋ ADR-0013 反证条件 1」四条约束下**承载面无解** |
| **Q6** | 分发平台**无审核门**（同步即发布）；确认责任 100% 在作者；业界把确认门**前移到仓库侧**——同步源只跟 **release 分支/tag**、以 **`@version` 变更**为唯一发布门；留痕三层（Git tag/changelog + CI run/审批 + 平台版本历史） | **Cycle-7 D-002**（GF 送达链口径）· ADR-0006「monitor 例外 · 联动裁定」（**把控制点登记为「站内 sync 开关的人工确认」**）· D-006 B⑨ | **无 D-xxx 冲突**：D-002③「保留拉取式同步兜底」与调研的 release 分支/tag 拉取**同构**（调研只是**指定了 ref**）；D-002 负向（禁 CI 主动写 GF / 禁伪造 cookie hack）调研**未触碰**。**但**：调研**取代**了现行残留的**控制点选型**（站内人工确认 → 仓库侧版本门）⇒ 该「改向」**已显式登记、未静默采纳**（见下「待裁定」） |
| **Q7** | 小型项目默认 = **每个变更保持可发布、按固定节奏/积累阈值批量对外发版**（time-based / changesets 式），**安全与严重 bug 的 patch 随时插发不排队**；纯「每 commit 即发」与「攒很久才爆发」两端均被批评；判据 = 消费者边界 / 发布摩擦 / 成熟度阶梯 / 下游承受力 | **Cycle-7 D-018**（累积再发，**本轮**裁定）· ADR-0010（发布门）· ADR-0006 决策 2（发版系 workflow 例外）· CONTEXT「发布门」 | **同向，无冲突**：调研结论**支持**批量口径（changesets 式意图积累 + 定期收割），且「continuous delivery ≠ continuous deployment」与本仓「累积再发」同构。**新张力 T-3**：D-018 是**本轮**裁定而非永久政策；其严格读法（一律累积）与调研判据 5（**安全 patch 豁免、不排队**）相抵 |

### 二、冲突处置结论（按用户指令）

- **未触发 `revised` 机制**：逐条对撞后，**没有任何 current D-xxx 被调研结论实质推翻**。⇒ 依「禁止静默改向」的**对称义务**，**不得反向擅自改标**；改标与否属**用户裁定面**。
- **3 处张力已显式登记（未静默采纳）**：**T-1**（landing/提交模型）· **T-2**（站点级语料承载面）· **T-3**（安全 patch 豁免 vs 累积再发严格读法）。
- **1 处「控制点选型替代」已显式登记（未静默采纳）**：**Q6** —— 现行残留的控制点是「站内 sync 开关人工确认」，调研主张改为**仓库侧版本门**。**两个选项待裁定**：(a) 修订 ADR-0006 联动裁定（该记录标 `revised`，保留原文）；(b) 保留现行 + 把仓库侧门作为**补强**（两者并存）。
- **未继续下探**：4 问均止于 `pending`；**未立票、未改代码、未动 workflow**（依用户「等我拍板后才继续下探」）。

### 三、新增条目（D-008…D-011，均 `pending`）

| ID | 原问题 | 调研结论（摘要） | 规范化需求（推荐） | 显式约束 / 负向需求 | 状态 |
|---|---|---|---|---|---|
| **D-008** | Q3 — CI 闭环形态：何时 push、哪些分支先落地、run ID 作为闭环证据的口径？ | 口径分界：`push ≠ 落地`；**落地事件 = required checks 绿后的 squash merge**；**权威验收证据 = main 上的绿 run**（分支 run 只作增量确认）；main 保护禁 force-push/删除 + Require status checks；单人**不开 Require approvals**；不需要 merge queue | ① 授权 `push` 后，**分支 run 作增量确认**；② 合入 main 后取 **main 上的 run** 作闭环证据（**run ID 入账**）；③ 启用 main 分支保护（禁 force-push/删除 + Require status checks，job 名唯一）；④ 只开 squash merge；⑤ 验收口径一句话：`PR #N + required checks 绿 + main commit <sha> + Release run <id>` | 不得把**分支 push 的 run** 当作闭环证据；不得开 Require approvals（自审自批/admin 死锁）；不引入 merge queue（10+ 人工具）；**T-1 未决前不得改 landing 模型** | current |
| **D-009** | Q5 — T-13 门槛②「< 1／千站点 + 可一键上报」的可测化路径与站点级伪 select 语料抽样预算？ | 零事件上界：1‰ + 95% CI 上界 < 门槛 ⇒ **n ≥ 3000 良性站点零误报**（rule of three 3/n；< 0.5‰ 则 6000）；分层 + Neyman 配额；判定用 **OC 双点**（AQL 0.5‰ / LTPD 2‰）反解 (n,c)；运行期用**燃烧率渐进处置**（>3× 阻断发版 / >1× 冻结并扩样 / <0.5× 常态）；门槛设在 **`tier ∈ {auto}`**，`lowkey` 只监控；配 FP/FN 双指标 + 一键上报率 + reviewer agreement ≥90%；**先行 pilot ~500 站点**估层内方差 | ① 门槛②改为**零事件上界口径**（而非点估计）；② 引入**分层站点语料 + Neyman 配额**；③ 判定改 **OC 双点 + 燃烧率**；④ 门槛收窄至 **auto 档**；⑤ 绝对量与比率双报 | 不得用**点估计**判门槛；不得用**正态近似 CI**（1e-3 量级下覆盖差）；不得用 **Clopper-Pearson**（过保守，多花 10–20% 样本）；不得把 FP 率单独设为 KPI；**T-2（语料承载面）未决前本票不得开工** | current |
| **D-010** | Q6 — GF 站内 `sync` 开关的人工确认责任人与时点？ | 确认人 = **能向 release 分支（或 tag）合并代码的人**（单人项目即维护者本人）；确认时点 = **`@version` 变更为唯一发布门**；**同步源只跟 release 分支或 tag，绝不跟 `main`**；留痕三层（Git tag/changelog · CI run/可选 environment required reviewers · 平台版本历史）；红线 = **绝不让自动同步跟随「维护权可能易手的上游」**（The Great Suspender 教训） | ① 确认人与时点按调研口径定稿；② **把确认门从「站内人工确认」改为「仓库侧版本门」**（**待裁定 (a)/(b)**）；③ 同步源 ref **显式指定**并留痕 | 不得据此放宽 **D-002 负向**（禁 CI 主动写 GF、禁伪造 session cookie 的推送 hack、禁据此宣布弃用 GF）；**确认前仍不得声称 D-002 送达链已闭合**；**(a)/(b) 未拍板前不得改 ADR-0006** | current |
| **D-011** | Q7 — 交付单位：继续「累积再发」还是切 release（ADR-0010 触发）？ | 维持**批量**口径，但升级为**有节奏的批量**：每 PR 附 changeset 意图 → 固定节奏（**双周/月度**）人工收割一版 → **security/严重 bug 的 patch 随时插发不排队** → 每个发布点打 tag。判据：① 消费者边界（GF 用户自动更新 = 外部无法协同升级的下游 ⇒ **严格 SemVer + 意图积累式批量，禁全自动 patch 直发**）；② 发布摩擦；③ 成熟度阶梯（先 "hard but plausible" 固定节奏）；④ 下游承受力；⑤ **补丁豁免**；⑥ breaking **永不藏进 patch**；⑦ 积累上限（changelog 写不清/diff 审不动即收割） | ① 确立**固定发版节奏**（双周/月度）；② 引入 **changeset 意图文件**；③ **安全 patch 豁免**（不排队）；④ breaking 只进批量点 + 迁移指南 | 不得采用「每 commit 即发」（版本噪音 + 44% breaking 藏在 minor/patch + 升级疲劳）；不得「攒很久才爆发」（反馈滞后 + 发布基础设施腐化 + 风险集中）；**T-3 未决前不得改写 Cycle-7 D-018** | current |

### 四、覆盖率自评（本段追加后）

- 已确认条目：**7**（D-001…D-007 = `current`）｜**待拍板：4**（D-008…D-011 = `pending`）｜`revised`：**0**｜`stale`：0｜`deferred`：0
- 本问覆盖：**T-09 四问（Q3/Q5/Q6/Q7）均已定稿并落账（D-008 起）** ⇒ T-09 完成判据中「4 问均已定稿并落账」**已满足**；剩余仅「**用户拍板**」一步。
- 待决（frontier）：D-008…D-011 四问拍板 · 张力 T-1/T-2/T-3 · Q6 控制点选项 (a)/(b) · 是否需将任一 D-xxx 改标 `revised`。

---

## T-09 四问采纳落地（2026-09-18 · 用户拍板「采纳」）

> **依据**：用户于 2026-09-18 本会话指令「采纳，把内容全部做好，并记录报告，最终交给审计窗口」。
> **形式**：**追加**；上方「T-09 四问深度调研与编排侧对撞」段与 D-001…D-007 原文**未动**；本段只做**状态迁移**与**张力裁定落地**。

### 一、状态迁移（`pending` → `current`）

| ID | 迁移 | 落地载体 |
|---|---|---|
| **D-008** | `pending` → **`current`** | `docs/adr/0014-ci-evidence-loop-and-landing-model.md` |
| **D-009** | `pending` → **`current`** | `docs/adr/0015-site-level-quality-threshold-measurability.md` · `tests/scripts/50-site-threshold-plan.mjs` · ADR-0005 带日期注记 |
| **D-010** | `pending` → **`current`** | `docs/adr/0006-ci-hygiene-policy.md`「monitor 例外的控制点修订」带日期注记 |
| **D-011** | `pending` → **`current`** | `docs/adr/0016-release-cadence-policy.md` · `tests/scripts/51-release-readiness.mjs` |

### 二、三处张力 + 一处控制点替代的裁定

| 项 | 裁定 | 载体 | 说明 |
|---|---|---|---|
| **T-1**（landing 模型） | **有意识偏离（documented deviation）**：接受「revert 单元 = 发版单元 = 证据单元」在 GitButler 下**不完全重合**；用「一逻辑单元一提交 + 每发版点打 tag」兜住 | ADR-0014 决策 7 + 反证条件 1 | **未改** GitButler 唯一入口（硬边界） |
| **T-2**（站点级语料承载面） | **库外归档 + 指针 + SHA-256**（复用票 41 / A-018 先例）；镜像页只收**被断言的形态**、不收全量 3838 站点 | ADR-0015 决策 9 | **有意接受的偏离**：可恢复性依赖库外归档持久性 ⇒ 入 findings register |
| **T-3**（安全 patch 豁免） | Cycle-7 **D-018 的「本轮不发版」是**本轮一次性**裁定**；其「累积再发」的永久化形态 = ADR-0016，且**附加安全补丁豁免** | ADR-0016 决策 9 | 是**扩展**，非推翻（D-018 原文未含豁免） |
| **Q6 控制点** | **主控制点改为仓库侧版本门**（release 分支/tag + `@version` 变更）；站内人工确认降为**验证步** | ADR-0006 带日期注记 | 原残留结论（确认前不得声称闭合）**不变**；**未对任何 D-xxx 改标 `revised`**（ADR-0006 的该记录属**残留登记**，非 D-xxx 决策） |

### 三、对调研的两处数值修正（辩证性处置，已写入 ADR）

1. **Wilson 守口径 = 3838，不是 3000**：调研的 3000 是 rule of three（3/n）口径；Wilson 上界在 k = 0 时约 `z²/n`，门槛 1‰、95% 置信需 **n ≥ 3838**（实算）。⇒ 操作值取 3838。
2. **调研引用的 OC 计划 (n = 3000, c = 2) 经复算不满足 AQL 约束**：`P(接受|AQL) = 0.8089 < 0.95`。⇒ 实算最小可行计划 = **n 4636 / c 5**（α = 0.0309、β = 0.0999）。

### 四、覆盖率自评（本段追加后）

- 已确认条目：**11**（D-001…D-011 全部 `current`）｜`pending`：**0**｜`revised`：**0**｜`stale`：0｜`deferred`：0
- T-09 完成判据「4 问均已定稿并落账（D-008 起）」**已满足**（含用户拍板）。
- 待决（frontier）：建站点级语料（~3838 站点 + ~500 pilot，**独立票，须授权**）· main 分支保护（GitHub 后台人工项）· push/land 授权（D-008 前提）· findings register FR-01…FR-11 到期重审（2027-03-31）。

### 五、状态位翻转留痕（2026-09-18）

> 形式：**状态列就地翻转**（沿用本仓先例：Cycle-8 `sts` 提交「经用户拍板转入台账并置 current」）；**结论原文未改**。

- D-008…D-011 四行的状态列已由 `pending` 改为 `current`（与 §一 迁移表一致）。
- 上方「T-09 四问深度调研与编排侧对撞」段内 D-008…D-011 的**结论正文未改**（只改状态列）。
- 修复动因：自检发现「迁移表已写 current、但行内状态列仍为 pending」的**自相矛盾**（审计上不可接受）。

---

## 补记 — D-005③ 的作用域豁免与 `revised` 语义定义（2026-09-18 · 审计返工窗口）

> **日期**：2026-09-18｜**作者**：审计返工窗口｜**依据**：审计报告 **F-2**。
> **形式**：**追加**；D-005 行原文与全表状态列**未动**。

- **D-005③ 原文**：「不可再生的外部输入一律进受管区（不得落在任何被忽略目录）」。
- **T-2 裁定造成的豁免**：T-2（站点级语料承载面）裁定为「**库外归档 + 指针 + SHA-256**」（ADR-0015 决策 9）⇒ 站点级语料的**原始快照落在仓库之外**，与 D-005③「一律进受管区」的**字面口径不相容**。该偏离已登记为张力 T-2 并落 FR-09（非静默），但 D-005 行未加注记。
- **`revised` 语义（写死）**：`revised` = **current 决策被后续裁定推翻**（决策方向反转）。本仓口径下，D-005③ 因 T-2 裁定发生的**作用域收窄**（新增「库外归档」豁免）登记为**偏离（documented deviation）**，**不计入 `revised`** ⇒ 头部结论 `revised = 0` 在**该语义**下成立。

---

## 追认 — T-1 / T-2 / T-3 三项张力裁定经用户逐条追认（2026-09-18 · 用户授权窗口）

> **日期**：2026-09-18｜**依据**：审计报告 **F-3**（本轮**唯一实质未闭合项**）
> **形式**：**追加**；上方各段与 D-001…D-011 原文**未动**。
> **性质**：本记录是**用户本人**的追认落账，**非执行窗口自裁**。

- **背景**：D-008 / D-009 / D-011 三条**负向前置**在采纳落地时由**执行窗口自行裁定解除**；审计窗口**不代为追认**（审计报告 §4-F-3）。
- **用户指令原文（2026-09-18）**：「确认确认确认。给你权限。之后push，之后删除所有已经合并的分支」。
- **逐条追认**：

| 前置 | 原负向条款（台账原文） | 用户裁定 | 落地载体 |
|---|---|---|---|
| **T-1** | D-008：「**T-1 未决前不得改 landing 模型**」 | **确认**（采纳 ADR-0014 的**有意识偏离**） | `docs/adr/0014-ci-evidence-loop-and-landing-model.md` 决策 7 |
| **T-2** | D-009：「**T-2（语料承载面）未决前本票不得开工**」 | **确认**（采纳「**库外归档 + 指针 + SHA-256**」） | `docs/adr/0015-site-level-quality-threshold-measurability.md` 决策 9 |
| **T-3** | D-011：「**T-3 未决前不得改写 Cycle-7 D-018**」 | **确认**（采纳 ADR-0016 的**扩展**形态，非推翻） | `docs/adr/0016-release-cadence-policy.md` 决策 9 |

- **⇒ F-3 闭合**：三条负向前置的解除**已由用户本人逐条追认**；执行窗口的自裁**获追认**。
- **未变更**：D-001…D-011 状态列（**11 current / 0 pending / 0 revised**）与本段以上全部原文。

---

## 冲突核对 — atomcode 深度调研 对 current 决策（2026-09-18 · 用户授权窗口）

> **形式**：**追加**；D-001…D-011 全表原文与状态列**未动**。
> **用户指令原文**：「调研的结果辩证性看待 若调研结论与账本中任何 current 决策冲突：禁止静默改向——把对应 D-xxx 标记为 revised（保留原记录），生成新的 D-xxx 记录呈报给我，等我拍板后才继续下探。」

### 一、调研结论摘要（供对撞）

| # | 结论 | 依据 |
|---|---|---|
| R-1 | 主流 = **冻结快照 + 独立 provenance manifest**（双轨制）；「**域名出现在 fixture 目录是合规的，出现在网络调用里才是违规的**」 | pagemark `testdata/real-world/`（URL 活在 `fixtures.json`，测试只读文件永不触网） |
| R-2 | 密封门禁的正确实现是**运行时拦截**（拦 `socket.connect`／网络层），而非**文本禁令**；SLSA 的 hermetic 与其 `materials[*].uri` 真实 URL 在同一标准内共存 | pytest-test-categories；SLSA provenance |
| R-3 | 若真实域名确需出现在测试面 → **重分级或 Record-Replay**（URL 留在 cassette），**而非拆门禁** | Google Arguelles |

### 二、逐条对撞 — D-001…D-011（11 条，全 current）

| current 记录 | 对撞结果 |
|---|---|
| D-001 议程＝收口治理＋证据闭环 | 无涉 |
| D-002 融合在途变更 | 无涉 |
| D-003 `.scratch/` 受管、原地保留、保持 Git 跟踪 | 无涉 |
| **D-004** 受管区内部治理：外部输入留痕三件套（入库 ＋ **SHA-256 ＋ 来源 URL ＋ 抓取日期** ＋ push）；不可再生外部输入一律进受管区 | **强印证（同向）**：R-1／R-2 均把 provenance 归入「采集／构建期元数据」；**本条即下文张力的现行约束方（要求保留来源 URL）** |
| D-005 被忽略目录处置 | 无涉 |
| D-006 审计遗留 7 项处置 | 无涉 |
| **D-007** findings register ＋ 例外生命周期 | **同向**：本段即「登记 ＋ 具名签核 ＋ 待裁定」的 register 形态 |
| D-008 CI 证据闭环（ADR-0014） | 无涉 |
| D-009 T-13 门槛可测化（ADR-0015） | 无涉 |
| D-010 GF sync 控制点（ADR-0006 注记） | 无涉 |
| D-011 发版节奏（ADR-0016） | 无涉 |

**⇒ 判定：无任何 current D-xxx 被调研结论推翻（决策方向反转）。** 依本账本已写死的 `revised` 语义（`revised` = current 决策被后续裁定推翻），**不触发 `revised`**；亦依「禁止静默改向」的**对称义务**，**不得反向擅自改标**。
**状态列不变：11 current ／ 0 pending ／ 0 revised。**

### 三、冲突的真实位置（登记，未静默改向）

**冲突不在「调研 ⟷ 账本」，而在「票 39 验收条款 G4e ⟷ 本仓已 accepted 的密封／溯源纪律集群」。**

| 侧 | 条款 | 层级 |
|---|---|---|
| **A** | `verify-ticket-39.mjs` G4e「live 目标 host **不出现在**密封 spec/fixture/corpus/helper/config」＝ 对 `sealedFiles` 全文 `c.includes(host)` **裸子串扫描（不剥注释、不分位置）** | 票 39 delta 验收条款（任务书 `issues/39-real-site-enablement.md`「delta 落实」） |
| **B1** | `CONTEXT.md:112–113`「**密封 E2E**：E2E 仅依赖仓库内 fixtures/corpus 与本地 server 供给、**不触真实站点与外网**的**供给边界**」 | CONTEXT 术语（工程门禁与仓库卫生节） |
| **B2** | `tests/corpus/forms/README.md:69`「镜像页**零外链**／零分析脚本，hermetic」＋ **`:71`「标 `source_url` ＋ `captured_at`：`manifest.json` 每条 entry 均有；镜像页头注释同步标注」** | 语料合规口径（D-008／issue 验收项 6） |
| **B3** | `verify-ticket-06.mjs`：**`:145–147`** `stripComments(html)` 后断言无外部 `src=`／`href=`／CSS `url()`（**引用位**断言）；**`:141–143`** 强制 provenance 四键存在；**`:131`** 品牌词表经 `bodyText()`（**剥注释**）判定 | PR 阻断门（`verify-tickets.yml` 21 票级门之一，**当前为绿**） |
| **B4** | `ADR-0008 决策 4`：语料改动 **append-only**；漂移即 CI 红——**这是设计意图，不是噪声** | accepted ADR |
| **B5** | `D-004`（current）：外部输入留痕三件套含**来源 URL**；不可再生外部输入一律进受管区 | 本账本 |
| **B6** | `verify-ticket-06.mjs:111/114/117` **S2 指纹完整性**：镜像页与骨架文件 SHA-256 必须与 `manifest.json` 逐条一致；`:202` 断言 README 纪律「**绝不为修绿而盲目更新快照**」 | PR 阻断门（同上） |

**结构性互斥链（本段核心判定，逐步可验）：**

1. 满足 **A** ⇒ 须从 `tests/corpus/forms/**` 移除 `cdpn.io` 全部出现（实测 **5 处**）。
2. 其中 2 处在 `mirrors/*.html`、1 处在 `skeletons/*.json` ⇒ 编辑即**打破 B6 的 SHA-256 一致性**，`verify-ticket-06` **转红**。
3. 修复 B6 须重生成 `manifest.json` 哈希（`06-manifest.mjs`）⇒ 即**语料内容变更**，触发 **B4**（append-only／漂移即红）与 B6 的「绝不为修绿而盲目更新快照」纪律。
4. 且移除即**销毁 B2:71 与 B5 要求留痕的来源 URL** ⇒ 违反 **D-004（current）**。
⇒ **A 无法在不破坏至少一条已 accepted 的 PR 阻断门或一条 current 决策的前提下被满足。属结构性冲突，非成本取舍。**

**实测证伪「真违规」假设（引用位普查）：**

对 G4e 的 5 处命中逐处定位（复刻其扫描口径）：

| 文件 | 行 | 位置性质 | 引用位？ |
|---|---|---|---|
| `tests/corpus/forms/manifest.json` | 129 | `source_url` 字段值 | 否 |
| `tests/corpus/forms/sources.json` | 32 | 采集源登记 `url` 字段（`06-capture-forms.mjs:118` 生成） | 否 |
| `tests/corpus/forms/skeletons/codepen-iti-v17.json` | 6 | `source_url` 字段值 | 否 |
| `tests/corpus/forms/mirrors/codepen-iti-v17.html` | 11 | HTML 头注释 `source_url` 标注 | 否 |
| `tests/corpus/forms/mirrors/codepen-iti-v17-child.html` | 11 | HTML 头注释 `source_url` 标注 | 否 |

**汇总：命中 5 处，可发起引用位命中 0 处 ⇒ 假阳性率 100%。** 另：`codepen.io` 在密封面**零命中**（仅出现于第二层 `tests/live/site-manifest.json` 与 gate 脚本自身）⇒ **密封层无任何真实外网引用**，B1 的供给边界不变量**当前实际成立**。

**⇒ 判定：`revised` 不触发（无 current 决策被推翻）；但 A（G4e）须被精化——改验收条款属决策变更，故新立 D-012 呈报待拍板。拍板前不动 `verify-ticket-39.mjs`／不动 workflow／不动语料／不立票。**

### 四、新增条目 D-012（`pending`）

| ID | 原问题 | 调研结论（摘要） | 规范化需求（推荐） | 显式约束／负向需求 | 状态 |
|---|---|---|---|---|---|
| **D-012** | 票 39 G4e「live host 不出现在密封面」与 `verify-ticket-06` S2/S3 结构性互斥（修 G4e 必破 06），如何收口？ | R-1／R-2：溯源属采集期元数据；密封门禁应落**运行时可执行面**；「域名出现在 fixture 目录是合规的，出现在网络调用里才是违规的」 | **精化 A 到 B3 同口径 ＋ 正向补偿**：① G4e 改为**引用位断言**——`stripComments`（HTML）后扫描 `liveHosts`，**仅在可发起引用位置**（`src=`／`href=`／`url(`／`fetch(`／`import(`／`route(`／`goto(`／`new URL(`）命中才 FAIL，并显式排除 provenance 键值位（`source_url`／`mirror_of`／`license_note`／`captured_at` 及 `sources.json` 的采集源登记字段）；② **保留** B3 的 provenance 强制、B6 的 SHA-256 一致性与 B4 的 append-only；③ **正向补偿**：在密封供给面加**运行时网络封锁**（非本地 origin 的请求一律 `abort()`，命中即 FAIL），把不变量钉到**不可被字符串拼接绕过**的层；④ 票 39 任务书「delta 落实」行加**带日期注记**（原文保留、不删改） | ① 拍板前不得改 `verify-ticket-39.mjs`／workflow／语料；② 不得删除或弱化 B3 的 provenance 四键断言；③ 不得改写既有语料（B4）；④ 不得把 G4e 降级为「白名单豁免 5 个文件」式点修；⑤ 精化后 G4e **断言强度不得低于**「live host 不得出现在任何可发起引用位置」；⑥ 不得新开 ADR（属既有意图的实现选型修正，走带日期注记） | `pending` |

**已评估并否决的备选（留痕）：**

| 备选 | 否决理由 |
|---|---|
| (E1) 删除语料中的来源 URL 以满足 A | 违反 B2:71／B5（D-004 来源 URL 留痕）＋ 触发 B6（SHA-256 断裂／「绝不为修绿而盲目更新快照」）＋ B4（append-only）；代价远大于收益 |
| (E2) 对 5 个 provenance 文件做**白名单豁免** | 保留粗断言 ＋ 埋维护陷阱（新增语料即再红）；违反 D-012 约束④ |
| (E3) 把 live 目标换名规避（如改写成 `codepen.io`） | **无效**：`liveHosts` 实测 = `{cdpn.io, codepen.io}` 双 host，语料两处均有；且属「改数据迁就断言」，违反 B4 |

### 五、状态位与覆盖率自评（本段追加后）

- 已确认条目：**11**（D-001…D-011 ＝ `current`）｜**待拍板：1**（D-012 ＝ `pending`）｜`revised`：**0**｜`stale`：0｜`deferred`：0
- 待决（frontier）：**D-012 拍板** · 票 39 gate 修法 · 是否需将任一 D-xxx 改标 `revised`（**本轮判定：否**）
- **未继续下探**：未改 `tests/scripts/verify-ticket-39.mjs`、未改任何 `.github/workflows/*.yml`、未改语料、未立票。
