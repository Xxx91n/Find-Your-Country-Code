# 组件库伪 select 逐库取证报告（票 17）

> 生成: 2026-09-05 | 票 17 | 纯取证，零业务代码改动
> 方法: 固定版本 CDN 样本页 + Playwright Chromium 真实渲染探针（一手证据，标记 observed）+ 官方文档/API 语义（标记 cited）+ 未验证推断（标记 candidate）
> 证据文件: 样本页 `research/pseudo-select-samples/pages/`，aria snapshot `research/pseudo-select-samples/snapshots/`，结构化事实 `research/pseudo-select-samples/facts/`，探针 `research/scripts/17-pseudo-select-probe.mjs`（2026-09-05 运行 5/5 捕获）

## 0. 跨库信号核心（先看这张表）

| 维度 | MUI 5.16.7 | antd 5.27.4 | Element-Plus 2.9.3 | react-select 5.10.0 | Radix 2.2.2 |
|---|---|---|---|---|---|
| 触发器元素 | `DIV[role=combobox]`（MuiSelect-select） | `INPUT[type=search][role=combobox]` readonly（搜索 input） | `INPUT[type=text][role=combobox]` readonly | `INPUT[type=text][role=combobox]` | `BUTTON[role=combobox]` |
| aria-expanded | 有 | 有 | 有（closed 态为空串 attr 存在） | 有 | 有 |
| aria-haspopup | `listbox` | `listbox` | `listbox` | **`true`（非 listbox）** | **无此属性** |
| aria-controls | 有（指向 `UL[role=listbox]#:r0:`） | 有 + **同时有 aria-owns**（`DIV#country_list[role=listbox]`） | 有（`UL#el-id-N[role=listbox]`） | 有（`DIV#react-select-N-listbox`） | 有（`DIV[role=listbox]#radix-N`） |
| aria-activedescendant | 无（走 roving focus） | 有（open 即有） | 有（closed 态空串） | 有 | 无（走 roving focus） |
| 弹出层位置 | portal 到 body（`#menu-country.MuiPopover-root`） | portal 到 body（`.ant-select-dropdown`） | teleport 到 body | **内联（控制内）** | portal 到 body |
| 选项元素 | `LI[role=option]` + `data-value=ISO2` | `DIV[role=option]`（**文本=ISO2 代码，国家名在 aria-label**） | `LI[role=option]` | `DIV[role=option]`（**无 aria-selected**） | `DIV[role=option]` + `data-highlighted` |
| 选项全量 | 全渲染 | **虚拟化: 6 项只渲染 2** | 全渲染 | 全渲染 | 全渲染 |
| 值承载 | **隐藏 native input** `name=country value=US aria-hidden tabindex=-1`（US→CA 实变） | **DOM 无承载**（组件 state；搜索 input value 恒空） | **DOM 无承载**（v-model state；input 带 name 但 value 恒空） | **隐藏 native input** `name=country value=CA`（name prop 驱动） | 无（本样本未见 native select 兜底，candidate: 需 form 上下文） |
| 选择后原生 change/input 事件 | 无 | 无 | 无 | 无 | 无 |
| label 关联 | aria-labelledby="cc-label mui-...-country"（双 id） | Form.Item label for→input#country | el-form-item label（aria 关联弱，observed 结构弱于其余库） | label for=inputId | label for=trigger id |

焦点管理两模型（observed）:
- **activedescendant 模型**（antd / EP / react-select）: 焦点始终停在触发器 input，`aria-activedescendant` 指向当前高亮 option id。antd 在 open 瞬间即设置。
- **roving focus 模型**（MUI / Radix）: 展开后焦点真实移入 option 元素（MUI: `LI[role=option]` tabindex=0；Radix: `DIV[role=option]` tabindex=-1 且 `data-highlighted` 标注），combobox 上无 activedescendant。

## 1. MUI（@mui/material 5.16.7 UMD）

结构（observed）: `FormControl` → 触发器 `DIV.MuiSelect-select[role=combobox][aria-expanded][aria-haspopup=listbox][aria-controls=:r0:][aria-labelledby="cc-label mui-component-select-country"][tabindex=0]` + 同容器内**隐藏承载 input**（`INPUT.MuiSelect-nativeInput[name=country][aria-hidden=true][tabindex=-1]`，值随选择 US→CA 实变）。弹出层 `UL[role=listbox]:r0:` 挂在 `DIV#menu-country.MuiPopover-root > DIV.MuiPaper-root` 之下 portal 到 body，UL 带 `aria-labelledby=cc-label`。选项 `LI[role=option][data-value=ISO2][aria-selected]`，roving tabindex（0/-1）。

aria snapshot（展开态节选，全文 `snapshots/mui--open.yml`）:

- listbox "Country code":
  - option "United States" [selected]
  - option "United Kingdom" ...

| 可识别信号 | 不可靠信号 | 值承载方式 |
|---|---|---|
| `DIV[role=combobox]` + aria-haspopup=listbox + aria-controls→UL[role=listbox]；option 带 data-value；aria-labelledby 可解出 label 文本 | 关闭态 aria-controls 指向已卸载的 id（悬空引用，不能假定 target 存在）；activedescendant 恒空 | 隐藏 native input（name/aria-hidden/tabindex=-1）承载 ISO2；读取走 `combobox 容器内 input[type][aria-hidden=true]` 或选择后 option[aria-selected] 的 data-value |

## 2. antd（5.27.4 UMD）

结构（observed）: 触发器是 `INPUT.ant-select-selection-search-input[type=search][readonly][role=combobox][aria-expanded][aria-haspopup=listbox][aria-owns=country_list][aria-controls=country_list][aria-autocomplete=list]`，外层 `.ant-select-selector` 才是可视点击区（input 本身零尺寸不可点击，探针实测 click 超时后改点 selector 成功）。弹出层 `DIV.ant-select-dropdown > DIV[role=listbox]#country_list` portal 到 body。选项 `DIV[role=option]#country_list_N[aria-selected]`，**可见文本是 ISO2 代码（US/GB/CA...），国家名在 aria-label**。虚拟化: 6 项只渲染 2 项。

aria snapshot（展开态节选，全文 `snapshots/antd--open.yml`）:

- listbox:
  - option "US" [selected]
  - option "GB"

| 可识别信号 | 不可靠信号 | 值承载方式 |
|---|---|---|
| `INPUT[role=combobox][aria-haspopup=listbox]` + aria-owns/controls 双写指向 `[role=listbox]`；Form.Item label for→input id | option 可见文本是 ISO2 代码不是国名（文本语义匹配必须叠加 aria-label）；虚拟化导致展开态 option 枚举不全；触发器 input 零尺寸不可点 | **无 DOM 承载**（observed: 全页 input/select/textarea 仅搜索 input 且 value 恒空）——值在组件 state，DOM 唯一痕迹是触发器文本与 option[aria-selected] |

## 3. Element-Plus（2.9.3）

结构（observed）: 触发器 `INPUT.el-select__input[type=text][readonly][name=country][role=combobox][aria-expanded][aria-haspopup=listbox][aria-controls=el-id-N][aria-autocomplete=none]`（name 属性在但 **value 恒空，不承载值**）。外层 `DIV.el-select__wrapper` 是可视点击区。弹出层 `DIV.el-select-dropdown > UL[role=listbox]#el-id-N-1` teleport 到 body。选项 `LI.el-select-dropdown__item[aria-selected]`，选中项带 `is-selected` class，hover 项带 `is-hovering`。

aria snapshot（展开态节选，全文 `snapshots/element-plus--open.yml`）:

- listbox:
  - option "United States" [selected]
  - option "United Kingdom" ...

| 可识别信号 | 不可靠信号 | 值承载方式 |
|---|---|---|
| `INPUT[role=combobox][aria-haspopup=listbox]` + aria-controls→UL[role=listbox]；is-selected/is-hovering class 与 aria-selected 并存 | closed 态 aria-expanded 为空串（存在但值空，属性判定需容错）；label 关联最弱（el-form-item 的 label 未形成 aria-labelledby/for 可靠链，observed） | **无 DOM 承载**（v-model 在组件 state）；DOM 痕迹同 antd: 触发器文本 + option[aria-selected]；readonly input 的 name 属性是假承载（value 恒空） |

## 4. react-select（5.10.0）

结构（observed）: 触发器 `INPUT.rs__input[type=text][role=combobox][aria-expanded][aria-haspopup=**true**][aria-controls=react-select-N-listbox][aria-autocomplete=list]`（haspopup 是裸 true，不是 listbox）。弹出层 `DIV#react-select-N-listbox[role=listbox]` **内联在 control 内**（唯一不 portal 的库）。选项 `DIV[role=option][aria-disabled=false]`，**不设置 aria-selected**（选中态只体现为 class）。值承载: `name` prop → 隐藏 `INPUT[type=hidden][name=country][value=CA]`（选择后实测出现并变化）。label for=inputId 直连触发器 input。

aria snapshot（展开态节选，全文 `snapshots/react-select--open.yml`）:

- listbox "Select...":
  - option "United States" [selected]
  - option "United Kingdom" ...

| 可识别信号 | 不可靠信号 | 值承载方式 |
|---|---|---|
| `INPUT[role=combobox][aria-expanded]` + aria-controls→`[role=listbox]`；label for 直连 | **aria-haspopup="true"** 而非 listbox（haspopup 匹配必须容忍 true）；**option 无 aria-selected**（选中判定只能靠 class 或隐藏 input）；aria-disabled="false" 冗余存在 | 隐藏 native input（name prop 生成），值随选择实变（CA 实测）；无 name prop 时无承载（candidate） |

## 5. Radix Select（@radix-ui/react-select 2.2.2）

结构（observed）: 触发器 `BUTTON#cc-trigger[role=combobox][type=button][aria-expanded][aria-controls=radix-:r0:][aria-autocomplete=none][data-state=open/closed]`——**无 aria-haspopup、无 aria-activedescendant**。弹出层 `DIV[role=listbox]#radix-:r0:` portal 到 body。选项 `DIV[role=option][aria-selected][data-highlighted][tabindex=-1]`，roving focus: 展开后 activeElement 就是 option DIV。本样本（name=country 已传、无 form 祖先）未观察到隐藏 native select 兜底（candidate: Radix 文档称有 form 集成 select，可能需 form 上下文）。

aria snapshot（展开态节选，全文 `snapshots/radix--open.yml`）:

- listbox:
  - option "United States" [selected]
  - option "United Kingdom" ...

| 可识别信号 | 不可靠信号 | 值承载方式 |
|---|---|---|
| `BUTTON[role=combobox][aria-expanded]` + aria-controls→`[role=listbox]`；data-state=open/closed 冗余佐证；aria-selected 存在 | 无 aria-haspopup（靠 haspopup 找触发器的策略会漏掉 Radix）；无 activedescendant（activedescendant 策略会漏）；触发器文本即当前值（SelectedValue 渲染在 BUTTON 内） | 本样本无 DOM 承载（值在 state，触发器文本是唯一 DOM 痕迹）；native select 兜底标注 candidate（疑需 form 上下文） |

## 6. 取证结论（喂给探测策略与 ADR-0005）

1. **信号核心稳定存在（observed，5/5 库）**: `role=combobox` + `aria-expanded` + `aria-controls` 可解到 `[role=listbox]` + 内含 `[role=option]`。差异只在辅助属性: haspopup（listbox/true/无）、activedescendant（有/无）、owns（antd 额外有）。
2. **弹出层 4/5 库 portal 到 body**，不是触发器 DOM 后代——探测必须沿 aria-controls/aria-owns 的 id 解引用，不能在触发器子树内找列表。
3. **值承载三分天下**（observed）: 隐藏 native input（MUI/react-select）、组件 state 无 DOM 痕迹（antd/EP/Radix 本样本）、state+触发器文本。任何「读值」策略必须做多级回退: 隐藏 input → 触发器可见文本 → 展开态 option[aria-selected] 文本/aria-label。
4. **选值不伴随原生 change/input 事件**（observed，5/5 库，React 受控 + EP/Vue 受控同象）——内容验证不能依赖事件监听，只能快照对比。
5. **option 文本语义分裂**（observed）: antd 文本=ISO2、国名在 aria-label；其余库文本=国名。L3 选项内容验证必须同时吃 text 与 aria-label，且 ISO2 判定按 spec 走数据全集成员测试。
6. **误报面警告**（cited/observed 交叉）: role=combobox 也是搜索型 typeahead（如站内搜索自动补全）的标准角色；role=listbox 也出现在非选择控件。仅凭单信号升格会造成新误报面——这正是「登记+手动召唤、不自动注入」档位的直接依据。

证据分级: 本报告结构性结论全部为 observed（探针一手）; aria 属性语义解释为 cited（WAI-ARIA 1.2 combobox/listbox 模式）; Radix native select 需 form 上下文、MUI v6/v7 结构不变为 candidate。
