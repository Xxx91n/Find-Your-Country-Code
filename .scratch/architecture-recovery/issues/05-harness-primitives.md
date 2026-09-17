# 05: harness 交互原语

**What to build:** 让验证能「驱动」而不只是「看见」：从密封层起建可复用交互原语层，并让 GM 替身可驱动。

**Blocked by:** 票 01（阶梯定义）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-029


- [x] 交互原语可从密封层调用：open → search → select → fill，并读回宿主字段 value — 唯一来源 `tests/helpers/primitives.mjs`（`openPanel`:129 / `searchType`:145 / `selectCountry`:157 / `fillField`:167 / `readHostValue`:204）；密封层经薄门面 `tests/helpers/userscript.ts:16`（`export * from './primitives.mjs'`，既有 4 导出名与导入面不变）消费；spec `tests/harness-primitives.spec.ts:44`（A 例四步逐段 + 读回 `#hp-select` value = `+86`）。验证 `npx playwright test tests/harness-primitives.spec.ts` = **7 passed**（exit 0）
- [x] 密封与 live 两个 harness 收敛为同一份原语（不新造第二套） — 共享层为**唯一** GM 替身（`tests/helpers/primitives.mjs:71` `GM_STUB`）与唯一原语实现；密封层 `tests/helpers/userscript.ts:16` 再导出；live 层 `tests/live/live-smoke.mjs:32-35` 直接 import，**已删除**内联第二套 GM 替身（原 `:44` 数组形式 + `:51` `GM_registerMenuCommand = () => 0` 空实现）与内联 `PROBE` 探针（原 `:95`）。验证 `node tests/scripts/verify-ticket-05-harness.mjs` = **59 PASS / 0 FAIL**（S1/S3 组：`const GM_STUB`=0 / `GM_registerMenuCommand`=0 / `const PROBE`=0 / `addInitScript(`=0；全仓该定义恰 **1** 处）+ `node tests/live/live-smoke.mjs --target mirror-control` = **deep 6/6、exit 0**（同一份原语在无测试运行器的 runtime 真实可用）
- [x] GM 替身记录 `{title, fn}` 且可调用 — `tests/helpers/primitives.mjs:87`（`window.__cchMenu.push({ id, title, fn })` 记录 **fn 本体**）/ `:86`（同 id 分支原地更新 title/fn 并 `return 0`，还原 Tampermonkey >= 5.0 / Violentmonkey >= 2.15.9 语义，不新增条目不递增计数）；读取面 `menuCommands`:262（`:266` 给出 `callable: typeof c.fn === 'function'`）；调用面 `invokeMenuCommand`:292（`:299` 真实执行 `cmd.fn()`；未命中 / 不可调用分别给 `no-match` / `fn-not-callable`）。验证 spec C/D/E = **ok**（4 条命令全 callable、`cch-menu-panel` 调用后面板可见、`cch-menu-restore` 可调用无拒因、无匹配给 `no-match`）
- [x] 断言改 web-first + `expect.soft` 一次收全量 — 门面 6 个 adapter `tests/helpers/userscript.ts:22` / `:28` / `:34` / `:40` / `:48` / `:53`（`softInjected` / `softTier` / `softHostValue` / `softFieldEvent` / `softFeedback` / `softMenuCallable`，全部 web-first locator + `expect.soft`）；live 层因 `expect.soft` **只在 test runner 下工作**（Playwright 官方）改由自建软收集器 `tests/live/live-smoke.mjs:127`（`runDeepChecks`：逐项 mark、一次收全量、不中断，失败项进既有 `failures` 数组）。验证门 S5 组：门面 `expect.soft(` = **7**、裸 `expect(` = **0**；spec `expect.soft(` = **29**、`waitForTimeout(` = 0、直写页面选择器 = 0（全仓 `expect.soft` 由 **0 → 36**，本票首次引入）
- [x] 声明本票覆盖的 A-xxx：A-029 — 本文件头 + `tests/harness-primitives.spec.ts` 头注 + `tests/helpers/primitives.mjs` 头注 + 报告头 + 提交信息

---

**验收证据**：逐项只读验证命令与输出摘要见 `.scratch/architecture-recovery/research/window-reports/05-harness-primitives-report.md` §4.2（Delta 检查点见 §5）。
**提交锚点**：`cch/05-harness-primitives` @ `f27458ce`（Change-ID `rxx`）
**文档提交**：`88d6112c`（Change-ID `wko`，本报告 + atomcode 调研 + 本文件勾销）
**基线**：common base `85990d2f`（Cycle-5 归档）；**堆叠于 `cch/01-acceptance-surface-and-ladder` @ `36455b7b` 之上**（本票 issue / handoff / spec 文件属 `cch/48` 产物 —— `git cat-file -e 85990d2f:.scratch/architecture-recovery/issues/05-harness-primitives.md` 失败，不堆叠则本勾销会退化为整文件新增；WORKFLOW §4.2）
**报告**：`.scratch/architecture-recovery/research/window-reports/05-harness-primitives-report.md`
**本地自证**：`npx tsc --noEmit` → exit 0；`npm run build` → `166.70 kB │ gzip: 48.22 kB`；结构门 05-harness → `59 PASS, 0 FAIL`；`npx playwright test tests/harness-primitives.spec.ts` → `7 passed`；`npm run e2e` → `117 passed`；live mirror deep → `6/6`；`tests/scripts/` 电池 → `16/16 exit 0`
**状态**：子窗口自证完成，**待大脑复核**（WORKFLOW §4.3）；**CI 证据缺位**（未 push，见报告 §8 / §9）
