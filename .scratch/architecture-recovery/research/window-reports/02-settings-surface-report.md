# 窗口报告 02 — 设置面收口（A-026 · A-027）

> 票：`issues/02-settings-surface.md` | 分支：`cch/02-settings-surface` | 日期：2026-09-16（Asia/Singapore）
> 基线：common base `85990d2f`（Cycle-5 归档）；依赖分支 `cch/48-cycle6-ticketing` @ `6d0563d9`（本票堆叠于其上）
> 提交锚点：`59daa016`（分支 `cch/02-settings-surface`，Change-ID `onr`；**堆叠于 `cch/48-cycle6-ticketing` @ `6d0563d9` 之上**）
> 性质：**行为面修复** —— 源码 + 密封 E2E + 结构闸门 + CI workflow。

---

## 1 结论摘要

本票把「语言设置找不到、切不干净」修成**可找到 + 切得干净 + 免重载跟随**，交付 6 项行为改变 + 1 项既有缺陷修复：

1. **设置一级入口**：GM 菜单新增第三条命令「设置」（稳定 id `cch-menu-settings`），点击调 `openSettings()` → 打开面板**并显式**把 `_view` 置为设置所在视图（既有 `#cch-rules-view`），再深链定位到语言行。**不是只开面板**。
2. **三选一显式控件**：语言控件由循环按钮改为 `.cch-locale-seg` 分段控件，`LOCALE_MODES` 三值（auto / zh / en）**并列可见**，`role=radiogroup`；旧循环按钮 `#cch-locale-tg` 已删除（计数 0）。
3. **字典化全量重渲染**：新增 `_i18n()` 统一扫 `[data-i18n]` / `[data-i18n-title]` / `[data-i18n-aria-label]` / `[data-i18n-placeholder]` 标记族（8 处写入点 / 4 类属性）；新增 `_refreshIconLabels()` 补图标 `title` + `aria-label`；`_render()` 恒调 `_renderRows` 重刷行数据（收藏行 `title` / 空态文案）。原手工逐项刷新方法 `_applyLocaleText()` **已删除**（方法定义计数 0）。
4. **菜单标签免重载跟随**：三条命令均带稳定 `cch-menu-*` id，`UI._menuRefresh` 在 `_setLocale()` 内重入 → 同 id 原地更新，不新增条目、不重载页面。
5. **入口可达性与反馈**：语言行滚入可见区（**只滚面板内滚动容器**，不牵连宿主页面）+ 高亮脉冲 1.5s 后衰减；已开面板**原地复用**，不重复入栈、不清返回栈。
6. **既有缺陷修复**：`.cch-sec{display:flex}` 压过 UA 样式表的 `[hidden]{display:none}`，使 `hidden` 属性对所有视图容器失效（设置视图与国家列表**互相叠显**）。补 `.cch-sec[hidden]{display:none}` 修复。

**Delta 纪律遵守**：不新建独立设置视图、不重排设置顺序 —— 设置仍落在既有 `#cch-rules-view`；全局 `data-cch-view` 写入点**计数恒为 1**（见 §5 D-①）。

---

## 2 复现基线（动手前先留证据）

| 项 | 观测值 | 命令 |
|---|---|---|
| common base | `85990d2f9d1b7ca1f9e5c342790cee3a39cc004` | `git merge-base HEAD 85990d2f` |
| 本票分支 head | `59daa016756149dc2a056a10ce9c5974cab01b45` | `git rev-parse cch/02-settings-surface` |
| 既有密封 spec 数（动手前） | **16** | `ls tests/*.spec.ts | wc -l` |
| 既有票级闸门数（动手前） | **22** | `ls tests/scripts/ | wc -l` |
| 密封 spec 数（收口后） | **17**（+`settings-surface.spec.ts`） | 同上 |
| 票级闸门数（收口后） | **23**（+`verify-ticket-02-settings.mjs`） | 同上 |

---

## 3 交付物

| 路径 | 内容 | 行数 / 字节 | SHA-256（前 12） |
|---|---|---|---|
| `tests/settings-surface.spec.ts` | **本票验收面**（8 例：验收1–6 + delta） | 257 / 16600 | `af90438b7c77` |
| `tests/scripts/verify-ticket-02-settings.mjs` | 结构闸门 S0–S6（33 断言） | 105 / 8000 | `775b577fc31c` |
| `.github/workflows/verify-02-settings.yml` | 票级 CI 闸门（node 22，无 npm 依赖） | 32 / 982 | `43db850f0b85` |
| `research/prompt-02-atomcode.md` | atomcode 调研提示词（Q1–Q8） | 64 / 5628 | — |
| `research/atomcode-02-settings-surface.md` | atomcode 调研记录（18 来源 / 6 缺口） | 171 / 22851 | — |
| `research/window-reports/02-settings-surface-report.md` | 本报告 | — | — |

**源码改动（`src/`）**：`config.ts` +5、`i18n.ts` ±10、`main.ts` +18/-、`types.ts` +4、`ui/index.ts` +473/-。
**测试改动**：`entry-access.spec.ts`、`helpers/userscript.ts`、`iframe.e2e.spec.ts`、`locale-switch.spec.ts`。
提交总计 **12 files changed, 900 insertions(+), 62 deletions(-)**（`git show --stat 59daa016`）。

---

## 4 验收项逐条勾销

### 4.1 提交锚点

本票提交：`cch/02-settings-surface` @ **`59daa016`**（Change-ID `onr`）。
**分支拓扑**：本票**堆叠于依赖分支** `cch/48-cycle6-ticketing` @ `6d0563d9` 之上（`git log --oneline -2 cch/02-settings-surface` 可验）。原因：本票的 `issues/02` / `handoffs/02` / `prompts/02` / `spec.md` 均为 `cch/48` 产物，**不在 common base `85990d2f` 上**；不堆叠则「issue 验收项勾销」这一步**无文件可改**（GitButler 实测报错：`lines 12–27 depends on cch/48-cycle6-ticketing`）。依 WORKFLOW §4.2「确有依赖按 `but move <branch> --above <dependency>` 堆叠」执行，与票 01 处理一致。**注**：本票与同波次票 01/03/04 之间**无堆叠**，不违反「同波次不堆叠」。

### 4.2 逐条

| # | 验收项 | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| 1 | GM 菜单新增「设置」项，点击后打开面板**并显式切到设置所在视图**（不能只开面板） | `src/main.ts:146`（`id: cch-menu-settings`）；`src/ui/index.ts:511` `openSettings()`，`:513/:519` `_view = rules`；`:459` `setAttribute(data-cch-view, SETTINGS_VIEW)` | `node tests/scripts/verify-ticket-02-settings.mjs`；`npx playwright test tests/settings-surface.spec.ts -g 验收1` | 闸门 `33 PASS, 0 FAIL`（exit 0）；验收1 `ok`（307ms）—— 断言面板已开 + `data-cch-view=settings` + 列表/召唤/反馈区均已隐藏 |
| 2 | 语言控件由循环按钮改为三选一显式控件（自动 / 中文 / English 并列可见） | `src/ui/index.ts:675`（`.cch-locale-seg`）、`:679`（`for (const mode of LOCALE_MODES)`）、`:128-131`（CSS）；`src/i18n.ts:9` `LOCALE_MODES` 未改 | 闸门 S6；`npx playwright test tests/settings-surface.spec.ts -g 验收2`；`npx playwright test tests/locale-switch.spec.ts` | 验收2 `ok`（835ms）—— 三选项 `toHaveCount(3)`、`data-locale` 顺序 `[auto, zh, en]`、同一 y 轴（±2px）、`role=radiogroup`、`aria-pressed` 正确；`#cch-locale-tg` 计数 **0** |
| 3 | 切换语言后全 UI 无漏刷（含图标 title/aria-label、收藏行 title、空态文案） | `_i18n()` `src/ui/index.ts:1136-1144`；`_refreshIconLabels()` `:1146-1154`；`_setLocale()` `:1156-1162`；`_renderRows` 调用点 `:1099-1100` | 闸门 S4（`_applyLocaleText(): void` 计数 = 0）；`npx playwright test tests/settings-surface.spec.ts -g 验收3` | S4 PASS；验收3 `ok`（898ms）—— 停在设置视图切语言后，图标 `title`/`aria-label`、两个列表的收藏行 `title`、空态文案、面板 chrome、语言选项标签**全部本地化** |
| 4 | 菜单标签无需重载即跟随（`GM_registerMenuCommand` id 原地更新） | `src/main.ts:144-146`（三条 `cch-menu-*` id）、`:150` `UI._menuRefresh = refreshMenu`；`src/ui/index.ts:1160` 重入；`src/types.ts:210/:212` 声明 | 闸门 S5；`npx playwright test tests/settings-surface.spec.ts -g 验收4` | 验收4 `ok`（727ms）—— 断言 `__nav === 1`（**零重载**）、`__cchMenuCount === 3`（**不新增条目**）、ids = `[cch-menu-restore, cch-menu-panel, cch-menu-settings]`、标题由 `Settings` → `设置` 原地跟随 |
| 5 | 入口把语言行滚入可见区 + 高亮衰减；已开面板原地复用不重复入栈 | `_revealSection()` `src/ui/index.ts:526-545`（`:536` 只滚最近滚动容器、`:540` 加 `cch-flash`、`:542` 1500ms 衰减、`:544` `focus({preventScroll:true})`）；`openSettings()` `:512-517` 复用分支 | `npx playwright test tests/settings-surface.spec.ts -g 验收5` | 验收5 `ok`（2.4s）—— 40 条豁免域名逼出滚动（`scrollMax > 0`、`scrollTop > 0`）、目标行落在滚动容器内、`cch-flash` 出现并在 4s 内衰减；二次调用仍只有 **1 个** `#cch-pop` 且重新高亮 |
| 6 | 豁免域名数量不影响语言控件可达性 | `tests/settings-surface.spec.ts:221`（`for (const n of [0, 40])`） | `npx playwright test tests/settings-surface.spec.ts -g 验收6` | 两条均 `ok`（0 条 496ms / 40 条 404–618ms）—— 两种规模下语言控件均可达、可点、prefs 正常写入 |
| 7 | 声明本票覆盖的 A-xxx：A-026 · A-027 | 本报告头 + `issues/02` 头 + 提交信息 | `head -8 .scratch/architecture-recovery/issues/02-settings-surface.md` | 头行含「**覆盖 A-xxx: A-026 · A-027**」 |

**全量回归**（本票验收面的上位证据）：`npm run e2e`（= `npm run build && playwright test`，**先构建后测**，保证跑的是新产物）→ **`104 passed (50.4s)`**。

---

## 5 本票 Delta 检查点逐条

| # | 检查点（handoff） | 落在 | 只读验证命令 | 输出摘要 |
|---|---|---|---|---|
| D-① | **不新建独立设置视图、不重排设置顺序** | 设置仍落在既有 `#cch-rules-view`；全局仅一处 `setAttribute(data-cch-view, ...)` | 闸门 S2；`npx playwright test tests/settings-surface.spec.ts -g delta` | S2 PASS（`setAttribute(data-cch-view` 计数 **= 1**、`#cch-rules-view` 存在、无 `cch-settings-view`）；delta 例 `ok`（655ms）—— 断言 `[data-cch-view]` 节点**恰好 1 个**、语言行仍在低调行之后 |
| D-② | 菜单项必须打开面板**并显式切到设置所在视图** | `openSettings()` `src/ui/index.ts:511-521`（`_view = rules` + `_render` + `_revealSection`） | 闸门 S1/S5；spec 验收1 | PASS；验收1 断言视图容器与列表视图**互斥显隐**，即已切视图 |
| D-③ | 深链目标用**稳定标识符**，不得绑内部实现名或易变排序位置 | `src/config.ts:101` `SETTINGS_VIEW`、`:102` `SETTINGS_SECTION_LOCALE`；`src/ui/index.ts:529` `[data-cch-section='locale']` | 闸门 S1 | PASS —— 常量导出且被消费；**无** `getElementById(cch-locale-row)` 这类实现名定位 |
| D-④ | 不得改 `LOCALE_MODES` 取值语义与 `UI_PREFS_KEY` 持久化键 | `src/i18n.ts:9` `LOCALE_MODES = [auto, zh, en]`；`src/config.ts:96` `UI_PREFS_KEY = cch_ui_prefs_v1` | 闸门 S3；`node tests/scripts/verify-ticket-42.mjs` | S3 PASS；票 42 闸门 **`42 PASS, 0 FAIL`**（exit 0）—— 该闸门直接加载模块断言 `LOCALE_MODES` 含 auto/zh/en 且持久化键不变 |
| D-⑤ | 切换后必须**全量重渲染**，不得继续手工逐项刷新 | `_setLocale()` `:1156-1162` → `_refreshIconLabels()` + `_menuRefresh()` + `_render()`；手工方法已删 | 闸门 S4 | PASS —— `_applyLocaleText(): void` 计数 **0**（仅存 1 处说明性注释 `:1135`） |

---

## 6 atomcode 深度调研（串行护栏：全程 1 个在途）

- **载体**：`atomcode` CLI headless（`--prompt-file` + `--output-format text` + `--no-telemetry` + `-C <仓库根>`），单次调用，耗时 5m36s，**`ATOMCODE_EXIT=0`**。
- **落盘**：`research/atomcode-02-settings-surface.md`（171 行 / 22851 B，UTF-8 无 BOM，LF）；提示词 `research/prompt-02-atomcode.md`（64 行 / 5628 B）。
- **覆盖度**：Q1–Q8 **全部命中**；来源清单 **18 条**，五角度（Official / Comparative / Criticism / Community / Currency）；证据标注 **21 处 cited / 13 处 candidate**；信息缺口 **6 条**。
- **采纳进实现**：
  - Tampermonkey **5.0+** 与 Violentmonkey **2.15.9+** 支持 `{ id }` 原地更新（Violentmonkey 2.16.2+ `id` 默认 = caption）→ 采纳为 `src/main.ts:144-146` 三条稳定 id（**cited**）。
  - 「三值并列 + 立即生效 + 单 tab stop」场景，APG 推荐 **radiogroup**（GitHub Primer 指出 tablist 语义是「切面板」而非「选值」）→ 采纳为 `role=radiogroup` 分段控件（**cited**）。
  - 成熟 i18n 一致采用「字典 + 标记声明式扫描」，手写逐项赋值是漏刷根因 → 采纳为 `_i18n()` 标记族 sweep（**cited**）。
  - 高亮时长业界先例经验值 **1.6–2s** → 采纳 1.5s 衰减（**candidate**，无规范依据，见 §9）。
  - 稳定标识符优于位置索引（Testing Library「像用户一样查询」原则 / Playwright 稳定选择器层级）→ 采纳为 `data-cch-view` / `data-cch-section`（**cited**）。
- **未采纳（已登记）**：Greasemonkey 4 **不支持** options 对象（仅 `accessKey`，4.11+）——当前实现以 `try/catch` 包裹注册，GM4 下菜单项仍注册但**无 id**，降级路径未实现（见 §9）。
- **辩证披露**：本报告如实记录调研时点偏离（§7 O-③）。

---

## 7 偏离点（呈报用户）

| # | 偏离 | 原因 | 状态 |
|---|---|---|---|
| O-① | 报告路径 `research/window-reports/` | handoff 已声明（任务书原文写 `reports/NN-report.md`）；沿用既有 50+ 报告链与 README 索引。经查证该目录实际为 `.scratch/architecture-recovery/research/window-reports/`，与票 01/03/04 落点**完全一致**。 | 沿用 |
| O-② | 本提交**带入并行票 03 的同 hunk 在途改动**（约 310 行：`_renderDiag` / `_renderDiagSummary` / diag 常量与 i18n 键） | 票 03 在途代码与票 02 改动落在**同一批 GitButler hunk** 内，且 `but commit --help` 明确粒度只有「文件或 hunk」**无子 hunk 选择**；只提交 22 个纯 hunk 会产出**不可构建的 tip**（`SETTINGS_SECTION_LOCALE` 未定义、`_setLocale`/`_i18n` 缺失）。已**向用户呈报并获明确授权**「带入共享 hunk」。 | **已授权执行**；票 03 提交自身改动时需 rebase / 重新归属 |
| O-③ | **atomcode 调研时点偏离**：调研 artifact 在实现**完成之后**补做（本会话重跑），而非 handoff 要求的「动手前」 | 原会话已做该调研并据以定型（三条 id + radiogroup + 字典扫描），但**未落盘 artifact**；本会话发现缺件后重跑补齐。产物来源标注完整（21 cited / 13 candidate）、结论与既有实现**一致**，但时点不符合「动手前」原文。 | **如实呈报**，请复核 |
| O-④ | 修复 `src/i18n.ts` 第 23/38 行**缺失尾逗号** | 并行票 03 在途插入 `diagnostics:` 行时漏尾逗号，造成**解析级语法错误**，阻断全仓构建（`TS1005`）与票 42 闸门。属跨票必要修复，已在提交信息中显式披露。 | 已执行 |
| O-⑥ | 分支拓扑为**堆叠**（非独立分支） | 本票的 `issues/02` 等 brief 文件是 `cch/48` 产物，不在 common base 上；不堆叠则 issue 无法勾销（GitButler 实测依赖报错）。依 WORKFLOW §4.2 堆叠于依赖分支之上。 | **已执行**（见 §4.1） |
| O-⑤ | 修复**既有缺陷** `.cch-sec` 的 `[hidden]` 失效 | 验收1 确定性红灯的**根因**（`.cch-sec{display:flex}` 压过 UA `[hidden]{display:none}`，致视图容器与列表视图叠显）。不修则本票验收1 无法通过，故属本票必要范围，非新增需求。已在 CSS 就地注明红灯锚点。 | 已执行 |

---

## 8 证据边界登记（WORKFLOW §8.2）

1. **为何当前缺 CI 证据**：本票**有**可执行行为面，**应当** CI 化，且 `verify-02-settings.yml` 与 `.github/workflows/e2e.yml` 已就位（后者触发于 push 到 `cch/**`）。但本票**尚未 push**（GitButler 规则：未获用户指示不 push），故当前**无 CI run ID**。因此 §4.2 全部结果均为 **开发期自证**，依 §8.1 **不得**替代 CI 证据。
2. **命令原文**：见 §4.2 / §5 各行「只读验证命令」列。
3. **输出摘要**：见 §4.2 / §5 各行「输出摘要」列；关键值 —— `npm run e2e` → `104 passed (50.4s)`；闸门 02 → `33 PASS, 0 FAIL`（exit 0）；闸门 42 → `42 PASS, 0 FAIL`（exit 0）。
4. **已知非绿项（非本票引入）**：`npx tsc --noEmit` **exit 2 / 7 errors**，全部落在**票 03 在途文件**（`src/detect/index.ts:297`、`src/diag/index.ts:137/:179`、`src/ui/index.ts:351/:909/:947/:960`；其中 `:351` 行首注释即 `票 03 [A-028]`）。本票交付面（config/i18n/main/types/UI 的设置与 i18n 路径）**零 typecheck 错误**。注意 `npm run build` 走 vite/esbuild **不做类型检查**，故 exit 0 不代表类型干净。
5. **复核窗口 / 复核人**：大脑在 S8 收口阶段逐份核对（WORKFLOW §4.3）；本报告为**待复核**产物，未经复核不得视为闭环。

---

## 9 遗留与后续

1. **CI 证据缺位（阻断闭环）**：需 push `cch/02-settings-surface` 以产生 CI run ID，方能按 §8.1 补齐「commit sha + CI run ID」证据铁律。**未获用户指示前不 push。**
2. **票 03 需 rebase / 重新归属**：本提交已带入其同 hunk 在途改动（O-②）；票 03 提交自身改动时须处理归属，否则其 diff 会显示为「已提交」。
3. **Greasemonkey 4 降级路径未实现**：调研已 **cited** 确认 GM4 仅支持 `accessKey`、不支持 options 对象；当前实现以 `try/catch` 包裹，GM4 下菜单项仍注册但**无稳定 id**，即「菜单标签免重载跟随」在 GM4 下**不成立**。是否属本票范围请复核裁定。
4. **高亮时长 1.5s 无规范依据**：调研 §四.4 明确 1.6–2s 仅工程先例经验值（**candidate**），无 W3C/HIG 规定；若需权威依据需本地实测取舍。
5. **Safari Userscripts（quoid）支持未知**：调研 §四.1 无官方文档命中，已按「不支持」保守处理。
6. **`hidden=until-found` 未采用**：调研 §四.3 指出该状态不适用于视图互斥场景，故采用显式 `[hidden]{display:none}` 补规则。
