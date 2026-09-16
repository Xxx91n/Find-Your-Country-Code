# 深度调研请求：userscript 的「设置面可达性 + 菜单标签随语言原地跟随 + 全量重渲染」工业级心智模型与轮子

## 背景（被调研对象的现状与约束）

被调研对象是一个 Tampermonkey / Violentmonkey 用户脚本（TypeScript 源码 + Vite 打包为**单文件** `.user.js`），它在页面上注入一个悬浮图标，点击展开一个面板；面板内有多个「视图」（国家列表 / 设置 / 诊断 / 反馈），视图间靠切换显隐，共用同一个面板容器（不新开窗口、不新开 DOM 根）。

**已知痛点（已实测，非推测）：**
1. 语言设置藏在面板的二级区域内，用户找不到入口；脚本管理器（GM）菜单里没有任何指向设置面的入口。
2. 语言控件是一个「循环按钮」：点一下 auto → zh → en → auto 轮转，三个选项**不能并列可见**，用户无法知道当前可选哪些值。
3. 切换语言后只有**部分**文案被刷新：图标 `title`、收藏行 `title`、空态文案会**漏刷**，必须重开面板才更新。原因实现上是用一个手写的 `_applyLocaleText()` 逐项赋値。
4. GM 菜单里的命令标签在切语言后**不跟随**，必须重新加载页面。

**目标：** GM 菜单补一个「设置」入口，点击后打开面板**并显式切到设置所在视图**（不能只开面板）；语言控件改为三选一显式控件；切换后全 UI 无漏刷；菜单标签免重载跟随。

## 硬约束（不得违背）

- 单文件 userscript，无构建期运行时；不得依赖任何 CDN 或外部网络请求。
- 必须同时兼容 Tampermonkey 与 Violentmonkey（Greasemonkey 4+ 与 Safari Userscripts 可选）。
- 不得引入前端框架（无 React / Vue）；纯 DOM + 原生事件。
- 不得改动既有 localStorage 键名与已有取值语义（必须向后兼容既有用户数据）。
- 不新建独立设置视图、不重排设置顺序（既有用户的空间记忆不得被破坏）。

## 需要你回答的问题

### Q1 GM_registerMenuCommand 的 `{id}` 原地更新语义
各脚本管理器（Tampermonkey / Violentmonkey / Greasemonkey / Safari Userscripts）从**哪个版本**起支持 `GM_registerMenuCommand(name, fn, { id })` 的第三个 `options` 参数？
同一 `id` 重复注册时，是「**原地更新** title 与 fn（不新增菜单条目）」还是「新增条目」？未提供 `id` 时行为如何？请给出官方文档 / 源码 / issue 依据。

### Q2 成熟方案如何从「菜单」进入「设置面」
业界（浏览器扩展、IDE、桌面应用）从菜单/命令面板进入设置面时，是「只打开容器」还是「打开容器**并切到目标视图**」？有无明确先例与口径？
「深链到设置分区 + 滚入可见区 + 短暂高亮」的成熟模式叫什么，业界怎么做？

### Q3 稳定标识符 vs 位置索引
用 `data-*` 稳定标识符定位设置分区，而不是绑内部实现名或易变排序位置，这个原则的权威依据是什么（a11y / ARIA / 路由库 / 设计系统侧）？
位置索引（nth-child、数组下标）作为深链目标为何不可靠？

### Q4 三选一互斥控件的 ARIA 正确形态
`radiogroup` + `radio`、`tablist` + `tab`、还是 `button` + `aria-pressed`？三者的取舍与可访问性后果（键盘交互、屏幕阅读器播报、表单语义）。
请给出 W3C ARIA Authoring Practices 或同等权威依据，并给出「三选一且必须全部同时可见」这一场景下的推荐选择。

### Q5 国际化「全量重渲染」策略
字典驱动扫 `[data-i18n]` / `[data-i18n-title]` / `[data-i18n-aria-label]` / `[data-i18n-placeholder]` 标记族，对比「手写函数逐项赋値」，成熟库（i18next / vue-i18n / FormatJS / Chrome extension i18n / 各扩展生态）推荐哪种？
漏刷的典型来源有哪些（title、aria-label、placeholder、动态插入节点、empty state、canvas/svg 内文本）？有哪些系统性防护手段（如 MutationObserver 补扫、渲染后统一 sweep）？

### Q6 `[hidden]` 被作者样式覆盖的陷阱
如果作者 CSS 给同一元素写了 `display:flex`，是否会压过 UA 样式表里的 `[hidden]{display:none}`？请从**特异性**与**来源优先级（cascade origin）**两个维度解释。
HTML 规范对 `hidden` 的定义是什么？标准修法有哪几种（`[hidden]{display:none!important}` / `:where([hidden])` / `hidden="until-found"`），各自取舍与浏览器支持？

### Q7 滚动入可见区 + 高亮衰减的成熟模式
「滚到目标 + 短暂高亮（flash/highlight）」的成熟做法：高亮时长经验值、`prefers-reduced-motion` 如何处理、不得只靠颜色传达信息、焦点管理（该不该抢焦点、`focus({preventScroll:true})` 的作用）。
请给出 Material / Apple HIG / W3C / MDN 级别的依据。

### Q8 反模式清单
在上述五个主题（菜单入口、深链标识、互斥控件、i18n 重渲染、视图显隐）上，业界**明确反对**的做法有哪些？

## 输出要求

1. 每个结论标注证据强度：**cited**（来自你已读的原文来源）或 **candidate**（搜索摘要级旁证，未全文阅读）。
2. 每条关键结论给 **≥2 个独立来源**；给出可点击 URL 或明确的文档标识（如规范条目号、库文档路径）。
3. 明确区分「多来源一致」与「单一来源」。
4. 附「**信息缺口**」小节：哪些问题未能找到权威依据、需要本地实验验证。
5. **不要写代码实现**，只要心智模型、取舍、来源。
6. 用中文输出。
