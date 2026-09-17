# atomcode 深度调研 — 票 08（A-031 · A-032）

> 日期：2026-09-17（Asia/Singapore）| 载体：`ctx_batch_execute`（label=`atomcode`，stdout 已入 FTS5）
> 串行护栏：单次在途（本票仅一次调研调用，未并发）
> 置信度：**高**（两条主线结论均有「官方源码 + 官方文档 + 社区实践」三重印证）
> 事实分级：下文均标 **cited**（来源见 §3 清单）；本仓库侧的**复现证据**标 observed，落 `research/window-reports/08-phase-b-failure-fixes-report.md`

## 0 调研问题（verbatim）

> 自动填充与密码管理器类产品（Bitwarden、1Password、Chrome 自动填充等）如何处理「被组件库视觉替换的原生表单控件」——即原生 select/input 被隐藏、页面上由可见替身展示与交互的情形：是否仍对其注入控件？是否仍保留填充能力？判定依据是什么？同时，从下拉选项文本中识别国际电话区号（如 +247、(+86)、0086 等形态）的工业级做法与常见陷阱是什么？

## 1 结论 A：隐藏原生控件的注入与填充判定

| # | 结论 | 分级 |
|---|---|---|
| A1 | **判定依据是「原生控件存在于 DOM + 语义信号」，而非视觉可见性**。信号权威性：`autocomplete` > `type`+name/id/placeholder/label 启发式 > 表单结构。 | cited |
| A2 | **可见性是「降级层」而非硬门槛**。Bitwarden `autofill.service.ts` 先找 *viewable*、找不到才放宽到隐藏字段（源码注释原文："not able to find any viewable password fields. maybe there are some 'hidden' ones?"）；Chromium `isFieldVisible` 用 `checkVisibility()` 严格判定但**不可见字段仍参与解析与去重**；Gecko `FormAutofillUtils.isFieldVisible` 同样从 focusable 演进为 checkVisibility，字段仍保留在解析结果里。 | cited |
| A3 | **原生 select 被替身替换时的行为**：只要替身组件**保留了语义完备的原生控件作为数据载体**（react-select / select2 / intl-tel-input 的标准做法），填充器仍注入并填充它；完全移除原生控件 → 所有填充器失效。Chrome 自身不填 `<select>`（只填 text/password 类 input），但 Bitwarden 自定义字段可填任意元素（含 `span.innerText` + `data-bwautofill`）。 | cited |
| A4 | **隐藏字段填充是「特例白名单」且有安全动机**：Chrome 官方推荐用 `display:none` 的隐藏 username input 帮助密码管理器识别账号（但不填 `type=hidden`）；同时厂商正因 overlay 诱导填充攻击而收紧（Bitwarden inline menu 只在**可见** password 字段上展示）。 | cited |
| A5 | **`aria-hidden` 是官方推荐的「隐藏承值字段」标记**：1Password 官方适配文档要求隐藏字段以 `aria-hidden` 标注并配 label/ARIA 可达性线索。⇒ 把 `aria-hidden` 当「硬排除」与业界共识相反。 | cited |

## 2 结论 B：下拉选项文本中的区号识别

| # | 结论 | 分级 |
|---|---|---|
| B1 | **不要用正则硬解析自由文本**；工业级做法 = 基于 libphonenumber `getSupportedCallingCodes()` 生成白名单，做「提取 → 归一化 → 白名单最长前缀匹配」。 | cited |
| B2 | **常见陷阱**：① `00`/`011` 国际前缀与国家码的二义（`0086` 可能是 00+86）；② **共享国家码**（`+1`/`+7` 覆盖多国）无法唯一映射回国家；③ 括号 / 空格 / 全角符号的**归一化遗漏**（`(+86)`、`+44 (0)`、`+0045`）。AOSP `PhoneNumberUtilsTest` 另给出假码 `+444` 与 `(0)` 干扰的断言集。 | cited |
| B3 | 本仓库既有 `DIAL_SET`（由 `COUNTRIES` 拨号集生成）正是 B1 所述白名单口径，故形态③的修法只需扩展**令牌提取面**，不需引入新依赖或新数据源。 | observed |

## 3 来源清单（14 条，逐条 cited）

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | Chromium `components/autofill` README | raw.githubusercontent.com/chromium/chromium/main/components/autofill/README.md | Official | 分类优先级（autocomplete > crowdsourcing > heuristics）、自定义下拉投票、隐藏字段参与结构解析 |
| 2 | 1Password — Design your website to work best with 1Password | 1password.dev/web/compatible-website-design | Official | 隐藏字段保留策略、ARIA/autocomplete 信号、`data-1p-ignore` |
| 3 | Bitwarden — Autofill Custom Fields | bitwarden.com/help/auto-fill-custom-fields/ | Official | 自定义字段可填 span/`data-bwautofill`；linked field 定位属性优先级 |
| 4 | Bitwarden `clients/.../autofill.service.ts` | github.com/bitwarden/clients | Official(源码) | viewable→hidden 降级逻辑原文注释 |
| 5 | Bitwarden `inline-menu-field-qualification` 测试 | 同仓库 spec | Official(源码) | 无可见 password 字段时的 multipart 表单判定 |
| 6 | Evert Pot — Multi-step login forms that work with password managers | evertpot.com | Community | Chrome Wiki 隐藏 username input 方案；KeepassXC 失败案例 |
| 7 | Stack Overflow — Chrome save-password prompt incorrect value | stackoverflow.com/questions/27518606 | Community | `display:none` 可填 / `type=hidden` 不可填 |
| 8 | Gecko `FormAutofillUtils.isFieldVisible` 源码 diff | git mirror（经 Tavily 检索） | Official(源码) | checkVisibility 判定 + 不可见字段去重语义 |
| 9 | libphonenumber FAQ.md | github.com/google/libphonenumber/blob/master/FAQ.md | Official | 国家码/区号二义（DE 49 / ID 62）、`+` 信号语义 |
| 10 | AOSP `PhoneNumberUtilsTest` | android.googlesource.com | Official(测试) | 00/011 前缀断言、`(0)` 干扰、假码 `+444` |
| 11 | intl-tel-input Options 文档 | intl-tel-input.com/docs/options | Official | separateDialCode / hiddenInputs / 拨码与号码分离架构 |
| 12 | Stack Overflow — Listing all country codes | wiki 镜像 | Community | `getSupportedCallingCodes()` 白名单生成标准做法 |
| 13 | npm `format-phone` README | npmjs.com/package/format-phone | Community | 畸形输入测试集（`+0045`、`+011 54`、`+44(0)`…） |
| 14 | Agent+autofill 攻击面分析 | （隐名安全文，Tavily 检索） | Criticism/Security | 隐藏字段自动填充的攻击向量与缓解（hit-testing、确认制） |

## 4 对本票的落地（decision linkage）

| 调研结论 | 本票决策 | 依据 |
|---|---|---|
| A2 / A5 | A-032：`aria-hidden="true"` 在**原生 select** 上不再硬排除（score 0），改为**可见性降级**信号——不注入图标，但**保留检测登记**（≥ `ITI_LOW_REGISTER_SCORE`）与可填充性 | 可见性是降级层而非硬门槛；`aria-hidden` 是官方推荐的隐藏承值标记 |
| A3 | 视觉替换型站点是**正样本**：填原生 select 即组件库标准写入通路 → 必须保留可填充性（与票 13 检查点一一致，本票未改变其语义） | 替身组件保留原生控件作数据载体时填充器仍有效 |
| B1 / B2 | A-031 形态③：裸 `+NN` 文本令牌按**白名单**识别（与括号形式同权重——证据本体是白名单命中的区号，括号只是排版）；三条护栏取自 B2：① 前置字符排除 `(` 避免与 `parenDial` 重复计分；② 值已是区号时不重复计分；③ 负向前瞻避免匹配长号码前缀（`+8613800138000` 不误命中） | 白名单最长匹配；归一化与重复计分陷阱 |
| A4 | 不采用「对隐藏字段也注入图标」——隐藏盒上的图标用户不可达；也不采用「不注入即不登记」——那正是本票修复的缺陷 | 隐藏字段填充是特例白名单；inline UI 只挂可见字段 |
| — | A-031 形态① / ②：**无需改动检测代码**（`type=search` 类型闸门 + 搜索型否决组；L4 语言/翻译排除组已覆盖） | 实测观察（见报告 §实测） |

## 5 信息缺口（如实登记）

1. 未找到公开资料直接回答「`aria-hidden` 原生 **select**（非 input）在主流填充器中的具体分支」——A5 为官方文档对「隐藏字段」的一般要求，向 select 的映射属**合理外推**（标 cited+推断）。
2. 未找到「无括号区号文本」的行业专用讨论；B1 的白名单提取口径可覆盖该形态，但**权重赋值**（与括号同权）属本仓库标定决策，非行业结论。
3. 调研未涉及「组件库内部搜索框」的误报治理（结论①由本仓库既有两道防线覆盖）。
