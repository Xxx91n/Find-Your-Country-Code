# 42 语言切换收口 — 窗口报告

> Cycle-5 | 票 `issues/42-locale-switch.md` | 覆盖 **A-019** | 启动器 `prompts/42-locale-switch.md`
> 分支 `cch/42-locale-switch` | 代码落点头 **86df9b14144bca508b55fca5c9d3534266f89f16**（GitButler `kus`）| 最终头 **fec312a0dab4546679965fd6de2b33c5bb01a5a4**（`kus` → `zqs` 文档 → `tyr` R1 修正）| 报告时间 2026-09-14
> 证据标注：observed（本机实测）/ reproduced（可复现）/ cited（外部来源）/ candidate（候选，未采信为结论）

---

## 1 开工复述（启动器硬要求）

**阻塞项**：`Blocked by: None`，属 Wave 1，与票 40/44/37 等并行、互不堆叠。

**必读清单（5 份，绝对路径，逐份读完）**：

1. `.scratch/architecture-recovery/handoffs/42-locale-switch.md`
2. `.scratch/architecture-recovery/issues/42-locale-switch.md`
3. `.scratch/architecture-recovery/spec.md`
4. `.scratch/architecture-recovery/WORKFLOW.md`（§4.2 版本控制：一切 git 写操作走 `but`）
5. `.scratch/architecture-recovery/decision-ledger.md`（A-019 行 + 去向登记）

**另核（不违背既有 ADR / 心智模型）**：`docs/adr/0002`（否决 core+locales 多产物拆分 → 故**不**走独立语言包/`@resource` 路线）、`docs/adr/0006`（依赖钉死、CI 脚本入 `tests/scripts/`、PR 门控）、`CONTEXT.md`。

## 2 裁决：功能实现，而非仅清死导出

issue 的 What to build 是「语言**不再由** navigator.language **单方面决定**；模块无死导出」——两句并列。若只删 `LANG`，语言仍然单方面由浏览器语言决定，前半句为假。故走：**面板可选 + GM 持久化**，`LANG` 死导出随重构自然消失（非单纯删除）。

Delta 要求「若只做死导出清理须显式声明功能不做」——**本票功能已做，不适用该声明**。

## 3 深度调研（atomcode，串行护栏内 1 次在途）

一次 `atomcode -p`：8 次检索（Exa×4 / Tavily×2 / AnySearch×2）+ 7 篇全文，角度 Official / Comparative / Criticism / Currency / Community。

| # | 结论 | 档位 | 来源 | 本票落地 |
|---|---|---|---|---|
| 1 | 优先级：**显式用户选择 > 浏览器语言 > 默认**，与 CSS 级联 / Accept-Language 协商同构；`GM_getValue(k, default)` 的默认值语义正好承载「未手动选过」 | cited | Tampermonkey 官方文档（GM_values）+ Greasespot GM.getValue wiki（双源） | `locale='auto'` 即「未选过」，落 `UI_PREFS_KEY` |
| 2 | 持久化用 `GM_setValue/GM_getValue`；页面 localStorage 是反模式（域隔离、可被站点清理） | cited | TM 文档 + VM metadata 文档；TM issue #936（删除同步历史 bug） | 沿用既有 `UI_PREFS_KEY`；回退用「写 auto」而非删键 |
| 3 | 翻译实现用内联字典直查，i18next 类运行时 205–422 KB 对单文件 userscript 不可接受 | cited | Paraglide vs i18next benchmark（opral/paraglide-js） | 零新增依赖，保留既有 `MSG` 内联字典 |
| 4 | 自动判定宜读 `navigator.languages`（偏好序数组）而非 `navigator.language`（数组首元素） | cited（MDN Navigator.languages） | **candidate，本票未采纳**——会改变既有判定行为，属越线；登记为遗留建议 |

## 4 实施（改动面：3 改 2 新增）

| 文件 | 改动 | 说明 |
|---|---|---|
| `src/i18n.ts` | 重写 | 删 `export const LANG`；新增 `LOCALE_MODES`(auto/zh/en)、`getLocale()`、`setLocale()`；`_locale` 可变；`t()` 签名与 `MSG` 结构不变；保持**零 import**（单元门按裸模块体装配） |
| `src/ui/index.ts` | 5 处接缝 | ①导入面；②`prefs()` 归一化 `locale`（非法/缺失→auto）；③`_renderRules()` 新增语言切换行 `#cch-locale-tg`（auto⇄中文⇄English）；④新增 `_applyLocaleText()` 刷新构建期写死的面板文案；⑤`createUI` 引导 `setLocale(UI.prefs().locale)` |
| `tests/scripts/verify-ticket-42.mjs` | 新增 | 42 断言单元门（G0 自证 / G1 死导出 / G2 契约键集 / G3 自动判定 / G4 手动覆盖 / G5 持久化+解耦） |
| `tests/locale-switch.spec.ts` | 新增 | E2E 4 例 |
| `.github/workflows/verify-42.yml` | 新增 | CI 挂接（node 22；pull_request + push + dispatch） |

**关键设计点**：

- `createUI` 内引导应用持久化语言，使 `main.ts` 后续所有 `t()`（Fill toast、GM 菜单命令、面板）统一生效；因此**无需改 `main.ts`**（该文件为 CRLF，本票零触碰）。
- `navigator.language` 判读包在 `try/catch` 内：Node 单测无 `navigator` 全局时不抛错并回落 `zh`；同时保留字面 token 供既有门以 `__navLanguage` 替身注入。

## 5 验收（逐项 + 只读命令 + 输出摘要 + commit sha / CI run ID）

commit **86df9b14144bca508b55fca5c9d3534266f89f16**（`cch/42-locale-switch`，GitButler `kus`）

| # | issue 验收项 | 结论 | 验证命令（只读） | 输出摘要 | CI 证据 |
|---|---|---|---|---|---|
| 1 | 面板提供语言选择且经 GM 持久化（沿用 UI_PREFS_KEY 独立键模式） | ✅ | `node tests/scripts/verify-ticket-42.mjs` / `npx playwright test tests/locale-switch.spec.ts` | G5 全绿：无偏好→`auto`；`setPref('locale','zh')` 写入 `cch_ui_prefs_v1`；新实例（=刷新）读回 `zh`；E2E 4 例 ✓ | Verify Ticket 42 **run 34826590699**；E2E **run 34826590603** |
| 2 | 中/英文案键与 t() 契约不破坏 | ✅ | `node tests/scripts/verify-ticket-42.mjs`；`npx tsc --noEmit` | G2：zh/en 键集一致；`t('__nope__')==='__nope__'`（回落契约保留）；`MSG.zh.search` / `MSG.en.search` 原文未改；tsc exit 0 | Typecheck **run 34826590628** |
| 3 | 新增断言覆盖语言选择持久化 | ✅ | 同上 | verify-ticket-42 **42 PASS / 0 FAIL**；E2E 全量 **84 passed** | Verify Ticket 42 **34826590699**；E2E **34826590603** |
| — | （Delta）模块无死导出 | ✅ | `node tests/scripts/verify-ticket-42.mjs` | G1：`i18n.ts` 已无 `LANG` 标识符；4 个 export（LOCALE_MODES/getLocale/setLocale/t）全部被 `src/` 具名导入 | 同上 |

**CI 五门全绿（均为 push 触发，成功）**：

| Workflow | Run ID | 结果 |
|---|---|---|
| Verify Ticket 42 (locale-switch) | 34826590699 | success（`verify-ticket-42: 42 PASS, 0 FAIL`） |
| E2E | 34826590603 | success（`84 passed (30.4s)`，本票 4 例 ✓ 42/43/44/45） |
| Engine Gates | 34826590588 | success（verify-ticket-02 `36/36 pass`） |
| Typecheck | 34826590628 | success |
| Lockfile Regen | 34826590587 | success |

**本地复跑**：`npx tsc --noEmit` exit 0；`npm run build` OK（dist 125.12 kB / gzip 36.94 kB）。

## 6 Delta 检查点

- **不新增依赖**：✅ `package.json` / `package-lock.json` 零改动；未新增 `@grant`（既有 grant 已含 GM_set/getValue）。
- **存储键与收藏/规则解耦**：✅ 复用既有独立键 `cch_ui_prefs_v1`，与收藏键 `cch_v33`、规则键 `cch_site_rules_v1` 三者互不相同（G5 断言）；E2E 断言切换语言后 GM 桶不出现后两个键。
- **功能不做声明**：不适用——功能已实现（见 §2）。

## 7 既有破损（如实登记，不借本票掩盖）

本地十门中 4 门为**既有红灯**，与本票无关，已用基线对照证明：临时还原原始 `src/i18n.ts` 后复跑，报错一致。

| 门 | 现象 | 归因 | 证据 |
|---|---|---|---|
| verify-ticket-09 / 15 / 18 | `SyntaxError: Unexpected token ':'` | 这三个装载器是裸 `new Function(bundle)`，未用 `module.stripTypeScriptTypes` 剥类型；cch-23 引入显式 TS 类型标注后即失效（verify-05 头注已记录该坑并只修了 05） | 基线还原复跑同错（observed+reproduced） |
| verify-ticket-13 | `验收6 语料规模 41 … got 51` + 同上 SyntaxError | ①语料计数断言钉死 41，而 `tests/corpus/manifest.json` 已被后续票追加（并行票 44 正在做 A-023 语料先行，observed：三次运行计数 45→48→51 递增）；②装载器同 09 | 基线还原复跑同错 |

本票未触碰 `tests/corpus/manifest.json` 与上述装载器（越线返修需独立票）。

另：本地全量 `npx playwright test` 出现 5 例失败，其中 `fill-feedback.spec.ts` 2 例在单独复跑时 **8/8 全绿**（2 workers 并发负载下的 flaky，reproduced）；`iframe-nested.e2e.spec.ts` 2 例与 `_debug40.spec.ts` 1 例属并行票 40 在途文件（strict mode violation：同页两个 iframe-mid）。CI（本票分支快照）E2E 84 passed 全绿，可作反证。

## 8 遗留与建议（不借本票越线）

1. **【candidate】自动判定改读 `navigator.languages`**：对 `['en-US','zh-CN']` 用户可命中第二偏好。属行为面变更，须独立票 + 语料标定（§7 同教训）。
2. **【candidate】跨标签页同步**：`GM_addValueChangeListener('cch_ui_prefs_v1')` 让其他标签页即时重渲染（grant 已具备）。
3. **【candidate】GM 菜单语言入口**：atomcode 调研指出 `GM_registerMenuCommand` 是社区惯例，可补面板不可达时的入口（与票 37 入口可达性相邻，建议并票评估）。
4. **【建议】装载器统一**：09/13/15/18 应统一改用 `module.stripTypeScriptTypes`（与 05/31 同口径），否则这四门长期失效——建议单开仓库卫生票。

## 9 教训（建议大脑写回 WORKFLOW §5）

| 日期 | 阶段 | 教训 | 防再犯 |
|---|---|---|---|
| 2026-09-14 | S7(票42) | 多窗口并行下，`tests/corpus/manifest.json` 会被并行票（44）实时追加，钉死计数的断言（verify-13 的 41）随之漂移；单次全量 E2E 在 2 workers 下会产出 flaky 失败，须单文件复跑归因后再下结论 | 跨票共享断言改成「>= 下限 + 快照基线」而非钉死绝对值；全量 E2E 失败先按文件单独复跑归因，再判定归属 |
| 2026-09-14 | S7(票42) | 判定「红灯是否自己引入」不能靠推断，必须做基线对照（临时还原上游文件复跑） | 子窗口遇到既有红灯先做基线复跑留证，再决定修/不修 |

## 10 返工轮次 R1（2026-09-14）

**现象**：文档提交 `zqs` push 后，E2E **run 34827293112 转红**——本票第 4 例「验收3 语言偏好写入 UI_PREFS_KEY，不污染收藏/规则键」报：

```
Error: expect(locator).toHaveCount(expected) failed
Locator:  locator('.cch-wrapper').filter({ has: locator('#cc-strong') })
Expected: 1
Received: undefined
Protocol error (Runtime.callFunctionOn): Internal server error, session closed.
```

**归因（测试代码缺陷，非功能缺陷、非环境 flake）**：spec 第 84 行 `expect(wrapperFor(page, '#cc-strong')).toHaveCount(1)` **漏写 `await`**。用例体执行完进入收尾、页面已被关闭后该断言仍在飞行，浏览器会话销毁 → Protocol error。代码落点头（86df9b14）的同分支 E2E **run 34826590603 曾 84 passed**，两次运行差异恰为该未 await 断言的竞态窗口。

**改法**：补 `await`（commit `tyr`，最终头 **fec312a0dab4546679965fd6de2b33c5bb01a5a4**）；本地 `npx playwright test tests/locale-switch.spec.ts --repeat-each=3` → **12/12 稳定绿**。

**R1 后 CI 五门全绿（最终头）**：

| Workflow | Run ID | 结果 |
|---|---|---|
| Verify Ticket 42 (locale-switch) | 34828039425 | success |
| E2E | 34828039466 | success（`84 passed (29.9s)`，本票 4 例 ✓ 42/43/44/45） |
| Engine Gates | 34828039510 | success |
| Typecheck | 34828039397 | success |
| Lockfile Regen | 34828039422 | success |

**并入 §9 的教训**：Playwright 的 `expect(locator).toXxx()` 必须 `await`；未 await 的断言在多数运行中不报错，只在收尾竞态下偶发暴露为 `Protocol error ... session closed`，极像环境 flake —— 新增 E2E 断言一律先 `--repeat-each=3` 干跑自证，再据红灯归因。
