# Cycle-6 架构大脑调查（Investigation）

> 生成：2026-09-15 | 大脑 Agent | 依据：WORKFLOW.md S1–S3
> 性质：**只读调查产物** —— 未修改任何业务代码；所有结论以实读/实测为准。
> 基线：origin/main = `85990d2f`（v1.6.0）
> 上游：`handoffs/46-cycle5-closure.md`（Cycle-5 终态：十票全落盘 / 账本 15/15 implemented / release v1.6.0）

---

## §0 目标（/goal · 不设预算）

上轮把「送达 + 可见 + 可信」做完了，但两个痛点指向同一件未完成的事：**脚本的功能「存在」不等于「能被找到」，更不等于「能被证明」**。

| 目标 | 内容 | 完成判据（stop condition） |
|---|---|---|
| **G1 可配置** | 语言设置埋在第 3 层且无任何直达入口 | 冷启动 ≤2 次点击到达语言设置；GM 菜单含「设置」项 |
| **G2 可解释** | 零 console 输出、无自检面、评分证据链算完即丢 | 存在诊断面，逐层点亮并给出已验证根因 |
| **G3 可证明** | 真实站点层 18 项能力只验证 2 项；核心填充 0 覆盖 | owned 指定页覆盖全部工具面且全绿；真实站点层保留 L0–L2 |

- **推进方式**：以 message 步骤（§5）为单位推进，每步一个可验收闭环；**不设时间/成本预算**。
- **硬边界**：大脑不直接修改业务代码；实施走 to-spec → to-tickets → implement；版本控制走 `but` 独立分支。
- **防丢失**：本文件 + `handoffs/47-cycle6-brain.md` 为磁盘产物，不依赖对话记忆。

---

## §1 两条投诉的辩证核验

| 主张 | 裁定 | 实测证据 |
|---|---|---|
| 「没有能设置脚本语言的地方」 | **CONFIRMED**（但不是「不存在」） | 控件存在：`#cch-locale-tg`（`src/ui/index.ts:532-545`），handler 含 `setPref`+`setLocale`+`_applyLocaleText`+`_renderRules`。失败在**可达性**：路径 3 层（图标→面板→⚙ `#cch-rules-tg`→滚动到底）；排序在豁免/规则/低调样式**之后**，容器 `overflow-y:auto`（`ui:101`）；GM 菜单仅 2 项（`main.ts:136-137`）无语言项；`openPanel` 开的是列表视图（`ui:296`）而非规则视图。 |
| 「脚本根本没去实际测试指定网页上所有工具是否生效」 | **CONFIRMED（比表述更严重）** | L3 覆盖 **2/18** 且均为存在性弱断言；`tests/live/live-smoke.mjs` 无交互原语（grep `.click(/.fill(/locator(` = NONE），唯一读面是数 `.cch-wrapper` 节点（`:95`）；GM 替身是空函数（`:50-51`）故菜单命令在 L3 不可驱动；核心「选国→填充」断言 = 0。 |
| 「真实站点层弱断言是照 Bitwarden BIT 口径」 | **SUPERSEDED** | BIT 原文："inconsistently flaky, therefore typically only testing that the username/email **was filled out properly**" —— 先例**恰恰断言填充结果**。本仓库 `_meta.assertionRule`（`site-manifest.json:8`）比其援引的先例更弱；`cdpNote`（`:14`）另封死 CDP Autofill 作为填充断言的退路。 |
| 「GM 菜单文案在持久化语言应用之前求值」 | **REFUTED** | 本大脑代理的初始假设，被子代理实物核验证伪：`main.ts:18` `createUI()` 在 IIFE 顶层**立即执行**，工厂体末 `ui/index.ts:767` `setLocale(UI.prefs().locale)` 已执行；菜单注册在 `:135-137`，位于其后。产物同序（dist:2827 → :2691 → :2955）。**该假设不立票。** |
| 「菜单标签问题完全不存在」 | **PARTIAL** | 真缺陷是**只求值一次**：运行时切换语言后已注册菜单标签不更新（需重载）。正解见 §4 S3。 |

**方法论提醒**：本轮再次出现「大脑自己的假设被证伪」——一切外部/内部事实均须实物核验，不凭推理立票。

---

## §2 能力 × 验证层覆盖矩阵（18 项 × 3 层）

✅ 全覆盖 / ⚠ 部分 / ❌ 无覆盖。证据见子代理审计与各 spec/门脚本。

| # | 能力 | L1 密封 E2E | L2 票门 | L3 真实站点 |
|---|---|---|---|---|
| 1 | 检测与分档 | ✅ | ✅ | ⚠ 仅判 wrapper 存在，不读档位 |
| 2 | 🌐 图标注入（auto/lowkey） | ✅ | ✅ | ⚠ 记录按钮数但不断言 |
| 3 | 面板开/关 | ✅ | ⚠ | ❌ |
| 4 | 搜索 / 过滤 | ✅ | ❌ | ❌ |
| 5 | 收藏 增/移除/持久 | ⚠ 移除无 E2E | ✅ | ❌ |
| 6 | **选国 → 填充目标字段** | ✅ | ✅ | **❌ 核心价值零覆盖** |
| 7 | 填充负反馈 + 失败 toast | ✅ | ✅ | ❌ |
| 8 | 手动召唤 `#cch-summon` | ✅ | ⚠ | ❌ |
| 9 | 站点豁免开关 | ✅ | ✅ | ❌ |
| 10 | 规则/覆盖列表 + ⚙ 入口 | ✅ | ✅ | ❌ |
| 11 | 低调样式开关 | ✅ | ⚠ | ❌ |
| 12 | 语言切换 | ✅ | ✅ | ❌ |
| 13 | GM 菜单命令 | ✅ | ✅ | ❌（替身为空函数） |
| 14 | 跨帧开面板/填充 | ✅ | ⚠ | ⚠ 仅注入 |
| 15 | 变更重扫 | ✅ | ⚠ | ❌ |
| 16 | 伪 select / 无 ARIA 下拉 | ✅ | ✅ | ❌ |
| 17 | intl-tel-input 适配 | ✅ | ✅ | ⚠ 仅注入 |
| 18 | `__cchLastFill` 三态钩子 | ✅ | ✅ | ❌ |

**L3 实际验证能力数 = 2 / 18**（且均为弱存在性断言）。L1/L2 覆盖充分（16 spec + 18 门），但全部跑本地 fixture（`playwright.config.ts` baseURL 指 127.0.0.1），**不构成真实站点证据**。

---

## §3 可观测性现状（子代理审计）

| 通道 | 揭示什么 | 门控 | 被测试？ |
|---|---|---|---|
| `window.__cchLastFill`（`fill/index.ts:306`） | 上次填充 status/kind/iso/code/fmtDiff | 每次填充必写 | ✅ |
| `window.__cchPerfHook(ms)`（`detect/index.ts:629`） | 仅扫描耗时 | **页面须自定义该钩子** | 间接 |
| `console.*` | — | — | **src/ 全目录 0 个调用点** |
| `#cch-toast`（`ui/index.ts:116-123`） | 填充结果/需目标/规则动作/一次帧校验失败 | 调用即显 | ✅ |
| `data-cch-tier` / `data-cch-score`（`ui:157,160`） | 最终档位 + 分数 | 仅当图标已挂 | ✅ |
| `signals[]` / 评分推理 | — | 只存私有 `_state`（`detect:290`）/ `_lowFields`（`ui:28`） | ❌ **从不外显** |

**三种静默失败均无解释**：
- (a) 无可信字段 → 无图标：理由（`gate:input-type` / `gate:aria-hidden` / `country-semantic:suppress` / `gate:visibility-hidden` 或分数不足）存在但从不外显。
- (b) 图标出现但面板不开：子帧路径 `_requestRemoteOpen` fire-and-forget（`ui:456-460`），无 ack 无超时；唯一外显失败是跨域帧校验 → toast（`main.ts:107-110`）。
- (c) 选国未填充：能报「失败」但不报「为何失败」——`FillResult` 无 reason 字段（`types.ts:22-28`）。

**无 debug/trace/verbose 开关**（`ui:239-241` 只持久化 `lowkeyMode` 与 `locale`）；**无 doctor/self-test 入口**（GM 菜单仅豁免 + 开面板）。

---

## §4 行业心智模型模板库（可直接复用的轮子）

来源：3 次 atomcode 全景调研（Exa + Tavily + AnySearch 三引擎、官方文档优先、多源交叉）。**原则：复用成熟轮子，不重复开发。**

### 设置入口与 i18n（R1，Confidence 高）
- **S1 设置分层（1–3 首层 / 4+ 专门面）**：1–3 个高频开关 → 首层；4 个以上或需分类 → 完整设置面；混合型 = 首层放最高频 2–3 个 + 一个「设置」入口。反模式：把 15 个设置塞进首层「求简单」。分组按**用户意图**而非实现细节。〔Chrome 官方 Give users options · ExtensionBooster 综述 · Dark Reader 案例〕
- **S2 GM_config 模式（油猴事实标准）**：声明式设置 schema → `GM_registerMenuCommand('设置', setup)` → `GM_setValue/getValue` 持久化 → **onsave 回调触发界面重渲染**。已知局限：菜单项无图标/无子菜单/无法控制出现位置（TM #2461）。〔Greasy Fork gm_config_toolbar · Tampermonkey 官方文档〕
- **S3 菜单命令 id 原地更新**：`GM_registerMenuCommand(name, fn, { id })` 支持用同一 `id` **原地更新**已注册项。正解：语言切换后重注册同一 id 的菜单项，而非等用户重载。〔Tampermonkey 官方文档，已核验〕
- **S4 i18n 全量重渲染**：**chrome.i18n 不能做运行时切换**（只绑定浏览器 UI 语言）→ 自建内联字典 + `t(key)`；解析优先级 **显式选择 > 浏览器语言 > 默认**；切换后**字典化全量重渲染**（`[data-i18n]`）而非手工逐项改文本。i18next 类库运行时 205–422KB，对单文件 userscript 不可接受。〔Chrome i18n 官方文档 · 本仓库 A-019 已对齐解析优先级〕

### 指定页面验证与断言阶梯（R2，Confidence 高）
- **D1 断言阶梯 L0–L5**：L0 注入发生 → L1 无副作用 → L2 面板可开 → L3 交互原语生效 → **L4 写入生效（value + input/change 事件）** → L5 反馈提示。取舍规则：**L0–L2 适合真实站点层；L3–L5 涉及多步驱动、flaky 乘性增长，应放自有页面层**。注意 CDP Autofill 域只观测原生管线，**不可用作脚本填充断言**（本仓库 cdpNote 已正确登记）。〔Playwright 官方 · Chrome 官方 E2E〕
- **D2 owned 指定页面 + 交互原语**：Playwright 铁律「Only test what you control」；**Contentsquare 解法：用自有 QA 域做全交互 E2E**（externally_connectable + 外接消息唤醒自测），28 个 E2E 自动化 17 个（73.7%）。落到本仓库：把真实站点形态**冻结快照为自有指定页**，在其上跑 L0–L5。交互原语模板：inject / open-panel / search-type / select-country / fill-field / feedback-toast；全部 web-first 断言 + `expect.soft` 一次收全量。〔Playwright 官方 best-practices · Contentsquare 工程博客 · QASkills 2026〕
- **D3 flaky 治理：触发面隔离**：advisory 的正确实现不是 try/catch，而是**把不稳定层从 blocking CI 的拓扑里物理移出**（仅 schedule + workflow_dispatch，永不进 pull_request）——唯一不会被「配置漂移/误触发」击穿的方案。skip 必须带非空 reason + ticket（Chromium `failing_test_names` 同构）。断言强度公式：**站点可控度 × 断言必要性 × flaky 成本**。〔QASkills 2026 · Bitwarden BIT · 本仓库已对齐〕
- **D4 真实站点弱断言（对齐先例口径）**：BIT 先例**断言填充结果**，故真实站点层可承受的断言上限是「L0 + 最弱 L4」，而非「只看元素存在」。〔Bitwarden BIT（本仓库 manifest 已援引）〕

### 自检与可观测性（R3，Confidence 高）
- **O1 doctor 命令矩阵**：已成工业标准——**只读检查矩阵 + `--json` + 显式退出码 + 破坏性动作必须 `--fix` 门控**。mv3-doctor 三铁律：先读 manifest 判定角色再应用规则、`--json` 供 CI/agent 消费、warning 不 fail；检查项含**一次真实启动冒烟**。〔mv3-doctor · vercel-labs agent-browser doctor · aspire/coderabbit doctor〕
- **O2 诊断面板逐层点亮**：Greasespot 排障树是母版（Add-on Enabled → Manager Enabled → Script Installed → Script Matched → Script Enabled → Script Errors）。每层回答一个独立布尔，**第一处熄灭的层就是「为何没生效」的答案**。根因提示必须是**验证过的**根因（TM 的误导横幅是反例）。面板可兼作修复入口（uBlock logger → 过滤器创建）。〔Greasespot Wiki · uBlock Logger wiki〕
- **O3 决策链 trace 作单一事实来源**：Flagr `evalDebugLog`——响应携带逐条 `{segmentID, msg}` 叙述判定，从上往下读即见**在哪一步停下**；GrowthBook 同构（per-flag debug log + `enableDevMode` 开关）。规则：**trace 是唯一源，UI 面板与 CI JSON 从同一份 trace 渲染**；溯源粒度局限要明示。〔Flagr Debug Console · GrowthBook DevTools · Wingify FE〕
- **O4 零开销 logger + 静默失败三招**：uBlock 统一时间线 + **未打开时零 CPU/内存开销**——诊断面必须与运行热路径解耦。静默失败三招：**前移**（构建/保存时校验必需元数据）、**捕获**（注入探针 + `window.onerror` 上报 trace）、**归因**（文案指向已验证的开关；未知错误诚实报「未知 + 请开 debug」）。〔uBlock Logger wiki · TM #2060/#2395 · mv3-doctor CI 模式〕

---

## §5 message 步骤（不设预算）

| 步 | 动作 | 关联 | 验收 |
|---|---|---|---|
| **M1** | 设置一级入口（含语言首位） | C1 | 冷启动 ≤2 次点击到达语言设置；豁免域名数量不影响可达性 |
| **M2** | i18n 全量重渲染 + 菜单原地更新 + 补齐文案 | C2 | 切换后全 UI 无漏刷；菜单无需重载即跟随 |
| **M3** | 自检面：trace + 逐层点亮面板 + debug 开关 | C3 | 构造「无可信字段」页，面板能说出具体哪道门挡住了 |
| **M4** | 测试 harness 交互原语 + GM 替身可驱动 | C5 | 原语可驱动 open/search/select/fill 并读到 value |
| **M5** | owned 指定页面语料 + L0–L5 全断言 | C4 | owned 语料上 18/18 能力均有断言且全绿 |
| **M6** | 真实站点层口径对齐先例 | C4 | ≥1 个 live 目标在 L0+最弱 L4 下连续两次绿 |
| **M7** | 可观测性自身的测试补齐 | C3 | 诊断面有密封断言 |
| **M8** | （可选）文档卫生 + live 清单扩充 | backlog | 上轮 C5-5/C5-6 + enablementRunbook |

**顶层建议**：**C1 + C3 先行**（唯一直接对应两条投诉，且共享一个「设置/诊断」视图交付物）；C2 紧随（同一改动面）；C5→C4 是「能被证明」的地基。**先让用户找得到，再让用户看得懂，最后让 CI 证得了。**

---

## §6 摩擦点登记（已写入 decision-ledger）

| A-ID | 摩擦点 | 去向（建议） |
|---|---|---|
| A-026 | 设置无一级入口（语言埋在第 3 层、滚动底、无菜单项） | M1（C1） |
| A-027 | i18n 不完整（手工逐项刷新致漏刷 + 图标 title 从未本地化 + 菜单标签只求值一次 + main.ts 就地双语） | M2（C2） |
| A-028 | 零可观测性/零自检面（src 无 console、无 debug 开关、无 doctor；signals 算完即丢；三种静默失败无解释） | M3（C3） |
| A-029 | 真实站点层能力覆盖 2/18（无交互原语、GM 替身为空函数、断言口径弱于其援引先例） | M4+M5+M6（C5+C4） |
| A-030 | 无 owned 指定页面语料与断言阶梯（「指定网页」两类都不适合全工具验证） | M5（C4） |

---

## §7 证据索引

- **代码证据**：`src/ui/index.ts:101,155-156,296,312,463-573,532-545,699,711,736,750-760,767` · `src/main.ts:18,107,135-137` · `src/i18n.ts:9,39-48` · `src/detect/index.ts:290,328,554,841-842` · `src/config.ts:53-54,62`
- **测试证据**：`tests/live/live-smoke.mjs:50-51,95,104,153-154` · `tests/live/site-manifest.json:8,14` · `tests/locale-switch.spec.ts` · `tests/scripts/verify-ticket-42.mjs` · `tests/helpers/userscript.ts`
- **子代理**：3 个并行只读审计（设置可达性矩阵 / 能力×层覆盖矩阵 18×3 / 可观测性通道审计）
- **深度调研**：atomcode 3 次全景调研（R1/R2/R3），三引擎交叉，官方文档优先
- **可视化报告**：`report/architecture-review-cycle6.html`
