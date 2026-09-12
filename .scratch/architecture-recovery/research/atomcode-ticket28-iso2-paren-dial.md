# 票 28 atomcode 深度调研纪要 — 括号区号（parenDial）独立计分

> Cycle-4 | 票: 28-iso2-dial-evidence（覆盖 A-002）
> 方式: atomcode 5.0.9 headless 单跑（串行护栏：同刻至多 1 个在途）
> 调研时点: 2026-09-12 | 调研先于动手，结论用于校准改法与护栏

## 调研问题

1. 成熟实现如何区分「国家选择器」与「电话区号字段」？选项文本出现 `(+NN)` 时是否被当作区号字段强证据？
2. `+1` / `+44` 等共享区号如何在 UI 与数据层消歧？有无通行做法或已知反例？
3. 把「括号区号」提升为独立证据后，如何防止「纯国家选择器」被误判为区号字段？
4. parenDial 独立计分的已知陷阱与规避方式？

## 结论（含依据）

### 1. 区分口径：规范层语义严格分离，parenDial 属增强

- Chromium `form_structure.cc`：`autocomplete=tel-country-code` → `HTML_TYPE_TEL_COUNTRY_CODE`，`country` → `HTML_TYPE_COUNTRY_CODE`，二者语义严格分离；核心护栏是「rationalization」——`PHONE_HOME_COUNTRY_CODE` 必须与同表单电话号码字段共存才生效（commit `ddae156e`，Bug 735479）；本地启发式仅当表单 ≥3 字段才启用。
- Chromium 2026 新提交「PHONE_COUNTRY 启发式优先于 `autocomplete="country"`」（`d41f91e`，crbug 479503511）**直接承认 select 上「区号 vs 国家」常被误分类** —— 与本票缺陷同源，反证修复方向成立。
- Firefox `FormAutofillHeuristics.sys.mjs`：autocomplete ＞ fathom ＞ 正则三机制，支持 select，但**不解析 option 文本**。
- Bitwarden 按 field qualifier 识别（phone 为最低优先级标识符），**不碰选项文本**；KeePassXC 仅检测 username/password 组合。
- WHATWG html issue #8597：`(+NN)` 仅作为「填充 select 时选 option 的启发式建议」被讨论，**业界不把它当字段类型强证据**。

→ 结论：parenDial 是本项目特有的用户脚本增强，方向成立，但**护栏必须自建**——不能指望业界先例直接背书。

### 2. 共享区号消歧

- 数据层：libphonenumber 规定共享区号列表中 `isMainCountryForCode` 的国家排第一，`getRegionCodeForCountryCode` 返回主国（+1→US）；格式化元数据只存主国一份（`PhoneNumberUtil.java`）。libphonenumber-js 另用 `leading_digits` 精确消歧（如 +1268→安提瓜）；US/CA 无该模式，数据层不可区分（`METADATA.md`）。
- UI 层通行做法：**option 文本 = 国家名 + `(+NN)`、value = ISO2**（即本票形态 B）；intl-tel-input 的 Country 模型含 `iso2 / dialCode / priority / areaCodes`（+1 时 US priority 0、CA 1，NANP 用 areaCodes 消歧）。
- **已知反例**：形态 A（`value="+1"`）被 whatwg#8597 定为缺陷——浏览器按 first-match 会把号码填成安圭拉。

→ 启示：parenDial 只能解析出「区号 + 候选国集合」，落盘/回显须按主国惯例或 area code 二选一（与 intl-tel-input 一致）。本票只改检测计分，**不动 fill 侧消歧逻辑**，故该约束由既有实现继续承担。

### 3. 误报护栏（三条）

1. **共现约束**（Chromium 同款）：parenDial 命中且同表单存在电话输入字段才判为区号字段，否则降级。
2. **负信号抑制**：label/placeholder 含 country/国家/地区 且表单另有国家字段时抑制；选项全为国家名、无括号区号时天然不触发。
3. **规模与白名单约束**：`+` 后数字必须命中真实区号表；**排除 `(0)` 形态**（UK trunk prefix）与本地固话区号（不带 `+`）；命中选项 ≥2。

### 4. 陷阱

- `(+NN)` 可能非区号含义 → 须命中区号表白名单；
- 与本地固话区号（010/020）混淆 → 须要求 `+` 前缀；
- 多语言站点文本差异 → 只认数字形态，不依赖语言；
- 性能 → 逐选项正则，选项数受限，成本可忽略。

## 采用 / 不采用对照

| 建议 | 处置 | 理由 |
|------|------|------|
| 区号表白名单（`+` + 数字必须命中 DIAL_SET） | **已具备**（采用） | `optStats`/`pseudoOptionStats` 既有的 `\(\+\d{1,4}\)` + `DIAL_SET.has()` 双条件 |
| 排除 `(0)` / 本地固话区号 | **已具备**（采用） | 正则强制 `\+` 前缀，`(0)` 与 010/020 天然不命中 |
| 负信号抑制（纯国家选择器不判区号字段） | **已具备**（采用，本票护栏 1） | `country-semantic:suppress`：`isoName/total ≥ 0.5 && plusDial === 0 && parenDial === 0` |
| 命中选项 ≥2 的规模门槛 | **已具备**（采用） | `gate:options<2` 硬排除 |
| 共现约束（必须有电话字段才判区号字段） | **不采用** | 与 ADR-0001 已决冲突：ADR-0001 明确否决「孤立字段减分」，改采「锚存在才加分」（`L2_ANCHOR_TEL_SCORE` 为正向加分而非硬门）；改为硬门会把单字段页面与懒渲染场景的真区号字段压出低置信档 |
| 规模约束加强（选项 ≥10 且命中率 ≥80%） | **不采用** | 超出本票范围，且会直接打掉本票正例（3 项全命中）。属引擎阈值整体重构，spec「Out of Scope」已排除 |
| 共享区号回显按主国惯例/area code 二选一 | **不在本票范围** | 属 fill 侧；本票不动 fill，由既有 intl-tel-input 同构实现承担 |

## 一手信源

- Chromium `form_structure.cc` / autofill README；commit `ddae156e`（Bug 735479）；commit `d41f91e`（crbug 479503511）
- Firefox `FormAutofillHeuristics.sys.mjs`
- Bitwarden `autofill.service.ts`；KeePassXC `fields.js` + 扩展 wiki
- WHATWG html issue #8597（形态 A/B 与共享区号冲突的原点）
- libphonenumber `PhoneNumberUtil.java`（`isMainCountryForCode` / `getRegionCodeForCountryCode`）；libphonenumber-js `METADATA.md`（`leading_digits`）
- intl-tel-input Country 模型（`iso2 / dialCode / priority / areaCodes`）
- MDN：`tel-area-code`（不带 `+` 的国内区号）与 `tel-country-code` 语义分离
