# 票 36 窗口报告 — 门禁完整性返修（A-014 / A-015 / A-020）

**分支**：`cch/36-gate-integrity-repair`（GitButler 栈，锚于 `cch/43-dependency-peer-rootfix` 之上——27/29/30 的删除 hunk 依赖其已提交版本，栈序由 `but commit` 依赖检测自动裁定）
**本票提交**：`156362032686f53b9f47c5b70478904f87e3deef`（fix(cch-36)，单提交收口，波内不堆叠）
**日期**：2026-09-14（UTC）

---

## 1. 覆盖范围与阻塞项

本票覆盖 A-014（四门裸 `new Function` 装载 TS 崩溃 + node 20 钉版 + 语料断言硬编码）、A-015（票级私有 E2E 碎片并回 e2e.yml）、A-020（typecheck.yml 注释失实 + lockfile 根 version 漂移）。Blocked by: None。

Delta 约束遵守情况：只修装载与口径、零断言删除/弱化（check() 位点 09=16、13=29、15=29、18=36 全部保留）；失效门如实呈报（见 §6）；node 升级核对 `stripTypeScriptTypes` ≥22.13（官方 API 页 "Added in: v22.13.0"）；release.yml 触发语义未触碰（本票未改该文件）。

## 2. 行业调研（atomcode，串行在途一次）

一次 atomcode 深度调研完成（searches 11 / full reads 13 / 五角度覆盖），结论与本仓库既定路线一致：

- **A 板块**：`module.stripTypeScriptTypes` 是官方为「剥类型后经 vm/new Function 执行」背书的程序化 API（v22.13.0 加入）；成熟做法 = CI 钉 node 版本 + `typeof !== 'function'` 防御性报错 + `mode:'strip'`（transform 模式在 Node 26 线收窄）。风险边界：strip 输出跨版本不保证稳定（官方 WARNING）；LTS 小版本默认行为会变（nodejs/node#59364 教训——升级须过 CI）；仅支持 erasable 语法，`tsc --noEmit` 类型门禁须独立保留。
- **B 板块**：票级 workflow 复刻公共 E2E 步骤是公认反模式（"duplicated is already broken"）；收敛为单一共享 workflow 是正确治理方向（官方 reusable-workflow 语义表 + 独立实践指南交叉）。
- **C 板块**：硬编码语料计数是公认反模式；通行做法 = manifest 为唯一事实源 + 运行时读取 + `>=` 最小阈值保底（apex 仓 no-hardcoded-counts 指令、astrogilda count-gate 重构 diff 实证）。

映射：14-lib-engine.mjs 已是该范式正确实例，本票只做对齐，未引入新装载架构。

## 3. 改动清单（commit 15636203）

### 票级门脚本（4 个，装载修复 + 口径修正）

| 文件 | 改动 |
|---|---|
| tests/scripts/verify-ticket-09.mjs | +import stripTypeScriptTypes；+stripTypes() 防御助手（typeof 守卫 + mode:'strip'，错误信息指 CI 已钉 22）；bundle 剥离顶层 return 元素后先剥类型再拼返回语句；S3 静态 grep `_inject(el,\s*value)` 字面签名 → `_inject(el:\s*\w+,\s*value:\s*string`（适配 cch-23 引入的 TS 签名 `el: AnyEl, value: string`，断言意图「_inject 为唯一注入函数」不变） |
| tests/scripts/verify-ticket-13.mjs | 同式 stripTypes 装载 ×2（fill 函数束 + countries.ts 求值）；验收6 `m.cases === 41` → `m.cases >= 41`（manifest 运行时实读，appendOnly 保底 41，新增用例不致红）；陈旧「41 例」注释同步动态口径 |
| tests/scripts/verify-ticket-15.mjs | 同式 stripTypes 装载；S4 `dispatchEvent===1` → `全部派发点 − KeyboardEvent 派发点 === 1`（口径限定为值事件派发点——ADR-0006 后果1 登记修法；cch-18 伪 select keydown 键盘派发不属值事件语义） |
| tests/scripts/verify-ticket-18.mjs | 同式 stripTypes 装载 ×2（引擎束 + fill 束）；6.3 `m.cases === 41` → `>= 41` 动态计数；8.5 `fillPseudo(el, country) {` 字面匹配 → `/fillPseudo\(el:\s*\w+,\s*country:\s*Country/`（同类 TS 签名适配） |

### 工作流（7 个）

| 文件 | 改动 |
|---|---|
| .github/workflows/verify-13.yml | 门作业 node-version 20→22；删私有 e2e 作业；头部注释口径更新（46→动态计数、E2E 归属注明） |
| .github/workflows/verify-15.yml | 门作业 20→22（该作业同跑 verify-15+09 双脚本）；删私有 e2e 作业 |
| .github/workflows/verify-16.yml | 整文件删除——其唯一作业即 e2e.yml 全量复刻，并回后无剩余职责 |
| .github/workflows/verify-18.yml | 门作业 20→22；删私有 e2e 作业；注释去「41 例」硬编码 |
| .github/workflows/verify-27.yml | 删 ticket-27-e2e 私有作业（weak-signal.spec.ts 已在 e2e.yml 全量 `npx playwright test` 内单次覆盖） |
| .github/workflows/verify-29.yml | 删 ticket-29-e2e 私有作业（同上） |
| .github/workflows/verify-30.yml | 删 e2e 私有作业；保留 rules-engine-gate 与 typecheck 作业（typecheck 复刻属另一类碎片，未在 A-015 登记范围，见 §7 残留） |

触发语义：三门的 `pull_request` + `workflow_dispatch` + 票分支 `push` 原样保留（逐字对 HEAD 核对）；release.yml 零改动。

## 4. 本地验收（干净室：base e2a10d8e + 本票脚本，隔离并行窗口在途语料）

工作树 corpus manifest 已被票 44 窗口增至 51 例；本票分支快照 = base 48 例。为避免把他窗在途语料计入本票验收，抽 `git archive e2a10d8e` 到临时目录、覆盖本票 4 脚本后运行：

```
verify-ticket-09: 36/36 pass   exit 0
verify-ticket-13: 28 PASS, 0 FAIL   exit 0
verify-ticket-15: 28/28 pass   exit 0
verify-ticket-18: 35 PASS, 0 FAIL   exit 0
verify-ticket-02/05/27/28/29/31 + misdetect-repro-v2: 全部 exit 0（misdetect 25 例符合预期）
```

断言数不下降：四脚本 check() 位点 16/29/29/36 与改前一致（修复前门执行数为 0——SyntaxError 崩溃即本票修的问题）；运行时全量通过数 36/28/28/35。`git diff --check` 干净；全文件 LF 无 CR（CI 行尾门过检，见 run 34827616474 日志）。

## 5. CI 证据（branch cch/36-gate-integrity-repair @ 15636203）

| workflow | 触发 | run ID | 结果 | 覆盖门 |
|---|---|---|---|---|
| Engine Gates | push | 34827616449 | success | verify-ticket-02 + misdetect-repro-v2 |
| Verify Ticket 13 | workflow_dispatch | 34827692875 | success | verify-ticket-13（node 22 门实跑） |
| Verify Ticket 15 | workflow_dispatch | 34827698027 | success | verify-ticket-15 + verify-ticket-09（同作业两步全 PASS，日志已核） |
| Verify Ticket 18 | workflow_dispatch | 34827703297 | success | verify-ticket-18（node 22 门实跑） |
| Verify Ticket 27 | workflow_dispatch | 34827709868 | success | verify-ticket-27 |
| Verify Ticket 28 | workflow_dispatch | 34827716763 | success | verify-ticket-28 |
| Verify Ticket 29 | workflow_dispatch | 34827722907 | success | verify-ticket-29 |
| Verify Ticket 30 | workflow_dispatch | 34827728178 | success | verify-ticket-05 + typecheck |
| Verify Ticket 31 | workflow_dispatch | 34827733219 | success | verify-ticket-31 |
| E2E | push | 34827616463 | success（1m19s） | 全量 playwright 套件——票级私有 E2E 断言的单次统一覆盖实证 |
| Typecheck | push | 34827616474 | success | `npm ci` + `tsc --noEmit` 实跑（栈含 cch/43 版本） |
| Lockfile Regen | push | 34827616470 | success | lockfile 复现断言 |

**10/10 票级门 success run ID 齐**：02(34827616449)、05(34827728178)、09+15(34827698027)、13(34827692875)、18(34827703297)、27(34827709868)、28(34827716763)、29(34827722907)、31(34827733219)。

三门 PR 可跑性：`pull_request:` 触发声明原样保留 + dispatch 实跑绿 = 同作业在 PR 触发下可跑（触发器语义未改即成立）。

## 6. 如实呈报

- **无「凑绿」行为**：所有失败均定位后按口径修复，无断言删除/弱化。verify-15 S4 的收窄按 ADR-0006 后果1 登记的修法执行（值事件派发点口径），断言力保留（任何新增值事件派发点仍会触红）；副作用边界已在断言说明文字内写明。
- **A-020 承载说明**：typecheck.yml 注释/命令一致与 package-lock.json 根 version=1.5.0 两项，由并行窗口 `cch/43-dependency-peer-rootfix` 的提交 `lxs` 实作；本票分支栈于其上方，故分支树内该两项已满足（typecheck run 34827616474 实跑 `npm ci` 成功）。本票未对该两文件重复落盘，避免与他窗 hunk 竞争；验收勾销依赖 cch/43 合流（其已报 4 run 全绿）。
- **既有破损归因**：四门崩溃自 cch-23 显式 TS 标注引入起即死（SyntaxError），票 42 窗口基线复跑亦佐证；S3/8.5 静态 grep 过期同因。非本票新伤。
- **verify-16.yml 删除**：该 workflow 除复刻 e2e.yml 外无其他职责，并回即删除——非弱化断言（同一 playwright 全量套件仍由 e2e.yml 在 pull_request/push(main,cch/**) 跑）。

## 7. 残留与偏离

- verify-30.yml 的 `typecheck` 作业仍为 typecheck.yml 的私有复刻（非 E2E，不在 A-015 登记范围）——留作下一轮碎片收口候选。
- 工作树尚有他窗未提交记账文件（issues/42、issues/43 勾选态），按窗口隔离规则留置。
- 干净室验证目录 `%TEMP%\verify36` 为临时产物，未入库。
- 与 cch/43 的合并序：本票删除的 e2e 作业行内含其 `npm ci` 版本——GitButler 已按栈序处理（本票在上），合流时无冲突。

## 8. 结论

issue 验收六项全部满足：四门可执行 exit 0 且断言数不下降（§4）；三门 node 22 + PR 可跑（§3/§5）；verify-13 语料断言动态化（§3）；10/10 门 success run ID（§5）；私有 E2E 并回 e2e.yml 单次覆盖（§3/§5 E2E run）；typecheck/lockfile 口径一致且 npm ci 可复现（§6 承载说明）。
