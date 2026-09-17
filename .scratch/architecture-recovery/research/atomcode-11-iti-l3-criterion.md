# atomcode 深度调研记录 — 票 11（ITI 形态下 L3 的正确可观测判据）

> 载体：atomcode 5.0.9（52ca5e6）无头模式 `--prompt-file`（串行护栏：同一时刻 1 个在途）
> 会话：06894dec-689c-4b38-ab6c-5aaec12b3bb9 ｜ 退出码 0 ｜ 原始 stdout 15.1KB（已由 ctx 自动索引）
> 日期：2026-09-17 ｜ 覆盖：A-035
> 数据源纪律：本节结论来自 atomcode 调研 + 本仓库实物核对；外部事实按 observed / cited / reproduced / candidate 标注。

## 调研问题（verbatim，未附加角度提示）

见 `prompt-11-atomcode.md`（原文）。核心：intl-tel-input 在被外部代码通过它的官方实例 API 编程式地切换国家、或写入号码之后，官方语义到底保证发生什么；哪些是可被外部观察者读到的国家状态；会不会派发标准 DOM 事件；在「只准用浏览器侧外部可观测事实」约束下，「已成功设置为指定国家」的正确可观测判据是什么。

## Sufficiency Gate（atomcode 自查）

searches 5（Official ×2 / Community ×2 / Comparative·Currency ×1）| angles：Official / Community / Currency | full reads 8（intl-tel-input.com/docs/methods · /docs/best-practices · /docs/options · GitHub 源码 intlTelInput.ts(master) · CHANGELOG.md · v29/v25/v24/v23/v22/v21 release notes · issue #1374 / #361 摘要）| 三引擎交叉（Exa / Tavily / AnySearch）| **总体 Confidence：高**；自报缺口见 §4。

## 1 执行摘要（atomcode 原文要点，cited）

1. **没有任何承诺把「所选国家的区号」写进 input.value** —— 区号写不写完全取决于已有 value 的形态。官方保证的只是：`setNumber` 会「插入号码并据此更新所选国家」；`setSelectedCountry` 只会在**已有值以 + 开头时**替换其中的旧区号，或在格式化开启时重排已有数字。
2. 编程式切国后，外部可读的稳定状态是 **input 的 placeholder**（utils 已加载时）与 **DOM 结构里的选中项**（v21 前 `.iti__selected-flag`，v21 起 `.iti__selected-country`，v29 后 selector 词汇全面改名）；官方承诺的读取途径是实例方法 `getSelectedCountry()`（v24 前 `getSelectedCountryData()`）。
3. 会派发自定义事件 **`countrychange`**（v17 起；setNumber / setSelectedCountry 均触发），**从不派发原生 `change`**；`input` 事件仅在用户键入时原生触发。
4. 自动化测试的正确判据：① 官方实例 API `getSelectedCountry().iso2`；② DOM/事件约束下的次级判据 —— `countrychange` 事件、`getNumber()` E.164 归一化；**不是**断言 value 里出现区号。

## 2 本地裁决（cited → 本票实现）

采纳 atomcode 结论 4 的①+②，并把「次级判据」升级为**独立读取路径的交叉核验**（本仓库口径）：

| 层 | 读取路径 | 本票定位 |
|---|---|---|
| ① 官方读 API | `intlTelInputGlobals|intlTelInput`.getInstance(el) → `getSelectedCountryData()`（v24 前）/ `getSelectedCountry()`（v24+）→ `.iso2` / `.dialCode` | ITI 判据主路径 |
| ② DOM 选中态 | 国家选择器（`.iti__selected-country` / `.iti__selected-flag` / `.selected-flag`）的 `data-country-code` / `.iti__flag` 类名 `iti__<cc>` / `title` 的 `: +NN` | 独立读取路径（不经官方读 API，可交叉核验） |
| ③ 用户可见区号 | `.iti__selected-dial-code` 文本（separateDialCode 模式） | 区号退路（iso2 不可读时） |
| ④ 事件面 | `countrychange`（官方广播） | ITI 形态的事件面判据 |

**放弃的候选**（均在本仓库实测下被否决，reproduced）：
- 「宿主 `input.value` == 区号」：separateDialCode 模式下必然为空（假红）；默认模式下又可能恰好等于区号（假绿）；且本仓库自己的 DOM 兜底 `dispatch(country.code)` 也能往 value 写区号而 ITI 选中态未变 —— **既不可靠也不健全**。
- 「原生 `input` / `change` 各 ≥1」：ITI **从不**派发原生 change（两模式实测均为 0），属**不可满足**的断言。
- 「`getNumber()` E.164 回读」：仍是实例方法，不提供比 `getSelectedCountry()` 更多的信息，且依赖 utils 已加载；未采纳为独立判据。

## 3 与本地实测的辩证差异（本仓库钉版 intl-tel-input@18.2.1，reproduced）

atomcode 结论 1 的表述是「**不**承诺」，本仓库实测进一步收紧为「**在 separateDialCode 模式下必然不写**」：

| 模式 | 动作 | input.value | 选中态 | countrychange | 原生 input/change |
|---|---|---|---|---|---|
| 默认 | `setNumber('+86')` | `"+86"` | cn/+86 | 触发 | 无 |
| 默认 | `setSelectedCountry('cn')`（空值） | `""` | cn/+86 | 不触发（未变更） | 无 |
| 默认 | `setNumber('+447733123456')` | `"07733 123456"`（国家格式，**无区号**） | gb/+44 | 触发 | 无 |
| **separateDialCode** | `setNumber('+86')` | **`""`** | cn/+86 | 触发 | 无 |

⇒ 「value == 区号」在默认模式下可能**假绿**、在 separateDialCode 模式下**假红**；「原生 input/change」在两种模式下都**恒为 0**。两个判据在 ITI 形态下均不成立，与本票判定一致。

## 4 信息缺口（atomcode 自报 + 本仓库补充）

- atomcode：未逐行展示 master 中 `setNumber()` 的完整实现体（只确认文档语义与相邻 `#updateDialCode` / `#setTelInputValue` 源码）。
- atomcode：v16–v20 各版本逐条 release notes 未全部打开（已覆盖 v21–v29；v17 行为由 issue #361 佐证）。
- atomcode：合成 `input` 事件是否进入 2026-04 之后首个正式 release 的具体 patch 号未对照 tag diff。
- 本仓库补充：真实站点层现有 ITI 目标为 v17 系；v29 形态仅由 `tests/corpus/forms/mirrors/iti-v29.html`（**手写 mock，不具库语义**）覆盖 —— 属本票影响面清单第 2 条。
- 本仓库补充：真实站点 Pen 的实例注册表在该帧内 `getInstance(el)` 返回 `null`（实测），故判据必须保留 DOM 选中态这条路径（不得只依赖官方读 API）。

## 5 来源清单（atomcode 输出，三引擎交叉）

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | Methods docs（官方） | https://intl-tel-input.com/docs/methods | Official | setNumber / setSelectedCountry / getSelectedCountry 官方语义全文 |
| 2 | Best practices docs（官方） | https://intl-tel-input.com/docs/best-practices | Official | 「区号内嵌于号码、无需单独存国家」 |
| 3 | Options docs（官方） | https://intl-tel-input.com/docs/options | Official | numberDisplayFormat / initialCountry 不覆盖已含区号的号码 |
| 4 | 源码 intlTelInput.ts（master） | https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/packages/core/src/js/intlTelInput.ts | Official | `#updateDialCode` 仅 + 开头才替换区号；程序化赋值不派发原生事件 |
| 5 | CHANGELOG.md | https://raw.githubusercontent.com/jackocnr/intl-tel-input/master/CHANGELOG.md | Currency | 指向全部 29 个 major 的 release notes |
| 6 | v29.0.0 release | https://github.com/jackocnr/intl-tel-input/releases/tag/v29.0.0 | Currency | setSelectedCountry / getSelectedCountry 改名表；DOM 类名与 CSS 变量改名 |
| 7 | v25.0.0 release | https://github.com/jackocnr/intl-tel-input/releases/tag/v25.0.0 | Currency | attachUtils / loadUtils 改名 |
| 8 | v22.0.0 release | https://github.com/jackocnr/intl-tel-input/releases/tag/v22.0.0 | Currency | showSelectedDialCode → separateDialCode |
| 9 | v21.0.0 release | https://github.com/jackocnr/intl-tel-input/releases/tag/v21.0.0 | Currency | selected-flag → selected-country 类名重构（DOM 判据不稳定实锤） |
| 10 | Issue #1374 | https://github.com/jackocnr/intl-tel-input/issues/1374 | Community | countrychange 触发范围含糊 + 作者确认（2022） |
| 11 | Issue #361 | https://github.com/jackocnr/intl-tel-input/issues/361 | Community | v17 起 setCountry / setNumber 触发 countrychange；原生 change 不派发 |
| 12 | Commit 288c029（2026-04） | https://github.com/jackocnr/intl-tel-input/commit/288c0290d438d1c792124398e27f90f26e6bdd7f | Currency | countrychange 时派发合成 input 事件（仅最新版，仅用户点下拉路径） |
| 13 | jqueryscript.net 综述（2026-08） | https://www.jqueryscript.net/form/jQuery-International-Telephone-Input-With-Flags-Dial-Codes.html | Comparative | 第三方对最新 API 用法的独立印证 |
| 14 | Tadabase 社区帖 | https://community.tadabase.io/t/add-phone-number-code-with-country-image/2998 | Community | 实例：页面代码自己往 input 塞 +区号（证明这不是库行为） |
| 15 | Stack Overflow #63028653 | https://stackoverflow.com/questions/63028653/on-change-event-for-country-code-in-intltelinput | Community | 业界断言方式：countrychange + getSelectedCountryData |

## 6 本地复现证据（reproduced，一次性诊断脚本，已清理）

- 载体：真实 `intl-tel-input@18.2.1`（node_modules）+ Playwright，OS 临时目录，用后删除。
- 观测面：`input.value` / 官方读 API 选中态 / 选中态 DOM 标记 / `input`·`change`·`countrychange` 事件序列。
- 结论表见 §3；真实站点（`https://codepen.io/pen/ExzVrPY` 的 `cdpn.io` 帧）实测：写入前 `iti__in`（India，title "India (भारत): +91"）→ 写入后 `iti__cn`（China，title "China (中国): +86"），`value` 保持 `""`，原生事件序列 `[]`，`countrychange` 已广播 —— 与 §3 的 separateDialCode 行一致。
- 密封层永久覆盖：`tests/iti-l3-criterion.spec.ts` + `tests/fixtures/iti-l3-write-surface.html`（PR 阻断）。
