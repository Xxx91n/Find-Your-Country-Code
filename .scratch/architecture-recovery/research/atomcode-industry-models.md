# atomcode 深度调研报告：网页表单字段识别与自动填充的工业级心智模型

> 来源：atomcode CLI（Exa×11 / Tavily×9 含 extract / AnySearch×3，23 次搜索，20 个 URL 原文核验）
> 运行时间：2026-09-03 18:34–18:47 (GMT+8) | 会话 ID：1ff2bd4f-ac23-44b1-b13f-daecd876fce9（可用 `atomcode -p "…" --resume` 续跑）
> 落盘说明：本文件为 atomcode stdout 的逐字存档，供多窗口引用（产物不许死在对话里）
> 置信度声明：主题1-3 高（官方一手文档/源码直读）；主题4 样本少、主题5 缺 React19 专项核验，中-高

---

## 执行摘要

浏览器扩展/用户脚本领域的表单字段识别,存在一个高度收敛的**三层工业共识**:① 词表/正则关键词信号 → ② 邻域锚定(以 password 字段为锚反向找 username)与 type/语义信号(email/tel、autocomplete、label/aria)→ ③ 可见性与可达性闸门(disabled/readonly/hidden/遮挡);Chromium 在此基础上叠加 crowdsourcing(服务器投票)并让 `autocomplete` 属性取得最高优先级;而"框架安全注入"的成熟方案在所有玩家中完全一致——**native prototype setter + 冒泡 `input` 事件**(必要时补 `_valueTracker.setValue` 与 `change`/`blur`)。intl-tel-input 在 v16→v29 的 6 年间 API/DOM 经历两轮大改名(dropdown→countrySelector、实例方法全面字符串化、wrapper 迁 scoped 包),但 `getInstance(input)` 与「setNumber→自动同步国家」的语义从未动摇,是第三方脚本唯一的稳定锚;`setCountry` 则已更名 `setSelectedCountry`,写死旧名的脚本会踩坑(社区脚本因此实现了 5 级降级填充链)。

## 核心结论速览（供 spec 直接引用）

1. **字段分类优先级链（Chromium）**：本地启发式 → crowdsourcing（服务端预测，压过本地）→ `autocomplete` 属性（除 `off` 外压过一切）→ rationalization。源码实证：表单内任一字段写了有效 autocomplete type hint，整张表单跳过其他启发式（form_structure.cc）。
2. **WHATWG autocomplete token**：`tel` 体系拆分 token（`tel-country-code`/`tel-national`/`tel-area-code`/`tel-local`…）正是"国家区号输入框"在规范层的分类词汇——本项目最强信号源。
3. **密码管理器三段式**（Bitwarden/KeePassXC 独立同构）：关键词词表（含歧义词表需上下文裁决）→ 锚定+邻域搜索（password 为锚找 username；type 信号兜底）→ 可见性/可达性闸门。**无公开数值化置信度**，实为规则序贯裁决；数值化分数出现在新一代 AI 填充扩展（ai-form-assistant 的 scanFields confidence score）。
4. **可见性闸门是安全关键**：KeePassXC #2184 的 isVisible 漏掉 overlay 遮挡/clip/content-visibility/样式表 opacity；Bitwarden dom-element-visibility.service.ts 是参考实现。
5. **站点级豁免/规则**：KeePassXC sites.js + Site Preferences；Bitwarden linked custom field（id/name/aria-label/placeholder 强制锚定）；1Password data-1p-ignore（可挂 body 全站忽略）——"用户可干预后门"是行业标配。
6. **intl-tel-input 集成真相**：`getInstance(input)` v16→v29 从未断代（最稳锚）；`setNumber("+…")` 官方推荐免 setCountry 路径（号码自带区号自动同步国家）；`setCountry` 已更名 `setSelectedCountry`（落点 v26–v29 区间，未锁定）；utils 异步加载必须 `await iti.promise`。
7. **5 级降级填充链**（GreasyFork 573755 即本项目）：`intlTelInputGlobals.getInstance` → `el.iti` → `data-intlTelInputId`+instances 表 → jQuery 插件 → DOM 点击 → 裸赋值+事件。覆盖 v16~v29。
8. **DOM 结构矩阵**：v16 `.iti__flag-container>.iti__selected-flag` → v29 `.iti__country-container><button class="iti__selected-country">`；下拉 `.iti__country-list` → `.iti__country-selector`（v29 改名）；`.iti` 根容器两代不变（检测锚）。
9. **React 受控组件**：`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,v)` + `input(bubbles)` 事件；需要时补 `_valueTracker.setValue(prev)` 强制 diff（react#11488）；完整序列 input→change→blur 触发 RHF/Formik 校验。
10. **Shadow DOM**：closed root 对普通 content script 不可见；扩展用 `chrome.dom.openOrClosedShadowRoot`（Chrome 88+）/ Firefox `element.openOrClosedShadowRoot`；KeePassXC 生产实现 = TreeWalker + openOrClosedShadowRoot（PR #2360）。油猴脚本环境可用 attachShadow monkey-patch（document-start）或递归 open shadowRoot 遍历。
11. **架构共性蓝图**（综合）：词表/正则 → 锚定/邻域 → type+语义信号 → 可见性/可达性闸门 → 框架安全注入（native setter+事件序列）→ MutationObserver 重扫 → 站点豁免规则。
12. **可直接借用的轮子**：libphonenumber（区号/号码元数据）、intl-tel-input 全家（检测 .iti 容器即用）、Bitwarden 词表思路（autofill-constants.ts 的歧义词表设计）、 WHATWG autocomplete token 表（tel 族）。

## 版本矩阵（intl-tel-input）

| 版本 | 日期 | 性质 | 关键点 |
|---|---|---|---|
| v16.1.0 | v16 系 | 基线 | `.iti` BEM 定型；setCountry/getSelectedCountryData/getCountryData/getInstance 全在 |
| v17.0.0 | 2020-04 | breaking | getInstance 新增；setNumber 去第二参 |
| v18 系 | ~2021 | — | 仍 setCountry；autoInsertDialCode 出现 |
| v25.13 | 2025-12-15 | minor | geoIpLookup 改 Promise；getSelectedCountryData 返回完整对象 |
| v26.0.0 | 2026-01-22 | breaking | locale 改 BCP-47；Intl.DisplayNames 国家名 |
| v27.0.0 | 2026-04-08 | breaking | 组件选项 initOptions → 独立 props |
| v28.0.0 | 2026-04-26 | breaking | wrapper 迁 scoped 包；separateDialCode/strictMode 默认 true、nationalMode 默认 false；枚举改字符串 |
| v29.0.0 | 2026-05-22 | breaking | dropdown→countrySelector 全面改名（CSS/事件/props）；utils 校验更名 |
| v29.2.3 | 2026-08-14 | 现版 | libphonenumber v9.0.37 |

## 缺口（诚实声明）

1. setCountry→setSelectedCountry 改名精确落点版本未锁定（v26–v29 区间）。
2. Chromium crowdsourcing 服务端预测细节、AutofillMin3FieldTypesForLocalHeuristics 实验默认状态未核实。
3. 1Password 内部算法闭源（反向推断）；Dashlane/LastPass/NordPass/Proton Pass 未纳入。
4. GreasyFork 同细分成熟脚本稀缺，仅本项目（573755）一个深度样本。
5. React 19 并发特性对 _valueTracker 的最新影响未专项核验（React 16–18 证据充分）。

## 来源清单（28 条，节选关键）

- Chromium Autofill README（components/autofill，v126 快照）全文
- WHATWG HTML spec §4.10.19.7 autofill + MDN autocomplete 全文
- chromium form_structure.cc 源码
- Bitwarden autofill-constants.ts / autofill.service.ts（main 分支 raw）
- KeePassXC-Browser wiki Extension details + #368/#2184/PR#2360
- 1Password compatible-website-design 官方规范
- intl-tel-input v16.1.0 README/CSS、v29.2.3 CSS、Releases API、官方 Methods docs
- GreasyFork 573755 源码全文（本项目自身）
- nopperabbo/auto-fill README（五形态交付：Playwright/扩展/userscript/bookmarklet/python）
- ai-form-assistant（MV3，scanFields confidence score 架构）
- chrome.dom API / MDN openOrClosedShadowRoot / react#11488 / Vue forms docs / browsersMCP React forms

（完整 28 条来源表与抓取方式见 atomcode 会话原始输出，可 `atomcode --resume 1ff2bd4f-ac23-44b1-b13f-daecd876fce9` 复查）
