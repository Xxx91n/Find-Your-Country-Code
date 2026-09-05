# Spec：Find-Your-Country-Code 检测引擎与跨站适配重构

> 依据 to-spec（综合既有调研，不再访谈）| 日期：2026-09-03
> 输入：report/architecture-review.md（用户候选遴选：Top 推荐 C1+C2 捆绑先行）+ research/ 五份调研
> 测试缝检查：复用最高缝 `Detect.scan`（DOM 进 → 评分出）与 `Fill.run`（字段+国家 → 行为出），新增内部缝 `scoreElement`（纯函数）。不新增跨模块 seam（理想缝数为 1：模块入口 detect/fill）。
> 偏离声明：grilling 问答由"目标原文 + 调研证据"替代（WORKFLOW 偏离点 D3/D4），用户确认点集中于候选遴选与偏离点清单。

## Problem Statement

用户在任意网页填写手机号时，需要手动找到国家区号选择控件。Find-Your-Country-Code 想在任何网页自动识别区号字段并提供快速选择面板，但现实是：大部分网站上脚本检测不到字段（功能不生效）；而在另一些与区号无关的字段上（称呼前缀、固话本地区号、纯数字枚举 select、国家选择器等）却出现了 🌐 图标（误检测）。根子是检测为布尔命中（关键词命中即注入），没有置信度分级，且缺少 Shadow DOM、框架组件库、autocomplete 标准信号三大覆盖。

## Solution

把脚本从"单文件布尔检测器"升级为"多信号加权评分引擎 + 分级行动 + 模块化工程"：识别结果从"是/否"变为"评分+信号明细"，高分自动注入图标、中分低调注入、低分不注入并提供用户手动召唤与负反馈回路；同步补齐 Shadow DOM 穿透、iti 版本适配（v16–v29）、框架安全注入，并把工程迁入 vite-plugin-monkey 模块化结构（产物仍为单 .user.js，GreasyFork 发布链不变）。

## User Stories

1. 作为在任意网站填手机号的用户，我希望脚本在含 `autocomplete="tel-country-code"` 的标准字段上自动识别，这样我不用手动展开区号下拉。
2. 作为在 React 网站填手机号的用户，我希望选中区号后电话输入框真实更新（React 受控组件状态同步），这样提交时号码带区号。
3. 作为在带 Shadow DOM 组件的网站填手机号的用户，我希望脚本穿透 open shadow root 检测区号字段，这样现代组件库网站也能用。
4. 作为遇到"称呼前缀 Mr./Ms."输入框的用户，我不希望看到 🌐 图标，这样页面不被无关图标污染。
5. 作为填中国固话"区号+号码"分格表单的用户，我不希望区号格被当成国际区号字段注入图标，这样避免语义错位。
6. 作为面对纯数字枚举 select（如"1-3 个月内"）的用户，我不希望出现图标，这样误报不再发生。
7. 作为面对国家选择器（选国家而非区号）的用户，我希望图标行为可预期（面板明确标示"国家/区号"两种语义且默认只在高置信时注入），这样我不会困惑图标含义。
8. 作为使用 intl-tel-input v16–v29 任意版本网站的用户，我希望脚本注入的按钮能正确联动该插件选择国家，这样老站新站都能填。
9. 作为误报受害用户，我希望在面板上点"这不是区号字段"后脚本记住该站点模式，这样下次不再打扰。
10. 作为希望全站禁用的用户，我希望在面板设置里按域名豁免，这样我拥有最终控制权。
11. 作为脚本维护者，我希望检测逻辑是纯函数（DOM 元素 → 评分+信号明细），这样我能用 Playwright 对每个误报/漏检样本写回归用例。
12. 作为脚本维护者，我希望工程模块化（detect/fill/ui/store/data/rules）且构建产物仍是单 .user.js，这样 GreasyFork 发布与手动安装链路完全不变。
13. 作为多窗口协作者，我希望每张票只触碰自己的模块目录，这样 GitButler 并行分支互不冲突。
14. 作为 SPA 用户，我希望路由切换后新出现的表单字段被重扫检测，这样单页应用不漏检。
15. 作为被框架复用 DOM 节点影响的患者，我希望字段判定在元素属性指纹变化后可重评估，这样图标不残留也不漏挂。
16. 作为使用 Vue/Angular 网站的用户，我希望程序化赋值通过原生 setter + input/change/blur 事件序列完成，这样响应式框架状态同步。
17. 作为中置信度场景的用户，我希望图标以低调样式出现且可配置，这样高置信与猜测场景体验分层。
18. 作为低置信度场景的用户，我希望图标默认不出现但可从面板手动召唤检测，这样功能可发现但不打扰。

## Implementation Decisions

- **评分引擎**：五层信号瀑布 L0 autocomplete/inputmode token（`tel-country-code`/`country`/`country-name`/`tel` 最强）→ L1 词表/label/placeholder/name/id 加权（歧义词如 `prefix`、`区号` 单独降权组）→ L2 锚→目标关联（同 form 邻域内 `input[type=tel]` 主号与已识别国家字段互证加分，孤立字段减分）→ L3 select options 内容验证（`+数字`/`00数字`/ISO2/国家名分布占比）→ L4 排除词负分（现有 SELECT_EXCLUDE_KW 负分制）。输出 `{score, signals}`。
- **分级行动**：阈值高/中/低三档映射注入样式（自动/低调/不注入+手动召唤）；阈值可配置。
- **模块化**：`detect`（评分引擎）、`fill`（iti/select/input 三策略 + 适配层）、`ui`（面板/toast/图标）、`store`（GM 收藏+站点规则）、`data`（国家数据）、`rules`（站点规则引擎）；TS + vite-plugin-monkey，产物单 .user.js。
- **iti 适配层**：`getInstance` 稳锚 → 能力探测（方法双名 setSelectedCountry/setCountry、属性 el.iti、dataset id、jQuery、DOM 点击双代类名）→ 兜底赋值。v16–v29 覆盖以 atomcode 版本矩阵为验收基准。
- **扫描机制**：递归穿透 open shadowRoot；每个 shadow root 单独 MutationObserver；`_done` 改指纹快照（属性变化重评）；SPA 路由 hook（pushState/replaceState/popstate）触发定向重扫。
- **注入安全**：INPUT/SELECT/TEXTAREA 统一走 `HTMLxxElement.prototype` 原生 value setter + `input→change→blur` 事件序列。
- **站点规则引擎**：GM 存储站点级规则（豁免域名 / 强制选择器 / 置信度覆盖）+ 面板负反馈入口。
- **国家数据**：保留现有 COUNTRIES 表为基准；标记为"后续可用 libphonenumber-js 元数据构建期校验"的改进项（不阻塞本 spec）。
- 不含具体文件路径与代码片段（遵循 to-spec 模板约束）；模块间接口形态在票内细化。

## Testing Decisions

- 好测试只测外部行为：注入图标出现与否、面板开合、填充后的最终值与事件序列，不测内部评分数字。
- 测试模块：detect（误报样本不插图标 + 正样本插图标）、fill（三种 kind 的填充终态与事件）、rules（豁免生效）、适配层（iti 场景联动）。
- Prior art：test/ 现有 3 个手工测试页（场景 A–E：原生 select / input / intl-tel-input / 动态注入 / 综合表单）升级为 Playwright fixture；误报样本（本 spec User Stories 4–7）各建一条回归用例。
- E2E 优先（jsdom 对 getComputedStyle/BroadcastChannel/iti 真实行为覆盖不足）。

## Out of Scope

- 组件库伪-select（MUI/AntD/Element-Plus role=listbox 等）识别（C6，Speculative，证据不足）。
- ML/AI 字段识别（需模型或服务端，不符合单文件油猴约束）。
- closed shadowRoot 穿透（油猴环境无 chrome.dom API；attachShadow monkey-patch 属实验性，仅记录为 future work）。
- Firefox/Greasemonkey 专项兼容（当前以 Tampermonkey 为准）。
- 国家数据的全面重生成（仅做基准保留与数据校验工具的可行性记录）。
- 多语言 UI 扩展（保留现有 zh/en 双语）。

## Further Notes

- 行业对标结论与证据链见 research/atomcode-industry-models.md（Chromium 分类优先级链 / Bitwarden-KeePassXC 三段式 / iti v16–v29 矩阵 / React-Vue 注入共识 / Shadow DOM 穿透实践），全部多源交叉验证。
- 用户痛点与候选依据见 report/architecture-review.md；误报/漏检代码级路径（含行号）见 research/misdetection-root-causes.md。
- 发布链路现状：GitHub Actions 在 src 主文件变更时自动以 @version 打 tag 发 Release（observed：.github/workflows/release.yml）——模块化后产物路径变更需同步该 workflow。
- 版本控制、波次推进、验收纪律遵循 WORKFLOW（.scratch/architecture-recovery/WORKFLOW.md）。
