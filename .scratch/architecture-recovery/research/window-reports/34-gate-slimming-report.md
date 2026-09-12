# 窗口报告 — 票 34: gate-slimming（门禁减肥）

> 窗口: 票 34 实施窗口 | 完成: 2026-09-12 | 遵循 handoff 完成定义: issue 5 条验收全部真实执行 + 本报告落盘
> 覆盖摩擦点: **A-008**（engine-gates 三处逐字重复跑）+ **A-009**（e2e 缺 push: main）
> 分支: `cch/34-gate-slimming`（GitButler，遵循 WORKFLOW §4.2）| 本地 commit `xys` → 远端 `a21964055d2c6000183c36e454e468f9bf006b62`

## 清点实证（先清点后摘除 — 检查点 ①）

三处 engine-gates job **逐字一致**（程序化比对 `eg13===eg16===eg18` 为 `true`，diff 逐字节核对）:
- 步骤完全相同: checkout → setup-node(20) → `node tests/scripts/verify-ticket-02.mjs`（36 例）→ `node tests/scripts/misdetect-repro-v2.mjs`（25 例）
- 在三个票级 workflow 中各自跑一遍 = 同一 61 例 × 3 次重复计算。

### 公共 vs 专属清单

| workflow | 公共部分（已抽出） | 专属部分（原样保留） |
|---|---|---|
| verify-13.yml | engine-gates job（61 例） | acceptance-gate: verify-ticket-13.mjs（46 例）+ e2e job（npm ci→build→playwright，artifact dist-userscript-verify-13） |
| verify-16.yml | engine-gates job（61 例） | e2e job（artifact dist-userscript-verify-16）；无票级专属断言门（票 16 只有 E2E 回归） |
| verify-18.yml | engine-gates job（61 例） | acceptance-gate: verify-ticket-18.mjs（41 例）+ e2e job（artifact dist-userscript-verify-18） |
| **新 engine-gates.yml** | **统一跑 verify-ticket-02.mjs（36）+ misdetect-repro-v2.mjs（25）一次** | — |

### 前后票级回归项数对照

| 维度 | 抽前 | 抽后 |
|---|---|---|
| 引擎门公共例（61 例）的执行载体 | verify-13/16/18 三处内嵌各跑一遍 | engine-gates.yml 统一跑 1 遍 |
| verify-13 保留的专属例数 | 46（acceptance-gate） | 46（原样保留） |
| verify-16 保留的专属例数 | 0（纯 E2E 回归，无断言门） | 0（E2E 回归保留） |
| verify-18 保留的专属例数 | 41（acceptance-gate） | 41（原样保留） |
| 票级 workflow job 布局 | 13/16/18 各 2 job（engine-gates + e2e，13/18 另有 acceptance） | 13/18 各 2 job（acceptance+e2e）、16 仅 1 job（e2e）、engine-gates.yml 1 job |

**回归覆盖无丢失**: 61 例公共断言始终有 workflow 跑（原三处重复、现统一一处），票级专属 46/41 例原样保留（静态断言核对: 改动后 verify-13/18.yml 中 `verify-ticket-13`/`verify-ticket-18` 步骤仍在，e2e job 三处均在）。

## 变更清单与理由

全部为 workflow 文件改动，零业务代码、零脚本改动（ADR-0006 脚本纪律: workflow 只引 `tests/scripts/`，零 `.scratch` 引用）:

| 文件 | 改动 | 理由 |
|---|---|---|
| `.github/workflows/engine-gates.yml` | **新建**（60 行） | 统一承载三处逐字重复的 engine-gates job; 触发面 pull_request + push(main, cch/**) + workflow_dispatch |
| `.github/workflows/verify-13.yml` | 头注释更新 + 删 engine-gates job | 只保留票级专属（acceptance 46 例 + e2e） |
| `.github/workflows/verify-16.yml` | 头注释更新 + 删 engine-gates job | 只保留 e2e 回归（票 16 无专属断言门） |
| `.github/workflows/verify-18.yml` | 头注释更新 + 删 engine-gates job | 只保留票级专属（acceptance 41 例 + e2e） |
| `.github/workflows/e2e.yml` | push branches 补 `- main` | A-009: e2e 触发面统一 = pull_request + push(main, cch/**) |

release.yml / release-dry-run.yml: **零改动**（sha256 前 2k 基线 85eeffa1060f88b0 / 94e7763d290f1cbb，改后复核一致）。

## CI 实证

**推送**: `but push cch/34-gate-slimming` → 远端 `a21964055d2c6000183c36e454e468f9bf006b62`（2026-09-12T08:15:47Z 触发）。

三个 run 证明新触发面生效（engine-gates.yml 在 push 上正确触发、YAML 合法、job 执行到脚本层）:

| workflow | run ID | conclusion | 失败面 |
|---|---|---|---|
| Engine Gates | 34682819555 | failure | Engine gate (verify-ticket-02.mjs) 步骤: `new Function(bundle)()` 裸求值 src/detect TS 注解 → `SyntaxError: Unexpected token ':'` |
| Typecheck | 34682819586 | failure | `npm ci --legacy-peer-deps` 报 package.json 与 lockfile 失同步（typescript 5.9.3 vs lock 7.0.2 等） |
| E2E | 34682819538 | failure | `npm install` 遇 react-dom19 alias peer 冲突 ERESOLVE |

### 三红归因: main 基线预存红（非本票引入 — 实证链）

handoff 明文: 「预存红门（verify-15 / F-1）如被合并暴露: 登记报告，不扩权修复（非本票授权面）」。本票三项失败均属此类:

1. **Engine Gates SyntaxError 预存链**: cch-23（commit 188f9c1）为 strict 类型修复向 `src/detect/index.ts:45` 引入 `AnyEl` 参数注解（`function isPlaceholderOpt(o: AnyEl): boolean`，git log -S 定位）。verify-ticket-02.mjs:30 用 `new Function(bundle)()` 裸求值 src 源码——TS 注解在纯 JS 求值器内必然 SyntaxError。该脚本与注解在 origin/main 上**共存**（origin/main:src/detect/index.ts:45 与 origin/main:tests/scripts/verify-ticket-02.mjs:30 逐行核对），故此红在 cch-23 合入 main 时已预存。verify-13/16/18 在 main 上 2026-09-11T15:50 起全红（run 34618604428 / 34618606288 / 34618607088），而同日 13:46 cch/21-pr-triggers-test 分支上同三 workflow 全绿（run 34606286053 / 34606286037 / 34606286054 success）——合入前绿、合入后红，与 cch-23/24/25 合入 main 的时间线吻合。
2. **Typecheck EUSAGE 预存链**: main@7dbc6fc 的 Typecheck run 34618705605 与本票分支 run 34682819586 的 EUSAGE 报错**逐字一致**（lockfile typescript@7.0.2 vs package.json 5.9.3、vite@8.2.2 vs 6.4.3、vite-plugin-monkey@8.1.1 vs 5.0.9）——ADR-0006 已登记的 lockfile 失同步遗留。cch-25（4b420be）钉死 package.json 版本但 lockfile 未随之再生成（其提交说明自述「lockfile 待 CI 实证」）。
3. **E2E ERESOLVE 预存链**: e2e.yml 的 `npm install`（无 --legacy-peer-deps）与 react-dom19 alias（cch-15 8d87173 引入）在 main 上共存，cch-25 移除 --legacy-peer-deps 时未覆盖 e2e.yml 的 install 步骤；main E2E run 34618602633 同红。F-1（verify-15 S4 二派发点漂移）由 cch-21 报告首次登记，同为预存。

### 与本票改动的因果判定

- 本票零源码、零脚本改动（5 文件全为 workflow YAML，脚本路径与内容未动）。
- 三红失败面均在本票改动之外: SyntaxError 源于 src/detect 的 TS 注解（cch-23 引入）、lockfile 失同步源于 package.json/lockfile（cch-25 遗留）、ERESOLVE 源于 e2e.yml 原有 npm install 写法。
- **同源同红对照**: 分支快照 = main 基线 + 本票 workflow 改动; engine-gates 内嵌版本（verify-13 在 main 上）同样红（34618604428）——内嵌与独立新 workflow 同源同红，抽取行为本身未新增任何失败模式。
- 验收④「全 workflow 绿」在本票语境下的成立方式: 预存红如实登记（本节）+ 抽取行为由 CI run ID 宽证（触发面生效、job 正确执行到脚本层、失败点与本票改动无因果）。main 全门基线红是仓库当前态，非本票可承诺项。

**docs-only 对照（终局旁证）**: docs 提交 `dfc99be44d3d8ab4b1157070ad73797d583302ad`（仅 .scratch 报告 + issue 勾选，零 workflow/源码/脚本改动）在 cch/34-gate-slimming 上触发同三 workflow（Engine Gates run 34684553572 / Typecheck run 34684553495 / E2E run 34684553632）——失败面与首轮逐字相同（verify-ticket-02 SyntaxError / EUSAGE lockfile 失同步 / ERESOLVE）。不含本票任何改动的提交爆同一三红，是「预存红非本票引入」的最强对照证据。

## atomcode 调研引用

行业三层分工（Reusable Workflow `workflow_call` / Composite Action / 共享测试模块）与批评视角（Lou Stack「less YAML is not always less complexity」）支持中小仓库扁平抽取。本票按 handoff 要求采用独立 workflow（非 workflow_call），避免嵌套跳转——详见会话内调研记录（atomcode 深度调研，2026-09-12）。

## 偏离呈报

- 无未声明偏离。唯一数量处理: verify-16 无票级专属断言门（票 16 只有 E2E 回归），抽后其票级 workflow 仅剩 e2e job——这是事实结构，非覆盖丢失。

## 剩余风险与建议

- **P-34-1 预存红三联**: verify-ticket-02 SyntaxError（cch-23 注解 × cch-20 裸求值法）/ lockfile 失同步 / e2e ERESOLVE——三项均在 main 上长期红，需返修票处理（建议合并为一张返修票: ①verify-ticket-02.mjs 求值前剥离 TS 注解或改 esbuild 转译; ②npm install 重生成 lockfile; ③e2e.yml npm install 补 --legacy-peer-deps）。本票按 handoff 纪律不扩权修复。
- **P-34-2 PR 门控**: engine-gates.yml 与 e2e.yml 现均含 pull_request 触发，主仓 PR 门已覆盖; 合并后 main 上每 push 跑 1 次引擎门（原 3 次重复），净减 2 次 × 61 例的重复计算。

## 教训

- 门禁抽取的验收证据不在「全绿」而在「同红对照」: 当 main 基线本身预存红时，抽取行为的正确性证明 = 新旧载体在同一源上产生相同失败模式（触发面生效 + 失败面共因）。本窗口以 main 同红 run + 源码考古（git log -S 定位注解引入 commit）完成归因链。
- GitButler 提交时相邻改动隔离: 工作区同时存在大脑产物（spec.md）与他窗在途改动（package-lock.json），提交时只勾选本票 5 文件 ID，未吸收任何他人改动。

## 返工轮次 R1（2026-09-12）

> 启动器: `prompts/34-gate-slimming-fix.md` | 复核结论: `verification/review-wave1-cycle4.md` 票 34 节——首轮验收④「全 workflow 绿」以同红对照替代（归因链完整无隐瞒，属验收口径变更），且修复面恰是票 34 自身域（票 32 明让、票 31 D-31c 明让）→ 返工轮启动。
> 遵循 Delta 三联红线: .npmrc 零接触（票 31 D-31a 产物）、verify-13/16/18 专属断言与 e2e job 零改动、release 系零接触（sha256 复核 85eeffa1060f88b0 / 94e7763d290f1cbb 与首轮基线一致）。

### 三联修复与 CI 实证

返工提交: `050d442`（首推，Lockfile Regen 红见下）→ amend `785406e62d9e4cbcce22b93de98037e4320dda67`（guard 转义修正）。

| 联 | 修复内容 | CI run | 结论 |
|---|---|---|---|
| ① 装载器 | `verify-ticket-02.mjs` + `misdetect-repro-v2.mjs` 装载改 `module.stripTypeScriptTypes`（Node>=22.13，同 14-lib-engine 先例：先剥类型再拼返回语句）+ engine-gates.yml node 20→22 | Engine Gates **34693483749 / 34693757833 success** | **转绿**：36 例引擎门 + 25 例 harness 断言全过（日志「合计 25 例，符合预期 25 例」「FP 全家桶（F1–F8）不注入： YES」） |
| ② lockfile 再生 | 新增 `lockfile-regen.yml`：CI 云端以 package.json（票 25 钉死版）为真相源 `npm install --legacy-peer-deps` 再生 lockfile + `npm ci --dry-run` 同步断言 + artifact 交付（`lockfile-regen-<run_id>`）；**不自动 push**（避免自动提交越权，产物入库待维护者） | Lockfile Regen **34693757830 success** | 转绿：artifact `lockfile-regen-34693757830`（62996 字节，lockfileVersion 3，125 包）已下载比对——typescript@5.9.3 / vite@6.4.3 / vite-plugin-monkey@5.0.9 / esbuild@0.25.12 / react@18.3.1 / react-dom19@19.2.8 全部对齐 package.json 钉死版（EUSAGE 报错的失同步项全部消除） |
| ③ 安装面 | `e2e.yml` npm install → `npm install --legacy-peer-deps`；`typecheck.yml` npm install → `npm ci --legacy-peer-deps`（回迁 cch-23 同基线先例） | E2E **34693483698 / 34693757840 success** | **转绿**：react-dom19 alias peer 冲突 ERESOLVE 消除（Delta「或等效」出口：内联 flag；.npmrc 集中口径为票 31 独立分支产物，未合流前本分支不可见，合流后两口径自然统一） |

### 同红对照 reverse（验收②）

main 上三红在返工分支 `785406e` 全数转绿，且无新增 FAIL 面：
- Engine Gates: main 内嵌同红 34618604428 → 返工分支 34693757833 **success**
- E2E: main 34618602633 → 返工分支 34693757840 **success**
- Typecheck: main 34618705605 → 返工分支 34693757831 仍 **failure**（见下「预期红」——lockfile 未入库前 npm ci 必 EUSAGE，联② workflow 设计为不自动 push，同步恢复待 lockfile 入库）

### 既有门回归不受影响（验收③）

verify-31 最近 run 34688872701 **success**（cch/31-fill-feedback-loop）；verify-30 最近 run 3468840489 **success**（cch/30-rules-tier-scope-fix）——本返工未触碰两票任何文件。

### 首轮验收④复核结论

首轮（`a219640`）三红归因为 main 基线预存红（归因链见首轮报告 §三红归因），复核采信；本轮按启动器授权把修复面（恰属票 34 域）落实：联①③已在返工分支全绿，联②机制落地（CI 再生 + artifact 验证版面对齐）但 lockfile 本体入库待维护者确认后，typecheck 的 npm ci 方可恢复同步——届时 Typecheck 转绿。

### 过程偏离呈报（R1）

- **D-R1a Lockfile Regen 首推红（050d442，run 34693483708）**: 本窗口建 workflow 时 CRLF guard 正则被转义双写（反斜杠双写 → 匹配字面反斜杠 → 白名单失效 → 误报全库 CRLF）。amend 785406e 修正，与 typecheck.yml 同款 guard 逐字一致后转绿（34693757830）。属实现 bug 非预存债，已自纠。
- **D-R1b .npmrc 不可见**: 联③原计划对齐 .npmrc 集中口径，发现其为票 31 独立分支产物（lom 提交），未合流前本分支 checkout 不可见 → 走 Delta「或等效」出口内联 flag。红线（不移除 .npmrc）零接触。
