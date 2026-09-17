# 02: 设置面收口

**What to build:** 让语言设置被找到并切得干净：GM 菜单补上唯一零置信度入口；语言控件改三选一显式控件；切换后全 UI 无漏刷且菜单标签即时跟随。不新建视图、不重排顺序。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-026 · A-027


- [x] GM 菜单新增「设置」项，点击后打开面板并显式切到设置所在视图（不能只开面板） — `src/main.ts:146`（稳定 id `cch-menu-settings`）+ `src/ui/index.ts:511` `openSettings()`（`:513/:519` 置 `_view` 为设置视图）+ `:459` 写 `data-cch-view`；验证 `npx playwright test tests/settings-surface.spec.ts -g 验收1` = **ok**（面板已开 + `data-cch-view=settings` + 列表/召唤/反馈区均已隐藏）
- [x] 语言控件由循环按钮改为三选一显式控件（自动 / 中文 / English 并列可见） — `src/ui/index.ts:675`（`.cch-locale-seg`）+ `:679`（`for (const mode of LOCALE_MODES)`）+ `:128-131`（CSS）；验证 `-g 验收2` = **ok**（三选项 `toHaveCount(3)`、`data-locale` 顺序 `[auto, zh, en]`、同一 y 轴 ±2px、`role=radiogroup`；`#cch-locale-tg` 计数 **0**）
- [x] 切换语言后全 UI 无漏刷（含图标 title/aria-label、收藏行 title、空态文案） — `_i18n()` `src/ui/index.ts:1136-1144`（标记族 sweep）+ `_refreshIconLabels()` `:1146-1154` + `_renderRows` 调用点 `:1099-1100`；验证 `-g 验收3` = **ok**（图标 `title`/`aria-label`、两个列表的收藏行 `title`、空态文案、面板 chrome、语言选项标签全部本地化）
- [x] 菜单标签无需重载即跟随（`GM_registerMenuCommand` id 原地更新） — `src/main.ts:144-146` 三条稳定 `cch-menu-*` id + `:150` `UI._menuRefresh = refreshMenu`，在 `_setLocale()`（`src/ui/index.ts:1160`）重入；验证 `-g 验收4` = **ok**（`__nav === 1` 零重载、`__cchMenuCount === 3` 不新增条目、标题 `Settings` → `设置` 原地跟随）
- [x] 入口把语言行滚入可见区 + 高亮衰减；已开面板原地复用不重复入栈 — `_revealSection()` `src/ui/index.ts:526-545`（只滚最近滚动容器 `:536`、`cch-flash` `:540`、1500ms 衰减 `:542`）+ `openSettings()` 复用分支 `:512-517`；验证 `-g 验收5` = **ok**（40 条豁免域名逼出滚动，`cch-flash` 4s 内衰减；二次调用仍只有 1 个 `#cch-pop`）
- [x] 豁免域名数量不影响语言控件可达性 — `tests/settings-surface.spec.ts:221`（`for (const n of [0, 40])`）；验证 `-g 验收6` = **ok × 2**（0 条与 40 条下均可达、可点、prefs 正常写入）
- [x] 声明本票覆盖的 A-xxx：A-026 · A-027 — 本文件头 + 报告头 + 提交信息

---

**验收证据**：逐项只读验证命令与输出摘要见 `.scratch/architecture-recovery/research/window-reports/02-settings-surface-report.md` §4.2（Delta 检查点见 §5）。
**提交锚点**：`cch/02-settings-surface` @ `59daa016`（Change-ID `onr`）
**文档提交**：`dfedcf6a`（Change-ID `lxx`，本报告 + atomcode 调研 + 本文件勾销）
**基线**：common base `85990d2f`（Cycle-5 归档）；**堆叠于 `cch/48-cycle6-ticketing` @ `6d0563d9` 之上**（本票 issue/handoff/spec 文件均属该分支，WORKFLOW §4.2）
**报告**：`.scratch/architecture-recovery/research/window-reports/02-settings-surface-report.md`
**本地自证**：`npm run e2e` → `104 passed`；闸门 02 → `33 PASS, 0 FAIL`；闸门 42 → `42 PASS, 0 FAIL`
**状态**：子窗口自证完成，**待大脑复核**（WORKFLOW §4.3）；**CI 证据缺位**（未 push，见报告 §8/§9）

**返工轮次 R2（2026-09-16）**：本票分支在 CI 上构建失败（run `35089321289` @ b95f672f），根因为交付提交 `61f3ebe7` 被扫入并行票 03 的诊断面整层而缺配套导出（实测缺 3 个符号：`DIAG_REASON` / `DIAG_POINT_PREFIX` / `DIAG_TRACE_PREF`）。R2 已产出**全绿验证的修复补丁**（`research/cch02-r2-decontamination.patch` + `research/cch02-r2/` 全文，`-p1` 实测 CLEAN），但**落地被 GitButler 依赖机制阻断**（`depends on cch/03`；cch/02 与 cch/03 等 7 支同属一个 stack，`but unapply` 会连带卸栈），经用户裁定**移交大脑落地**。R2 逐分支验收（隔离检出，非并集）：`npm run build` exit 0 · `npm run typecheck` 0 错 · 门 02 33 PASS/0 FAIL · 门 42 42 PASS/0 FAIL · 全量 E2E 103 passed/1 failed（唯一红 = `entry-access` 垂直居中 = R-3，非本票）。详见报告 `## 返工轮次 R2`。
