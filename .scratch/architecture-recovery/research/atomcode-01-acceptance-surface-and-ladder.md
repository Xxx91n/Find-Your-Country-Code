# atomcode 深度调研记录 — 票 01（验收面与断言阶梯）

> 生成 2026-09-16 | 载体：`ctx_batch_execute`（`atomcode -p`，串行护栏：本会话 1 次在途，`concurrency: 1`，`timeout: 600000`）
> 性质：**外部事实记录（标注 cited）**。原始 stdout 已由 ctx 自动索引入 FTS5（source label = `atomcode`）。
> 用途：为 `tests/ACCEPTANCE-SURFACE.md` 提供外部对标依据。

---

## 调研问题（verbatim，未附加角度提示）

> 全景调研：浏览器扩展与用户脚本的端到端测试中，业界如何定义并分层断言「功能在真实页面上确实生效」——包括页面侧外部可观测的验收判据、断言强度分层与层归属、有状态设置的持久化断言、跨 iframe 消息链路的双端断言，以及 headless 浏览器加载扩展的真实性约束。

## Sufficiency Gate（atomcode 自查）

searches 4+（Exa×2 / Tavily×1 / AnySearch batch×2 子查询）| angles 全五类（Official / Comparative / Criticism / Currency / Community）| full reads 本会话 6 篇 + 上一会话知识库 8+ | 三引擎覆盖：Exa（2.1 / 2.2）· Tavily（2.3）· AnySearch（2.5）| 关键结论均 ≥2 独立信源 | **总体 Confidence：高**

---

## 1 执行摘要

业界共识：**验收判据以「页面侧用户可见的外部可观测效果」为准**，而非扩展 / 脚本内部状态（Chrome 官方原句：avoid accessing internal state; base tests on what is visible to the user）。断言按「测试金字塔 × 实现细节理论」分层——低层测纯逻辑、高层只在真实浏览器里断言最终用户可见结果；持久化经「写入 → 重载 → 再读」闭环验证；跨 iframe 消息链路要求**双端断言**；headless 加载扩展受「旧 headless 不支持扩展」约束，需 `--headless=new` 或 Playwright 的 `channel: 'chromium'`。

## 2 分点结论

### 2.1 页面侧外部可观测的验收判据（官方口径）

- **Chrome 官方**（developer.chrome.com，E2E testing for Chrome Extensions，2023-10）：「为避免扩展内部行为变更导致测试失败，集成测试通常应**避免访问内部状态**，而应基于**用户可见的内容**编写测试」；直接访问扩展数据仅作例外，且应通过扩展页面 / Service Worker 上下文执行。已全文核验。
- **Playwright 官方 Best Practices**：Test user-visible behavior——验证应用代码对最终用户是否生效，避免依赖实现细节。已核验。
- **理论根基**（Kent C. Dodds, *Testing Implementation Details*, 2020）：断言实现细节会同时产生 false positive（重构即红）与 false negative（真坏而绿）。
- **实证反例**（dev.to，Rewardly 事故复盘，2026-03）：292 个 Node 单测全绿，装进 Chrome 后 7 个用户可见 bug（popup 路径错 / content script matches 错 / 消息格式错 / 存储未序列化）——**全部是「Node 环境测不到的多上下文 / 真实运行时问题」**。
- **工程实践**（Contentsquare Engineering, 2024-05）：CRX 打包 + `--headless=new` + `externally_connectable` / `onMessageExternal` 自触发，打通「页面 ↔ 扩展」双上下文，实测覆盖 73.7% 扩展代码。

**可观测判据清单**（各来源归纳）：页面 DOM 被注入 / 修改（wrapper / badge / toast）· 页面 URL / 导航变化 · popup 页面可打开且内容正确 · 控制台零错误 · 图标 / 资源正确加载。

### 2.2 断言强度分层与层归属

| 层 | 断言对象 | 断言强度 | 归属层（谁测） |
|---|---|---|---|
| L0 纯逻辑 | 解析 / 计算 / 状态机 | 精确值断言 | 单测（Node，mock API） |
| L1 契约 / 集成 | API 响应、存储读写、消息格式 | 结构断言 | 集成测试 |
| L2 页面可观测效果 | DOM 注入、可见性、文本、角色 | web-first 自动重试断言 | E2E（真实浏览器） |
| L3 持久化 / 生命周期 | 重载后设置仍在 | 行为闭环断言（写→重载→读） | E2E |
| L4 跨上下文链路 | 页面 ↔ SW ↔ iframe 消息往返 | 双端断言 | E2E + 少量 SW 上下文 evaluate |
| L5 人工验收 | 真实站点、真实账户、视觉 | 人工检查清单 + 截图存证 | 发布前人工 gate |

配套原则（Martin Fowler 测试金字塔，已核验）：**高层测试只测低层测不到的部分**，低层已覆盖的条件不在高层重复断言；精确值断言下沉到低层，高层只断言「效果存在且正确」。

> 与本仓库阶梯的关系：本仓库 D-003 重定的 **L0–L4** 是**页面侧断言强度**轴（静默健康 → 注入 → 可驱动 → 写入结果 + 持久化 → 用户反馈），与上表「测试层次」轴正交。本仓库的 L3 同时吸收了上表的 L2+L3；本仓库的 L4（用户反馈）对应上表 L5 的自动化子集。

### 2.3 有状态设置的持久化断言

- **标准闭环模板**（extensionbooster, 2026-04，已核验）：**写入设置 → 页面出现可观测反馈（toast / UI）→ 重载页面或重启上下文 → 断言设置仍生效**。四步最小闭环是社区最常复用的形态。
- **用户脚本（Tampermonkey 系）**：`GM_setValue` 是脚本级存储（Tampermonkey 官方文档核验）；测试环境惯用等价物是**用 localStorage 承载 GM 存储**（同源页面间、刷新后天然持久）——刷新断言即为持久化断言。
- **Firefox 扩展的持久化陷阱**（Extension Workshop 官方，已全文核验）：临时加载（web-ext 默认）**每次分配新 add-on ID 且卸载即清空** storage——持久化测试**必须**在 manifest 声明固定 `gecko.id`；web-ext 需固定 profile。
- **测试一致性前提**（Chrome 官方）：**固定扩展 ID** 是持久化与跨会话测试的前置条件——存储归属、origin 白名单都挂在 ID 上。
- **注意**：持久化断言本身属于「内部状态」，官方立场是**通过外部可观测效果验证**（重载后功能仍生效），直读 storage 仅作辅助例外。

### 2.4 跨 iframe 消息链路的双端断言

（Assrt《How to Test postMessage with Playwright》2026-04 全文核验 + Playwright 社区资料）

1. **双端断言模式**：发送侧用 `page.evaluate()` / 事件监听收集，接收侧用 `frameLocator()` 断言 iframe 内 DOM 效果；响应回传再用父页 DOM 断言。只断一端会漏掉半边 bug。
2. **时序前提**：消息发给尚未注册 listener 的 iframe 会**静默丢弃、无任何报错**——必须先等 iframe 就绪信号再发消息；这是该链路 flaky 的第一大根因。
3. **origin 校验是必测项**：正向（合法 origin 被处理）+ 负向（非法 origin 被拒绝）。
4. **结构化克隆**：需断言 Map / Set / Date 等跨序列化边界存活；函数、DOM 节点、原型链会被剥离。
5. **陷阱**：sandbox iframe 的 `event.origin` 为 null 会静默被拒；**断言必须与动作留在同一个 frame locator 上**，越界断言父页会得到假阴性空串。

### 2.5 Headless 浏览器加载扩展的真实性约束

| 约束 | 事实 |
|---|---|
| 旧 headless 不支持扩展 | Chrome 官方明确：`--headless`（old）**不能加载扩展**，必须 `--headless=new` |
| Playwright 路径 | 扩展只能在 **persistent context** 中加载；headless 下需 `channel: 'chromium'`；须用 Playwright 自带 Chromium |
| headless_shell 陷阱 | Playwright 默认 headless_shell **不支持扩展**；GPU / WebGL 在 headless 下降级为软渲染，视觉类断言可能与有头不一致 |
| 新 headless ≈ 有头 | Chrome / Edge 新 headless「更接近真实有头模式」，扩展兼容性显著改善 |
| SW 生命周期失真 | MV3 SW 30 秒空闲挂起；挂起瞬间的 in-flight `evaluate` 会抛错；自动化环境下的生命周期与真实使用有差异 |
| Firefox | 传统 headless 下扩展支持有限，业界惯例是 Firefox 端跑有头（Xvfb）或仅覆盖 Chromium |

**真实性结论**：新 headless 已足够「真实」到能加载扩展并断言页面效果，但三类失真仍需人工 / 有头补充——SW 自动挂起时序、GPU / 视觉渲染、Firefox 端。自动化 headless 绿 ≠ 真实用户可用。

---

## 3 对比矩阵：扩展 vs 用户脚本 的 E2E 断言形态

| 维度 | 浏览器扩展（MV3） | 用户脚本（Tampermonkey 系） |
|---|---|---|
| 加载方式 | persistent context + `--load-extension` / CRX | 构建产物 `addInitScript` 注入 + GM_* 替身 |
| 环境真实性 | 高（真扩展宿主，但 headless 有约束） | 中（TM 运行时被替身模拟；GM 存储 → localStorage） |
| 页面侧判据 | DOM 注入、popup URL、SW 存活、console 零错 | DOM 注入、面板可见、菜单命令注册数 |
| 持久化断言 | 重载 / 重启 + 固定扩展 ID | 刷新页面 + localStorage 键仍存 |
| 跨上下文消息 | content↔SW↔popup 三上下文，双端断言 | 单页面上下文为主，iframe 链路同 2.4 |
| 主要失真源 | headless_shell、SW 挂起、Selenium debugger | 替身与真实 GM API 的行为差异、`@match` / `@grant` 元数据未被验证 |

---

## 4 来源清单（cited）

| # | 来源 | 角度 | 贡献 |
|---|---|---|---|
| 1 | Chrome 官方 *End-to-end testing for Chrome Extensions*（developer.chrome.com） | Official | 「用户可见为准、内部状态仅例外」官方原句；`--headless=new` |
| 2 | Playwright 官方 *Chrome extensions*（playwright.dev/docs/chrome-extensions） | Official | persistent context；`channel:'chromium'`；SW 挂起透明化 |
| 3 | Playwright 官方 *Best Practices* | Official | Test user-visible behavior；web-first assertions |
| 4 | Firefox *Extension Workshop — Testing persistent and restart features* | Official | 固定 ID 是持久化测试前置；临时加载清空存储 |
| 5 | Martin Fowler 测试金字塔 | Official（理论） | 高层只测低层测不到的部分 |
| 6 | Assrt *How to Test postMessage with Playwright* | Community | 双端断言；时序前提；origin 正 / 负向；结构化克隆 |
| 7 | dev.to Rewardly 事故复盘 | Criticism | 292 绿测 vs 7 bug；多上下文失败类别 |
| 8 | Contentsquare Engineering | Comparative | CRX + headless=new + externally_connectable，73.7% 覆盖 |
| 9 | Kent C. Dodds *Testing Implementation Details* | Official（理论） | 断言实现细节的双重失真 |
| 10 | qatechtools *Chrome Extension E2E Testing with Playwright* | Currency | headless_shell 陷阱 |
| 11 | extensionbooster *E2E Testing Complete Guide* | Currency | 写入 → 反馈 → 重载 → 持久化四步闭环 |
| 12 | Tampermonkey 官方文档 GM_setValue | Official | GM 存储语义 |
| 13 | Currents *When Tests Should Run Headless vs Headed* | Currency | headless GPU / WebGL 降级 |
| 14 | Playwright 官方 *Browsers* | Official | 新 headless 更接近有头模式 |
| 15 | 本仓库 `tests/helpers/userscript.ts` | 本地 | GM 替身 + localStorage 承载的实际落地 |

---

## 5 信息缺口（原样保留）

- **Selenium / WebDriverIO 生态**对扩展 popup / iframe 断言的最新能力（2026）未深挖，仅从 Chrome 官方与 issue 侧写得知 SW 永挂起的失真。
- **Safari Web Extension** 的 E2E 测试方案几乎无公开资料（XCUITest 路线未验证）。
- **用户脚本管理器行为差异**（Violentmonkey / Greasemonkey 的 GM 语义与 Tampermonkey 不完全一致）对替身保真度的影响缺乏系统对比来源。
- Chrome 官方 E2E 文档最后更新 2023-10，MV3 新 API 在测试中的成熟度可能有更新未反映。
