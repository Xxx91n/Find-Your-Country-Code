# 03: 诊断面

**What to build:** 让脚本能回答「各工具是否生效、为何未生效」：一份结构化诊断事件流作唯一事实来源，面板与机器可读输出是其两个 serializer；覆盖全链路四层判定。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-028


- [x] 诊断事件流为唯一数据源，面板与机器可读输出从同一份数据渲染（不得各自采集） — `src/diag/index.ts:118`（`records()` 唯一读出面）/ `:151`（`snapshot()` 机器可读）/ `:137`（`checks()`）；面板侧 `src/ui/index.ts:911`（`_renderDiag` 读事实源）；机器侧 `src/main.ts:36`（`window.__cchDiag = () => Diag.snapshot()`）。验证 `npx playwright test tests/diagnostics-surface.spec.ts -g 验收3` = **ok**（面板行数与 `__cchDiag().records` 同源一致）
- [x] 四层判定全链路：工具失效 / 注入失效 / 脚本逻辑失效 / 写入结果（提交前状态→写入动作→提交后断言） — 四层声明 `src/config.ts`（`DIAG_LAYERS` + `DIAG_REASON` 26 项，前缀即层）；层由前缀派生不手传 `src/diag/index.ts:26`（`LAYER_PREFIX`）/ `:35`；工具层 `src/detect/index.ts:590`（`_reasonOf` 从既有信号派生）/ `:907`（`gate:verdict-none`）；注入层 `src/detect/index.ts:298` / `:310` / `:922`；逻辑层 `src/fill/index.ts:101` / `:143` / `:283`；写入层三元组 `src/fill/index.ts:331`（`_assertWrite`；`:332` post 读回、`:337-339` pre/post/asserted、`:340` reason）。验证 `-g 验收5` = **ok**（四层依次点亮，写入三元组齐备）
- [x] 独立诊断视图（决策链时间线 + 过滤器 + 导出）+ 既有界面做入口与摘要 — 视图宿主 `src/ui/index.ts:480`；时间线渲染 `:911`（`_renderDiag`）/ 层级名映射 `:966`；过滤器 `:885`（`_diagFilter`）/ `:1008-1010` / `:1016` / `:1020`；导出 `:1076`（按钮）/ `:1079`（`D.text()` 序列化）/ `:1080`（剪贴板）；入口 `:397`（`#cch-diag-tg` 头部常驻）；摘要 `:892`（`_renderDiagSummary`）。验证 `-g 验收2` 与 `-g 验收6` = **ok**
- [x] 入口收敛为一个 GM 菜单项（不为每个诊断功能各设菜单项） — `src/main.ts:161`（唯一诊断命令，稳定 id `cch-menu-diag`，点击 `UI.open(null, null, null, { view: diag })`）；菜单总数 3 → 4（`:157` / `:158` / `:159` / `:161`）。验证 `npx playwright test tests/diagnostics-surface.spec.ts -g 验收1` = **ok**（诊断入口恰好 1 条）
- [x] 分级门控：error/warn 与计数器恒开；全链路 trace 门控且惰性构造；环形缓冲有容量上限 — 恒开 `src/diag/index.ts:99`（`error`）/ `:100`（`warn`）/ `:295`（计数器写入）；门控 + 惰性 `:91`（`lazily`）/ `:109`（`info`）/ `:113`（`trace`，thunk 门关零求值）/ `:116-117`（`traceOn` / `setTrace`）；门控键 `src/config.ts:131`（`DIAG_TRACE_PREF`，持久化经 `UI.setPref` 落 `UI_PREFS_KEY`）；容量上限 `src/config.ts:130`（`DIAG_CAPACITY = 200`，溢出丢最旧并计数）。验证 `-g 验收4` = **ok**（trace 关时无全链路记录但计数器仍增长；开启后记录出现且跨刷新保持）
- [x] fail 记录的 reason 指向已验证因果；诊断不挂运行热路径 — 闭集外降级 `src/diag/index.ts:72`（`verified = false` 且 `reason` 落 `unknown-open-debug`）/ `:70`（`verified` 位）；写入侧 `src/fill/index.ts:398`；reason 派生不手传 `src/detect/index.ts:903-905`；热路径 O(1) `src/diag/index.ts`（环形写入，无遍历 / 无排序）。验证 `npx playwright test tests/custom-dropdown.spec.ts tests/rescan.e2e.spec.ts --workers=1` = **ok**（`[cch-29 perf] 1000 节点 scan 实测: scans=1 maxMs=59` < 350）
- [x] 声明本票覆盖的 A-xxx：A-028 — 本文件头 + 报告头 + 提交信息

---

**验收证据**：逐项只读验证命令与输出摘要见 `.scratch/architecture-recovery/research/window-reports/03-diagnostics-surface-report.md` §4.2（Delta 检查点见 §5）。
**提交锚点**：`cch/03-diagnostics-surface` @ `1ee67dc0`（Change-ID `oto`）
**文档提交**：`<本提交 sha>`（本报告 + atomcode 调研 + 本文件勾销）
**基线**：common base `85990d2f`（Cycle-5 归档）；**堆叠于 `cch/02-settings-surface` @ `4067ce71` 之上**（本票 issue / handoff / spec 文件属 `cch/48` 产物，WORKFLOW §4.2）
**报告**：`.scratch/architecture-recovery/research/window-reports/03-diagnostics-surface-report.md`
**本地自证**：`npx tsc --noEmit` → exit 0；`npm run build` → `166.70 kB │ gzip: 48.22 kB`；闸门 03 → `58 PASS, 0 FAIL`；`npx playwright test --workers=1` → `110 passed`
**状态**：子窗口自证完成，**待大脑复核**（WORKFLOW §4.3）；**CI 证据缺位**（未 push，见报告 §8 / §9）
