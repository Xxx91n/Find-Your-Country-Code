# 行业心智模型调研报告：网页表单字段识别与自动填充

> 调研人：行业方案调研员（子代理） | 日期：2026-09-03
> 服务对象：Find-Your-Country-Code v1.3.4 架构重设计
> 方法：本地源码阅读（observed）+ web_search 广泛检索（cited/candidate，共 20+ 次不同角度）
> 证据状态标注：**observed** = 直接读到本地源码；**cited** = 有网络来源引用；**candidate** = 推测待验证

---

## ① 行业心智模型清单

### M1. 浏览器原生 Autofill 标准模型（WHATWG autocomplete token 体系）【cited】

**核心心智**：字段的"语义身份"应当由标准化的 `autocomplete` 属性声明，浏览器只需解析 token，无需猜测。

- WHATWG HTML 规范 4.10.18.7《Autofilling form controls: the autocomplete attribute》定义了 **autofill detail tokens**：空格分隔的有序 token 集合，如 `tel`、`tel-country-code`、`tel-national`、`tel-area-code`、`country`、`country-name` 等。来源：html.spec.whatwg.org/multipage/form-control-infrastructure.html
- 规范原文出现 **"autofill anchor mantle"**（自动填充锚斗篷）概念：当 autocomplete 属性用于标识字段名时，它"wearing the autofill anchor mantle"——即 autocomplete 属性本身就是规范定义的"锚"信号。来源：WHATWG spec + wicg.github.io HTML Standard 镜像
- **对本项目最关键的 token：`tel-country-code`**（"The country code, such as 1 for the United States"）与 `country` / `country-name`。来源：MDN autocomplete 文档
- whatwg/html#8597 讨论了 `tel-country-code` 语义混乱问题（country 填 UK 但电话可能是非 UK 号），说明连标准委员会都在争论该字段的语义边界——这正是启发式仍不可替代的原因。
- W3C ACT Rule 73f2c2（proposed）：autocomplete 值必须是合法 autofill detail token 集合，这是可访问性测试的正式规则。

**对本项目的直接启示（observed 对照）**：当前源码 `Detect._isInput` / `_isSelect` 收集的属性串为 `name/id/className/placeholder/aria-label/data-name/title`，**完全没有读取 `autocomplete` 和 `inputmode` 属性**。行业标准里最强的语义信号（autocomplete="tel-country-code" / "country"）目前是盲区。这是最高性价比的改进点。

### M2. Chromium Autofill 引擎：分层预测 + Rationalization【cited】

**核心心智**：单层启发式不够，用"启发式 → 服务器预测 → autocomplete 覆盖 → 合理化（rationalization）"的多层瀑布。

- Chromium 源码文档（chromium.googlesource.com/chromium/src/+/HEAD/components/autofill/）明确写道：**"FormField::ParseFormFields is the global entry point for parsing fields with heuristics. Local heuristics are only applied if a form has at least 3 fields"**——即 Chrome 也有"表单规模门槛"这种防误报阈值。
- **字段签名（field signature）与表单签名（form signature）**：Chrome 为每个字段生成签名（name + type 等的哈希），服务器预测缓存按签名键控（issues.chromium.org 有签名缓存投毒的漏洞报告，佐证签名机制存在）。
- **预测优先级**：服务器预测可被 autocomplete 属性预测覆盖；提交时的预测事件统计 `.BasedOnAutocomplete` 变体（chromiumdash 提交记录）。
- Chrome DevTools 已内置 **Autofill 面板**，可视化"表单字段 ↔ 预测的 autofill 值 ↔ 已保存数据"三者的映射（developer.chrome.com/docs/devtools/autofill）——预测结果可被开发者检查，说明"预测可观测性"是工业实践的一部分。

### M3. Chrome 新 "autofill" 事件（Origin Trial）与 AutofillPredicted【cited + candidate】

- developer.chrome.com/blog/autofill-event-origin-trial：Chrome 正在试验全新的 **`autofill` 事件**，允许页面 JS 以编程方式响应浏览器自动填充（ autofill 发生后通知页面、允许页面调整表单）。目前处于 origin trial 阶段，尚未广泛可用。
- **AutofillPredicted 事件**：Chrome DevTools Protocol 中存在 Autofill domain（chromedevtools.github.io/devtools-protocol/tot/Autofill/），用于测试时触发/检查 autofill。但**面向普通页面脚本的 `AutofillPredicted` DOM 事件未找到公开标准或可用 API**——该事件名主要出现在 Chromium 内部消息与 CDP 语境。油猴脚本无法依赖它。**此项为部分缺口，详见⑤。**

### M4. 密码管理器字段启发式（Bitwarden / 1Password / KeePassXC / Dashlane）【cited + observed】

**核心心智**：强类型信号（type=password）→ 标准 token（autocomplete）→ 弱文本信号（name/id/placeholder/label 正则与关键词）的优先级链；识别失败时降级到用户手动绑定。

- **Bitwarden**（contributing.bitwarden.com 架构深度文档，cited）：
  - `collect.js` content script 负责收集页面表单结构（含字段属性、可见性、表单分组），序列化后交给 background 做填充决策；
  - `notificationBar.ts` 用 **MutationObserver 检测 DOM 变化发现新表单**（与本项目的 observe() 同构）；
  - **Linked Custom Fields**（bitwarden.com/help/auto-fill-custom-fields/）：启发式识别失败时，允许用户手动把 vault 字段绑定到页面字段——即"低置信度 → 人工兜底"的降级通道。
- **1Password "brain"**（1password.com/blog/1passwordx-december-2019-release + 官方 Reddit 回复，cited）：官方称其为"a cross-platform library"，"analyzes webpages in the background so it can suggest relevant items to fill in the available fields"。跨平台共享同一套页面分析大脑，闭源，细节未公开。
- **KeePassXC-Browser**（github.com/keepassxreboot/keepassxc-browser，cited）：issue #2929 表明其对 `autocomplete="off"` 的处理策略（忽略 off 仍显示填充图标）——各家对"排除信号"的取舍不同。
- **通用信号集**（hidde.blog《Making password managers play ball with your login form》+ Medium Thomas Gamauf《Why Password Managers Ignore Input Fields》+ web.dev sign-in form best practices，cited）：密码管理器普遍读取 `autocomplete`、`placeholder`、`label` 文本、`type`、`name`/`id` 正则、以及"相邻字段组合"（文本框+密码框的成对出现是登录表单的强结构信号）。
- **anchor/target（锚字段→目标字段）模式**【candidate】：任务书要求重点核实。规范层的"锚"= autocomplete 的 autofill anchor mantle（M1，cited）。实践层的锚→目标配对（用户名锚→密码目标；国家锚→区号目标）在密码管理器与地址填充中普遍存在，但**未找到 Bitwarden/1Password 以 "anchor/target" 命名的公开文档**——该术语更像社区对这类配对启发式的统称。标注 candidate，建议 atomcode 深度调研时读 Bitwarden clients 源码（`autofill.service` / `collect.js`）核实。

### M5. 学术界与 ML 路线【cited】

- **arXiv:1912.08809《Field Label Prediction for Autofill in Web Browsers》**（Bose, 2019）：用 Azure ML Studio 训练 web 服务，从 HTML 预测字段标签——证明"字段语义识别"可 ML 化，但需要服务端与训练数据，不适合油猴单文件场景。
- **mozilla/smart_autofill**（github.com/mozilla/smart_autofill，cited）："Autofill HTML Tag Detection. Training code for the autofill model that can predict labels (e.g. Zip Code) from HTML tags"——Mozilla 官方的字段标签预测训练代码。
- **Mozilla Fathom**（github.com/mozilla/fathom，已 DEPRECATED，cited）："A supervised-learning system for recognizing parts of web pages—pop-ups, address forms, slideshows"。其心智模型最具参考价值：**ruleset（规则集）→ 每条规则对候选元素打分 → 输出 (type, score, note)**。即"识别结果 = 类型 + 置信度分数 + 说明"，而非布尔值。Fathom 曾是 Firefox 表单识别的候选技术（form recognizer 谱系）。
- 《Empirical Analysis of the Privacy Threats of Browser Form Autofill》（UIC，cited）：autofill 误判会造成隐私泄露（隐藏字段被填充）——**误报控制不仅是体验问题，更是安全问题**，对本项目"误注入图标到无关字段"的严重性定级有参考意义。
- Nordpass 博客（cited）：商业密码管理器也在用 ML 增强 autofill 字段分类，佐证纯规则的天花板。

### M6. 用户脚本（userscript）领域现状【cited + candidate】

- GreasyFork 检索到的表单填充类脚本（cited）：
  - *AutoFiller Script Multi-profile*（greasyfork #568847）：多 profile 手动配置填充，Alt+A 面板——"用户配置"路线，无字段语义识别；
  - *Google Form Auto Filler*（#546495）：站点特定（Google Forms）；
  - *Simple Form Saver*（#8410）：保存/回放表单值——"录制回放"路线；
  - *enable autofill*（#498213）、*Auto-Fill Voting Page*（#6697）：站点特定或极简；
  - *Country Code*（#465957）：显示 ISO 3166-1 alpha-2 国家代码的工具，**不是表单识别/填充**。
- **结论**【candidate】：用户脚本领域没有发现"通用网页 + 语义识别国家区号字段"的成熟同类竞品。最接近的形态是密码管理器扩展（M4）而非 userscript。本项目的定位在 userscript 生态内是空白区。（受搜索引擎索引限制，未能穷尽 GreasyFork 站内搜索，见⑤缺口。）
- 值得注意：Testofill（Chrome 扩展）、AutoFill Forms（Chrome 扩展，正则规则多 profile）走的是"规则由用户写"的路线，同样回避了语义识别。

### M7. intl-tel-input 版本矩阵与互操作 API【cited + candidate】

- 官方 Methods 文档（intl-tel-input.com/docs/methods，cited）：核心实例方法 `setCountry`、`setNumber`、`getNumber`、`getSelectedCountryData`、`destroy` 等；静态入口 `intlTelInputGlobals`（含 `getInstance`、`instances`、`getCountryData`）。
- `getInstance`/`instances` 的社区用法有 StackOverflow #77959032 佐证（cited）；GitHub issue #1207 反映"无 bundler 时 window.intlTelInput 不是函数"的版本差异困惑。
- 版本演进（**部分 candidate，精确矩阵待 atomcode 补齐**）：
  - **v16 及更早**：jQuery 插件形态（`$.fn.intlTelInput`），实例数据挂 jQuery `.data()`；
  - **v17**：vanilla JS 重写过渡期，仍存在 `jquery-intl-tel-input` 命名的分发（U Waterloo GitLab v17.0.5 包，cited）与 jQuery 调用兼容；
  - **v18.x**：纯 vanilla + `window.intlTelInput` / `intlTelInputGlobals` 全局暴露（npm 上 18.5.4 长期存在于 fork，cited）；
  - **v19+ ~ 当前 29.x**（npm latest 29.2.1，cited）：ESM/原生框架组件化（React/Vue/Angular/Svelte 官方组件），全局暴露依赖传统 `<script>` 引入方式。
- **本项目现状（observed）**：`Fill.fillIti` 已实现 5 层降级链——`globals.getInstance` → `el.iti` → `dataset.intlTelInputId + instances` → jQuery `$().intlTelInput('setCountry')` → DOM 模拟点击 `.iti__selected-country`。这条降级链与上述版本碎片化一一对应，是正确的工业互操作实践，应在架构重设计中**保留为独立适配层**。

### M8. 检测增强技术：Shadow DOM 穿透与框架受控组件赋值【cited + observed】

**Shadow DOM**：
- w3c/webextensions#647《Shadow DOM problems for extensions》（cited）：扩展生态正式向 W3C 提出的痛点清单——扩展需要跨 shadow root 做 `querySelectorAll`、`MutationObserver`、加事件监听，标准 API 不支持，只能逐层手动穿透。
- 工业实践（cited）：**递归 querySelectorAll**——遍历所有元素，对有 `shadowRoot` 的宿主递归查询（closed shadow root 无法穿透，marian-caikovski Medium 文章）；现成轮子 `query-selector-shadow-dom`（webdriverio，`querySelectorAllDeep`/`querySelectorDeep`）与 `shadow-dom-selector`（npm）。
- MutationObserver 跨 shadow root（cited，StackOverflow #72239762 + deliciousreverie.dev）：**每个 open shadow root 必须单独 attach observer**，顶层 observer 看不到 shadow 内部变更。
- **本项目现状（observed）**：`Detect.scan` 只调 `root.querySelectorAll(...)`，`observe()` 只 observe `document.body`——**shadow DOM 内的字段完全检测不到**。这是已知能力缺口。

**React 受控组件赋值**：
- 经典方案（StackOverflow #23892547，cited；coryrylan.com 博客佐证）：React 重载了 `value` setter，必须 `Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, value)` 再派发 `input`（React 16+）事件，否则 React 状态不更新。
- **本项目现状（observed）**：`Fill._dispatch` 已实现 INPUT 的 native setter + input/change/blur 三事件派发——符合工业实践。**缺口**：SELECT 元素没有先调 `HTMLSelectElement.prototype` 的 value setter（直接 `el.value = m.value` 后派发，对多数 React select 封装有效但非最稳形态）；未派发 `focus`/`keydown` 前置事件（少数严格组件需要）。

**Vue / Angular**：
- Vue（vue-multiselect issue #1187 等，cited）：v-model 监听 `input` 事件，programmatic 赋值不触发事件——所以"native setter + dispatch input"对 Vue 同样有效；Vue3 的 @vue/reactivity 不拦截 DOM 属性，行为一致。
- Angular（angular.dev Reactive Forms 文档，cited）：Angular 自身用 `setValue()` API，但对外部脚本注入而言，Angular 的默认 DOM event listener（`(input)`/`(change)`）同样吃 dispatchEvent 方案。
- **结论**：统一的 "prototype setter + input/change 事件派发" 是跨 React/Vue/Angular 的最大公约数方案，本项目已具备 INPUT 版本，补 SELECT 版本即可。

---

## ② 共同架构模式提炼

综合 M1–M8，工业级"表单字段识别"的共识架构可以提炼为四层：

### P1. 多信号融合（Multi-Signal Fusion）

所有成熟方案都同时采集多类信号，绝无单一信号决策：

| 信号类别 | 信号源 | 权重定位 |
|---|---|---|
| 语义标准信号 | `autocomplete` token（tel-country-code/country/country-name）、`type=tel` | 最高（规范级，Chrome 用它覆盖服务器预测）|
| 强类型信号 | `type=password`（密码管理器）、`<select>` vs `<input>` | 高 |
| 结构文本信号 | name/id/class/data-* 的关键词正则、placeholder、`label[for]`、`closest('label')`、`aria-labelledby`、`aria-label`、`title` | 中 |
| 上下文验证信号 | select options 内容分布（+86/ISO2/国家名占比）、相邻字段（电话主号=锚）、表单整体规模 | 中（Chrome rationalization 层）|
| 排除信号（负分） | locale/language/province/state/city 等反关键词、`autocomplete=off`（各家取舍不同）| 负向否决 |

**本项目现状（observed）**：已有第二、三、五类信号的雏形（SELECT_KW/INPUT_KW/LABEL_PHRASES/SELECT_EXCLUDE_KW + options 内容验证），**缺第一类（autocomplete token）**，且信号之间是布尔短路逻辑而非加权融合。

### P2. 置信度评分 + 阈值分级（Scoring & Tiering）

- Fathom：规则集输出 (type, **score**)，分数是连续值（cited）。
- Chrome：预测有质量分层（本地启发式 vs 服务器 vs autocomplete 覆盖），且对表单有"≥3 字段才启用启发式"的门槛（cited）。
- Bitwarden：识别不确定时提供手动绑定兜底（cited）——本质是"低置信度 → 降级人工"。
- **映射到 UI 行为分级**：高置信度 → 自动注入图标；中置信度 → 可配置/低视觉权重注入；低置信度 → 不注入但允许用户手动召唤。本项目目前是二元判定（注入/不注入），`_isSelect` 里 `hitCode.length >= 2`、`hitPlusLike.length / opts.length >= 0.4` 等阈值已具雏形，但没有统一分数体系。

### P3. 锚字段 → 目标字段关联（Anchor → Target）

- 规范层：autocomplete 属性即 "autofill anchor mantle"（cited，WHATWG）。
- 实践层：密码管理器的"用户名(锚)→密码(目标)"配对、地址表单的"国家(锚)→电话区号(目标)"关联（cited，社区文档描述的相邻字段组合启发式；具体实现术语 candidate）。
- **对本项目的映射**：国家区号字段极少孤立出现——典型场景是"国家 select（锚）+ 区号 input（目标）+ 电话主号 input（锚）"成组。锚字段命中可以为目标字段提供强佐证（例：同 form 内存在 `input[type=tel]` 或已识别的国家 select，则邻近 "code" 命名的 input 置信度上调；反之孤立 "prefix" 字段下调）。

### P4. 误报控制三件套（Negative Scoring / Exclusion / Content Validation）

1. **负分/排除关键词**：本项目 SELECT_EXCLUDE_KW 已是此模式（observed）；密码管理器对 autocomplete=off 的差异化处理（cited）。
2. **内容验证（rationalization）**：本项目对 select options 的 `+数字`/ISO2/国家名检测（observed）与 Chrome "用已保存数据类型回验预测"同构。
3. **规模门槛**：Chrome "少于 3 字段的表单不跑本地启发式"（cited）；本项目 "options < 2 直接排除"（observed）是同思路的更小粒度版本。

**隐私/安全佐证**：UIC 研究证明 autofill 误判会向隐藏字段泄露数据（cited）——对 inject 型工具而言，误报的代价不是零，值得用评分制收敛。

---

## ③ 可直接借用的轮子清单

| 名称 | 地址 | 许可证 | 作用 | 油猴适配性 |
|---|---|---|---|---|
| **libphonenumber-js** | github.com/catamphetamine/libphonenumber-js | MIT | 国家区号/ISO 元数据、号码解析、`getCountryCallingCode()`；可替代硬编码 COUNTRIES 表并校验数据 | ★★★☆☆ 有 jsDelivr UMD/iife 构建，可 `@require`，但含完整元数据体积偏大；可只用其元数据生成脚本内静态表（构建期提取，运行期零依赖） |
| **intl-tel-input** | github.com/jackocnr/intl-tel-input | MIT | 国际电话输入组件（本项目是"检测宿主"而非依赖）；其 `intlTelInputGlobals.getInstance/instances/setCountry` 是官方互操作通道 | ★★★★★ 不是引入，而是继续适配：保留现有 5 层降级链（observed） |
| **query-selector-shadow-dom** | github.com/webdriverio/query-selector-shadow-dom | MIT | `querySelectorAllDeep`/`querySelectorDeep` 递归穿透 open shadow root | ★★★★★ 体积小、无依赖，可直接内联 `collectElements` 递归函数进单文件脚本（MIT 允许保留版权注释） |
| **shadow-dom-selector** | npmjs.com/package/shadow-dom-selector | MIT | 同类 shadow DOM 穿透查询（同步+异步两种） | ★★★★☆ 同上，二选一内联即可 |
| **WHATWG autofill token 列表** | html.spec.whatwg.org/multipage/form-control-infrastructure.html | 规范（CC-BY 文档） | `tel-country-code`/`country`/`country-name` 等 token 的合法值域——直接在检测器里按 token 匹配，零依赖 | ★★★★★ 静态字符串匹配，直接实现 |
| **fathom** | github.com/mozilla/fathom | MPL-2.0（仓库标注 DEPRECATED） | "规则集→打分"的语义识别框架，Firefox 系 | ★★☆☆☆ 已弃用、体积大、面向训练场景；**只借心智模型（ruleset+score），不引库** |
| **mozilla/smart_autofill 训练代码** | github.com/mozilla/smart_autofill | 开源（MPL 系） | 字段标签预测的训练管线 | ☆☆☆☆☆ 需要模型与服务端，与油猴场景不兼容，仅作方法论参考 |
| **google-libphonenumber** | npmjs.com/package/google-libphonenumber | Apache-2.0 | Google 官方端口，功能最全 | ★☆☆☆☆ 体积过大（数百 KB），不适合单文件脚本 |

**结论**：真正值得引入运行时的只有 **query-selector-shadow-dom 的算法（内联）** 与 **libphonenumber-js 的元数据（构建期提取）**；其余轮子以"借模型不借代码"为主。

---

## ④ 对本项目的映射建议

### 最适合的模型：**Chromium 分层预测（M2）为骨架 + Fathom 评分表达（M5）为形式 + 密码管理器降级哲学（M4）为兜底**

即：**"信号分层 → 统一置信度评分 → 阈值分级行动 → 内容验证复核"** 的纯规则评分引擎。

**理由**：

1. **规模匹配**：单文件、无构建、无服务端。ML 路线（M5 的 arXiv/Nordpass）全部需要模型推理，排除；Fathom 库已弃用且面向训练，排除运行时引入，但其 "(type, score)" 输出契约是评分制的最佳表达形式。
2. **现状延续**：现有 `_isSelect`/`_isInput` 已是布尔版的多信号融合（observed：关键词组 + label 三源提取 + options 内容验证 + 排除词），重设计是从"布尔短路"升级为"加权累计"，而不是推倒重来——迁移成本最低。
3. **行业共识**：Chrome 的"autocomplete 覆盖一切 + 启发式兜底 + rationalization 复核"、密码管理器的"强信号优先 + 手动兜底"、Fathom 的"连续分数"，三者交集就是上述评分引擎。没有更简单的行业共识形态。

### 具体分层建议（架构重设计的检测引擎蓝图）

```
L0 语义标准层（新增，权重最高）
   autocomplete ∈ {tel-country-code, country, country-name, tel} → 一票强命中
   inputmode=tel / type=tel 作为结构佐证
L1 结构文本层（现有逻辑加权化）
   name/id/class/data-name 关键词（SELECT_KW/INPUT_KW 归一为正则组，不同组不同权重）
   placeholder / title / aria-label
   label 三源（label[for] > closest('label') > aria-labelledby）+ LABEL_PHRASES
L2 锚→目标关联层（新增）
   同 form / 邻近 DOM 内存在：电话主号 input[type=tel]（锚）或已识别国家 select（锚）
   → 为区号目标字段加分；孤立字段减分
L3 内容验证层（现有，rationalization）
   select options 的 +digits / ISO2 / 国家名分布占比
L4 排除层（现有 SELECT_EXCLUDE_KW，负分制）
   locale/语言/省份/城市等 → 负分抵扣
输出：score ∈ [0,1] + 命中信号明细（可观测性，对应 Chrome DevTools Autofill 面板思想）
行动分级：
   score ≥ 高阈值 → 自动注入 🌐 图标
   中阈值 ≤ score < 高阈值 → 注入但低视觉权重（或遵循用户配置）
   score < 中阈值 → 不注入，保留手动召唤入口
```

### 填充侧建议

- 保留 `fillIti` 的 5 层降级链（observed，与 intl-tel-input 版本碎片化一一对应，M7）并隔离为独立适配模块；
- `_dispatch` 补 SELECT 的 `HTMLSelectElement.prototype` value setter 调用（M8）；
- `Detect.scan` 增加 shadow root 递归穿透（内联 query-selector-shadow-dom 算法），`observe()` 对发现的每个 open shadow root 单独 attach MutationObserver（M8）；
- COUNTRIES 静态表改为构建期从 libphonenumber-js 元数据生成（或人工核对一遍），消除手抄数据漂移风险。

---

## ⑤ 调研缺口声明

以下问题本次调研**未能完全确证**，建议 atomcode 深度调研（可直读源码/仓库）补齐：

1. **AutofillPredicted 事件的权威定义**：仅在 Chromium 内部消息/CDP Autofill domain 语境找到间接证据；未找到面向页面脚本的公开 DOM 事件规范。新 `autofill` event 确认在 origin trial（developer.chrome.com/blog/autofill-event-origin-trial）但未 GA。→ 建议读 `chromium/src/components/autofill` 的 `autofill_agent.cc` 确认事件名与触发路径。
2. **Bitwarden/1Password 打分算法细节**：1Password "brain" 闭源；Bitwarden 源码开放但本次只读到了架构文档（contributing.bitwarden.com 的 Collecting Page Details / Form Submission Detection），未直读 `clients` 仓库的 `autofill.service.ts` / `collect.js` 具体字段匹配实现。anchor/target 术语的具体出处未确证（目前定位：规范 anchor mantle 为实、工程术语为社区通称）。
3. **intl-tel-input v16→v19 逐版本 API 差异矩阵**：拿到了间接证据（v17 时代仍有 jQuery 命名分发、v18 fork 长期存在、当前 29.x、官方 Methods 文档），但未逐条核对 CHANGELOG（github.com/jackocnr/intl-tel-input/blob/master/CHANGELOG.md）中的 breaking changes 清单。现有 5 层降级链的版本覆盖完备性未经逐版本验证。
4. **GreasyFork 站内穷尽检索**：web_search 只能覆盖被外部搜索引擎索引的脚本页，无法穷尽站内搜索"country code / intl-tel-input / dial code"全部脚本；"无成熟同类竞品"的结论为 candidate 级。
5. **DuckDuckGo autofill 字段检测细节**：DDG 浏览器自带 autofill，但开源仓库（duckduckgo/duckduckgo-privacy-extension）以 tracker 阻断为主，autofill 逻辑未见公开文档，未能纳入模型清单。
6. **Vue/Angular 外部赋值的官方文档级证据**：React 的 native setter 方案有 StackOverflow 高票答案 + 博客佐证（cited）；Vue 的 v-model=input 事件契约、Angular 的 DOM listener 行为主要靠通识与零散 issue 佐证，未抓到官方文档直接陈述"外部脚本赋值"路径。
7. **Fathom 在 Firefox formautofill 中的实际使用状态**：Fathom 仓库已标 DEPRECATED，但它是否/何时被 Firefox 的 formautofill 组件实际采用过，本次只找到外围描述，未读 mozilla-central 源码确认。

---

## 附：本项目现状快照（observed，供架构师对照）

- **Detect**：`_isIti`（iti 宿主识别）/ `_isSelect`（关键词+排除词+options 三段验证）/ `_isInput`（INPUT_KW + LABEL_PHRASES）；布尔判定，无 autocomplete 读取，无 shadow DOM 穿透，无置信度分数。
- **Fill**：`fillIti`（5 层降级）/ `fillSelect`（值/ISO/data-attr/文本多级匹配）/ `fillInput`（placeholder 格式推断 +/+00/纯数字三种格式）；`_dispatch` 对 INPUT 有 native setter，对 SELECT 无。
- **Observer**：MutationObserver（childList+subtree）+ 350ms debounce + 初始 8×500ms 轮询——与 Bitwarden notificationBar 的 MutationObserver 模式同构（cited 对照）。
- **UI**：wrapper 重排（`position:relative` 包裹目标字段 + 角标按钮）——注意 wrapper 重排本身可能触发某些框架的 re-render，属已知风险点，本次未调研该风险（缺口 8：DOM 重排对宿主框架的副作用未检索）。
