# 票 09 窗口报告 — Cycle-6 收口

> 窗口：Cycle-6 票 09（收口层）｜日期：2026-09-17｜覆盖 A-xxx：**（无；收口层）**
> 启动器：`prompts/09-cycle6-closeout.md`｜Handoff：`handoffs/09-cycle6-closeout.md`
> 证据口径：行为面只认 CI run（WORKFLOW §8.1）；本票产物为**纯文档**，走 §8.2 本地硬验收（只读闭集），例外四要素见 §9.3。

## 0. 开工复述（阻塞项与必读清单）

**阻塞项**：票 01–08（全部实施票）。**开工前实物核对**：01–08 全部闭环（issue 勾销 + 报告落盘 + 分支 tip CI 绿）；并行票 10 / 11 亦已 W5 复核通过。

**必读清单（7 份，逐份已读）**：`handoffs/09-cycle6-closeout.md` · `issues/09-cycle6-closeout.md` · `spec.md` · `WORKFLOW.md` · `decision-ledger.md` · `.scratch/cycle6-grill/decision-ledger.md` · `docs/adr/0006-ci-hygiene-policy.md`。

**开工即发现的口径冲突（已呈报，见 §10 E-1）**：任务书 delta 写「A-026…A-033」，而实物账本已扩到 **A-036**（A-034/035/036 于 2026-09-17 W5 复核后登记并立票 10/11/12）。本票**按实物账本**结算。

## 1. AC1 勾销 — A 台账 A-026…A-036 逐条终态

### 1.1 只读验证命令与输出摘要

```
grep -n '^| A-0' .scratch/architecture-recovery/decision-ledger.md
```

输出（状态列）：A-026…A-035 = `implemented`（10 条，各附票号 + CI 锚点）；A-036 = `current（未结算）`。

| A-ID | 终态 | 去向票 | 证据锚点 |
|------|------|--------|----------|
| A-026 | implemented | 票 02 | CI `a80756ad`（Verify Ticket 02 35125953578）；**仅保留「GM 菜单设置项」一条**（D-010 取消另两条） |
| A-027 | implemented | 票 02 | CI `a80756ad`；字典化重渲染 + 菜单 id 原地更新 + 文案补齐 |
| A-028 | implemented | 票 03 | CI `29baf181`（Verify Ticket 03 35125966038）；单采集源双 serializer + 四层判定 + 分级门控 |
| A-029 | implemented | 票 01 · 05 · 07 | CI `fd02901f`（Verify Ticket 07 35126019730）；定义层 + 原语层 + 真实站点全阶梯 L0–L4 + 发布门 |
| A-030 | implemented | 票 01 · 06 | CI `8d787e5d`（Verify Ticket 06 35126009237）；阶梯归属 + 形态语料三层架构 |
| A-031 | implemented | 票 08 | CI `747763fd`（Verify Ticket 08 35127030983）；三形态入语料 + 引擎只加护栏 |
| A-032 | implemented | 票 08 | CI `747763fd`；两子形态各建 fixture + N7 机理据实修正 |
| A-033 | implemented | 票 04 | `8aa956fa`（ADR-0010 + CONTEXT.md 28→35）；**未推送 ⇒ 无 CI**（纯文档，§8.2 例外） |
| A-034 | implemented | 票 10 | CI `6a95417b`（Verify Ticket 10 35155127276 · E2E 35155127289 success）；P0 闭环 |
| A-035 | implemented | 票 11 | CI `8a27ad34`（Verify Ticket 11 35126031083）；判据按写入口形态分派 |
| A-036 | **current（未结算）** | 票 12（并行，未开工） | — |

### 1.2 结论

**A-026…A-035 = 10/10 implemented**（A-026 按 D-010 修订后口径）；**A-036 如实声明未结算**——归并行票 12（W6），收口票不承载、不代签。新增 `## Cycle-6 结算` 节（含终端 CI 锚点表、已知红归因、违规清单）。

**对账闸**：A-026…A-036 共 **11 条**，全部有票去向；无去向记录 **0 条**。

## 2. AC2 勾销 — D 账本 D-001…D-016 逐条终态

### 2.1 只读验证命令与输出摘要

```
grep -c '| current |' .scratch/cycle6-grill/decision-ledger.md   # → 0
```

D-001…D-016 状态列 **16/16** 为 `implemented`（13 条 current → implemented；3 条 revised → implemented，修订后口径生效）。逐条去向：

| D-ID | 终态 | 落实处 |
|------|------|--------|
| D-001 | implemented | 两阶段交付：阶段 A 票 01–07 建验证能力；阶段 B 票 08 失效驱动修复；页面选取权由 Agent 行使（未向用户索要清单） |
| D-002 | implemented | `tests/ACCEPTANCE-SURFACE.md` §1 裁定原则；票 07 真实站点层按外部可观测裁定 |
| D-003 | revised → implemented | 五级阶梯 / full Chromium / 跨上下文必覆盖 / L3 为最强自动化位保留；两条被 D-004 覆盖 |
| D-004 | implemented | L4 入自动化：票 01 §4.2 层归属 + 票 07 真实站点 L0–L4 实跑 |
| D-005 | implemented | `docs/adr/0010-release-gate.md` + `release.yml` `release-gate`；`real-site-smoke.yml` 无 `pull_request` |
| D-006 | implemented | 17 项 + 1 诊断项 / 持久化通用判据 / 跨隔离上下文 #14 双端断言 |
| D-007 | revised → implemented | ADR-0010 成文；术语条数条款由 D-013 覆盖为 7 |
| D-008 | implemented | 票 06 三层架构：镜像 9 + 骨架 8 + manifest 指纹 + 仓外 archive；单一 `tests/` 根；无 S3 |
| D-009 | revised → implemented | 命名「形态语料」落 `tests/corpus/forms/` |
| D-010 | implemented | 票 02：(b) GM 设置项 + (c) 三选一控件 + (d) 字典化重渲染；(a) 未采纳 |
| D-011 | implemented | 票 02：稳定 slug 深链 + 滚入可见区 + 高亮衰减 + 已开面板原地复用 |
| D-012 | implemented | 票 03：单采集源双 serializer + 四层判定 + 独立诊断视图 + 分级门控 + 环形缓冲 |
| D-013 | implemented | CONTEXT.md 7 术语落盘（28→35） |
| D-014 | implemented | 票 06 取用 8 候选页为输入；原始快照出仓不入 git |
| D-015 | implemented | 票 05：从密封层起建 primitives，两 harness 同源 |
| D-016 | implemented | 票 08：四项发现落语料/据实修正 |

### 2.2 结论

**D-001…D-016 = 16/16 落定**，无未决条款。新增 `## Cycle-6 结算` 节。

## 3. AC3 勾销 — 归档 handoff 成文且可恢复上下文

### 3.1 只读验证命令与输出摘要

```
wc -lc .scratch/architecture-recovery/handoffs/49-cycle6-closure.md
# → 112 行 / 11,102 B（UTF-8 无 BOM，LF）
```

### 3.2 可恢复性自证（fresh context 仅凭该文件可回答）

| 问题 | 所在节 |
|------|--------|
| 本轮交付了什么 | §2 逐票证据表（票 / 覆盖 A / 状态 / 实施提交 / 分支 tip / CI run） |
| 哪些还没完 | §5.1 票 12（A-036）未开工 |
| 下一步动作与授权边界 | §5.2 land 触发 release ⇒ 须用户逐次授权 |
| 有哪些已知红与违规 | §5.3 已知红归因 · §5.4 过程违规表 |
| 权威文件在哪 | §4 权威文件索引（工作流 / spec / 账本 / 验收面 / ADR-0010 / 语料 / 发布门 / 真实站点层） |
| 环境禁忌 | §7（`>nul` 禁用、工具文件字面转义陷阱、归档位置） |

## 4. AC4 勾销 — 声明本票覆盖的 A-xxx

**（无；收口层）**。本票不承载任何 A-xxx；**未编造**。

## 5. 逐票实物核验矩阵（收口层证据）

> 方法：`gh run list --branch cch/<分支>` 取**分支 tip sha** 上的全部 run（run ID 经 JSON 解析输出，避开 Go 模板浮点格式化精度丢失）；issue 勾销数 / 报告存在性用文件系统只读统计。

| 票 | issue 勾销 | 报告 | 分支 tip（远端） | 终端 CI |
|----|------------|------|------------------|----------|
| 01 | 6/6 | ✅ | `ca6403a7` | Typecheck 35125983470 · Engine Gates 35125983700 · Lockfile 35125983551 · E2E 35125983491 全 success |
| 02 | 7/7 | ✅ | `a80756ad` | Verify Ticket 02 35125953578 + 四门全 success |
| 03 | 7/7 | ✅ | `29baf181` | Verify Ticket 03 35125966038 + 四门全 success |
| 04 | **0/5** | ✅ | **未推送** | **无 CI**（纯文档） |
| 05 | 5/5 | ✅ | `129d78c3` | Verify Ticket 05 35125996879 + 四门全 success |
| 06 | 7/7 | ✅ | `8d787e5d` | Verify Ticket 06 35126009237 + 四门全 success |
| 07 | 6/6 | ✅ | `fd02901f` | Verify Ticket 07 35126019730 + 四门全 success |
| 08 | 5/5 | ✅ | `747763fd` | Verify Ticket 08 35127030983 success；**E2E 35127030916 failure**（见 §7） |
| 09 | 4/4 | ✅ | 本票分支 | 纯文档，无行为面门 |
| 10 | 6/6 | ✅ | `6a95417b` | Verify Ticket 10 35155127276 + 四门全 success；Real-site smoke 35154465918 success @ `62f2292a` |
| 11 | 5/5 | ✅ | `8a27ad34` | Verify Ticket 11 35126031083 + 四门全 success |
| 12 | 0/7 | ❌（未开工） | — | — |

**唯一异常**：票 04 的 issue 未勾销（P-4）——实现经实物复核属实（下 §5.1），但本票**未代勾**（跨票工件纪律）。

### 5.1 票 04 交付物独立实物复核（本窗亲跑）

```
ls -l docs/adr/0010-release-gate.md     # → 存在；头部「ADR-0010: 发布门绑定真实站点层（PR 不阻断 / 发布阻断）」，状态 accepted，来源「Cycle-6 票 04（A-033；用户裁决 D-004 / D-005）」
for t in 验收阶梯 发布门 形态语料 结构骨架 镜像页 诊断面 判定记录; do grep -c "$t" CONTEXT.md; done
# → 7 条术语均命中（计数 1/2/2/2/2/2/1）
```

## 6. 本票 Delta 检查点

| delta（任务书原文） | 结果 | 说明 |
|---------------------|------|------|
| A 台账 A-026…A-033 与 D 账本 D-001…D-016 **逐条标记终态** | ✅（口径按实物扩到 A-036） | A-026…A-035 implemented；A-036 如实声明未结算（E-1）；D 16/16 |
| 归档 handoff 必须可让 fresh context 恢复上下文 | ✅ | §3.2 六项自证 |
| 收口票不承载 A-xxx（如实声明，不得编造） | ✅ | §4 |

## 7. 已知红与归因（WORKFLOW §8.1.3 三选一留痕）

### R-1：`cch/08` tip `747763fd` 的 E2E = failure（run 35127030916）

- **失败面**：`tests/srcdoc-origin.spec.ts:64` → `Error: L3 srcdoc 帧宿主字段 value 应写入区号`；`Expected: "+86"`；该 run 汇总 `1 failed / 144 passed`。
- **归因：②（非票 08 自身改动）**。证据链：
  1. `tests/srcdoc-origin.spec.ts` 属**票 10**（A-034）；
  2. `git merge-base origin/cch/08 origin/cch/10` = `fd02901f`（票 07 tip）⇒ 两支已分岔；票 10 的**读侧竞态修复**（`08d40362` 修 spec 跨帧竞态 · `4caa6fbc` live 层改有界条件等待）**不在票 08 的快照链上**；
  3. `git diff --stat origin/cch/08 cch/10 -- tests/srcdoc-origin.spec.ts` → `15 insertions(+), 4 deletions(-)` ⇒ 票 08 快照里是**修复前版本**（一次性读值）；
  4. 票 10 终态 `6a95417b` 同用例 E2E **success**（run 35155127289）⇒ 修复有效。
- **处置（land 前置，已登记）**：把 `cch/08` 重挂到 `cch/10` 终态之上（或确保栈序上 10 的修复先于 08），否则该红随快照进入 main。
- **为什么不直接修**：属票 08 / 票 10 的工件与栈拓扑，超出本票授权范围；本票只做只读归因与登记。

**其余门：无红**。票 01–11 的可 CI 化门（typecheck / engine-gates / lockfile / E2E / verify-*）在各自分支 tip 上均 success（票 04 无 CI，纯文档）。

## 8. 账本结算后的 frontier

1. **票 12（A-036）** 未开工——唯一在途实施票；blocked by 票 10（已闭环）⇒ **可立即开工**；启动器 `prompts/12-rules-limit-fidelity.md`。
2. **land 与发版**：`origin/main` 未含 Cycle-6 任何提交；land 触发 `release.yml` ⇒ **不可逆，须用户逐次授权**（§8.2.4）；land 前必办 §7 的重挂。
3. **P-4**：票 04 issue 未勾销——建议 land 时由大脑一并勾销（实现已实物复核）。
4. **P-13 / P-20**：多支本地 tip ≠ 远端 tip——推送前须重新对齐，跨支终态一律以 CI 为准。

## 9. 证据矩阵（只读验证命令 + 输出摘要）

### 9.1 账本类

| # | 命令 | 输出摘要 |
|---|------|----------|
| 1 | `grep -n '^| A-0' decision-ledger.md` | A-026…A-035 = implemented；A-036 = current（未结算） |
| 2 | `grep -c '| current |' .scratch/cycle6-grill/decision-ledger.md` | **0** |
| 3 | `grep -c '## Cycle-6 结算'` 两份账本 | 1 / 1 |

### 9.2 产物类

| # | 命令 | 输出摘要 |
|---|------|----------|
| 4 | `wc -lc handoffs/49-cycle6-closure.md` | 112 行 / 11,102 B |
| 5 | `ls -l tests/ACCEPTANCE-SURFACE.md` | 17,898 B（17 项 + 1 诊断项 · L0–L4 · 持久化 · 跨隔离 #14） |
| 6 | `ls -l docs/adr/0010-release-gate.md` | 存在，accepted，来源票 04 / A-033 |
| 7 | `grep -n 'release-gate\|needs:' .github/workflows/release.yml` | `release-gate:` @ 25 + `needs: release-gate` @ 46；脚本 `tests/scripts/release-gate.mjs` |
| 8 | `grep -nE 'pull_request' .github/workflows/real-site-smoke.yml` | **零命中**（advisory 触发面隔离成立） |
| 9 | `ls tests/corpus/forms/` | `mirrors` 9 件 · `skeletons` 8 件 · `manifest.json` 21,400 B · `sources.json` · `README.md` |
| 10 | `ls src/diag/` | `index.ts`（诊断面实存） |
| 11 | `grep -cE '^export ' tests/helpers/primitives.mjs` | 56 导出 / 521 行 |
| 12 | `for t in 验收阶梯 发布门 形态语料 结构骨架 镜像页 诊断面 判定记录; do grep -c "$t" CONTEXT.md; done` | 7/7 命中（计数 1/2/2/2/2/2/1） |

### 9.3 本地硬验收例外登记（§8.2.3 四要素）

| 要素 | 内容 |
|------|------|
| ① 为何不可 CI 化 | 本票全部产物为 `.scratch` 下的过程文档（账本 / handoff / issue / README 波次表），**无行为面可 CI 复现的验收项**（§8.1.1 只约束「可 CI 复现的验收项」） |
| ② 命令原文 | 见 §9.1 / §9.2（全部只读：`grep` / `wc` / `ls` / `git log` / `git merge-base` / `git diff --stat` / `gh run list`） |
| ③ 输出摘要 | 见 §9.1 / §9.2 |
| ④ 复核窗口 / 复核人 | 票 09 窗口（本窗）；**待首脑（大脑 Agent）复核** |

**未触及 §8.2.2 禁止面**：未以本地结果勾销任何行为面 AC；未放松任何 CI 门；未做任何远端写（§8.2.4 授权路径未触发）。

## 10. 偏离点申报（待首脑 / 用户确认）

| # | 偏离 | 说明 | 建议 |
|---|------|------|------|
| E-1 | **任务书 delta 的 A 台账范围失效** | 任务书写 A-026…A-033；实物账本为 A-026…A-036（A-034/035/036 于 2026-09-17 登记）。本票按实物结算 A-026…A-035，A-036 不代签 | 保留本处理；后续收口票开工前先重跑账本范围实物核对 |
| E-2 | 报告路径 | 按本仓既有约定 `research/window-reports/`（handoff 09 §偏离点已预先声明） | 无需动作 |
| E-3 | 本票无 CI 证据 | 纯文档；§8.2 本地硬验收例外已四要素登记（§9.3） | 无需动作 |
| E-4 | **票 04 issue 未代勾**（P-4） | 实现已实物复核属实（§5.1），但本周期 P-1/P-21 已两次登记「跨票工件改动」违规 | land 时由大脑补勾 |
| E-5 | 新发现 `cch/08` tip E2E 红并完成归因 | 见 §7；属 land 前置动作 | land 前重挂 `cch/08` 到 `cch/10` 终态 |
| E-6 | **本票修改了 `README.md`**（波次表 / 票务状态表 / 对账闸） | WORKFLOW §4.3 / §7.3 将「波次表勾销」列为收口动作；未触碰其他票的 issue 或任何代码工件 | 如属越界请指示 |
| E-7 | 修正一处收口前已存在的 README 陈旧行 | 第六周期对账闸行原记「A-026…A-035 共 10 条」，已校正为 11 条；行 02/04/06 的陈旧状态（“未落地”“R1 待开工”）已按实物更新 | 无需动作 |

## 11. 教训候选（供 WORKFLOW §5 取舍）

1. **收口票的 delta 范围会因账本持续扩张而失效**：任务书在 W1 前生成，而 A-034/035/036 在 W5 后登记 ⇒ 收口票开工**第一动作应是重跑账本范围实物核对**，而非按任务书数字直接结。同类于已登记的「台账登记数字失效」（票 45 / A-024）。
2. **收口票的「归档 handoff」应当自带可恢复性自证节**：仅声明「可恢复」不可验，应给出「fresh context 能回答哪些问题 → 答案在哪一节」的映射表（本票 §3.2）。
3. **跨栈快照会携带其他票的旧版测试工件**：`cch/08` 的 E2E 红不是自身缺陷，而是同栈票 10 的**修复前**密封用例被扫入其快照。建议：栈内任一票修改了其他票所属的测试工件时，应在该分支 push 前重跑全量 E2E（即「跨栈行为改动的组合从未被任何单票验证」的测试侧同构）。

## 12. 剩余风险 / 待办

| # | 风险 / 待办 | 级别 | 归属 |
|---|-------------|------|------|
| 1 | 票 12（A-036）未开工，A-036 未结算 | 高（阻塞周期完整闭环） | 下一窗口 |
| 2 | `cch/08` 未重挂 ⇒ land 会把 E2E 红带入 main | 高 | land 前必办 |
| 3 | land 未获授权（触发 release，不可逆） | 高 | 用户裁定 |
| 4 | 票 04 issue 未勾销（P-4） | 中（文档） | 大脑（land 时） |
| 5 | 本地 tip ≠ 远端 tip（P-13 / P-20） | 中 | 推送前对齐 |
| 6 | P-17 强推改写已发布历史未追认 | 中（需用户裁定） | 用户 |
| 7 | 真实站点层 `observe` 挂账条目持续增长 | 低 | 后续周期（ADR-0010 已约束 reason+ticket） |
