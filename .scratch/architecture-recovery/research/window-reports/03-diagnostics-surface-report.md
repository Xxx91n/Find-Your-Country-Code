# 窗口报告 03 — 诊断面（A-028）

> 票：`issues/03-diagnostics-surface.md` | 分支：`cch/03-diagnostics-surface` | 日期：2026-09-16（Asia/Singapore）
> 基线：common base `85990d2f`（Cycle-5 归档）；依赖分支 `cch/02-settings-surface` @ `4067ce71`（本票堆叠于其上）
> 提交锚点：`1ee67dc0`（分支 `cch/03-diagnostics-surface`，Change-ID `oto`；**堆叠于 `cch/02-settings-surface` @ `4067ce71` 之上**）
> 文档提交：`2c93d3a4`（Change-ID `mst`，本报告 + atomcode 调研 + issue 勾销）
> 性质：**行为面新增** —— 源码 + 密封 E2E + 结构闸门 + CI workflow。

---

## 1 结论摘要

本票把「脚本静默失败、无法自证」修成**可解释 + 可导出 + 可断言**，交付 6 项行为改变 + 2 项既有缺陷修复：

1. **单一事实来源**：新增 `src/diag/index.ts`（工厂 `createDiag(opts)`），一份结构化诊断事件流作唯一数据源。面板（`#cch-diag-view`）与机器可读输出（`window.__cchDiag()`）都是它的 serializer，均读 `Diag.records()` / `Diag.snapshot()`，**不各自采集**。
2. **四层判定全链路**：`tool`（工具失效）→ `inject`（注入失效）→ `logic`（脚本逻辑失效）→ `write`（写入结果 = 提交前状态 → 写入动作 → 提交后断言）。层**不手传**，由 reason 前缀派生，层与原因不可能漂移。
3. **分级门控（D-012）**：`error` / `warn` 与计数器**恒开**；`info` / `trace` 全链路门控且**惰性构造**（`Diag.trace(pt, reason, () => detail)`，门关时 thunk 零求值）。「零开销」指高开销诊断，不是零可观测。
4. **环形缓冲容量上限**：`DIAG_CAPACITY = 200`，溢出丢最旧并计数（`dropped`），长会话不无限增长。
5. **已验证因果闭集**：`DIAG_REASON` 26 项闭集（`tool-*` 10 / `inject-*` 6 / `logic-*` 5 / `write-*` 4 + 1 项兜底 `unknown-open-debug`）；闭集外降级为 `unknown-open-debug` 且 `verified = false`。`fail` 记录的 `reason` 指向可复算的判定点（`point` 携带该点 id）。
6. **独立诊断视图 + 单一入口**：决策链时间线 + 层级/等级过滤器 + 导出；入口收敛为**一个** GM 菜单项 `cch-menu-diag`（菜单总数 3 → 4，不为每个诊断功能各设菜单项）。
7. **既有缺陷修复①（叠显）**：`#cch-diag-sum{display:flex}` 压过 UA `[hidden]{display:none}`，使摘要条在诊断视图内仍显形并与视图叠显；补 `#cch-diag-sum[hidden]{display:none}`。与票 02 的 `.cch-sec` 属**同类缺陷**（WORKFLOW §5 已登记同类）。
8. **既有缺陷修复②（单向门，本票自查发现）**：入口按钮原先寄居摘要条，而摘要条在诊断视图内被隐藏 → **诊断视图成为单向门**（进得去出不来）。入口改为面板头部常驻按钮（与齿轮同构，`_view` 会话内保持）。

**Delta 纪律遵守**：不新建独立入口栈、不为诊断功能各设菜单项 —— 诊断视图复用既有面板容器，入口只增 1 条菜单命令（3 → 4）。

---

## 2 复现基线（动手前先留证据）

| 项 | 动手前（`cch/02` @ `4067ce71`） | 收口后 | 命令 |
|---|---|---|---|
| `src/` 内 `console.` 调用点 | **0** | 0（本票不走 console，改走结构化诊断流） | `git grep -c console. 4067ce71 -- src/` |
| GM 菜单命令数 | **3**（`cch-menu-restore` / `cch-menu-panel` / `cch-menu-settings`） | **4**（+ `cch-menu-diag`） | `git grep -n GM_registerMenuCommand 4067ce71 -- src/main.ts` |
| 密封 spec 数 | **17** | **18**（+ `tests/diagnostics-surface.spec.ts`） | `git ls-tree -r --name-only 4067ce71 -- tests/`（计 `*.spec.ts`） |
| 票级闸门 `verify-*.mjs` 数 | **14** | **15**（+ `verify-ticket-03.mjs`） | `git ls-tree -r --name-only 4067ce71 -- tests/scripts/`（计 `verify-*.mjs`） |
| 诊断面 / doctor / self-test 入口 | **不存在** | 面板头部按钮 + 1 条菜单命令 + `window.__cchDiag()` | 见 §4.2 |
| `signals[]` 证据链可达性 | 算完写入私有 `WeakMap`，**算完即不可达** | 经 `Diag` 事件流读出（`scan:` / `gate:` 判定点） | 见 §4.2 验收1 |

> 基线 `console.` 计数为 **0** 是 A-028 的核心事实：全项目零可观测性，且无任何 debug / trace / verbose 开关。

---

## 3 交付物

| 路径 | 内容 | 行数 | 字节 | SHA-256（前 12） |
|---|---|---|---|---|
| `src/diag/index.ts` | **新增**：诊断事件流（环形缓冲 + 计数器 + 四层判定 + 惰性门控 + 闭集因果 + 自保 try/catch） | 210 | 10660 | `8cb4fbca1493` |
| `src/config.ts` | 诊断常量：`DIAG_VERSION` / `DIAG_CAPACITY` / `DIAG_TRACE_PREF` / `DIAG_LAYERS` / `DIAG_REASON`（26 项）/ `DIAG_POINT_PREFIX` | 177 | 14817 | `bb1e5e00bf1c` |
| `src/types.ts` | 诊断类型族 + `PanelView` + `FillResult.reason/pre/post/asserted` + `window.__cchDiag` | 279 | 11707 | `e4fb4f805e4b` |
| `src/main.ts` | 装配 `createDiag` 并注入 `createFill` / `createDetect`；`window.__cchDiag`；第 4 条 GM 菜单命令 | 168 | 10391 | `ccbd563599a2` |
| `src/detect/index.ts` | `createDetect(UI, Rules, Diag?)`；`_reasonOf(res)` 原因派生；`scans`/`candidates`/`scored`/`injected` 计数器；近失 `warn` | 949 | 55466 | `94f3dc7c29f2` |
| `src/fill/index.ts` | `createFill(UI, Diag?)`；`_assertWrite` 写入三元组（pre → 动作 → post 断言）；`_decline(reason, detail)` | 413 | 22897 | `fff1a7f4c619` |
| `src/ui/index.ts` | 诊断视图 `_renderDiag` / `_renderDiagSummary` / `_diagFilter`；头部常驻入口 `#cch-diag-tg`；CSS `.cch-diag-*` | 1192 | 60947 | `7cac2b85ffda` |
| `tests/diagnostics-surface.spec.ts` | **新增**：密封 E2E 6 例（入口收敛 / 视图完整性 / 同源 / 分级门控 / 四层链 / 过滤与导出） | 248 | 20288 | `0bee9e770c8d` |
| `tests/scripts/verify-ticket-03.mjs` | **新增**：结构门 G0–G10（58 断言） | 244 | 17241 | `82b71e5ec566` |
| `.github/workflows/verify-03.yml` | **新增**：本票 CI 门（PR + 本票分支 push + dispatch；node 22） | 32 | 1034 | `406bb4fd6d14` |
| `tests/entry-access.spec.ts` | 对齐菜单计数 3 → 4 + 断言新 id | 141 | 7534 | `eed2cf5b771b` |
| `tests/iframe.e2e.spec.ts` | 对齐菜单计数 3 → 4 | 93 | 5210 | `1152db1508c0` |
| `tests/settings-surface.spec.ts` | 对齐菜单计数与 id 集合 3 → 4 | 257 | 16617 | `cf25c3f54418` |
| `tests/scripts/verify-ticket-02-settings.mjs` | S5 菜单 id 计数 3 → 4 | 105 | 8000 | `70fa5931f282` |
| `tests/scripts/verify-ticket-18.mjs` | 装载面补 `src/config.ts`（否则 `DIAG_REASON` 未定义） | 292 | 17233 | `6c6310e5edbd` |
| `tests/scripts/verify-ticket-31.mjs` | 装载面补 `src/config.ts` | 214 | 13145 | `5fb3f99b0489` |
| `tests/scripts/verify-ticket-37.mjs` | G1b 菜单数 2 → 4；G5a 正则放宽 + 新增负反馈 `LOGIC_NO_TARGET` 断言 | 105 | 6855 | `7f5f81399142` |

提交统计：`17 files changed, 1141 insertions(+), 58 deletions(-)`（`git diff --stat 1ee67dc0^ 1ee67dc0`）。

---

## 4 验收项逐条勾销

### 4.1 提交锚点

本票提交：`cch/03-diagnostics-surface` @ **`1ee67dc0`**（Change-ID `oto`；堆叠于 `cch/02-settings-surface` @ `4067ce71` 之上）。
父提交核验：`git rev-parse 1ee67dc0^` → `4067ce716ef86eb0cf904591178fcc727ced87fa`（= `cch/02` tip，堆叠成立）。
文档提交：**`2c93d3a4`**（Change-ID `mst`，本报告 + atomcode 调研 + `issues/03-diagnostics-surface.md` 勾销）。

### 4.2 逐条

| # | 验收项（issue 原文） | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| 1 | 诊断事件流为唯一数据源，面板与机器可读输出从同一份数据渲染（不得各自采集） | `src/diag/index.ts`、`src/ui/index.ts`、`src/main.ts` | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/diagnostics-surface.spec.ts` | 闸门 **58 PASS / 0 FAIL**（G2 组同源断言）；E2E 验收3 绿 —— `__cchDiag().records` 与面板行数同源一致 |
| 2 | 四层判定全链路：工具失效 / 注入失效 / 脚本逻辑失效 / 写入结果（提交前状态→写入动作→提交后断言） | `src/config.ts`（`DIAG_LAYERS` / `DIAG_REASON`）、`src/fill/index.ts`（`_assertWrite`）、`src/detect/index.ts`（`_reasonOf`） | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/diagnostics-surface.spec.ts` | 四层 `tool`/`inject`/`logic`/`write` 均有点位；`write` 三元组 pre → 动作 → post 断言齐备；E2E 验收5 绿 |
| 3 | 独立诊断视图（决策链时间线 + 过滤器 + 导出）+ 既有界面做入口与摘要 | `src/ui/index.ts`（`_renderDiag` / `_renderDiagSummary` / `_diagFilter`） | `npx playwright test tests/diagnostics-surface.spec.ts` | E2E 验收2 / 验收6 绿：时间线 + 层级/等级过滤器 + 导出三件齐备；面板头部入口 + 摘要条 |
| 4 | 入口收敛为一个 GM 菜单项（不为每个诊断功能各设菜单项） | `src/main.ts` | `git grep -n GM_registerMenuCommand cch/03-diagnostics-surface -- src/main.ts` | 4 条命令：`cch-menu-restore` / `cch-menu-panel` / `cch-menu-settings` / **`cch-menu-diag`**（诊断仅 1 条）；E2E 验收1 绿 |
| 5 | 分级门控：error/warn 与计数器恒开；全链路 trace 门控且惰性构造；环形缓冲有容量上限 | `src/diag/index.ts`、`src/config.ts` | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/diagnostics-surface.spec.ts` | `DIAG_CAPACITY = 200`（`snapshot().capacity === 200`）；门关时 thunk 零求值；`error`/`warn`/计数器恒开；E2E 验收4 绿 |
| 6 | fail 记录的 reason 指向已验证因果；诊断不挂运行热路径 | `src/config.ts`（闭集）、`src/diag/index.ts`（降级）、`src/detect/index.ts` | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/custom-dropdown.spec.ts tests/rescan.e2e.spec.ts --workers=1` | 闭集外降级 `unknown-open-debug` 且 `verified = false`；**1000 节点单次 scan `maxMs = 59` < 350**（12 passed） |
| 7 | 声明本票覆盖的 A-xxx：A-028 | `issues/03-diagnostics-surface.md` | `grep -n A-028 .scratch/architecture-recovery/issues/03-diagnostics-surface.md` | 声明覆盖 **A-028** |

---

## 5 本票 Delta 检查点逐条

| # | 检查点（handoff） | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| D-① | 面板与机器可读输出必须从**同一份**诊断数据渲染（不得各自采集） | `src/ui/index.ts` 读 `Diag.records()`；`src/main.ts` 的 `__cchDiag` 读 `Diag.snapshot()` | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/diagnostics-surface.spec.ts` | G2 组断言二者同源；E2E 验收3 绿（同源一致性）。**与验收1 同源，同一实现同时满足** |
| D-② | **error/warn 与计数器恒开**，只有全链路 trace 门控（零开销指高开销诊断，不是零可观测） | `src/diag/index.ts`（`put` 恒写 vs `lazily` 门控）、`src/config.ts`（`DIAG_TRACE_PREF`） | `node tests/scripts/verify-ticket-03.mjs`；`npx playwright test tests/diagnostics-surface.spec.ts` | 门关时 `info`/`trace` 不入缓冲但 `error`/`warn`/计数器仍写入；trace 开关经 `setPref(DIAG_TRACE_PREF)` 持久化（`UI_PREFS_KEY` 契约）；E2E 验收4 绿 |
| D-③ | 入口收敛为**一个** GM 菜单项 | `src/main.ts` | `git grep -n GM_registerMenuCommand cch/03-diagnostics-surface -- src/main.ts` | 诊断仅 `cch-menu-diag` 一条；总菜单 3 → 4 |
| D-④ | fail 记录的 reason 必须指向**已验证因果** | `src/config.ts`（26 项闭集）、`src/diag/index.ts`（集外降级 + `verified` 位）、`src/detect/index.ts`（`_reasonOf` 从既有信号名派生，不手传） | `node tests/scripts/verify-ticket-03.mjs` | 闭集内 `verified = true`；集外降级 `unknown-open-debug` 且 `verified = false`；reason 由判定点派生而非自由合成 |
| D-⑤ | 诊断不得挂运行热路径（1000 节点 scan < 350ms 不回退） | `src/diag/index.ts`（O(1) 环形写入，无遍历/无排序）、`src/detect/index.ts` | `npx playwright test tests/custom-dropdown.spec.ts tests/rescan.e2e.spec.ts --workers=1` | `[cch-29 perf] 1000 节点（含 50 个可聚焦 div 容器）scan 实测: scans=1 maxMs=59 avgMs=59.00 samples=[59]` → **59 ms，余量 291 ms（83%）**；12 passed |

---

## 6 atomcode 深度调研（串行护栏：全程 1 个在途）

- **载体**：`atomcode` CLI headless；产物落盘 `.scratch/architecture-recovery/research/atomcode-03-diagnostics-surface.md`（181 行 / 21757 B），请求书落盘 `prompt-03-atomcode.md`（67 行 / 5938 B）。
- **覆盖**：8 个问题域（Q1 单一事实源 + 双 serializer / Q2 事件最小字段集 / Q3 写入三元组 / Q4 分级门控与零开销 / Q5 已验证根因归因 / Q6 环形缓冲容量 / Q7 doctor 第二机器面 / Q8 反模式清单）。
- **来源**：15 条完整来源清单（OTel 弃用 Span Events 博客、OTel 事件 semconv、pino lazy evaluation issue #900、uBlock logger wiki 与 loggerFactory 源码、log4j2 async 手册、Playwright actionability / trace viewer 文档与 `traceActions.ts` 源码 / PR #29310 与 #34074、Sentry breadcrumbs、GrowthBook `evalFeature`、K8s controller 文档与 controller-runtime 源码、Lighthouse `driver.js` 源码、flutter `doctor.dart` 源码、日志反模式文）。Sufficiency Gate：searches 15+、五类角度（Official / Comparative / Criticism / Currency / Community）全覆盖、full reads 6。
- **采纳结论（与本实现逐条对应）**：
  1. 单一事实源 + 双只读投影 —— 对应 `createDiag` + 面板/`__cchDiag` 两 serializer。
  2. 一次性布尔短路 + thunk 惰性求值（pino #900 / uBlock「logger 未开 = 零开销」）—— 对应 `lazily()` 与 `trace()` 的 thunk 形参。
  3. 判定点 id + 枚举 reason（GrowthBook `source` 枚举 + `ruleId`）—— 对应 `DIAG_POINT_PREFIX` + `DIAG_REASON` 闭集。
  4. before / action / after 三快照（Playwright trace）—— 对应 `FillResult` 的 `pre` / 动作 / `post` + `asserted`。
  5. 固定容量环形缓冲 + 满时策略（Sentry 100 条 / log4j2 永不增缩）—— 对应 `DIAG_CAPACITY = 200` + 丢最旧并计数。
- **未逐字采纳项（选型取舍，非偏离）**：调研「最终推荐汇总」建议缓冲 **500** 条，实现取 **200**；调研建议 `FillResult` 拆为 `{pre, attempted, observed, verdict}`，实现取 `{reason, pre, post, asserted}`。二者均**收窄命名/容量**，语义不冲突，属实现期保守取值。
- **信息缺口（调研自陈）**：Chrome DevTools tracing domain 官方开销文档未直接抓取（以 Lighthouse 源码替代，observed）；Flagr `evalDebugLog` 源码未读（以 GrowthBook 同构模型替代，candidate）；brew doctor 源码未深读（candidate）；Tavily 引擎本轮未调用（Exa + AnySearch 双引擎已交叉覆盖）。

---

## 7 偏离点（呈报用户）

| # | 偏离 | 原因 | 状态 |
|---|---|---|---|
| O-① | 报告路径 `research/window-reports/` | handoff 已声明（任务书原文写 `reports/NN-report.md`）；该目录实际为 `.scratch/architecture-recovery/research/window-reports/`，与既有 50+ 报告链及 README 索引一致，与票 01/02/04 落点完全相同。 | 沿用（handoff 已预授权） |
| O-② | 分支拓扑为**堆叠**（非独立分支） | 本票的 `issues/03-diagnostics-surface.md` 等 brief 文件是 `cch/48` 产物，**不在 common base 上**（`git ls-tree 85990d2f -- .../issues/03-...` 为空）；不堆叠则 issue 无法勾销。本票按 `but branch new cch/03-diagnostics-surface -A cch/02-settings-surface` 堆叠于 `cch/02` @ `4067ce71` 之上（`cch/02` 为当前栈顶且已含本票 UI 侧在途代码，见 O-③）。 | **已执行** |
| O-③ | 本票**部分 UI 侧代码已被 `cch/02` 的提交带入** | 票 02 报告 O-② 已披露并获用户授权：「带入共享 hunk」——`src/ui/index.ts` 的 59 处 `cch-diag` 标记与 1 处 `DIAG_REASON` 已落在 `cch/02` @ `4067ce71`。本票 `1ee67dc0` 因此只包含**剩余**部分（`src/diag` 模块、config 常量、`main.ts` 装配、`fill`/`detect` 接线、测试与 CI）。本报告 §3 的 diff 统计即为该剩余集，**不含**已被 02 带入的部分。 | **如实呈报**，请复核归属 |
| O-④ | 提交信息写 `DIAG_REASON 25 项闭集`，实测 **26 项** | 提交信息（`1ee67dc0`）撰写时手数有误；实测 26 项（`tool-*` 10 / `inject-*` 6 / `logic-*` 5 / `write-*` 4 + `unknown-open-debug` 1）。**代码与闸门均正确**（闸门断言基于集合成员而非计数），仅提交信息文本不准。 | **如实呈报**，本报告以 26 为准 |
| O-⑤ | 修复既有缺陷 `#cch-diag-sum` 的 `[hidden]` 失效 | 与票 02 `.cch-sec` 同类缺陷（`display:flex` 压过 UA `[hidden]{display:none}`）；不修则诊断视图与摘要条叠显，验收3 无法通过。属本票必要范围，非新增需求。 | 已执行 |
| O-⑥ | 修复**本票自查发现**的诊断视图单向门 | 入口按钮原先寄居 `#cch-diag-sum`，而该条在诊断视图内被隐藏 → 进入诊断视图后无法返回列表视图（E2E 验收5 确定性红灯暴露）。入口移至面板头部常驻（与齿轮同构）。属本票必要范围。 | 已执行 |
| O-⑦ | 修改 3 个**并行票的 spec 文件**与 4 个既有闸门脚本 | 票 03 合法新增第 4 条 GM 菜单命令，使既有「菜单数 = 3」断言确定性红灯（E2E 6 例 + 闸门 4 个脚本）。已核实这 6 个文件均由 `cch/02-settings-surface`（`59daa016`）或更早（`cch/37`）引入、**均不存在于 `main`**，且票 02/01 已收口（无竞争在途改动），故更新属本票后果面。 | 已执行（见 §3） |
| O-⑧ | `verify-ticket-18.mjs` / `verify-ticket-31.mjs` 装载面补 `src/config.ts` | 二者以「函数 bundle」方式装载 `src/fill` 等模块，票 03 在 `fill` 路径引入 `DIAG_REASON` 常量后，bundle 缺 `config.ts` 即 `ReferenceError: DIAG_REASON is not defined`（exit 1）。属本票后果面。 | 已执行 |

---

## 8 证据边界登记（WORKFLOW §8.2）

1. **为何当前缺 CI 证据**：本票**有**可执行行为面，**应当** CI 化，且 `verify-03.yml`（触发 `pull_request` + `cch/03-diagnostics-surface` push + `workflow_dispatch`）与既有 `.github/workflows/e2e.yml` 已就位。但本票**尚未 push**（GitButler 规则：未获用户指示不 push），故当前**无 CI run ID**。因此 §4 / §5 全部结果均为**开发期自证**，依 §8.1.2 **不得**作为勾销依据，亦不得替代 CI 证据。
2. **命令原文**：见 §4.2 / §5 各行「只读验证命令」列。
3. **输出摘要（关键值）**：
   - `npx tsc --noEmit` → **exit 0**（零类型错误；对比票 02 报告 §8.4 当时遗留的 7 处票 03 在途类型错误，本票已全部清零）。
   - `npm run build` → `dist/find-your-country-code.user.js 166.70 kB │ gzip: 48.22 kB`，`✓ built in 878ms`，**exit 0**。
   - `node tests/scripts/verify-ticket-03.mjs` → `58 PASS, 0 FAIL`，**exit 0**。
   - `npx playwright test tests/diagnostics-surface.spec.ts --workers=1` → `6 passed`，**exit 0**。
   - `npx playwright test --workers=1`（全量）→ `110 passed (1.7m)`，**exit 0**。
   - `npx playwright test tests/custom-dropdown.spec.ts tests/rescan.e2e.spec.ts --workers=1` → `12 passed`；`[cch-29 perf] ... maxMs=59`。
   - 全量 node 闸门电池（`tests/scripts/` 下 15 个 `verify-*.mjs` + 6 个非 verify 脚本）→ **21/21 exit 0**。
4. **已知非绿项**：无。本票收口时 `tsc` / `build` / 闸门 / E2E 全绿。
5. **复核窗口 / 复核人**：大脑在 S8 收口阶段逐份核对（WORKFLOW §4.3）；本报告为**待复核**产物，未经复核不得视为闭环。
6. **本地硬验收例外登记**：§2 的基线计数与 §3 的 SHA-256 为**只读、无副作用**核查（`git grep` / `git ls-tree` / `git diff --stat` / `sha256sum`），不改变仓库状态，属 §8.2.1 允许面；不涉及远端写或凭证门控动作。

---

## 9 遗留与后续

1. **CI 证据缺位（阻断闭环）**：需 push `cch/03-diagnostics-surface` 以产生 CI run ID，方能按 §8.1.1 补齐「commit sha + CI run ID」证据铁律。**未获用户指示前不 push。**
2. **归属复核（O-③）**：本票 UI 侧部分代码已随 `cch/02` 的提交落地；`cch/03` 的 diff 为其剩余集。若需将 59 处 `cch-diag` 标记的归属改判到 `cch/03`，须走 `but move` 流程，**需用户裁定**。
3. **提交信息文本订正（O-④）**：`1ee67dc0` 提交信息写 `25 项闭集`，实测 26 项。已在本报告更正；如需提交信息与代码一致，须 `but reword`，**需用户裁定**（历史已推送前重写代价低，当前未 push）。
4. **`GM4`（Greasemonkey 4）降级路径未覆盖**：与票 02 同源问题 —— GM4 不支持 options 对象，`cch-menu-diag` 在 GM4 下无稳定 id。本票以 `try/catch` 包裹（不影响主流程），未实现降级。是否属本票范围请复核裁定。
5. **诊断视图的 trace 门控默认关闭**：`DIAG_TRACE_PREF` 默认 `false`，即默认只可见 `error` / `warn` / 计数器；全链路 `info` / `trace` 需用户显式开启。这是 D-012 的**有意设计**（零开销指高开销诊断），但意味着「为何没识别到」的完整链路在默认态下**不落缓冲**（仅近失 `warn` 可见）。如需默认开启，属产品取舍，请复核裁定。
6. **缓冲容量 200 vs 调研建议 500**：见 §6「未逐字采纳项」。当前 200 为保守取值；若长会话诊断被截断，可评估上调（常量单点，改动成本低）。
7. **`window.__cchDiag` 暴露面**：机器可读输出挂在宿主页面 `window` 上，理论上可被页面脚本读取/伪造。当前按「面板与 CI 从同一份数据渲染」的验收要求实现（CI 需可读）。若需防伪造，需引入签名或改走 GM 存储，属安全取舍，请复核裁定。
