# atomcode 深度调研记录 — 票 05（harness 交互原语）

> 载体：atomcode 5.0.9（52ca5e6）无头模式 `--prompt-file`（串行护栏：同一时刻 1 个在途）
> 会话：735789be-4293-4fc3-ad93-77ea577a9028 ｜ 退出码 0 ｜ 原始 stdout 13889B
> 日期：2026-09-16 ｜ 覆盖：A-029
> 数据源纪律：本节结论来自 atomcode 调研 + 本仓库实物核对；外部事实按 observed / cited / reproduced / candidate 标注。

## 调研问题（verbatim，未附加角度提示）

见 `prompt-05-atomcode.md`（原文）。核心：两个 runtime（playwright/test 运行器内的密封层 vs 独立 node 脚本的 live 层）如何收敛为同一份交互原语；驱动/读取与断言的边界；两种软断言风格如何一次收全量；共享层写 .mjs 还是 .ts；常见反模式。

## Sufficiency Gate（atomcode 自查）

searches 6（web_search 1 + Tavily 1 + AnySearch batch 4）| angles 全五类（Official / Comparative / Criticism / Currency / Community）| full reads 6（nodejs.org · playwright.dev/docs/pom · playwright.dev/docs/test-assertions · anton.qa · test-automation.blog · qaskills.sh）| 关键结论均 ≥2 独立信源 | **总体 Confidence：高**（atomcode 自评；一处缺口自报见 §4）

## 1 执行摘要

1. **三层结构**（cited，Playwright 官方 POM 文档 + BrowserStack/Testomat 一致）：harness 层（两个，互不共享）→ **共享交互原语层（一份）** → 选择器常量。共享层放在不被任何 harness 拥有的目录。
2. **驱动/断言边界**（cited，anton.qa 2026-07-22 专文全文精读）：共享层只放「定位器 + 意图命名动作方法」与**等待式技术守卫**（`locator.waitFor()` / `page.waitForFunction()`），**绝不放任何 `expect()` / `expect.soft()`**；读取方法**返回**状态而不下判定。
3. **软断言归 harness**（cited，Playwright 官方 Assertions 文档）：官方明确 **soft assertions only work with Playwright test runner**；故 live 层不可能复用 `expect.soft`。统一方式 = 共享层返回**事实快照**，两个 harness 各套一层薄 adapter（sealed 用 `expect.soft`，live 用自建软收集器）。
4. **模块形态**：调研推荐 **.ts + Node type stripping**（cited，nodejs.org 官方 Running TypeScript Natively），但**前提是 Node ≥ 22.18**；调研同时明示其风险与**退路 = .mjs + JSDoc**。本仓库选退路，理由见 §2.4（reproduced：本仓库 CI Node 版本实物核对）。
5. **六类反模式**（cited，Reddit r/QualityAssurance + anton.qa + test-automation.blog + 官方文档多源一致）：断言写进共享原语 / 让 live 层 import 测试运行器 / 复制粘贴第二套 stub / 共享层依赖 fixture 或全局状态 / 固定 sleep / 共享层写网络环境假设。

## 2 分点结论与本地裁决

### 2.1 共享层位置与分层（cited + 本地适配）

官方 POM 文档同时给出 **Test** 与 **Library** 两种形态（同一份 page object，test 形态 import `@playwright/test`，library 形态只用 `playwright` 的 Page 类型）—— 这正是「同一原语服务两个 runtime」的官方背书（cited）。本地落地：共享层置于 `tests/helpers/primitives.mjs`（不被任一 harness 拥有；sealed 经 `tests/helpers/userscript.ts` 薄门面消费，live 直接 import）。

### 2.2 驱动/读取 vs 断言的边界（cited → 本票硬约束）

| 进共享层 | 不进共享层 |
|---|---|
| 定位器 + 意图命名动作（open / search / select / fill） | 业务期望值（如「toast 应显示 +86」） |
| **等待式技术守卫** `locator.waitFor()` / `page.waitForFunction()` | 任何 `expect()` / `expect.soft()` 调用 |
| 读取并**返回**状态（`readHostValue(): string`） | 判定 verdict（pass/fail 语义） |
| GM_* 替身 init-script 载荷 + 菜单注册表 | harness 专有物（test fixture / reporter / process.exit） |

本地裁决：**采纳**。共享层零 `expect` 依赖，从而同时消解「soft assertions only work with test runner」限制（cited）与「live 层 import 运行器污染 process.exit 语义」反模式。

### 2.3 两种软断言风格「一次收全量」（cited → 本票实现）

- sealed：`expect.soft` + web-first locator（自动重试），累计失败不中断（官方文档 cited）。
- live：自建软收集器把 `{label, pass, detail}` push 进数组，结尾统一报告 + `process.exit`（live-smoke.mjs 既有 `failures` 机制即此形态，reproduced）。
- **「查什么」只有一份（共享层返回的事实快照），「怎么收」各归各 harness**（cited，qaskills.sh / test-automation.blog）。

### 2.4 模块形态选型：调研推荐 .ts，本仓库选其明示退路 .mjs

**调研推荐**（cited）：共享层写 `.ts`，由 live 侧 `.mjs` 直接 import（Node 22.18+ type stripping 默认启用）。**调研同时列出的风险**（cited）：Node < 22.18 的 CI 会挂；只支持 erasable 语法（禁 enum / parameter properties / namespace）；Node 不查类型，需另跑 `tsc --noEmit`。**调研自报的退路**（cited）：`.mjs` + JSDoc 类型。

**本仓库实物核对（reproduced，2026-09-16）**：`.github/workflows/*.yml` 的 `node-version` **异构** —— `e2e.yml` = **20**、`typecheck.yml` = **20**、`real-site-smoke.yml` = 22、`verify-*.yml` = 22（`grep -rn 'node-version' .github/workflows/*.yml` 24 命中）。且 `tests/live/live-smoke.mjs` 带有一条**已在库的显式设计不变量**：GM 替身「此处内联以避免 .mjs 导入 .ts 链」（observed，live-smoke.mjs:43 原注释）。

**裁决：选 .mjs**（四条依据，逐条可核验）：
1. 调研的 .ts 推荐**自带 Node ≥22.18 前提**；本仓库该前提不普遍成立（e2e/typecheck = 20），而 live 层跑在 node 22 上，引入 .ts 链会给 advisory 真实站点层**新增一个版本耦合**（当前不存在）。
2. `live-smoke.mjs` 已有一条显式记录的设计决定「避免 .mjs 导入 .ts 链」（observed）；无补偿收益地反转它是净风险。
3. 这是**调研自己写明的退路**，非推翻调研（`.mjs` + JSDoc）。
4. `.mjs` 给出「同一份原语」的**最强形态**：两个 runtime 零转换地加载**同一个文件**（AC「收敛为同一份」的字面满足）。

**同时完整采纳调研的实质建议**：三层分层、共享层零 expect、等待式守卫替固定 sleep、live 层不 import 运行器、单一 GM stub、事实快照 + 每 harness 薄 adapter（与模块形态正交）。

### 2.5 反模式清单（cited，作为本票的自检项）

1. 把断言写进共享原语（症状：`panelPage.shouldShowToast('Germany')"）——本票以「共享层零 expect」结构性阻断。
2. 让 live 层 import 测试运行器——本票以「共享层不 import `playwright/test`」+ 结构门断言阻断。
3. 复制粘贴第二套 GM_* stub / 选择器——本票以「单一 GM_STUB 源 + 结构门计数」阻断（现状正是两套：userscript.ts 内联字符串 + live-smoke.mjs 内联数组）。
4. 共享层依赖 fixture / 全局状态——本票共享层只经参数接收 scope/page。
5. 固定 sleep——本票以 `locator.waitFor()` / `waitForFunction` 取代新增等待。
6. 共享层写网络/环境假设——本票共享层不含 `goto`；URL 由 harness 传入（live 的镜像服务器与第三方 URL 均在 live 层）。

## 3 推荐落地形态（调研原文 → 本地映射）

```
调研建议                          本仓库落地
shared/e2e-panel/                 tests/helpers/primitives.mjs      （单一共享层，.mjs 退路）
  gm-stub.ts                      → export const GM_STUB            （唯一一份，两 harness 共用）
  panel-page.ts                   → install/openPanel/searchType/
                                     selectCountry/fillField/readHostValue/
                                     readFieldEvents/readFeedback/menu*
                                    （wait-guards，零 expect）
tests/ (H1) → import, expect.soft   tests/helpers/userscript.ts（薄门面 + soft adapter）
scripts/ (H2) → import, 自建收集器  tests/live/live-smoke.mjs（既有 failures 收集器）
```

## 4 来源（cited，atomcode 三引擎交叉）

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | Node.js 官方 — Running TypeScript Natively | nodejs.org/learn/typescript/run-natively | Official | type stripping 门槛 22.18+、erasable 语法限制、不查类型 |
| 2 | Playwright 官方 — Page object models | playwright.dev/docs/pom | Official | POM 的 Test/Library 双形态（共享层 Library 化依据） |
| 3 | Playwright 官方 — Assertions | playwright.dev/docs/test-assertions | Official | soft assertions 定义 + **only work with Playwright test runner** |
| 4 | Should Page Objects Assert?（anton.qa，2026-07-22） | anton.qa/blog/posts/where-test-assertions-belong | Criticism/Comparative | 业务断言 vs 技术守卫边界三分法 |
| 5 | Improve your testing with Playwright soft asserts | test-automation.blog/playwright/using-soft-asserts-playwright/ | Community/Criticism | 软断言适用场景、混用软硬警告 |
| 6 | Playwright Soft Assertions 2026 Guide（qaskills.sh，2026-06） | qaskills.sh/blog/playwright-soft-assertions-expect-guide | Currency | `expect.configure` / `test.info().errors` 编程式收全量 |
| 7 | Playwright POM Guide 2026（BrowserStack） | browserstack.com/guide/page-object-model-with-playwright | Comparative | utils/ 目录约定、可复用页对象原则 |
| 8 | Playwright POM JS Guide 2026（Testomat） | testomat.io/blog/page-object-model-pattern-javascript-with-playwright | Comparative | JS 侧 POM 结构 |
| 9 | Node 24 native TS（ishu.dev，2026-04） | ishu.dev/post/nodejs-24-native-typescript-2026-04-26 | Currency | v24 默认启用 stripping（交叉验证） |
| 10 | Run TS natively / erasableSyntaxOnly（codevup，2026-04） | codevup.com/posts/run-typescript-natively-nodejs-type-stripping/ | Comparative | stripping vs transform、erasableSyntaxOnly |
| 11 | POM best practices（Reddit r/QualityAssurance） | reddit.com/r/QualityAssurance/comments/1ou4qr6/ | Community | 「expect 应在测试脚本里」社区共识 |
| 12 | Playwright POM 讨论（Reddit） | reddit.com/r/QualityAssurance/comments/145mskt/ | Community | Playwright 团队对 POM 的态度信号 |

## 5 信息缺口（诚实披露）

1. **未找到「独立 node 脚本 + playwright library + 共享 POM」完全同构的成熟开源项目范本**（调研自报）；以官方 Library 形态 + 官方文档外推，置信度仍高但缺一个直接范本。
2. Node stripping 在 **Windows 路径 / 权限下的边角行为未专门验证**（本工作区宿主为 Windows）——本票选 .mjs 退路后该缺口不构成阻塞。
3. 调研 §2.4 的版本门槛结论已由本票**本地实物核对修正**（CI Node 异构：20 / 22 混用），非直接采信调研推断。
