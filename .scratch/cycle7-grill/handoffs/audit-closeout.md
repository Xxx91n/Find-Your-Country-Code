# audit-closeout.md — Cycle-7 审计收口交接

> **用途**：本轮（cycle-7 grill）实施 + 独立审计后的收口交接。**不复制其他工件正文**，只给「去哪找 ＋ 现状 ＋ 下一步」＋ **下一个 grill 方向指示**。
> **生成**：2026-09-17（审计窗口）｜**状态**：实施 15/15 票已落地并已审计；**审计结论 = 功能面通过 / 文本面有条件通过**；**尚未 push ⇒ 无 CI run**
> **分支**：`cch/16-cycle7-grill` ＋ 16 个票级分支（均在 GitButler applied 态，未 `but land`／`but push`）
> **基线**：`origin/main` = `a93cb3a8`（v1.7.0）｜**被审态**：`HEAD` = `05d07f3a`（GitButler Workspace Commit）

---

## 0. 一句话现状

Cycle-7 的 A（收口债清账）+ B（检测能力扩张）**全部 15 票已落地且经独立硬验收通过**（提交态：`tsc` 0 ／ build 0 ／ dist **169,993 B** ／ E2E **146 passed, 0 failed** ／ 21 张票级门 **20/21 绿**，唯一红＝票 39 基线预存红）；**剩余工作全是「处置审计发现 + 取 CI 闭环 + 纳管并行在途修复」**，而非功能开发。

---

## 1. 必读（按序）

1. **`.scratch/cycle7-grill/reports/2026-09-17-audit-report.md`** —— 本轮审计报告（§2 声明→证据→结论 34 行对照表；§3 D-xxx 逐条；§4 过程违规与需裁定项；§6 处置建议与重跑清单）。**唯一新增权威结论。**
2. `.scratch/cycle7-grill/reports/2026-09-17-report.md` —— 修复窗口实施报告（被审对象）。
3. `.scratch/cycle7-grill/decision-ledger.md` —— D-001…D-019（19/19 current），**唯一权威需求面**。
4. `.scratch/cycle7-grill/spec.md` · `.scratch/cycle7-grill/handoffs/next-round.md` —— S-01…S-11 ／ T-01…T-15 完成判据。
5. `CONTEXT.md` · `docs/adr/`（本轮已改：0003/0004/0005/0006，新增 0012）。

---

## 2. 审计已定的「不能动」结论（不得再被推翻）

- **提交态硬验收全绿且数字精确吻合**（169,993 B ／ 146 passed ／ 20/21）——已用 `git archive HEAD` 隔离重建验证，**不是转述**。
- **票 39 红 = 基线预存红**：断言代码（`verify-ticket-39.mjs`）与输入（`tests/corpus/forms/**`、`tests/live/site-manifest.json`）**均不在本轮 76 个变更文件内**；§5.6 的 7 条结构性证据已逐条复现一致。**不要在本轮范围内“修”它。**
- **主审已推翻 2 条子代理误判**，不得重新引入：①「`src/` 新增 7 处非空断言」→ 实测 **5**（报告正确）；②「ADR-0012 行号锚点系统性偏移」→ 按 HEAD 逐条复核**精确命中**（误因：子代理读了含并行未提交改动的脏工作区）。
- **零网络面**（`src/` 0 命中）、**语料零物理删除**（`- "id"` 行 = 0）、**`package.json` 1.7.0 未动**、**`CONTEXT.md` 未动** —— 已实测。

---

## 3. 待处置清单（逐条与审计报告 §6 对应，**不在此处重述内容**）

| 分组 | 审计报告锚点 | 性质 |
|---|---|---|
| A｜打回原修复窗口返工（6 项，低风险纯文本/元数据） | §6.1 第 1–6 条 | `countries.ts` 行尾自述失真、CRLF 计数 124→121、§9.5 基数 59→56、ADR-0006 尾空行、票号误标「票 12」、t16 提交信息 |
| B｜呈报用户批准后修（4 项，涉架构/门禁/ADR） | §6.2 第 7–10 条 | `.scratch/` 成为 CI 依赖、ADR-0005 非 Notes H2 节、`push: cch/**` 触发面、`32-real-site-corpus` 谓词变更 |
| C｜须用户裁定（4 项） | §6.3 第 11–14 条 | T-15 波次授权留痕、T-14② 裁定授权留痕、并行在途修复的验收纳管、CRLF 漂移 121 文件 |
| D｜重跑清单 | §6.4 | **无论谁修，修完必须重跑同一套验收** |

---

## 4. ⚠️ 并行在途工作流（**开工前必读**）

审计时点工作区存在**另一窗口的在途未提交变更**（`but status` 的 `zz [uncommitted]`）：

```
M  src/detect/index.ts
M  tests/scripts/verify-ticket-29.mjs
?? tests/contenteditable-scan.spec.ts
?? tests/fixtures/contenteditable-dial.html
```

它正在补齐报告 §6#6／§7 自认的两个 T-12 残留（缺口 2a：`SCAN_SELECTORS` 加 `:not([contenteditable="false"])`；缺口 2b：`contenteditable` 入 `OBSERVED_ATTRS`/`_fingerprint`，并新增扫描层端到端 fixture + 3 个 E2E 用例）。

**影响**：带上该未提交工作流后，工作区实测为 **build 171,171 B ／ E2E 149 passed**（与提交态 169,993 B ／ 146 passed 的差值可完整归因，见审计报告 §1.2）。

**纪律**：
- 本窗口与该工作流**互不影响**；**不得**替它提交、改写或回退。
- 它提交前**必须**走审计报告 §6.4 同一套验收（含 `verify-29` 断言变更复核）。
- 任何「取提交态基准」的测量，**一律用 `git archive HEAD` 隔离重建**，不得以脏工作区数值冒充提交态。

---

## 5. 下一个 grill 方向指示（待用户拍板）

**方向主轴**：从「交付功能」转为「**收口治理 + 证据闭环**」。

建议下轮 grill 的 Q 序：

| Q | 问题 | 为何现在问 |
|---|---|---|
| **Q1** | 审计发现的处置口径：A 组返工由谁执行、B 组是否批准、C 组是否追认？各自的**留痕位置**与**重跑要求**？ | 审计已出，但**未获用户追认**；未处置前本周期不能算收口 |
| **Q2** | `.scratch/` 是否转为**受管工件**？三选一：(a) 票据勾销数据迁出 `.scratch/`；(b) 补 ADR-0006 例外条款承认该目录受管；(c) `issue-checkbox-audit` 降为 advisory | T-07 的 CI 门已使可抛弃工作区成为构建依赖，与 ADR-0006 后果相抵 |
| **Q3** | **CI 闭环形态**：何时 push、哪些分支先落地、run ID 作为闭环证据的口径？ | D-018「累积再发」的前置；无 CI run 则行为面永远只是本地自证（报告 §6#8） |
| **Q4** | 并行在途的 T-12 缺口 2a/2b：**并入本轮验收面**还是**独立立票**？ | 它正是审计发现「D-014 语料先行弱化」的修复，归属不定会导致验收面漏管 |
| **Q5** | T-13 门槛②「<1／千站点 + 可一键上报」的**可测化路径**与站点级伪 select 语料**抽样预算** | 报告 §6#1 残留；门槛①/② 当前均不可由本仓语料测得 |
| **Q6** | GF 站内 `sync` 开关的**人工确认**责任人与时点 | D-002 送达链闭环的唯一阻塞点（公开面不可证成） |
| **Q7** | **交付单位**：继续「累积再发」还是切 release（ADR-0010 触发）？ | D-018 为**本轮**裁定；下一轮需重新拍板 |
| **Q8** | 存量 CRLF 漂移 121 文件：一次性 renormalize 还是继续登记不改？ | 报告 §6#9 残留；本周期反复出现行尾自述失真，建议一次性清账 |

---

## 6. 硬边界（每票适用，承接 `next-round.md` §1，无变更）

- 版本控制**唯一入口 `but`**；禁裸 `git` 写操作；**未获授权不得 `but land`／`but push`**。
- **ADR-0010 发布门**：本轮不触发；下轮若发版则必须走该门并登记。
- **不得声称 D-002 送达链已闭合**（除非 GF 站内 sync 已人工确认）。
- **不得降低任何既有门禁**；门禁证据只认 **CI run / artifact**。
- **语料先行**（无地基不立检测票）；**禁物理删除语料条目**（ADR-0008 决策 4）。
- **A-003 / A-023 性能红线**（1000 节点 scan < 350ms）不得回退。
- 不得引入**远程网络面**（ADR-0003 被否决路线）与 **ML / 模型**（ADR-0001）。
- **`.scratch/` 内的文件均入 Git**（`.gitignore` 未忽略）——写入即跟踪，不得当临时目录用。

---

## 7. suggested skills（下一轮开工按序加载）

- **`Skill: grill/engineering/code-review`** —— 交付前双轴评审（Standards ＋ Spec）；**注意：子代理必须按 `HEAD` 读文件，不得读含并行未提交改动的脏工作区**（本审已因此推翻 2 条误判）。
- **`Skill: gitbutler`** —— 版本控制唯一入口；`land`／`push`／`pull`／冲突解收语义必读。
- **`Skill: grill/engineering/diagnosing-bugs`** —— 处置审计发现时先用它定位，再改。
- **`Skill: grill/engineering/tdd`** —— 若并行在途的 T-12 缺口 2a/2b 需重构，红-绿-重构。
- **`Skill: grill/engineering/domain-modeling`** —— ADR / `CONTEXT.md` 维护（本轮已触 ADR-0005/0006 形式问题）。
- **`Skill: grill/engineering/resolving-merge-conflicts`** —— 多分支并行下的冲突解收（逐 hunk 按意图解，**禁 `--abort`**）。
- **`Skill: atomcode-research`** —— 深度调研护栏（同一时刻至多 1 个在途，**禁杀进程**）。
- **`Skill: grill/productivity/handoff`** —— 下一轮收口时再生成本文件。

---

## 8. 审计侧可复现命令（最小集）

```bash
# 提交态隔离重建（避免脏工作区干扰）
TMP=$(mktemp -d); git archive HEAD | tar -x -C "$TMP"
ln -s "$PWD/node_modules" "$TMP/node_modules"
ln -s "$PWD/tests/vendor/react19/node_modules" "$TMP/tests/vendor/react19/node_modules"   # 必需！否则 3 个假红
(cd "$TMP" && node node_modules/vite/bin/vite.js build && node node_modules/playwright/cli.js test --reporter=line)

# 门禁总账
node tests/scripts/verify-ticket-runner.mjs --audit
node tests/scripts/14-calibration-harness.mjs --out /tmp/c.md --json /tmp/c.json
node tests/scripts/32-real-site-corpus.mjs --out /tmp/rs.md --json /tmp/rs.json
node tests/scripts/doc-facts.mjs
node tests/scripts/issue-checkbox-audit.mjs
node tests/scripts/corpus-exemption-lint.mjs
node tests/scripts/38-gf-alignment-check.mjs
node tests/scripts/verify-ticket-02.mjs

git diff --check a93cb3a8...HEAD      # 当前非净（ADR-0006:69 尾空行）
```

---

## 9. 收口结果回写（2026-09-17 · 收口窗口）

> **本节取代本文头部三项字段**：①「尚未 push ⇒ 无 CI run」→ 已 push，CI 已 run；②「16 个票级分支均在 applied 态，未 `but land`／`but push`」→ 全部已 land + push；③「基线 `origin/main` = `a93cb3a8`」→ 新基线 `origin/main` = `337461e8`。原文按 D-010 保留，不删改。

- **§3 A 组（6 项，低风险纯文本／元数据）**：第 1–5 项已修复并复跑同一套验收全绿；**第 6 项（t16 提交信息票数口径 13 → 15/15）未执行** —— 该提交已落地，回改须 force-push `main`，属须用户授权的破坏性操作，**登记为残留**（实施报告 §13.1）。
- **§3 B 组（4 项）与 C 组（4 项）**：**均未处置**，仍待用户裁定。收口窗口未代为决定（B 组涉架构／门禁／ADR 形式；C 组涉授权留痕）。
- **落地与清理**：19 个 `cch/*` 分支（16 栈）全部 land 至 `origin/main`；本地与远端均无 `cch/*` 引用；`but clean --dry-run` = 无空分支；无残留临时目录／临时文件。
- **落地一致性**：`origin/main` 树 = 落地前隔离验证树 = `f79f7f20…`，`git diff --stat` 为空 ⇒ 已验收内容与落地内容逐字节一致。
- **落地后 CI（`337461e8`）**：Typecheck / Engine Gates / Calibration Baseline / Lockfile Regen = success；Verify Tickets 唯一红 = **票 39 基线预存红**（与 §2「不能动」结论一致，仍未修、也不应在旧范围内修）。
- **并行在途 4 项未提交变更**（`src/detect/index.ts`、`tests/contenteditable-scan.spec.ts`、`tests/fixtures/contenteditable-dial.html`、`tests/scripts/verify-ticket-29.mjs`）：本轮**未提交、未改写、未回退**，原样留在工作区（`git status --short` 可验）。§4 的纪律与 §6.3 第 13 项的要求**继续适用**：其提交前必须走同一套验收（含 `verify-29` 断言变更复核）。
- **§5 下一个 grill 方向指示（Q1–Q8）不变**，但**起点已更新**：Q1 中「A 组返工由谁执行」现仅余第 6 项残留；Q3「CI 闭环形态」已由本轮取得首个 CI run，可据 `337461e8` 的 run 结果续议；Q7「交付单位」仍待拍板（D-018 为**本轮**裁定）。
