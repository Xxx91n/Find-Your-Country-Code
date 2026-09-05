# Find-Your-Country-Code

浏览器油猴脚本，在任意网页识别电话国家区号字段并提供快速选择面板。本词汇表定义检测、注入与用户干预的核心领域词汇，供后续架构工作与 ADR 引用；文末"行业心智模型对照"章固化行业调研对标结论与证据出处，新窗口读此对齐，不重复调研。

## 检测

**区号字段**：
网页上用于选择/填写电话国际区号的表单控件，本脚本唯一要找的目标。对应三种形态：原生 `select`、原生 `input`、intl-tel-input 实例。
_Avoid_: 电话字段、国家字段（那是另一种语义，见"国家选择器"）

**主号锚**：
同一 form（或全文档兜底）内承载完整电话号码的 `input[type=tel]` 输入框。锚→目标关联用它与候选字段互证加分；孤立字段不因此加分。
_Avoid_: 锚点、电话输入框（泛指时不用）

**置信度**：
评分引擎对"该元素是区号字段"这一判断的量化结果，输出分数与信号明细，而非命中/不命中的布尔结论。分数映射到分级行动。
_Avoid_: 命中率、匹配成功

**信号层**：
评分引擎的五层加权瀑布：L0 autocomplete/inputmode token、L1 词表与 label/placeholder、L2 锚→目标关联、L3 下拉选项内容验证、L4 排除词负分。每条评分贡献都以信号明细记录，可观测、可回归。
_Avoid_: 规则数、优先级

**分级行动**：
置信度分数到注入行为的三档映射：auto（高置信，自动注入）、lowkey（中置信，低调注入）、none（低置信，不注入，仅登记）。阈值可配置。
_Avoid_: 档位注入（口语可，落文档用"分级行动"）

**低调注入**：
lowkey 档的注入样式：图标半透明缩小、悬停恢复，与高置信图标视觉分层。

**手动召唤**：
低置信字段默认不出图标，仅登记；用户从面板点按召唤后按高置信样式补挂。用户显式请求压过启发式。
_Avoid_: 强制注入

**重评**：
扫描不再以"处理过"为终态：元素以属性指纹快照记录，指纹变化或 DOM 实况与记录不符时重新评分，图标不残留也不漏挂。
_Avoid_: 去重、跳过

**帧治理**：
脚本对 iframe 的存在与分工策略：元数据显式声明全帧启用，每帧各自检测与填充，选择面板只在顶层渲染，收藏与站点规则跨帧读同一份 GM 存储。
_Avoid_: @noframes、iframe 兼容（泛称，无分工语义）

**可见性闸门**：
只作用于注入档位的几何/样式闸门：display:none、零尺寸、opacity:0、clip-path、content-visibility、被遮挡的字段降为登记 + 手动召唤；隐藏但承载值的原生 select（视觉替换型）不受闸门阻断。
_Avoid_: 隐藏字段过滤、display 检查（只覆盖单一隐藏形态）

**ARIA 语义层**：
读取 role=combobox/listbox、aria-expanded/aria-controls/aria-activedescendant、label 语义与 shadow 内列表文本作为检测信号的层，并入既有信号瀑布，是伪 select 取证与识别的语义入口。
_Avoid_: 无障碍扫描、aria 修补（那是替页面补语义的别家心智）

**校准语料**：
fixtures 固化的正负例语料体系：manifest 索引 + CI 上的 precision/recall 回归基线 + 阈值标定脚本，评分阈值与权重以它为数据依据，任何改动不得悄悄引入回归。
_Avoid_: 样本集、测试数据（泛称，无基线与标定语义）

## 注入与填充

**图标注入**：
在区号字段旁附加 🌐 图标按钮的行为，是面板的入口。Shadow DOM 内的注入会同步采纳样式。
_Avoid_: 嵌入、标记

**面板**：
点击图标弹出的国家区号快速选择界面：搜索（中文/英文国家名、ISO、区号）、收藏区、全部列表与低置信召唤入口。
_Avoid_: 弹窗、对话框

**填充**：
把选中的区号/国家写入目标字段的动作，按字段形态分发三种策略：intl-tel-input 联动、原生 select 选中、input 赋值。
_Avoid_: 回填、自动完成

**iti 适配层**：
对 intl-tel-input v16–v29 的能力探测与兼容层：先稳锚 getInstance，再按能力面选择联动路径，兜底走原生赋值。
_Avoid_: iti hack、版本分支

**原生事件序列**：
框架安全注入的固定手法：按元素原型上的原生 value setter 写值，随后派发 input→change→blur，保证 React/Vue 等受控组件状态真实同步。
_Avoid_: 直接赋值、模拟点击（兜底路径除外）

**伪 select（组件库下拉）**：
MUI/AntD/Element/react-select/Radix 等组件库的下拉控件：值存组件 state，选项渲染为 div 列表或 portal，DOM 无原生 select；识别先取证 + 探测、只登记不注入，端到端实现与否由 ADR 裁决；填充分 select-only 型（开面板后键盘/点击选值）与可编辑型（隐藏输入原生 setter + 事件）两形态。
_Avoid_: 自定义下拉（泛称，易与视觉替换型混同——那是隐藏原生 select 承载值的另一形态）

## 用户干预

**站点规则**：
GM 存储的站点级规则文档（独立于收藏键），在检测入口之前匹配生效。含豁免域名、强制选择器、页面级分档覆盖与负反馈记忆。
_Avoid_: 黑名单、配置项

**豁免域名**：
整站禁用本脚本的域名规则；命中的站点完全跳过检测。
_Avoid_: 禁用列表

**强制选择器**：
元素级 CSS 选择器规则，命中的元素按规则声明的档位注入，无需评分。
_Avoid_: 白名单

**分档覆盖**：
页面级规则，把该页检测结果的注入档位下限抬升/压到声明档；用户显式规则压过启发式。
_Avoid_: 阈值调整

**负反馈**：
用户对误报字段声明"这不是区号字段"，脚本把它记为该字段的 none 档规则，下次不再提示。
_Avoid_: 举报、上报

## 行业心智模型对照

本节固化 2026-09 心智模型 v2 周期的行业对标结论：每个论断一行，证据出处以仓库相对路径标注，调研全文按路径溯源，不在此复制。

### 检测骨架三支柱（行业三方交集）

- **Chromium 分层预测**：字段语义识别采用"autocomplete token 最高优先 → 启发式加权 → 内容验证（rationalization）"的多层瀑布，本脚本落为 L0–L4 五层信号瀑布与置信度分数。（证据：`.scratch/architecture-recovery/research/industry-models.md` §M1/M2、`docs/adr/0001-scoring-engine-replaces-boolean-detection.md`）
- **Fathom 连续评分**：识别结果输出"类型 + 置信度分数 + 说明"的连续值而非布尔命中，分数驱动分级行动。（证据：`.scratch/architecture-recovery/research/industry-models.md` §M5、`docs/adr/0001-scoring-engine-replaces-boolean-detection.md`）
- **密码管理器降级兜底**：识别失败不硬猜，降级到用户手动兜底，本脚本对应低置信登记 + 手动召唤 + 负反馈。（证据：`.scratch/architecture-recovery/research/industry-models.md` §M4）

### 工程支柱三件（本周期采纳）

- **可见性正确性**：隐藏字段误注入是正确性/安全问题而非体验问题，clip-path 与 content-visibility 隐藏字段曾使全部密码管理器中招（CCS-20/ACSAC-24），几何/样式可见性闸门是行业标配。（证据：`.scratch/architecture-recovery/research/atomcode-mental-model-v2.md`、`.scratch/architecture-recovery/research/misdetection-root-causes.md`）
- **数据驱动校准**：权重与阈值不由人工拍定，以正负例语料的 precision/recall 基线与阈值标定脚本为数据依据，CI 执行。（证据：`.scratch/architecture-recovery/research/atomcode-mental-model-v2.md`）
- **可解释反馈回路**：每次注入决策输出信号明细，可观测、可归因，低置信走手动召唤，用户负反馈沉淀为站点规则。（证据：`docs/adr/0001-scoring-engine-replaces-boolean-detection.md`、`.scratch/architecture-recovery/research/industry-models.md` §M2）

### 对标结论

- 本模型是上述三支柱的交集，方向正确，已被 Chromium 与密码管理器两套生产实现独立验证；油猴/扩展领域无成熟同类竞品。（证据：`.scratch/architecture-recovery/research/atomcode-mental-model-v2.md`、`.scratch/mental-model-v2/report.md`）
- autocomplete 属性只是强先验，下拉语义必须由选项内容裁决，共享区号需文本消歧。（证据：`.scratch/architecture-recovery/research/atomcode-mental-model-v2.md`）
- 伪 select 先取证不仓促注入，实现与否由 ADR 裁决。（证据：`docs/adr/0004-pseudo-select-recognition-deferred.md`）
