# Q4 行业对标调研存档 —— 字段识别覆盖面扩张

> 载体：atomcode CLI（headless，只读护栏）｜会话 id：b919e07c-7bc7-459b-920a-104a7790e5c3
> 派发：2026-09-17｜问题 verbatim 见文末附录｜自报配额：searches 10+ · full reads 5（Chromium 源码、1Password 开发者文档、Dashlane 工程博客、Bitwarden Fill Assist、Marek Toth 安全研究）
> 用途：为 Q4（B 侧能力集边界）提供工业界心智模型对标。**本文件为调研存档，不是决策**。
> 辩证性声明：结论已由编排 Agent 逐条对撞 decision-ledger（D-001…D-012）/ docs/adr / CONTEXT.md；对撞结果见 `decision-ledger.md` §待拍板。

## 执行摘要（调研自评 Confidence：① 高 · ② 高 · ③ 中）

① **没有任何主流自动填充/密码管理器做全 DOM contenteditable 语义扫描**。Chromium Autofill 只把 contenteditable 当作「合成单字段表单」处理（`FindFormForContentEditable`：connected、非 form、非 form control、父级不可编辑），候选集收敛在原生 form control 白名单；1Password 官方开发者文档明确指导「用原生 input + label + autocomplete」，并用 `data-1p-ignore` 类开关退避。

② **伪下拉：业界主流是「先登记 + 用户手动召唤，证据足够再升级自动注入」**。Bitwarden Fill Assist（2026.6.0）甚至反向收敛——对易错站点用人工核验的 CSS selector 地图**替换**启发式，且**规则失败不回退启发式**。

③ 可借鉴的未采纳心智模型：远程规则地图层 / ML 现场分类 / `data-*` 协作协议 / 可见性-可聚焦性过滤 / 「低置信不自动、手动召唤即学习」的反哺闭环。

## ① contenteditable 字段

**结论 A（高置信，两源以上）：主流自动填充不把 contenteditable 纳入常规候选集，全 DOM 扫描不存在。**
- Chromium 源码（`form_autofill_util.h/cc`，M130 tag 已核）：`IsAutofillableElement()` 白名单 = {Text, RadioButton, Checkbox, Select, TextArea} 的 form control；contenteditable 单独走 `FindFormForContentEditable()`，生成**合成的单字段 FormData**（要求 connected、父级不可编辑）。M126 起 contenteditable/textarea 才获得 caret 定位弹窗支持（Finch flag），属**渐进放开**。
- 1Password 开发者文档：官方口径是按最佳实践用原生 input，借助无障碍线索（label/for、aria）定位——即**语义控件 + ARIA 白名单**，从未承诺识别任意 contenteditable 承载的电话字段。
- 反例（社区单例，非权威）：某站给 div 加 `role=textbox` 反而让 1Password 填充失败，移除后恢复——各家在 contenteditable 上行为**脆弱且不统一**。

**结论 B（高置信）：区分「电话语义 contenteditable」与「全站富文本编辑器」靠组合判据：**

| 判据 | 电话语义 contenteditable | 全站富文本编辑器 |
|---|---|---|
| role | `role=textbox`（单行语义）| 也常见，需组合判据 |
| inputmode/autocomplete | 有 `inputmode=tel` 或 `autocomplete=tel`／`tel-country-code` 强先验 | 无或 `off` |
| 内容结构 | 单值短文本（≤4-5 字符、数字/dial code 形态）| 多段落、含 `p`/`br`/`b` 富结构 |
| 可聚焦性 | 可聚焦、tabIndex 正常、无多余工具栏 | 通常伴随工具栏/格式面板兄弟节点 |
| 周边语义 | 相邻 label/aria-label 含 country/city/phone 词汇 | 无表单周边语义 |
| 尺寸/位置 | 单字段尺寸，位于表单流内 | 大面积编辑区 |

**推荐 1**：contenteditable 支持做成**低置信档**——只对同时满足（可聚焦 + `role=textbox` 或 `inputmode=tel`/`autocomplete=tel` + 内容为短数字形态）的 contenteditable 出图标/登记，**不做自动注入；宁可漏检**。理由：Chromium 用了十余年才谨慎放开 caret 弹窗，误报成本（在富文本编辑器里弹区号面板）远高于漏检成本。

## ② 组件库伪下拉

**结论 C（高置信）：业界对非原生控件的自动注入极其克制，主流路径是「检测 → 登记 → 用户召唤 → 有证据再自动」。**
- Bitwarden Fill Assist（已核原文 + PR #19693）：人工核验的 CSS selector 规则集**替换**默认启发式；PR 明确「规则命中即 bypass heuristic qualification」「**规则失败不回退**启发式」——宁可该站不自动，也不叠加两层猜测。工业界对误报预算的明确表态：**每个新增识别形态必须证明「错的比对的少」**。
- Dashlane（已核官方博客）：ML 检测「传统表单 + pseudo-form」，但保留右键手动菜单兜底，并靠内部标注语料持续反哺。
- Marek Toth 安全研究（已核原文）：16 款浏览器/密码管理器中 11 款可被 XSS + 隐藏表单一击窃取凭据——**自动填充面越大，攻击面越大**。

**推荐 2**：伪下拉保持「登记 + 手动召唤」为默认；自动注入升级判据**量化**：
- **Precision 门槛**：站点语料上 ≥95%（参考行业把「填错字段」视为最高级 bug）；
- **误报预算**：每千站点误注入 <1 次，且误报必须可一键上报；
- **升级判据**：由「选项内容证据」裁决（选项列表出现国名/区号/dial code 词条），**而非容器结构**；
- **形态二分保留**：select-only 型走开面板 + 键盘选值；可编辑型走隐藏 input 原生 setter + 事件序列。

## ③ 尚未采纳的成熟心智模型

| 心智模型 | 业界出处 | 对本项目的适配建议 |
|---|---|---|
| **远程规则地图层**（启发式失败不硬扛，走人工核验 selector 地图，随同步/定时更新，独立于客户端发版）| Bitwarden Fill Assist / Map the Web | 调研建议采纳（**最高优先级**）：油猴难发版，远端 JSON 站点规则层 + 定时拉取 |
| **规则失败不回退启发式** | Bitwarden PR #19693 | 采纳：显式规则失败时静默退出 |
| 现场轻量分类（label/placeholder/周边文本 → 字段类型）| Dashlane SAWF | 降级采纳：不做 ML，把词典做成评分特征（已有 scoring engine，方向一致）|
| **面向站点开发者的协作协议**（`data-1p-ignore`、`data-form-type`）| 1Password / Dashlane SAWF | 采纳（低成本）：尊重退出标记 + 发布自己的 `data-fycc-*` 文档 |
| 可见性/可聚焦性过滤白名单例外 | Chromium `FILTER_NON_FOCUSABLE_ELEMENTS` + select 例外 | 已部分拥有（可见性闸门 + 视觉替换型 select 例外）|
| **手动召唤 → 学习 → 持久化的反哺闭环** | Dashlane 右键「记住该字段」 | 采纳：已有 site-rules-engine，缺「成功填充即自动登记」回路 |
| 隐藏字段不填（除特定条件外）| 1Password hidden-fields 策略 | 采纳为硬规则：`offsetParent=null`/`visibility:hidden` 的伪 select 不自动注入，只登记 |

**推荐 3（优先级排序）**：远程站点规则地图层 > 成功填充即登记的反馈闭环 > 退出协议（data-*）尊重 > 现场 ML（**不做**，用词典评分顶替）。

## ④ 明确的分歧清单（不强行统一）

1. **自动填充默认态**：Chrome 地址字段激进自动 vs 1Password 默认自动但可加确认弹窗 vs 社区安全共识建议手动填充。→ 本项目数据不敏感，可默认自动于**高置信**、低置信走手动召唤。
2. **contenteditable 是否值得做**：Chromium 已渐进支持，1Password 无承诺且社区有反例。→ 本质是成本/收益：本项目做**低置信手动档**即可，不做全扫描。
3. **规则失败回退与否**：Bitwarden 明确不回退；多数扩展默认启发式兜底。→ 建议跟 Bitwarden。

## 对比矩阵

| 实现方 | contenteditable 口径 | 非原生控件策略 | 误报控制手段 |
|---|---|---|---|
| Chromium Autofill | 合成单字段表单；候选集＝form control 白名单 | 仅原生 select/input/textarea | 白名单 + 聚焦/可见过滤 + Finch 灰度 |
| 1Password | 无承诺；依赖原生 input + label/ARIA；`data-1p-ignore` 退出 | 不识别伪下拉；靠用户手动召唤 | 可见性检查、确认弹窗、域级策略 |
| Bitwarden | 未纳入常规启发式；Fill Assist 用人工 selector 地图替换 | 人工核验规则；规则失败不回退 | 精选站点名单 + 人工 review + 6h 同步 |
| Dashlane | 扫传统表单 + pseudo-form（input 组），ML 现场分类 | ML 覆盖非标准形态；右键手动兜底 | 内部标注语料训练 + 手动召唤反哺 |
| **本项目（现状）** | **未支持**（符合行业收敛）| 取证 + 登记不注入（ADR-0004/0005）| 评分引擎 + 选项内容裁决 |

## 来源清单（12 条）

| # | 标题 | URL | 角度 |
|---|---|---|---|
| 1 | form_autofill_util.h（Chromium M130）| https://chromium.googlesource.com/chromium/src.git/+/refs/tags/130.0.6685.1/components/autofill/content/renderer/form_autofill_util.h | Official |
| 2 | form_autofill_util.cc（Chromium）| https://chromium.googlesource.com/chromium/src/+/c2b67006263eeb58bea91dd2b093a9d0df2bc5a2/components/autofill/content/renderer/form_autofill_util.cc | Official |
| 3 | [M126] Pass caret position to AskForValuesToFill() | https://github.com/chromium/chromium/commit/050bc905aaf5aaf87a33e723f962cb457633050b | Official/Currency |
| 4 | Design your website to work best with 1Password | https://www.1password.dev/web/compatible-website-design | Official |
| 5 | Fill Assist — Bitwarden | https://bitwarden.com/help/fill-assist/ | Official |
| 6 | PM-33139 Targeting Rules PR | https://github.com/bitwarden/clients/pull/19693 | Official/Currency |
| 7 | How AI Powers Dashlane Autofill | https://www.dashlane.com/blog/ai-autofill-privacy | Official |
| 8 | Marek Toth: disable autofill in password managers | https://marektoth.com/blog/password-managers-autofill/ | Criticism |
| 9 | Reddit: role=textbox 导致 1Password 填充失败 | https://www.reddit.com/r/1Password/comments/1ge32js/ | Community |
| 10 | Empirical Analysis of Privacy Threats of Browser Form Autofill（CCS 20）| https://www.cs.uic.edu/~polakis/classes/CS568/fall-2020/autofill-ccs20.pdf | Criticism/学术 |
| 11 | RTL 测试 MUI Select（mouseDown + listbox）| https://stackoverflow.com/questions/55184037/ | Community |
| 12 | Leaky Autofill (2024) | https://www.researchgate.net/publication/385420522 | Criticism |

## 调研自报信息缺口

- Firefox/Safari 内置填充对 contenteditable 的具体源码口径**未取得一手证据**（Gecko/WebKit 源码未读）；
- crbug 上 contenteditable autofill 的具体 issue 编号链未逐条核验（结论已由 M130 源码 + M126 commit 交叉支撑）；
- 各家 precision/recall 的**具体数字门槛业界均未公开**（Bitwarden/Dashlane 只公开方法论）——推荐 2 中的 95% 是基于行业惯例外推，**非引用数字**。

## 附录：派发问题 verbatim

```
某单文件油猴脚本项目（TypeScript，在任意网页识别电话国家区号字段并提供快速选择面板）需要为一轮「检测能力扩张」做行业对标。请以工业界成熟落地的心智模型为重点，给出对比矩阵与推荐，并附可引用来源。
① contenteditable 承载的输入字段（无原生 input/select）：主流浏览器自动填充与密码管理器、表单填充工具是否识别 contenteditable 承载的电话号码或区号字段？它们的候选集口径是什么（是否会全 DOM 扫 contenteditable、还是收敛在语义控件白名单）？若不做全 DOM 扫描，有哪些成熟判据能把「承载电话语义的 contenteditable」与「全站富文本编辑器」区分开（role=textbox、inputmode、autocomplete、aria 语义、可聚焦性、内容结构）？
② 组件库伪下拉（MUI/AntD/Element/react-select/Radix 等无原生 select 的下拉）：业界成熟做法是自动注入与自动填充，还是先「登记 + 用户手动召唤」再考虑自动？有无基于语料或证据的升级判据（precision/recall 门槛、误报预算）？行业在「扩大覆盖面」与「控制误报」之间如何取舍？
③ 除此之外，业界在「字段识别覆盖面扩张」上是否还有该项目尚未采纳的成熟心智模型？
要求：每条给推荐与理由；若业界存在明确分歧，如实呈现分歧而非强行统一。
```
