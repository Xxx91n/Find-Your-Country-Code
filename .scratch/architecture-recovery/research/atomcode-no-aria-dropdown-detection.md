# atomcode 调研纪要 — 无 ARIA 手写自定义下拉的候选发现与收敛

> 票 29（A-003）| 2026-09-12 | 串行护栏：本会话仅此 1 次调研在途
> 调研问题（原文）：浏览器自动填充与密码管理器在识别无 ARIA 语义的手写自定义下拉（div 触发器 + ul/li 选项面板，无 role=combobox）时，如何在不产生误报爆炸与性能爆炸的前提下做候选元素发现与收敛？
> 本报告为调研纪要；结论在票 29 窗口报告 §3 采用，实现见该报告 §4。

## 一、候选发现：行业全部收敛在语义控件白名单

1. **Firefox**：候选集就是一条 `autofillFieldSelector(doc) { return doc.querySelectorAll("input, select") }`，`isFieldEligibleForAutofill` 只放行 `["text","email","tel","number"]` 并排除 `autocomplete="off"`。div 触发器物理上不可达。（commit c99e343，2017-05-08）
2. **Chromium**：候选集 = 真实 `<form>` 内控件 + 未关联表单控件（input/select/textarea），`FormStructure::ParseFormFields` 只对表单控件做类型预测，且有最小字段数门槛 `kRequiredFieldsForPredictionRoutines`。（form_structure.cc）
3. **Dashlane**：「searching for form tags and their associated input fields」，随后才做上下文提取与分类；要求 `role="form"` 兜底自定义元素。（官方博客 2023-08-24）
4. **Bitwarden**：自定义字段走属性降级链 `id → name → label → aria-label → placeholder`，**不扫描 div 结构**。（社区 15926）
5. **实证：语义缺失 → 不发现**。Vuetify `v-select` 在 Chrome 70 自动填充「nothing happens」（vuetify#5936）；Bitwarden 用户对 SAP 自研 div 下拉全属性链命中仍无法选中值（社区 15926）。**两条独立信源交叉验证。**
6. Shadow DOM 是候选集扩展的唯一例外路径（Chromium `kAutofillIncludeFormElementsInShadowDom`，Dashlane 2022 起有限支持），但扩展对象仍是**真实表单控件**，不是 div 面板。

## 二、收敛：多层瀑布 + 内容验证

7. Chromium 三层瀑布：`autocomplete` token 最高优先 → 启发式加权 `BestHeuristicType` → 服务端 crowd-sourced 预测覆盖本地启发式；`<select>` 另有选项文本内容验证。
8. Firefox 同样内容驱动：`<select>` 的 country/state 预测基于选项内容（Bug 1360370 Part 3），后又加「邻近 `<select>`」邻居启发式（Bug 1836458，FF 116）。**注意方向**：是「先证邻居文本字段再找相邻 select」，不是「先找 div 再证它是下拉」。
9. 官方锚点：WHATWG `autocomplete` 明细 token（含 `country`/`country-name`/`tel-country-code`）与 MDN 清单交叉验证；**隐藏 input 允许带明细 token**（禁止 on/off 关键字）——这是「视觉替换型」自定义下拉被官方认可的承载语义通道。

## 三、误报与性能控制

10. **误报前车之鉴**：Bitwarden `login` 子串匹配把 `last_login` 日期框误挂 UI（bitwarden/clients#20320）——**子串匹配必炸**；Chromium 负模式必须全属性生效（c990531）。
11. **性能控制**：Chromium 事件驱动按需解析 + `kAutofillHandlerMaxFormCacheSize=100` 缓存上限；Dashlane 重分析防抖 + iframe 独立提取。**都不是靠全 DOM 扫描。**

## 四、语义层的官方出路

12. `appearance: base-select`（Chrome 135，2025-03-24）：原生 `<select>` 全 CSS 可定制（`::picker(select)`/`:open`/`::checkmark`），JS 接口不变、可访问性保留、自动填充照常；Safari 27 起提供。渐进增强——不支持时退化为原生弹层。**官方结论：别再写 div 下拉。**

## 五、对票 29 的采用 / 不采用

**采用**
- 形态描述符匹配：`div/span[tabindex="0"]`（可聚焦非表单容器），**绝不做全 DOM div 扫描、不放裸 `ul li`**。
- 收敛靠选项文本内容验证（`(+NN)` 区号模式即 L3 证据口径），内容证据作门槛。
- 档位：登记门槛 ≥ `ITI_LOW_REGISTER_SCORE`(25) 而注入档位 cap 在 none —— 与密码管理器「识别失败 → 手动兜底」同构（hidde.blog / Dashlane / ADR-0005 三方一致）。
- 误报侧：子串匹配必炸（Bitwarden #20320）→ 沿用既有 `matchLatin` 词边界纪律；负模式全属性生效。

**不采用**
- 服务端/ML 预测（无基础设施，CONTEXT.md 未采纳该心智）。
- 全量 DOM 遍历 / 宽 `ul li` 选择器（候选爆炸 + 误报）。
- `contenteditable` 候选（无语料地基，且会捞到所有富文本编辑器；登记为偏离点 D-29d）。

## 六、来源清单（调研全文按 URL 溯源）

| # | 标题 | URL | 角度 |
|---|---|---|---|
| 1 | The `<select>` element can now be customized with CSS | developer.chrome.com/blog/a-customizable-select | Official/Currency |
| 2 | autocomplete HTML attribute（MDN） | developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/autocomplete | Official |
| 3 | Custom fields: drop-down menu（Bitwarden 社区） | community.bitwarden.com/t/…/15926 | Community |
| 4 | Autofill heuristic false positive（bitwarden/clients#20320） | github.com/bitwarden/clients/issues/20320 | Criticism |
| 5 | Making password managers play ball with your login form | hidde.blog/… | Community |
| 6 | Sign-in form best practices | web.dev/articles/sign-in-form-best-practices | Official |
| 7 | Best Practices for Web Development…（Dashlane） | dashlane.com/blog/… | Official/Comparative |
| 8 | Bug 1360370 Part 3: select country/state 启发式 | github.com/mozilla-firefox/firefox/commit/c99e343… | Official |
| 9 | Improve formautofill province/state/region detection | bugzilla.mozilla.org/show_bug.cgi?id=1836458 | Official |
| 10 | Form Autofill（Chromium 设计文档） | chromium.org/developers/design-documents/form-autofill/ | Official |
| 11 | Browser autofill doesn't work with v-select | github.com/vuetifyjs/vuetify/issues/5936 | Criticism |
| 12 | form_structure.cc | chromium.googlesource.com/…/form_structure.cc | Official（源码） |
| 13 | autofill_handler.cc | chromium.googlesource.com/…/autofill_handler.cc | Official（源码） |
| 14 | WHATWG §4.10.19.7 Autofilling form controls | html.spec.whatwg.org/multipage/form-control-infrastructure.html | Official（规范） |
| 15 | Autofill in ShadowDOM（blink-dev I2S） | groups.google.com/…/RY9leMu5hI | Official/Currency |

**信息缺口**：1Password/LastPass 无公开源码（仅行为证据）；`kRequiredFieldsForPredictionRoutines` 具体数值未核实；base-select 的 Safari/Firefox 时间线为二手引述。
