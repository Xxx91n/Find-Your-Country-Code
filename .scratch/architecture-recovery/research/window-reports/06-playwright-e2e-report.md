# 窗口实施报告：06 — Playwright E2E 测试基建 + fixture 扩容

> 子窗口（fresh context）实施 | 日期：2026-09-03 | 分支：cch/06-playwright-e2e
> 开工复述：Blocked by: 01 —— 已确认 01 闭环（window-reports/01-modular-skeleton-report.md 落盘、验收全过）后开工；必读清单（issue → handoff → infra-patterns → misdetection-root-causes → test/ 三页 → WORKFLOW）已按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 cch/06-playwright-e2e，与其他票分支并行不堆叠）。

## 1. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| playwright.config.ts | 新增 | E2E 入口配置：webServer 自动拉起 fixture 服务器、baseURL、workers=2、list+html 双 reporter |
| tests/server.mjs | 新增 | 零依赖静态服务器：`/test/`（现有 3 页）+ `/fixtures/`（新 fixture）+ `/vendor/intl-tel-input/`（node_modules 直供）；HTML 响应内把 jsdelivr CDN 引用改写到本地 vendor 路径（hermetic 关键） |
| tests/server.mjs（同上） | withUtilsBundle() | npm 包不发布 CDN 专供的 `intlTelInputWithUtils.js`，按官方顺序现场拼接 utils.js + data.js + intlTelInput.js |
| tests/helpers/userscript.ts | 新增 | GM_* 替身（localStorage 承载，刷新/同源页面间持久，等价 TM 语义）+ `addInitScript` 注入 dist 构建产物 + `wrapperFor`/`openPanel` 断言 helper |
| tests/scenarios.e2e.spec.ts | 新增 | 绿色回归组（11 例）：3 个手工测试页场景 A–E 断言 + 动态注入 fixture |
| tests/fp-regression.spec.ts | 新增 | 默认红回归组（6 例）：误报 5 类 + shadow DOM + iti v18.2.1 填充缺口，`test.fail()` 标记 |
| tests/fixtures/fp-regression.html | 新增 | 误报 5 类样本（F1/F4/F5/F2/F6）+ 正例控件（证明扫描已运行，"无图标"断言才有效） |
| tests/fixtures/shadow-dom.html | 新增 | open shadow root 内真区号下拉（漏检样本） |
| tests/fixtures/dynamic-inject.html | 新增 | 500ms 后注入区号下拉的动态样本（当前行为绿） |
| package.json | e2e 脚本 + intl-tel-input devDep | `"e2e": "npm run build && playwright test"` 一条命令全跑；iti 18.2.1 固定版本本地供给（替代不可靠 CDN） |
| package-lock.json | 锁定 intl-tel-input@18.2.1 | 可复现安装 |
| .gitignore | 追加 test-results/、playwright-report/ | 测试产物不入库 |
| .scratch/…/research/scripts/probe-iti-fill.mjs | 新增（docs commit） | iti v18.2.1 填充行为探针：观察 Fill 四条路径在 v18 上的真实终态，作为断言定基与票 03 适配输入 |

基建票约束遵守：**未改动任何脚本源码**（src/ 与 dist 行为零变更，构建产物 43.95 kB 与 01 验收值一致）。

## 2. 运行命令与环境要求

- **一条命令**：`npm run e2e`（= npm run build && playwright test；自动拉起 127.0.0.1:4273 fixture 服务器，测试结束自动关闭）
- 环境要求：Node v24.11.0（vite/playwright 均可）；npm 11.6.1；Playwright 1.62.1（`playwright` 包自带 test runner，经 `playwright/test` 导入，未新增 runner 依赖）；浏览器 chromium headless（`npx playwright install chromium` 一次性安装）
- **无头环境复跑 / CI 用法**：
  ```bash
  npm ci
  npx playwright install chromium   # Linux CI 加 --with-deps 装系统依赖
  npm run e2e                      # exit 0 = 绿色组全过 + 红名单全部如预期红
  ```
  全程仅访问 127.0.0.1（CDN 引用被服务器改写为本地 vendor），无外部网络依赖；`E2E_PORT` 可改端口；CI 下 `reuseExistingServer` 自动关闭。HTML 报告落 `playwright-report/`（`npx playwright show-report` 查看）。

## 3. fixture 清单与预期红/绿状态

**绿色组（11 例，必须常绿）**：
- test-page.html：3 下拉注入/普通 tel 不注入；面板开合（图标切换+外部关闭）；搜索过滤→中国填充 +86→input/change/blur 各一次→toast；收藏刷新持久（GM→localStorage 替身，key `cch_v33`）
- cch-test-page.html：8 应触发字段注入、Case9 省份/Case10 单选项负例不注入；Case11 动态表单 8→9（MutationObserver 防抖）
- cch-test-page2.html：场景 A/B/C/E 检测矩阵 12 字段注入（A1-A3 select、B1/B2/callingCode input、C1/C2×2 iti、E 三字段）；场景 C 填充链路（toast +81、面板关闭）；场景 D 动态注入 select/input/iti 三图标
- fixtures/dynamic-inject.html：注入后自动挂图标（绿）

**默认红组（6 例，`test.fail()` 标记的 TDD 红，非基建失败；转绿时 Playwright 报 unexpectedly passed 逼摘标记）**：
| 用例 | 样本来源 | 断言 | 转绿票 |
|---|---|---|---|
| fp-1 prefix 歧义 | misdetect §2①/F1 | 不插图标 | 02 |
| fp-2 裸词"区号" | §2②/F4 | 不插图标 | 02 |
| fp-3 纯数字选项形态学 | §2③/F5 | 不插图标 | 02 |
| fp-4 国家选择混同 | §2④/F2 | 不插图标 | 02 |
| fp-5 class 子串撞库 | §4⑤/F6（hidden→idd） | 不插图标 | 02 |
| shadow DOM | §3① | 穿透注入图标 | 04 |
| iti v18.2.1 填充缺口 | 探针实测 | 选中国家同步 jp/+81 | 03 |

误报 5 类每例先过正例控件门（真区号下拉已注入图标），保证"无图标"断言在扫描确实运行过之后评估——避免零断言瞬时假绿。红性质已逐一核对 error-context：全部为断言级失败（Received 1 / deep-equality 不等），无基建超时混入。

## 4. 验收命令与退出码（issue 内 4 条验收项）

1. **一条命令跑全部 E2E，CI 可复用** → `npm run e2e`，exit 0；两次连跑均 17 passed（46.6s / 1.6m），无外部网络。✅
2. **场景 A–E 自动断言通过（01 迁移后行为基准）** → scenarios.e2e.spec.ts 11 例全绿（上节）。✅
3. **误报 5 类 + shadow DOM + 动态注入 fixture 就绪，误报用例默认红** → 红名单 7 例（含 iti 缺口）全部"failed as expected"，动态注入样本绿。✅
4. **报告含运行命令、环境要求、无头复跑** → 本文件 §2。✅

最终验收输出：`17 passed (46.6s)` + `EXIT_CODE=0`（`set -o pipefail` 下取自 npm run e2e）。

## 5. 偏离点

1. **cch-test-page2 的 12 vs 01 报告的 8**：01 的 behavior-compare 环境加载不到 jsdelivr CDN，iti 插件未初始化（12-4=8）；本基建将 iti 18.2.1 npm 化本地供给后，iti 字段可稳定检出。检测矩阵按字段逐一断言（不依赖页面总数），两种环境下均与"旧=新"等价结论一致。
2. **新增 devDep intl-tel-input@18.2.1**：测试页硬依赖 iti 才能覆盖场景 C；npm 固定版本是唯一可 hermetic 的供给方式（CDN 在本环境不可达）。已入 package-lock。
3. **红色组超出"误报 5 类"清单 2 例**（shadow DOM 为 issue 明文要求；iti v18 填充缺口为探针新发现）：iti 缺口红线钉的是"应然行为"，票 03 落地后转绿摘标——把 03 的适配效果固化成可执行验收。
4. **GM 替身用 localStorage 而非内存对象**：内存 stub 会让"收藏持久化"断言失真（刷新即丢）；localStorage 等价 TM 的按源持久语义。
5. **CDN URL 改写放在 fixture 服务器而非测试页**：不改动 test/ 现有资产（避免与其他窗口的基线冲突），服务器属本票授权的测试基建范围。

## 6. 给大脑的风险提示

1. **Fill.fillIti 在 v18.2.1 上"假成功"**（票 03 前置信号）：getInstance 不在 `intlTelInput` factory 上（在 `intlTelInputGlobals`）、`.instances` 同样不在 factory、DOM 点击 fallback 虽能点到 `[data-country-code]` 列表项但插件选中态不变，最终 toast 谎报"已填入"。探针证据：research/scripts/probe-iti-fill.mjs（selectedIso 停留 cn、inputValue 空、toast +81）。票 03 的 getInstance 稳锚需以 `intlTelInputGlobals` 为准。
2. **红色组的维护契约**：02/03/04 转绿后 `npm run e2e` 会因 unexpectedly passed 而 exit 1——这是设计好的强制摘标动作；收口窗口需同步删除对应 `test.fail()` 行并在报告记录。
3. **workers=2 是本机经验值**：默认并发在 Windows 宿主触发 chromium launch 超时（180s）；CI 单核容器如再遇超时可降 `workers: 1` 或在 config 读 env。
4. **fp-正例控件门依赖当前扫描时序**（DOMContentLoaded 首扫）：若 04 改造扫描启动时机，控件门断言可能需同步调整。
5. **test/ 三页本身仍被 .gitignore 忽略**（仓库历史约定）：E2E 依赖这些页面，建议大脑决定是否将其入库（否则 fresh clone 需手工补页才能复跑）。
