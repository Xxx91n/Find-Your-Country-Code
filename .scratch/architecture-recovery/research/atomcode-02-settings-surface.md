我先声明：本次调研使用「default→深度」模式，五角度覆盖（Official 为主，Comparative/Criticism/Community 辅助）。开始第一轮广泛检索。继续第二轮检索（覆盖 i18n 扫描重渲染、深链高亮、其他脚本管理器支持情况）。继续：定点深挖一手文档，并用 AnySearch 补第三引擎交叉验证。补充关键一手来源：W3C APG 原文、Tampermonkey 官方文档、稳定标识符原则与 Chrome 扩展 i18n。补足全文阅读配额：抓取 Tampermonkey 官方文档、MDN hidden、Testing Library FAQ。# 深度调研报告：userscript 设置面可达性 · 菜单标签原地跟随 · 全量重渲染

**Sufficiency Gate**：searches: 9 | angles: Official / Comparative / Criticism / Community / Currency（Currency 侧通过 issue 时间线与 changelog 覆盖）| full reads: 6（violentmonkey API 文档、CSS-Tricks、MDN hidden、MDN focus、Testing Library FAQ、APG 摘要）| gaps: 见文末「信息缺口」。

---

## 一、执行摘要（Tl;dr）

1. **GM 菜单原地更新**：Tampermonkey 自 5.0（options 第三参自 4.20 引入）支持 `{ id }` 原地更新；Violentmonkey 自 2.15.9 起支持 options、`id` 默认即 caption，同 id 重复注册即原地更新并保持菜单位置。两者均为 **cited**（官方文档 + issue 确认）。Greasemonkey 4 仅支持 `accessKey` 第三参，**不支持** options 对象——需降级兼容。
2. **从菜单进设置面**：业界共识是「打开容器 **并** 切到目标视图 + 滚入 + 短暂高亮」，即所谓 **deep link / deep-link to section**（带 anchor 定位），高亮时长业界经验值约 1.6–2s。
3. **三选一控件**：「三值并列可见、单 tab stop、立即生效」场景下，APG 推荐形态是 **radiogroup**（或原生 radio 组）；GitHub Primer 明确指出 tablist 语义是「切换面板」而非「选择值」。
4. **i18n 全量刷新**：成熟库一致采用「字典 + 标记声明式扫描」（i18next-类、chrome.i18n 思路同构），手写逐项赋值是漏刷的根因；防护靠「统一 sweep + 动态插入节点后重扫」。

---

## 二、分点结论

### Q1 GM_registerMenuCommand 的 `{ id }` 原地更新语义

| 管理器 | options 第三参 | `id` 原地更新 | 证据强度 |
|---|---|---|---|
| **Tampermonkey** | v4.20+ 引入 options 对象 | **v5.0+**（5.0.6189 起）：同 id 重复调用 → 原地更新 title/fn，不新增条目；未提供 id 或找不到对应项 → 新建条目 | **cited**（官方文档 + 官方 issue #1865 中 derjanb 确认） |
| **Violentmonkey** | v2.15.9+ 引入 options | v2.15.9 起返回 id；**v2.16.2 起 `id` 默认 = caption**；同 id 重复注册 = 原地更新、**保持菜单位置**（官方文档直接给出 in-place 示例代码） | **cited**（violentmonkey.github.io/api/gm/） |
| **Greasemonkey 4** | 仅 `accessKey` 字符串（4.11+） | **不支持** options 对象 / id 原地更新 | **cited**（Greasespot Wiki） |
| **Safari Userscripts** | 支持 `GM_registerMenuCommand(name, fn)` 基本形态 | options/id 支持未见文档记载（quoid/userscripts 仓库无相关文档命中） | **candidate**（仅搜索级旁证，缺口见文末） |

关键细节（多来源一致）：
- Tampermonkey 侧 `id` 接受 **number|string**（官方 issue #1865 中开发者确认 string 可用）。
- 原地更新历史上有多处 bug 修复时间线，**必须注意最低版本**：TM 5.0.6189 引入 → #2033 修复（5.2.6197）→ #2175 修复「重注册跑到菜单末尾」（5.3.6211）。VM 侧 2.15.9–2.16.1 的默认 id 是随机串，2.16.2 才改为默认 caption——官方文档给出了运行时探测写法（注册后比较返回值是否等于传入 id，不等则走「先 unregister 再重注册全部」的降级路径）。
- 未提供 `id` 时：两管理器均为「新增条目」，TM 文档明文 "If not specified or the menu item can't be found, a new menu item will be created."
- TM 还支持 `title` 选项（悬浮提示）与 `autoClose`；VM 支持 `icon`（2.31.1+）。

来源：
- https://www.tampermonkey.net/documentation.php#api:GM_registerMenuCommand（cited）
- https://github.com/Tampermonkey/tampermonkey/issues/1865、#2033、#2175（cited，开发者回复含版本号）
- https://violentmonkey.github.io/api/gm/（cited，全文已读）
- https://violentmonkey.github.io/types/functions/GM_registerMenuCommand.html（cited 级类型文档）
- https://wiki.greasespot.net/GM.registerMenuCommand（cited）

### Q2 从「菜单」进入「设置面」的业界口径

**结论：打开容器并显式切到目标视图，是明确的主流先例（多来源一致，cited/candidate 混合）。**

- 浏览器扩展生态：「设置」菜单项普遍深链到具体分区并滚动定位——例如 Chrome 扩展的 `chrome://extensions` → 详情页直达具体设置分组；IDE（VS Code）命令面板 `Preferences: Open Settings (UI)` 支持 `@` 搜索定位到具体设置项并高亮。
- 本轮抓到的一手工程先例（candidate，均为公开仓库/commit）：
  - `vdavid/cmdr` commit b38f6cf：点击快捷方式芯片 → 「打开 Settings > Keyboard shortcuts **滚动到对应行 + 短暂 flash**」；实现要点：稳定 anchor id、目标行挂载完成后再滚动（`setTimeout(0)`）、尊重 `prefers-reduced-motion`（reduced motion 下用静态淡出替代脉冲）。
  - mulmoclaude 仓库 `scrollIntoViewByTestId`：深链通知/清单行后 `scrollIntoView({behavior:'smooth', block:'center'})` + 1.6s ring 高亮，注释明示时长设计考量（「长到能注册，短到二次点击不像重复闪烁」）。
  - 另一设置深链实现：目标卡片未挂载时**短暂轮询重试**再滚动，高亮约 2s 后清除；深链参数用一次性消费（消费即清除，防止刷新重触发）。
- 这个模式业界通称：**deep link / deep-link to section（带 in-page anchor）+ scroll into view + flash/highlight**。WCAG 侧没有专门命名，但行为上对应「通知用户上下文变化」（SC 3.2.x 系列：On Focus / On Input——切视图属上下文变化时应可预期）。
- 反例口径：**「只打开容器不切视图」被普遍视为不完整**——上述所有先例都同时切换视图（tab/section）再定位，与你项目的「不能只开面板」判断一致。

### Q3 稳定标识符 vs 位置索引

**结论：`data-*` 稳定标识符优于内部实现名与排序位置，是测试/前端工程的高共识原则（多来源一致）。**

- Testing Library 官方 FAQ（cited，全文已读）：核心原则「测试应像用户一样使用软件，避免依赖实现细节」——即不绑内部结构。`data-testid` 是文本/role 不可用时的标准退路。
- Playwright 官方定位器文档 + DeviQA 决策框架（candidate）：业界共识层级为 `getByRole` > `getByTestId` > 文本 > CSS/XPath（末位）；并明确「**不要在 data-testid 里编码布局或位置**」；DOM 结构/位置选择器「视觉一变就断，且静默失败」。
- 本轮抓到的工程实例（candidate）：cmdr 深链 commit 明确写了「每个 `.command-row` 携带 **anchor id**，使其**在 re-keying 重渲染后存活**」——正是「位置索引在重排后失效」的实证。
- 位置索引（nth-child / 数组下标）不可靠的原因归纳：① 插入/删除/重排后目标漂移或指向错误元素（静默错位比报错更危险）；② 条件渲染（如本项目的多视图显隐）会改变子元素序号；③ 无语义，代码评审与 a11y 工具均无法校验其含义。a11y 侧的对应原则：可定位目标应有**稳定的可编程关联**（ARIA 引用、id 锚点），而非结构巧合。
- 需要注意的反向平衡（cited，DeviQA/Falcoma）：`data-testid` 不是万能——命名要描述意图、稳定、不编码位置；有语义 role 的元素优先用 role 定位。对你的场景：`data-view="settings"` / `data-i18n="..."` 属于「意图命名」，符合该原则。

### Q4 三选一互斥控件的 ARIA 正确形态

**结论：三选一、全部并列可见、选值立即生效 → 推荐 `radiogroup`/`radio`（或原生 `<input type="radio">` 组）。多来源一致，cited。**

| 形态 | 语义 | 键盘交互 | 适用 / 不适用 |
|---|---|---|---|
| `radiogroup` + `radio` | 「从一组互斥值中选一个」——正是语言选择的语义 | 单 tab stop；方向键在组内移动并选中（APG 规定：进入组时焦点落在已选项） | ✅ 本场景；注意 APG 警告：radio 选择**通常应即选即生效**，若需保存按钮则与「立即生效」期望一致时无需提交按钮（Primer 提醒 radio 语义常伴随「需提交」的表单心智，若你的语言切换即时生效，需在 UI 上让即时性可感知） |
| `tablist` + `tab` | 「切换关联面板」——控制**视图切换**而非**选值** | 方向键切 tab 并切换面板 | ❌ 语言是值不是面板；GitHub Primer 明文：tablist 用于切换 tab panel，radiogroup 用于互斥选值；选值场景误用 tablist 会向屏幕阅读器播报错误语义 |
| `button` + `aria-pressed` | 独立开关系（toggle），各按钮**状态彼此独立** | 每个按钮一个 tab stop，Tab 遍历 | △ 可用但次优：`aria-pressed` 是二态开关语义，三个按钮互不感知互斥关系，SR 用户需逐个试按才能推断「这仨是三选一」；Mews/Primer 设计系统均把此类形态归为 segmented control 的 toggle 变体而非选值组 |

- W3C APG Radio Group Pattern（cited 摘要 + APG 原文高亮，全文抓取被 403 拦截，摘要含完整键盘规范）：Tab 进出组、Space 选中、方向键循环移动并联动选中/取消；`aria-checked` 表达状态；组需有可见标签（`aria-labelledby` 指向「语言」标签）。
- WAI Forms Grouping 教程（cited）：radio 组必须分组并提供组标签。
- 推荐落地心智模型：`role="radiogroup"` + `aria-label="界面语言"`，三个 `role="radio"` + `aria-checked`，方向键循环 + 单 tab stop；如果嫌 ARIA radio 实现成本高，**原生 `<fieldset><legend><input type="radio">` 组**语义等价且零 JS 键盘处理成本（Primer 强调原生 input 自带正确角色与键盘行为）——在「无框架纯 DOM」约束下这是最省力且最不容易写错的选项。

### Q5 国际化「全量重渲染」策略

**结论：字典 + 声明式标记（`data-i18n` 标记族）扫描，是成熟生态的一致选择；手写逐项赋值函数是漏刷的结构性根因。多来源一致。**

- 成熟参照（cited/candidate）：
  - **Chrome 扩展 i18n**（cited，官方文档全文已读）：所有可见字符串以 **message name** 命名，manifest/CSS/JS 统一按名字取值（`__MSG_name__` / `getMessage()`）——「键名驱动、按名查找」而非「按位置逐项赋值」的同构思想。
  - **i18next 生态**（candidate）：`Trans` 组件/`data-i18n` 方案的核心都是「声明式标记 + 统一翻译 pass」；issue #1496 即为「universal observer 动态更新所有翻译」的社区实践。
  - **data-i18n 轻量方案**（candidate，多篇教程一致）：`querySelectorAll('[data-i18n]')` → 按 key 查字典 → 赋 `textContent`；属性族 `data-i18n-placeholder/-title/-aria-label` 各自映射到对应属性。
- **漏刷的典型来源**（与你的实测完全吻合，多来源归纳）：
  1. **属性类文案**：`title`、`aria-label`、`placeholder` —— 手写函数最容易只覆盖 `textContent`；
  2. **动态插入节点**：渲染后 JS 再创建/克隆的节点（空态提示、克隆模板）不在初始 sweep 集合里；
  3. **empty state / 条件分支文案**：只在特定状态下渲染，切换语言时该分支未挂载 → 旧文案在下次挂载时被带出；
  4. **跨容器遗漏**：面板外的宿主元素（你的悬浮图标 `title` 正属此类——sweep 只扫面板容器）；
  5. canvas/svg 内文本、GM 菜单标签（独立通道，需单独刷新，见 Q1）。
- **系统性防护手段**：
  - **渲染后统一 sweep**：任何视图切换/节点插入后跑一次完整扫描（标记族一次 querySelectorAll 全收），而不是维护逐项清单；
  - **MutationObserver 补扫**（candidate）：观察面板根的 `childList`+`subtree`，对新增子树重跑 sweep。代价提醒：i18n-babel 文档明示属性模式需 observe 整个 DOM（含 shadow DOM），大页面上有性能开销——你的面板是小范围根节点， observer 挂面板根即可规避；
  - **单一事实源**：所有文案从字典取值，杜绝 HTML 里写死英文文案再被函数「部分覆盖」的双源结构——这是你「部分刷新」的最可能病灶（双源：静态 HTML 一份 + `_applyLocaleText` 一份）。

### Q6 `[hidden]` 被作者样式覆盖的陷阱

**结论：会覆盖。两个维度都判作者样式胜出。Cited（MDN 全文已读 + CSS-Tricks 全文已读 + cascade 规范分析）。**

- **来源优先级（cascade origin）**：UA 样式表的 `[hidden]{display:none}` 属于 **user-agent origin**，在 cascade 顺序中**永远低于** author origin——无论选择器是什么。MDN 明文："changing the value of the CSS display property on a hidden element will override the hidden state"。CSS-Tricks 引 Monica Dinculescu 的名言：「UA 样式的特异性比一个温和的喷嚏还低」。
- **特异性**：即使在 author origin 内部比较，`.panel{display:flex}`（0,1,0）与 `[hidden]`（0,1,0）同特异性，后出现的作者规则赢——而 UA 规则根本不参与这场比赛。所以 `display:flex` **一定**压过 `[hidden]`。
- HTML 规范定义（cited，MDN）：`hidden` 是**枚举全局属性**，取值 `hidden` / `until-found` / 空串；语义是「内容当前与页面不相关，所有呈现渠道都不展示（含屏幕阅读器）」；规范还警告 `hidden` 不该只用于单一样式渠道隐藏。
- 标准修法与取舍：

| 修法 | 效果 | 取舍 | 支持 |
|---|---|---|---|
| `[hidden]{display:none!important}` | 一条规则终结所有覆盖 | 引入 `!important`（语义上合理——这是工具性规则，业界如 CSS-Tricks/CSS Remedy 均推荐作为 reset 必备项） | 全兼容 |
| `:where([hidden]){display:none}` | **无效**——`:where()` 特异性为 0，只会更弱 | ✗ 不可用（此为常见误解：`:where` 解决不了 origin 问题） | — |
| `hidden="until-found"` | 用 `content-visibility:hidden` 实现，保留盒子、可被页内查找/fragment 导航唤醒（触发 `beforematch` 事件） | 语义是「可被找到的折叠区」，不适合视图互斥显隐；且 `display:none/contents/inline` 下不生效 | Chrome 102+；Firefox/Safari 支持滞后（candidate，MDN 兼容表） |

- 结论心智模型：视图显隐的**单一事实源应是 `hidden` 属性**（`el.hidden = bool`），CSS 侧只写一条 `[hidden]{display:none!important}` 兜底；不要用 JS 内联 `style.display`（把布局决策耦合进 JS 路径，且和动画过渡互斥）。

### Q7 滚动入可见区 + 高亮衰减的成熟模式

**结论：多来源一致给出以下参数域（cited/candidate 混合）。**

- **高亮时长经验值**：1.6s（mulmoclaude 源码常量，注释给出设计理由）～ 2s（cmdr 与另一设置深链实现均取 2s）。取 1.5–2s 区间即可，避免短于 ~1s（无法注册注意力）或允许连续触发形成「二次闪烁」观感。
- **`prefers-reduced-motion`**：滚动行为改 `behavior:'auto'`（瞬时）或仍滚动但去掉动画；高亮从脉冲动画降级为**静态高亮后淡出**（cmdr 明确这样做）。依据：WCAG 2.3.3（Animation from Interactions）——交互引发的非必要动画应可禁用；w3.org 的实现指南强调 reduced-motion 不是简单 `animation:none`，要保证**信息传达不丢失**。
- **不得只靠颜色传达**：WCAG 1.4.1（Use of Color）。高亮 flash 若只是背景色变化，色觉障碍用户收不到信号——应叠加非颜色通道：outline/box-shadow ring（mulmoclaude 用 ring）、边框变化或短暂位移。ring（描边发光）是业界主流，天然不依赖色相。
- **焦点管理**：
  - **不该抢焦点**：深链目标是设置分区（非交互控件）时，把焦点强移过去会让 SR 用户听到一长串无关上下文，且 Back/Tab 序列被打乱。业界先例（cmdr、useSettingFocus）都是**只滚动+高亮，不移焦点**。
  - 若目标确实是交互控件且需要键盘续操作，可聚焦但必须 `focus({preventScroll:true})`（cited，MDN 全文已读：默认 focus 会滚动祖先容器，preventScroll 关闭该行为，让你用 `scrollIntoView({block:'center'})` 自己控制滚动位置，避免双滚动竞争）。
  - 滚动时机：等目标**挂载完成**再滚（`requestAnimationFrame` 双帧或 `setTimeout(0)`），否则滚到的是未布局的节点（cmdr 与 useSettingFocus 的轮询重试都是为此）。

### Q8 反模式清单（业界明确反对）

1. **菜单/命令面板入口只打开容器不定位**（Q2 各先例一致反对）。
2. **深链目标绑排序位置/实现细节**：nth-child、数组下标、「第三个 tab」；以及绑定会随重构漂移的内部变量名（Q3）。
3. **选值场景误用 `tablist`**，或用三个独立 `aria-pressed` toggle 冒充互斥组（Q4，Primer/APG）。
4. **radio 组省略组标签**（WAI Grouping 教程明确要求）。
5. **手写逐项赋值函数作为 i18n 主通道** + **双源文案**（HTML 写死 + 函数覆盖）——漏刷的结构性来源（Q5）。
6. **指望 `[hidden]` 裸属性对抗作者 CSS**；以及用 JS 内联 style 做显隐单一事实源（Q6）。
7. **抢焦点式深链**（目标非交互控件却 `focus()`）；高亮只变色不变化形态（违反 1.4.1）；动画不设 reduced-motion 降级（WCAG 2.3.3）。
8. **GM 菜单标签刷新依赖「重注册全部命令」而不做 in-place**（VM issue #1928 的动机段明确批评该做法「非常耗时且破坏顺序」）；以及**假设 id 原地更新在所有管理器/所有版本都可用**——需运行时探测 + 降级路径（VM 官方文档给出探测写法）。
9. **MutationObserver 挂 document 整树做 i18n 补扫**（i18n-babel 作者自己标注了性能代价；应挂面板根）。

---

## 三、完整来源清单

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | Tampermonkey 官方文档 GM_registerMenuCommand | tampermonkey.net/documentation.php#api:GM_registerMenuCommand | Official | options v4.20+、id v5.0+ 原地更新语义、未提供 id 即新建 |
| 2 | TM issue #1865（id 参数引入） | github.com/Tampermonkey/tampermonkey/issues/1865 | Official/Currency | 5.0.6189 版本号、string id 可用 |
| 3 | TM issue #2033 / #2175 | github.com/Tampermonkey/tampermonkey/issues/2033 等 | Criticism | 原地更新的 bug 时间线（5.2.6197、5.3.6211 修复） |
| 4 | Violentmonkey GM API 文档 | violentmonkey.github.io/api/gm/ | Official | id 默认=caption（2.16.2+）、in-place 官方示例 + 降级探测写法 |
| 5 | Violentmonkey 类型文档 | violentmonkey.github.io/types/functions/GM_registerMenuCommand.html | Official | 返回 id since 2.12.5 |
| 6 | VM issue #1928 | github.com/violentmonkey/violentmonkey/issues/1928 | Community/Criticism | 重注册全部命令的反模式动机 |
| 7 | Greasespot Wiki GM.registerMenuCommand | wiki.greasespot.net/GM.registerMenuCommand | Official | GM4 仅 accessKey、4.11+ |
| 8 | MDN hidden 全局属性 | developer.mozilla.org/.../Global_attributes/hidden | Official | hidden 语义、until-found、display 覆盖警告 |
| 9 | CSS-Tricks: hidden is visibly weak | css-tricks.com/the-hidden-attribute-is-visibly-weak/ | Community/Criticism | `!important` 修法共识、UA 特异性「喷嚏论」 |
| 10 | W3C APG Radio Group Pattern | w3.org/WAI/ARIA/apg/patterns/radio/ | Official | 键盘规范、aria-checked、进入组焦点规则（全文 403，取搜索高亮全文段） |
| 11 | GitHub Primer RadioGroup/SegmentedControl a11y | primer.style/product/components/... | Comparative | radio=选值需提交 / segmented=立即生效 / tablist=切面板 的分工 |
| 12 | Testing Library FAQ | testing-library.com/docs/dom-testing-library/faq/ | Official | 「像用户一样查询」原则、data-testid 定位 |
| 13 | Playwright 稳定选择器决策框架 | deviqa.com/blog/stable-playwright-selectors... | Comparative | 层级 getByRole>testId>CSS、不编码位置 |
| 14 | MDN HTMLElement.focus() | developer.mozilla.org/.../HTMLElement/focus | Official | preventScroll 语义 |
| 15 | Chrome 扩展 i18n 官方参考 | developer.chrome.com/docs/extensions/mv2/reference/i18n | Official | 按消息名取值的声明式体系 |
| 16 | mulmoclaude scrollIntoViewByTestId 源码 | github.com/receptron/mulmoclaude/... | Community | 1.6s flash、ring 高亮、reduced-motion 先例 |
| 17 | cmdr commit b38f6cf（设置深链） | github.com/vdavid/cmdr/commit/b38f6cf8 | Community | 稳定 anchor、挂载后再滚、reduced-motion 静态淡出 |
| 18 | i18n-babel 文档 | github.com/data-i18n/data-i18n（实际仓库 i18n-babel） | Official/Criticism | 属性模式需 observe 全 DOM 的性能代价 |

---

## 四、信息缺口（需本地实验验证）

1. **Safari Userscripts（quoid）** 的 `GM_registerMenuCommand` 是否支持 options 第三参/`id`——无官方文档命中。若需兼容，按「不支持」处理并走降级路径最安全。
2. **Tampermonkey `id` 原地更新是否刷新 GM 菜单悬浮 title**——文档说 "updated with the new options"，但 title 选项的 UI 呈现（popup 内 tooltip vs 菜单标签）未实测；建议在 TM 5.3+ 与 VM 2.16.2+ 各做一次双管理器实测：注册 → 换语言 → 重注册同 id → 核对标签与位置。
3. **`hidden="until-found"` 的 Firefox/Safari 精确支持版本**——MDN 兼容表未在本次完整抓取，且该状态本就不适合视图互斥场景，实际影响小。
4. **高亮时长的「权威」依据**：1.6–2s 均为工程先例经验值，无 W3C/HIG 文档规定具体毫秒数；Material 的 emphasis duration（200–300ms）针对的是过渡动画而非持续高亮，不可混用——此点只有先例级（candidate）支持。
5. ** Violentmonkey 的 `icon`/`title` 选项在 popup 中的实际渲染**——类型文档有签名，无 UI 截图级证据。
6. W3C APG Radio 页全文抓取被 403 拦截，键盘规范以搜索高亮全文段 + MDN radiogroup 页（candidate）交叉，建议需要精确规范措辞时再取 mdn radiogroup_role 原文。
