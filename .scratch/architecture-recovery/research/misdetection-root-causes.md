# 误检测/漏检根因分析（大脑 Agent 直查，替代失败的 T2 子代理）

> 日期：2026-09-03 | 作者：AutoCoder（大脑）
> 证据状态：源码行号引用均为 **observed**（全文直读 v1.3.4）；测试页结构 **observed**；外部行为影响标注 **candidate**
> T2 子代理因模型配额耗尽失败（403 GLM-5.3 free quota used up），本报告由大脑用已持有的全文证据直接完成。
> **复现升级（18:59 补）**：T2 遗留的复现 harness `research/scripts/misdetect-repro.mjs` 经大脑修复路径后跑通——**25 例中 24 例符合预期：FP 8 例复现 7 例、FN 5 例全部确认、对照组 7 例全绿**。以下 §2/§3 中被 harness 复现的路径，证据等级从 observed 升级为 **reproduced**；F8 一例未复现（label「国家/地区」单独不触发，需要 name/attr 关键词之一），已如实标注。
> gate 诊断（真实代码路径定位）：F1/F2/F6/F7=hasAttrKw（词表路径，含 F6 的 `hidden`子串→`idd` 撞库）；F4/F5=hitCode 纯数字选项路径（F5 同中 hitPlusLike）。

## 1. 测试页场景矩阵（observed）

| 场景 | 文件:行 | 内容 | 检测路径 |
|---|---|---|---|
| A | cch-test-page2.html:177 | 原生 `<select>` 区号下拉 | `_isSelect` |
| B | :274 | `<input>` 文本框区号 | `_isInput` |
| C | :343 | intl-tel-input@18.2.1 CDN 插件（C1 initialCountry:"cn"） | `_isIti` |
| D | :383 | 动态注入字段（MutationObserver） | observer→scan |
| E | :405 | 综合注册表单 | 混合 |

cch-test-page.html:207-217 自带说明：CodePen/intl-tel-input 部分场景"未生效"及"检测通过条件（需同时满足）"——测试资产本身已记录检出失败样本。

## 2. 误检测路径（为什么"不是区号字段也有图标"）

1. **`prefix` 歧义关键词**（src/Find-Your-Country-Code.js:49）：INPUT_KW 含 `prefix`，且 `_kw` 做去连字符子串匹配（:353）——`name="prefix"` 的"称呼前缀（Mr./Ms.）"输入框、`name="lastname-prefix"` 类字段全部命中。`_isInput` 属性命中即返回 true（:432），无任何内容验证。→ 误报路径①（observed 源码路径；具体站点样本 candidate）。
2. **固话"本地区号"**：label 含裸词"区号"（LABEL_PHRASES 含 `'区号'`，:59）即命中——中国固话表单"区号-号码"分两格的场景（区号=010 这类**非国际区号**）会插图标，但面板填的是 `+86` 语义错位。→ 误报路径②（observed）。
3. **select 选项形态学的纯数字漏洞**：`hitCode` 正则 `/^\d{1,4}$/`（:390）把"1-3 个月内有效""排序 1/2/3"这类纯数字 option 值当区号候选；`hitCode.length>=2` 即满足——叠加任意关键词命中（如父容器 class 含 `country`）即误插。`hitPlusLike` 40% 占比阈值（:407）同样不校验值的区号语义（1-4 位纯数字可命中任何小枚举表单）。→ 误报路径③（observed）。
4. **关键词命中后验证强度反转**：`_isSelect` 中 `hasAttrKw||hasLabelPhrase` 命中后只需 `hitCode>=2 || hitIso>=2`（:400）——"country" 命中的**国家选择器**（选国家不选区号，ISO 值表）也会插图标（功能上可用但语义是"国家"而非"区号"，用户感知即"不是选区号的也有图标"）。→ 误报路径④（observed，此条正是用户痛点直接映射）。
5. **布尔短路无置信度**：所有命中路径返回 boolean（`_process`:447-454 直接 attach），无评分、无分级行动。任何一条弱信号单独成立即注入。→ 系统性根因（observed）。

## 3. 漏检路径（为什么"大部分网站不生效"）

1. **Shadow DOM 完全盲区**：`Detect.scan`（:456-462）只用 `root.querySelectorAll`；`observe()`（:672-679）只 observe `document.body`。open shadowRoot 内字段零检出（Lit/Modern 组件库/GitHub 前端等）。→ 行业方案：递归穿透 + 每 shadow root 单独 observer（atomcode 报告结论10）。
2. **`_done` WeakSet 终态化**（:349, :449）：元素判定过一次即永不再评估。框架（React/Vue）复用 DOM 节点切换 props/表单语义后不会重检；SPA 把元素从"普通字段"改造成"区号字段"也不会重检。反向：判定为区号后改成普通字段则图标残留（另一类"误检测"来源）。→ observed。
3. **iti 新版 DOM 假设**：`_isIti` 依赖 `.iti`/`.intl-tel-input` 容器类（:368）与 jQuery data（:375-380）。iti v28+ wrapper 迁 scoped 包、v29 dropdown 改名（atomcode 版本矩阵），`.iti` 根类目前仍在（cited），但 `fillIti` 的 DOM 点击 fallback 依赖 `.iti__selected-country`（v29 才有）/`.iti__flag-container`（v16 时代）两套类名，v17-v27 中间版本的类名与行为差异未覆盖；`el.iti` 属性在部分版本不存在。→ candidate（需版本矩阵实测，atomcode 已给两端矩阵）。
4. **SELECT value 不在 DOM 的框架组件**：`_isSelect` 只能看 `<select><option>`；MUI/AntD/Element-Plus 等把 options 渲染为 div 列表或存 JS state，`el.tagName==='SELECT'` 直接 false（:364）→ 零检出。→ observed（源码只认原生 select）。
5. **input type 覆盖不全**：`_isInput` 只接受 `text/tel/''`（:420）。`type=number`（区号输入偶尔）、无 type 但有 `inputmode=tel` 的字段：inputmode 未读取。`autocomplete` 属性完全未读取——`autocomplete="tel-country-code"` 的标准字段（最强语义信号）反而可能因 name/id 无关键词而漏检。→ observed。
6. **label 识别面窄**：`_label` 只查 `label[for]`/`closest('label')`/`aria-labelledby`（:357-366）；浮动 label（Material 风格 span）、placeholder 前缀、`<th>`/网格布局的表头关联全部丢失；且多次调用重复查询（`_isSelect` 内 3 次 `_label`）无缓存。→ observed。
7. **iframe 不处理**：`@match *://*/*` 只进顶层 frame（Tampermonkey 默认 @all frames 未开，头部无 `@noframes` 也不代表进 iframe——依赖 @match 默认 all frames 行为，candidate）；跨域支付/注册 iframe 场景未设计。→ candidate。

## 4. 根因综合

- **reproduced**：误报路径①prefix 歧义（F1/F1b/F1c）、②裸词区号（F3/F4）、③纯数字选项（F4/F5）、④国家 select 混同（F2/F7）、外加 harness 新发现：ISO2 撞库（mr/ms 是合法 ISO2）与 class 名子串撞库（hidden→idd，F6）；漏检路径：EXCLUDE 误杀真区号字段（N1：label「国家/地区区号」含「地区」被排除表杀掉！）、aria-labelledby 多 id 未 split（N2/N2b 对照）、type=number 双重漏（N3）、INPUT_KW 无 prefix（N4）、react-phone-input-2 不识别（N5）、hidden 承值 input（N6）、Select2 可用性缺陷（N7）。复现命令：`node research/scripts/misdetect-repro.mjs`（24/25 符合预期）。
- **confirmed（代码级机制+复现）**：布尔命中无置信度（误报主根因，F1-F7 全部经 hasAttrKw 或 hitCode 路径）；EXCLUDE 黑名单误杀（N1）；Shadow DOM/框架 select/autocomplete 三大盲区（漏报主根因，静态代码确认）；`_done` 终态化（动态页面双向误/漏检）。
- **candidate**：iti 中间版本类名差异、iframe 覆盖、wrapper 重排对 React 的副作用（T1 报告缺口8同款）。

## 5. 修复方向（给 to-spec 的输入，不含代码）

0. **harness 新发现的两个必修点**（更新 spec 决策输入）：① 排除表需要词边界匹配 + 「国家/地区区号」这类复合短语白名单优先级高于子串排除（N1 误杀）；② ISO2 撞库词（mr/ms/id/do 等双字母人名/代词）在选项值侧需要「值域整体分布」判定而非单值判定。两者均已进入 02 号票验收范围（歧义词降权组 + L3 内容验证）。
1. 检测引擎改"多信号加权评分 + 分级行动"（L0 autocomplete token → L1 词表/label → L2 锚关联 → L3 内容验证 → L4 负分排除）——蓝图见 industry-models.md §④。
2. Shadow DOM 穿透（内联 query-selector-shadow-dom 算法）+ per-root observer。
3. `_done` 改"版本号重评"机制（元素元数据变更/路由变化触发重评）。
4. iti 适配层化：getInstance 稳锚 + setSelectedCountry/setCountry 双名 + DOM 类名双代矩阵。
5. 框架组件库适配：MUI/AntD/Element 的"伪 select"识别（role=listbox/combobox + aria）至少出探测策略，或明确列为 out-of-scope。
6. SELECT 的 native setter 补齐 + inputmode/autocomplete 信号接入。
7. 站点级规则引擎（用户可配置豁免/强制，参照 KeePassXC sites.js / 1Password data-1p-ignore 后门心智）。
