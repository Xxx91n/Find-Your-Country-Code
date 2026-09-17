# 窗口报告 05 — harness 交互原语（A-029）

- 票号：Cycle-6 票 05（`.scratch/architecture-recovery/issues/05-harness-primitives.md`）
- 分支：`cch/05-harness-primitives`（堆叠于 `cch/01-acceptance-surface-and-ladder` @ `36455b7b` 之上）
- 层归属：测试塔**塔基 + 塔身**（密封 fixture E2E 与真实站点冒烟层**共用**的交互原语层）
- 状态：实现完成，**待 W2 复核**；CI 证据缺位（未 push，见 §8）
- 零 `src/` 改动

---

## 1 结论摘要

1. 交付了一份**唯一**的共享交互原语层 `tests/helpers/primitives.mjs`（309 行 / **43 导出**）：零 `expect`、零 `playwright/test` 依赖、零固定 sleep。密封层（`playwright/test` 运行器）与 live 层（独立 node + playwright，**无测试运行器**）**零转换加载同一文件** —— 这是「两 harness 收敛为同一份原语」在模块形态上能达到的最强形式。
2. 两 harness 收敛：`tests/live/live-smoke.mjs` **删除**内联第二套 GM 替身（`:44` 数组形式 + `:51` 的 `GM_registerMenuCommand = () => 0` 空实现）与内联 `PROBE` 探针（`:95`），改 import 共享原语；`tests/helpers/userscript.ts` 收为**薄门面**（`export * from ./primitives.mjs` + 6 个 `expect.soft` adapter），既有 4 个导出名（`userscriptCode` / `installUserscript` / `wrapperFor` / `openPanel`）与 19 个 spec 的导入面**均不变**。
3. GM 替身记录 `{id, title, fn}` 且 `fn` **可调用**（`window.__cchMenu`），还原 Tampermonkey >= 5.0 / Violentmonkey >= 2.15.9 的 **id 原地更新语义**（同 id 重注册只更新 title/fn，不新增条目、不递增计数）；`invokeMenuCommand` 真实执行 `fn`，未命中/不可调用分别给出 `no-match` / `fn-not-callable` 可观测拒因。
4. 断言改 web-first + `expect.soft` 一次收全量：全仓 `expect.soft` 由 **0 → 36 处**（门面 7 + spec 29），门面内裸 `expect(` 断言 **0 处**，spec 内 `waitForTimeout(` **0 处**、直写页面选择器 **0 处**。
5. **live runtime 自证（本票最强证据）**：`CCH_LIVE_HEADLESS=1 node tests/live/live-smoke.mjs --target mirror-control` **离线**运行 → `deep 6/6 通过`、`白名单契约 + harness 自证: PASS`、exit 0。即同一份原语在**无测试运行器的 runtime** 里真实驱动 open → search → select → 读回宿主 value（`+86`）+ 事件面 `[input,change]` + 反馈 `on=true`。
6. 本票只建**原语层**；A-029 的「真实站点层能力覆盖 2/18 → 提升」属票 06 / 票 07 范围（台账去向 `T1 · T5 · T7`）。
7. 规模：`8 files changed, 872 insertions(+), 83 deletions(-)`；零 `src/` 改动。

---

## 2 复现基线（动手前先留证据）

实测自 `git show cch/01-acceptance-surface-and-ladder:<path>`：

| 面 | 改造前实测 | 与 issue / handoff / 台账记载比对 |
|---|---|---|
| `tests/helpers/userscript.ts` | 61 行 / 2729 B / **4 导出**（`userscriptCode`:13 · `installUserscript`:48 · `wrapperFor`:54 · `openPanel`:58） | 导出数 4 **一致**；行数记载「仅 48 行」**不准**（见 O-③） |
| `tests/live/live-smoke.mjs` | 270 行 / 14916 B；`.click(`=0 `.fill(`=0 `.locator(`=0 `.waitFor(`=0 `.evaluate(`=2 | 与 A-029 台账「全文无任何交互原语」**一致** |
| 内联第二套 GM 替身 | `:44` `const GM_STUB = [`、`:51` `GM_registerMenuCommand = () => 0`、`:95` `const PROBE = sel =>`、`:153-154` `addInitScript` ×2 | 与 A-029 台账「GM 替身为空函数致菜单命令在 L3 不可驱动」**一致** |
| `tests/live/site-manifest.json` | 100 行 / 7552 B；8 targets；**无** `deep` 字段 | — |
| `tests/helpers/primitives.mjs` | **不存在**（`git cat-file -e` 失败） | 与 D-015「密封层本身没有可复用的交互原语层」**一致** |
| `expect.soft` 全仓 | **0 命中**（`git grep -c`） | 本票为**首次引入** |
| 密封层交互原语 spec | **0**（无 `tests/harness-primitives.spec.ts`） | 与 D-015「M4 必须从密封层起建」**一致** |
| 旧 `openPanel` 实现 | `wrapperFor(...).locator(.cch-btn).click()` + `expect(page.locator(#cch-pop)).toBeVisible()`（expect 默认 5s 上界） | 驱动与断言**混装**，正是 D-015 的病灶 |

**基线计数口径说明**：以上 `.click(` 等均为 `grep -cE` 行计数；`git grep -c expect.soft` 在全仓 `*.ts` / `*.mjs` 上返回空（0 命中）。

---

## 3 交付物

### 3.1 新增（6 件）

| 文件 | 角色 | 行 | 字节 | sha256(16) |
|---|---|---|---|---|
| `tests/helpers/primitives.mjs` | 共享交互原语层（**唯一来源**；43 导出） | 309 | 14410 | `87bb7c7b952b352a` |
| `tests/harness-primitives.spec.ts` | 密封层自证 spec（7 例） | 185 | 10364 | `51a24146dc3bf09f` |
| `tests/fixtures/harness-primitives.html` | 本票自带 hermetic fixture（两宿主字段） | 30 | 1440 | `955e2f8cf0d4fe68` |
| `tests/scripts/verify-ticket-05-harness.mjs` | 结构门（59 断言） | 163 | 10067 | `481349f5f0c64588` |
| `.github/workflows/verify-05-harness.yml` | CI 门 workflow（PR + 分支 push + dispatch） | 30 | 775 | `9f691c33f491d0c8` |
| （调研产物 2 件见 §6） | — | — | — | — |

### 3.2 改造（3 件）

| 文件 | 改动 | 行 | 字节 | sha256(16) |
|---|---|---|---|---|
| `tests/helpers/userscript.ts` | 收为薄门面：`export *` + 6 个 `expect.soft` adapter；4 导出名与导入面不变 | 58 | 3730 | `7e3c090e70852dfd` |
| `tests/live/live-smoke.mjs` | 删内联第二套 GM 替身与 PROBE；改 import 共享原语；新增 `runDeepChecks` 驱动链与 `deepChecks` 汇总/报告表 | 344 | 18708 | `66042444aada9da8` |
| `tests/live/site-manifest.json` | `_meta.assertionRule` 增补 deep 例外；`mirror-control` 增 `deep` 契约 | 101 | 8127 | `67da2492c3b8e780` |

提交统计：`git diff --stat cch/01-acceptance-surface-and-ladder..cch/05-harness-primitives` → **8 files changed, 872 insertions(+), 83 deletions(-)**。

### 3.3 共享层导出面（43）

常量：`DIST_PATH` · `MENU_STORE_KEY` · `EVENTS_KEY` · `PANEL_SELECTOR` · `SEARCH_SELECTOR` · `FEEDBACK_SELECTOR` · `WRAPPER_SELECTOR` · `BUTTON_SELECTOR` · `ALL_LIST_ROWS_SELECTOR` · `WAIT_MS` · `GM_STUB`

定位器：`wrapperFor` · `panel` · `searchBox` · `feedbackToast` · `allRows` · `countryRow`

驱动：`userscriptCode` · `installUserscript` · `waitForInjection` · `openPanel` · `openPanelViaMenu` · `searchType` · `selectCountry` · `fillField`

读取：`readInjection` · `readHostField` · `readHostValue` · `recordFieldEvents` · `readFieldEvents` · `countFieldEvents` · `readFeedback` · `waitForFeedback` · `readTier` · `readScore` · `readVisibleRows`

GM 菜单：`menuCommands` · `menuTitles` · `menuIds` · `menuCount` · `waitForMenu` · `invokeMenuCommand`

纯归约：`injectionSatisfied`

---

## 4 验收项逐条勾销

### 4.1 提交锚点

本票提交：`cch/05-harness-primitives` @ **`f27458ce`**（Change-ID `rxx`；堆叠于 `cch/01-acceptance-surface-and-ladder` @ `36455b7b` 之上）。
父提交核验：`git rev-parse cch/05-harness-primitives^` → `36455b7baf7d305c304db2c04da30bcf706140a6`（= `cch/01` tip，**堆叠成立**）。
文档提交：**`88d6112c`**（Change-ID `wko`；本报告 + atomcode 调研 + `issues/05-harness-primitives.md` 勾销）。回写提交：`but amend` 后的锚点回写（本段即回写产物）。

### 4.2 逐条

| # | 验收项（issue 原文） | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| 1 | 交互原语可从密封层调用：open → search → select → fill，并读回宿主字段 value | `tests/helpers/primitives.mjs`（`openPanel` / `searchType` / `selectCountry` / `fillField` / `readHostValue`）、`tests/helpers/userscript.ts`、`tests/harness-primitives.spec.ts` | `npx playwright test tests/harness-primitives.spec.ts` | **7 passed**（exit 0）；A 例以 `test.step` 逐段断言：open → `#cch-pop` 可见 / search → 可见行收窄且含 China / select → 面板 detached / fill → `#hp-select` value=`+86` |
| 2 | 密封与 live 两个 harness 收敛为同一份原语（不新造第二套） | `primitives.mjs`（唯一来源）、`userscript.ts`（`export *` 门面）、`live-smoke.mjs`（import） | `node tests/scripts/verify-ticket-05-harness.mjs` | **59 PASS / 0 FAIL**；S1/S3 组：`const GM_STUB`=0、`GM_registerMenuCommand`=0、`const PROBE`=0、`addInitScript(`=0；全仓 `GM_registerMenuCommand` 定义恰 **1** 处 |
| 3 | GM 替身记录 `{title, fn}` 且可调用 | `primitives.mjs`（`GM_STUB` / `menuCommands` / `invokeMenuCommand`） | `npx playwright test tests/harness-primitives.spec.ts`；`node tests/scripts/verify-ticket-05-harness.mjs` | spec C/D/E 绿：4 条命令全 `callable=true`、稳定 id 齐备、`cch-menu-panel` 调用后面板可见、`cch-menu-restore` 可调用且无拒因、无匹配给 `no-match`；门 S4 组 6 断言全绿 |
| 4 | 断言改 web-first + `expect.soft` 一次收全量 | `userscript.ts`（6 adapter）、`harness-primitives.spec.ts`、`live-smoke.mjs`（自建软收集器 `runDeepChecks`） | `node tests/scripts/verify-ticket-05-harness.mjs` | 门 S5 组：门面 `expect.soft(`=**7**、裸 `expect(`=**0**；spec `expect.soft(`=**29**、`waitForTimeout(`=0、直写选择器=0 |
| 5 | 声明本票覆盖的 A-xxx：A-029 | `harness-primitives.spec.ts` 头注、`primitives.mjs` 头注 | `node tests/scripts/verify-ticket-05-harness.mjs` | 门 S6 组：spec 与共享层**均声明 A-029** |

---

## 5 本票 Delta 检查点逐条

| # | 检查点（handoff） | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| D-① | **必须从密封层起建**（现状 `userscript.ts` 仅 48 行 / 4 导出，密封层本身没有原语层） | `primitives.mjs`（新建，密封层 spec 直接消费）+ `harness-primitives.spec.ts` + `harness-primitives.html` | `npx playwright test tests/harness-primitives.spec.ts`；`git cat-file -e cch/01:tests/helpers/primitives.mjs` | 7 passed；基线实测共享层改造前**不存在**、密封层 spec 改造前 **0** —— 从 L1 起建属实（行数记载偏差见 O-③） |
| D-② | 两个 harness **收敛为同一份原语**，不得新造第二套 | 见验收 2 | 门 S1/S3/S7 组 + `node tests/live/live-smoke.mjs --target mirror-control` | 门 59/0；live 层 `deep 6/6`、`harness 自证: PASS`、exit 0 |
| D-③ | GM 替身改为记录 `{title, fn}` 且**可调用** | 见验收 3 | spec C/D/E + 门 S4 组 | 见上；`invokeMenuCommand` 真实执行 `cmd.fn()`（门 S4 断言该调用点存在） |
| D-④ | 断言改 **web-first + `expect.soft` 一次收全量** | 见验收 4 | 门 S5 组 | 见上；live 层因 `expect.soft` 只在 test runner 下工作（Playwright 官方），改由共享层返回事实快照 + 自建软收集器 `runDeepChecks` 承载 |

---

## 6 atomcode 深度调研（串行护栏：全程 1 个在途）

- **载体**：`atomcode` 5.0.9（`52ca5e6`）无头模式 `--prompt-file`；串行护栏遵守（本工作区全程 0 → 1 在途，未杀进程）。
- **产物**：`.scratch/architecture-recovery/research/atomcode-05-harness-primitives.md`（105 行 / 11059 B）；请求书 `.scratch/architecture-recovery/research/prompt-05-atomcode.md`（885 B，verbatim，未附加角度提示）。
- **会话**：`735789be-4293-4fc3-ad93-77ea577a9028` ｜ 退出码 **0** ｜ 原始 stdout 13889 B（临时 raw 文件已清理）。
- **Sufficiency Gate（atomcode 自查）**：searches 6（web_search 1 + Tavily 1 + AnySearch batch 4）｜ angles 全五类（Official / Comparative / Criticism / Currency / Community）｜ full reads 6（nodejs.org · playwright.dev/docs/pom · playwright.dev/docs/test-assertions · anton.qa · test-automation.blog · qaskills.sh）｜ 关键结论均 ≥ 2 独立信源 ｜ **总体 Confidence：高**。
- **采纳结论（与本实现逐条对应）**：
  1. **三层结构**（harness 层两个 → 共享交互原语层一份 → 选择器常量）—— 对应 `tests/helpers/primitives.mjs` 作为唯一来源。
  2. **驱动/读取与断言的边界**：共享层只放「定位器 + 意图命名动作方法」+ 等待式技术守卫（`locator.waitFor()` / `waitForFunction()`），**零 `expect()`**；读取方法**返回**事实而不下判定 —— 对应门 S2 组（`expect(`=0、`playwright/test`=0、`waitForTimeout(`=0）。
  3. **软断言归 harness**：Playwright 官方明确 soft assertions **只在 test runner 下工作** → 统一方式 = 共享层返回事实快照，两个 harness 各套薄 adapter（密封层 `expect.soft`，live 层自建软收集器）—— 对应 `soft*` 六函数与 `runDeepChecks`。
  4. **模块形态**：调研推荐 `.ts` + Node type stripping，但**前提是 Node ≥ 22.18**；调研同时明示其风险与**退路 `.mjs` + JSDoc**。本仓库**采纳调研自陈退路**，理由见 O-⑤（`reproduced`：CI Node 版本实物核对）。
  5. **六类反模式**：断言写进共享原语 / 让 live 层 import 测试运行器 / 复制粘贴第二套 stub / 共享层依赖 fixture 或全局状态 / 固定 sleep / 共享层写网络环境假设 —— 全部由门 S2/S3/S5 组钉住。
- **未逐字采纳项（选型取舍，非偏离）**：调研建议共享层放 `tests/helpers/` 之外的独立目录以强调「不被任何 harness 拥有」；本实现仍放 `tests/helpers/`，理由为 ADR-0006「仓库只有一个 `tests/` 根」与既有导入面（19 个 spec 引用 `./helpers/userscript`）不变优先。语义不冲突。
- **信息缺口（调研自陈）**：`Tavily` 仅 1 次调用（以 AnySearch batch 4 交叉覆盖）；Node type stripping 在 CI 多版本矩阵下的实际可用性未取官方矩阵文档，改以本仓库 CI 实物核对替代（`reproduced`）。

---

## 7 偏离点（呈报用户）

| # | 偏离 | 原因 | 状态 |
|---|---|---|---|
| O-① | 报告路径 `research/window-reports/` | handoff 已声明（任务书原文写 `reports/NN-report.md`）；该目录实际为 `.scratch/architecture-recovery/research/window-reports/`，与既有 50+ 报告链及 README 索引一致，与票 01/02/03/04 落点完全相同。 | 沿用（handoff 已预授权） |
| O-② | 分支拓扑为**堆叠**（非独立分支） | 实测 `git cat-file -e 85990d2f:.scratch/architecture-recovery/issues/05-harness-primitives.md` **失败**（该 brief 文件不在 common base，是 `cch/48` 产物）；不堆叠则 issue 勾销会退化为**整文件新增**。故按 `but branch new` + `but move cch/05-harness-primitives --above cch/01-acceptance-surface-and-ladder` 堆叠。 | **已执行**（与票 02/03/04 同型，属 W1 已登记的 P-3「波内堆叠」） |
| O-③ | issue / handoff 记 `userscript.ts`「仅 **48 行**」，实测 **61 行** | 导出数 **4 属实**（`userscriptCode` / `installUserscript` / `wrapperFor` / `openPanel`），仅行数口径笔误。不构成阻塞（D-015 的结论「密封层无原语层」不依赖行数）。 | **如实呈报**，本报告以 61 行为准 |
| O-④ | 结构门命名 `verify-ticket-05-harness.mjs`（非 `verify-ticket-05.mjs`） | `tests/scripts/verify-ticket-05.mjs`（30461 B）**已被 Cycle-5 票 05 占用**（站点规则引擎单元门，非本票）。本票为 Cycle-6 新票，按 `verify-ticket-02-settings.mjs` 的既有后缀模式另起名，**零覆盖零碰撞**；两份脚本头注互相指引消歧。 | 已执行 |
| O-⑤ | 共享层模块形态取 **`.mjs` + JSDoc**（非调研首推的 `.ts`） | 调研首推 `.ts` + Node type stripping，**前提 Node ≥ 22.18**；`reproduced` 实测本仓库 CI Node **异构**（`e2e.yml` / `typecheck.yml` = **20**，`real-site-smoke.yml` / `verify-*.yml` = 22）→ 前提不普遍成立。另 `live-smoke.mjs:43` 既有设计注释已显式规避「`.mjs` 导入 `.ts` 链」（`observed`）。本仓库采纳调研**自己写明的退路**，非推翻调研；收益是两 runtime 零转换加载**同一文件**。 | 已执行 |
| O-⑥ | `openPanel` 由 `expect(...).toBeVisible()` 改为 `waitFor()` + 显式 `WAIT_MS = 5000` | 共享层**零 expect** 的必然结果（D-④ / 调研 §2.2）。旧实现的有效上界为 expect 默认 5s；改用 `waitFor` 后 Playwright 默认 30s，会把失败模式从「5s 断言报错」退化为「吃掉整个用例 30s 超时」。故新增 `WAIT_MS` 常量作为驱动原语默认等待上限的**单一来源**（8 处统一消费）。 | 已执行（失败模式保真） |
| O-⑦ | 共享层导出 **43**（非 42） | 新增 `WAIT_MS` 导出（见 O-⑥）。 | 已执行 |
| O-⑧ | 新增 hermetic fixture `tests/fixtures/harness-primitives.html` | 本票自带，形态取自 live 层**已知好对照组** `mirror-three-forms.html#f-control`（label + 区号选项）。理由：不把本票的密封层自证耦合到其他票（票 31 `fill-feedback.html` / 票 37 `entry-access.html`）的 fixture 语义上。 | 已执行 |
| O-⑨ | 收尾自查发现并修正 **2 处本票自引入**的选择器硬编码 | ① `live-smoke.mjs:148` 直写 `.cch-list[data-sec=all] .cch-row`（改 `readVisibleRows`）；② 门面 `softTier` 直写 `.cch-btn`（改 `BUTTON_SELECTOR`）。二者均违反本票自己的「选择器唯一定义处」原则，已用 `but amend` **折回实施提交**（非新增 fixup 提交）。 | 已执行 |
| O-⑩ | 一条**被否的自检项**（撤销） | 曾拟加门禁「live 层不硬编码面板选择器」，实测命中 `#cch-pop 可见` 与 `.cch-wrapper 已挂上目标字段` 两处**日志文案**（非选择器）→ 判定该启发式**必误报**（无法区分选择器与文案），已撤销。改为可证真、零误报的断言：S7 组要求 `readVisibleRows` **被实际调用**。 | 已撤销并替换 |

---

## 8 证据边界登记（WORKFLOW §8.2）

1. **为何当前缺 CI 证据**：本票**有**可执行行为面，**应当** CI 化，且 `.github/workflows/verify-05-harness.yml`（触发 `pull_request` + `cch/05-harness-primitives` push + `workflow_dispatch`）已就位。但本票**尚未 push**（GitButler 规则：未获用户指示不 push），故当前**无 CI run ID**。因此 §4 / §5 全部结果均为**开发期自证**，依 §8.1.2 **不得**作为勾销依据，亦不得替代 CI 证据。
2. **命令原文**：见 §4.2 / §5 各行「只读验证命令」列。
3. **输出摘要（关键值）**：
   - `node tests/scripts/verify-ticket-05-harness.mjs` → `59 PASS, 0 FAIL`，**exit 0**。
   - `npx playwright test tests/harness-primitives.spec.ts` → `7 passed (6.2s)`，**exit 0**。
   - `npm run e2e` → `117 passed (1.2m)`，**exit 0**；`dist/find-your-country-code.user.js 166.70 kB │ gzip: 48.22 kB`，`✓ built in 744ms`。
   - `npx tsc --noEmit` → **exit 0**。
   - `CCH_LIVE_HEADLESS=1 node tests/live/live-smoke.mjs --target mirror-control` → `[pass] mirror-control expect=injected errs=0 …；deep 6/6 通过`；`白名单契约 + harness 自证: PASS`；**exit 0**。deep 明细：open-panel pass（`#cch-pop` 可见）/ search-type pass（可见行 1）/ select-country pass（iso=cn）/ read-host-value pass（value=+86）/ field-events pass（序列 `[input,change]`）/ feedback pass（on=true，文本 `已填入: 🇨🇳 +86`）。
   - `tests/scripts/` 下 `verify-*.mjs` 电池 → **16/16 exit 0**（含本票新增 `verify-ticket-05-harness.mjs` 59/0；与 Cycle-5 的 `verify-ticket-05.mjs` 各自独立）。
   - 字节完整性：本票 8 个文件 `CR=0 / CRLF=0 / BOM=false`（全 LF、无 BOM）；`git diff --check` **exit 0**。
   - `node --check` → `primitives.mjs` / `live-smoke.mjs` / `verify-ticket-05-harness.mjs` 语法 OK（`userscript.ts` 由 Playwright 编译，已由 spec 7 passed 实证）。
4. **已知非绿项**：无。收口时 `tsc` / `build` / 结构门 / 全量 E2E / live mirror 驱动链全绿。
5. **复核窗口 / 复核人**：大脑在 S8 收口阶段逐份核对（WORKFLOW §4.3）；本报告为**待复核**产物，未经复核不得视为闭环。
6. **本地硬验收例外登记**：§2 的基线计数、§3 的 sha256、§8.3 的 `grep` / `node` 计数均为**只读、无副作用**核查（`git show` / `git cat-file` / `sha256sum` / `node --check` / `grep -cE`），不改变仓库状态，属 §8.2.1 允许面；`but amend` 为**本地历史编辑**（未 push），不涉远端写或凭证门控动作。
7. **本票未触碰并行票在途改动**：工作区另有票 02/03/04 的 `src/*` 与 `tests/*.spec.ts` 在途修改（`git status` 可见），本票提交面严格限定为 §3 的 8 个文件 + 调研产物 + 本报告 + issue 勾销；`but commit` / `but amend` 均以**显式文件 ID** 选择，未做整工作区提交。

---

## 9 遗留与后续

1. **CI 证据缺位（阻断闭环）**：需 push `cch/05-harness-primitives` 以产生 CI run ID，方能按 §8.1.1 补齐「commit sha + CI run ID」证据铁律。**未获用户指示前不 push。**
2. **真实站点层 deep 链未在真实站点验证**：本票只在自有镜像目标（`mirror-control`，本地 hermetic 页）跑通 deep 6/6；第三方真实站点目标仍**不深交互**（`site-manifest.json` 的 `validate()` 硬约束 `deep` 仅允许 `kind === mirror`）。把 L3/L4 断言铺到真实站点属 A-029 台账去向 **T7（票 07）**，非本票范围。
3. **`softTier` 期望档位由实测钉为 `lowkey`**：本票 fixture 的 `#hp-select` 实测 `data-cch-tier=lowkey`（评分低于 `SCORE_AUTO = 70`，见 `src/config.ts:54`）。若评分常量或 detect 加权调整，该断言需同步复核。
4. **live-smoke 仍有 3 处固定静置**（`:113` / `:239` 的 `waitForTimeout(POLL_MS)` 轮询、`:266` 的 `waitForTimeout(SETTLE_MS)` 观测静置）—— 均为**票 32/39 预存**，且**不在** `runDeepChecks` 内（deep 链全程等待式守卫）。是否收敛为 `waitForFunction` 请复核裁定（属票 32/39 的资产）。
5. **`WAIT_MS = 5000` 的层间适用性**：真实站点（慢网络 / 重 SPA）下 5s 可能偏紧。当前 live 层仅对自有镜像目标走 deep 链（本地毫秒级），第三方目标只读注入面；若票 07 把驱动链铺到真实站点，需重新评估该上界（或改为可注入参数）。
6. **`__cchMenu` / `__cchEvents` 暴露面**：GM 替身把菜单命令（**含 `fn`**）与事件序列挂在宿主 `window` 上，页面脚本理论上可读 / 伪造。当前为「断言裁定权在页面侧外部可观测」（D-002）的必要代价，与票 03 的 `__cchDiag` 同类取舍；如需防伪造需改走 GM 存储或加签名，请复核裁定。
7. **`verify-ticket-05.mjs`（Cycle-5）与本票 `verify-ticket-05-harness.mjs` 并存**：编号同名不同票。本票已通过后缀命名 + 两份脚本头注互相指引消歧；若 W2 认为需在 README / 索引中显式区分，请裁定。
8. **`userscript.ts` 的 `soft*` adapter 目前仅被本票 spec 消费**：其余 19 个既有 spec 仍用裸 `expect()`。是否要求既有 spec 一并迁移到 web-first + `expect.soft`，属**范围扩张**，本票未做（避免触碰并行票在途的 spec 文件），请复核裁定。
