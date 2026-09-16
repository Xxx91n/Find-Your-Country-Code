# Cycle-6 第 1 波首脑复核报告（票 01 / 02 / 03 / 04）

> 复核人：大脑 Agent | 2026-09-16 | 方法：**不信报告自述，逐条回仓库实物验证**（子代理并行验证 + 主 Agent 实跑门与守卫脚本 + 分支落位 + rg 代码抽查）
> 验证分工：子代理 verify-02 / verify-03 / verify-01-04（只读）；主 Agent 实跑闸门、全量 E2E、远端与栈形、跨票改动取证

## §1 分支落位（but status + ancestry 实物）

| 分支 | 头 | 自 base 提交数 | 远端 | 结论 |
|------|----|--------------|------|------|
| cch/01-acceptance-surface-and-ladder | 193018de | 10 | **不在远端** | ✅ 落位 |
| cch/02-settings-surface | 4067ce71 | 5 | **不在远端** | ✅ 落位 |
| cch/03-diagnostics-surface | 2f64632c | 8 | **不在远端** | ✅ 落位 |
| cch/04-domain-modeling | 77704d4c | 2 | **不在远端** | ✅ 落位 |

**栈形实测（ancestry）**：`47 → 48 → 01` YES；`02 → 03` **YES**；`01 → 02` NO；`01 → 03` NO。→ 实际为两条栈 + 一张独立票，**并非全并行**（见 §5 P-3）。

## §2 声明 → 证据 → 结论对照表

### 票 01 验收面与断言阶梯定义（A-029 · A-030）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| 交付 `tests/ACCEPTANCE-SURFACE.md`，**零源码/零 harness 改动** | `git show --name-only ecd38b13` 命中 5 文件，`src/` 命中 **0**；文件实体 17898B | ✅ 属实 |
| 17 项验收 + 1 项诊断，`__cchLastFill` 移出验收面 | 程序化计数 `| [0-9]+ |` = **17**；`| D[0-9]+ |` = **1**；`:66` 标「诊断项」 | ✅ 属实 |
| L0–L4 五级 + 逐级层归属 | `:124-130` 五级表（5 行）；`:134-140` 逐级两列（owned / 真实站点） | ✅ 属实 |
| 持久化为通用判据（6 项有状态工具） | `:74-76` 「适用 6 项」；`有状态=是` 行数 = **6** | ✅ 属实 |
| 跨隔离链路单列 + **双端断言** | `:57` 第 14 项；`:100` 链路 A、`:105` 链路 B，各含两端断言；`:108` 不得只断言消息到达 | ✅ 属实 |
| 环境真实性（L2+ 真实 runtime / headless full Chromium） | `:152` 条 1、`:153` 条 2；`headless_shell` 命中 2 | ✅ 属实 |
| spec S-03 指针 | `git show ecd38b13` 的 spec 段 +1 行指针 | ✅ 属实 |
| issue 6 项勾销 | `grep -c '^- \[x\]'` = **6**，undone = 0 | ✅ 属实 |
| **CI run 证据** | 远端无该分支 | ❌ **缺失（P-2）** |

### 票 02 设置面收口（A-026 · A-027）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| GM 菜单「设置」项**开面板 + 显式切视图** | `src/main.ts:159` `GM_registerMenuCommand(t('settings'), () => { UI.openSettings(); }, { id: 'cch-menu-settings' })`；`ui/index.ts:528-539` `openSettings()` 设 `_view='rules'` 后 `_render()` + `_revealSection()` | ✅ 属实 |
| 稳定标识符深链 + 滚入可见区 + 高亮衰减 + 面板复用 | `config.ts:101-102` `SETTINGS_VIEW`/`SETTINGS_SECTION_LOCALE`；`ui:688/546/549-553/557-559`；`ui:529-534` `if (this._popup)` 早返回 | ✅ 属实 |
| 循环按钮 → **三选一显式控件** | `ui:691-708` `role=radiogroup` + `for (const mode of LOCALE_MODES)` + `data-locale` + `aria-pressed`；旧 `#cch-locale-tg` 全仓计数 **0** | ✅ 属实 |
| `LOCALE_MODES` / `UI_PREFS_KEY` 语义**未改** | `i18n.ts:9` 与基线 `85990d2f:9` 逐字符相同；`config.ts:96` 同 | ✅ 属实 |
| 字典化全量重渲染 + `_applyLocaleText` **已删** + 零漏刷 | 基线 `:750` 有定义 → 现定义计数 **0**（仅存注释 `:1154`）；`_i18n()` `:1155-1163` 覆盖 4 类属性；`_refreshIconLabels()` `:1165-1173` | ✅ 属实 |
| 菜单 `cch-menu-*` id + `_menuRefresh` 随语言重入 | 提交版 `59daa016:src/main.ts:144-146` 恰 3 条 id；`:150` `UI._menuRefresh = refreshMenu`；`ui:1179` 调用点 | ✅ 属实（**仅对提交版**；工作树已 4 条，见 P-1） |
| 修复 `.cch-sec` `display:flex` 压过 UA `[hidden]` | `ui:70` + `ui:74` `.cch-sec[hidden]{display:none}`；全量回归 110 passed 含 `visibility.spec.ts` | ✅ 属实，无回归 |
| 三件交付物 | `tests/settings-surface.spec.ts`（8 例）· `verify-ticket-02-settings.mjs`（33 断言）· `verify-02-settings.yml`（31 行） | ✅ 属实 |
| **闸门实跑** | `node tests/scripts/verify-ticket-02-settings.mjs` → **exit 0，33 PASS / 0 FAIL** | ✅ 属实（主 Agent 复现） |
| **规格实跑** | `npx playwright test tests/settings-surface.spec.ts` → **8 passed** | ✅ 属实 |
| workflow 触发面 | `verify-02-settings.yml:8` `pull_request:` | ✅ 符 ADR-0006 §2 |
| **CI run 证据** | 远端无该分支 | ❌ **缺失（P-2）** |

### 票 03 诊断面（A-028）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| **单一采集路径**（面板与机器输出同源） | `main.ts:22-32` 唯一装配点建 `createDiag({})` → `deps.Diag`（UI 读面）+ `window.__cchDiag`（机器读面）；`diag/index.ts:50` 为全仓**唯一**缓冲；`ui:926` `D.records()` / `D.snapshot()` / `D.checks()` 全走同一实例 | ✅ **属实（核心）** |
| 四层判定全链路（tool/inject/logic/write + 写入三元组） | `config.ts:135` `DIAG_LAYERS`；`fill:331-340` `_assertWrite` 记 `res.pre/res.post/res.asserted`；`detect:590-607` `_reasonOf` | ✅ 属实 |
| 独立诊断视图 + 既有面做入口与摘要 | `ui:911` `_renderDiag()`；`:1030` `cch-diag-list`；`:1003-1020` 层级/等级双维过滤；`:1076-1081` 导出；`:397` 头部入口 | ✅ 属实 |
| 入口收敛为**一个** GM 菜单项 | `main.ts:161` 仅 1 条 `cch-menu-diag`；全文件 4 条实调用 | ✅ 属实 |
| 分级门控 + 惰性构造 + 环形缓冲上限 | `diag:99-100` error/warn 恒写；`:101-105` counter 无分配；`:107-114` traceFlag 门控；`:91-95` `lazily(thunk)`；`:47,50,76-78` `cap` + 溢出计数；`config:130` `DIAG_CAPACITY = 200` | ✅ 属实 |
| fail 记录 reason 指向已验证因果 | `diag:70-72` `REASON_SET.has(r)` 否则降级 `UNKNOWN` + `verified=false`；闭集 26 项 | ✅ 属实 |
| 诊断不挂热路径（1000 节点 < 350ms） | 实测 `maxMs=48` < 350 | ✅ 属实 |
| **闸门实跑** | `node tests/scripts/verify-ticket-03.mjs` → **exit 0，58 PASS / 0 FAIL** | ✅ 属实（主 Agent 复现） |
| **规格实跑** | `npx playwright test tests/diagnostics-surface.spec.ts` → **6 passed** | ✅ 属实 |
| **CI run 证据** | 远端无该分支 | ❌ **缺失（P-2）** |
| **跨票改动** | `1ee67dc0` 修改了 4 张其他票的 7 个工件 | ❌ **见 P-1** |

### 票 04 域建模（A-033）

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| ADR-0010 实体，含取舍 + 被否 + 反证 | `docs/adr/0010-release-gate.md` `:20-23` 4 决策、`:29-33` 5 条被否、`:48-51` 4 反证 | ✅ 属实 |
| **ADR-0008 第二层未改写** | `git diff 85990d2f 8aa956fa -- docs/adr/0008-…` → **0 字节** | ✅ 属实 |
| 恰 +7 术语（28 → 35） | 程序化：`85990d2f:CONTEXT.md` = **28** → `8aa956fa` = **35**；`comm` 新 = 7，移除 = 0 | ✅ 属实 |
| 无实现细节 | 新增块 34 行；禁词 SHA256/指纹/退化回路/WARC/SingleFile/回放自检/bump **全 0** | ✅ 属实 |
| 命名零碰撞 | 7×28 相等 + 双向子串 → `collisions: []` | ✅ 属实 |
| 台账 29 vs 实测 28（已自报） | `git show 85990d2f:CONTEXT.md` 计数 = **28** | ✅ 属实（报告已自报） |
| L0–L4 同名消歧句存在 | `CONTEXT.md:128` 注明「与信号层 L0–L4 同名不同轴」 | ✅ 属实 |
| **issue 5 项勾销** | `grep -c '^- \[x\]'` = **0**，undone = **5**；`git log --all -- issues/04…` 仅 `6d0563d9`（立票提交）——**无任何提交触碰过该 issue** | ❌ **完成定义未满足（P-4）** |
| **CI run 证据** | 纯文档；远端无该分支 | ⚠️ 缺失（P-2，纯文档降级） |

## §3 账本维度（逐 A-xxx 核对实现证据）

| A-ID | 票 | 实现证据 | 判定 |
|------|----|---------|------|
| A-026 | 02 | `main.ts:159` 菜单项 + `ui:528-539` 切视图 + `ui:691-708` 三选一控件 | ✅ implemented（待 CI） |
| A-027 | 02 | `ui:1155-1181` 全量重渲染 + `main.ts:144-150` id 原地更新 + `_applyLocaleText` 已删 | ✅ implemented（待 CI） |
| A-028 | 03 | `src/diag/index.ts`（209 行）+ 四层判定 + 独立视图 + 分级门控 | ✅ implemented（待 CI） |
| A-029 | 01（+05/07） | 本票交付**断言口径与阶梯定义**；**harness 交互原语在票 05**、**真实站点层在票 07** | ⚠️ **部分**（定义完成，实作未开始） |
| A-030 | 01（+06） | 本票交付**阶梯定义**；**形态语料三层架构在票 06** | ⚠️ **部分** |
| A-031 | 08（W5） | 未开始 | ⏸ 未开始 |
| A-032 | 08（W5） | 未开始 | ⏸ 未开始 |
| A-033 | 04 | `docs/adr/0010-release-gate.md` + CONTEXT 28→35 | ✅ implemented（待 CI） |

**缺失/弱化/跑偏单独列出**：A-029 / A-030 为**部分覆盖**（本波只完成定义层，实作层在后续波次）；A-031 / A-032 未开始；无「跑偏」。

## §4 全量 E2E 实测（主 Agent）

- `npx playwright test` → **110 passed (51.7s)**，exit 0。
- `npm run build` → exit 0（166.70 kB / gzip 48.22 kB）。
- 注：以上针对**多分支混合工作树**，见 §6 限制 1。

## §5 过程违规（单独呈报，**不替你追认**）

| # | 违规 | 实物证据 | 待裁定 |
|----|------|---------|--------|
| **P-1** | 票 03 的 `1ee67dc0` **修改了 4 张其他票的 7 个工件** | `git show --name-only 1ee67dc0` 含 `tests/settings-surface.spec.ts`、`tests/scripts/verify-ticket-02-settings.mjs`、`entry-access.spec.ts`、`iframe.e2e.spec.ts`、`verify-ticket-18/31/37.mjs`；diff 为菜单计数 3→4 | 是否追认（该改动**已在提交信息披露**且**实质必要**——新增第 4 条菜单命令确实打破 3 计数断言；但违反「不得修改其他 agent 工作」的全局规则） |
| **P-2** | **四票全无 CI 证据**：远端零 `cch/*` 分支 | `git ls-remote --heads origin 'refs/heads/cch/*'` → 空 | 是否授权 push（票 02/03 为**行为面改动**，按 WORKFLOW §8.1 属合规缺口；四份报告均自认） |
| **P-3** | **波内堆叠**：`02 → 03` 为堆叠（03 在 02 之上）；`47 → 48 → 01` 为堆叠 | ancestry 实测 YES/YES | 是否接受（与 README/启动器「同波互不堆叠，可并行」不符） |
| **P-4** | 票 04 **完成定义未满足**：issue 5 项验收未勾销，且无任何提交触碰过该 issue 文件 | `grep -c` = 0 / undone = 5；`git log --all -- issues/04…` 仅立票提交 | 补勾销（记账修正，非源码） |
| **P-5** | 文档卫生（非功能）：02 报告行号漂移 13–20 行 + 「三条菜单命令」已过期（现 4 条）；01 报告 203 行 vs 实测 202；04 报告 §5.2 称信号层在 `:165` 实测 `:19-20` | 子代理逐条比对 | 补正 |

**未发现**：提交信息缺前缀 / 编码损坏 / 闸门或规格造假（两个闸门与两份规格均由主 Agent 独立复现）。

## §6 复核方法论的两条限制（诚实披露）

1. **闸门/规格是在「多分支混合工作树」上跑的**（GitButler applied 状态），即针对各分支的**并集**，而非逐分支。子代理发现的「提交版 3 条 id vs 工作树 4 条」正是这一现象的体现。→ 「闸门绿」证明的是**并集树绿**；逐分支绿需 push 后由 CI 证明。
2. 已核实工作树内容与 `cch/03` 分支 head 的三个文件 md5 **一致**（`a7442e6e` / `0dd9e88c` / `23d3cca0`），说明并集树 = 03 栈顶视图。

## §7 返工判定

**无源码层面问题需返工。** 四票的实质声明全部经实物验证属实；闸门 `33/0` 与 `58/0` 实测 exit 0；全量 E2E `110 passed`；构建 exit 0。

待处置项均属**证据/记账层面**（P-1…P-5），**不重发修复版启动器**。

## §8 下一波开工指引

- **W2 = 票 05（harness 交互原语，A-029）** ← 票 01（已复核通过）→ **可开工**
- 启动器：`prompts/05-harness-primitives.md`
- 后置链：06 ← 05、07 ← 06、08 ← 07、09 ← 01–08。
