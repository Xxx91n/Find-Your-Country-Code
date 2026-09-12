# Cycle-4 atomcode 调研纪要（两路串行，浓缩版）

> 生成：2026-09-12 | 大脑 Agent | 原始调研为两路 atomcode 串行运行（Exa+Tavily+AnySearch 三引擎交叉验证），本文为窗口可引用的浓缩结论；引用标注保留。
> 票 32（真实站点语料）与票 27/28/29（检测修复）的工业参照基线。**每票动手前仍须按 handoff「通用调研要求」跑自己票的针对性 atomcode 调研**，本文不是替代。

## 第一路：autofill / 表单字段识别的工业级回归测试方法论

**四层组合拳（工业界没有单一方案）**：
1. **静态模式库**：把真实站点压缩成带标注的抽象表单模式，确定性回归。代表：Bitwarden `test-the-web`、Mozilla `form-fill-examples`。
2. **真实驱动 E2E**：Playwright/CDP 驱动真实浏览器或真实 MV3 扩展对真实站点冒烟。代表：Bitwarden BIT；CDP `Autofill` domain（`setAddresses` / `trigger` 返回 `FilledField[]` 含 `autofillType` + `fillingStrategy: autocompleteAttribute|autofillInferred` / `addressFormFilled` 事件）。
3. **流量即语料**：真实用户行为变回归信号。Chrome crowdsourcing 投票；`web.dev/autofill-measure` 状态机（EMPTY/AUTOFILLED/AUTOFILLED_THEN_MODIFIED/ONLY_MANUAL，`:autofill` 伪类 + change 事件）；Chrome 147（2026-06）`autofill` 事件 origin trial（WICG/autofill-event）。
4. **大规模评测**：Top 100K 爬取（Fidentikit、CCS'20）或合成高保真表单基准（FormFactory、FormGym）。

**硬结论**：
- 「WPT 测不了 autofill 触发」官方双源确认（wpt#27118 + blink-dev）→ 必须自建宿主级测试或走 CDP。
- 「海量真实网站」覆盖不靠全量实时测试，靠**模式抽象 + 低频抽样 + 弱断言 + 可跳过白名单**收敛成本。
- 可复用最小组合：分层分类架构（每层可 override）+ 静态模式库 + Playwright 驱动真实被测物 + CDP/事件级细粒度断言 + 众包/遥测增量语料飞轮。
- 信息缺口（未公开）：厂商内部语料规模与 CI 频率、Dashlane/1Password 测试执行细节。

## 第二路：区号字段形态多样性下的高识别覆盖率

**语义混同图谱（8 类）**：共享国码（+1 二十余国、+7 俄/哈）、国码与国内区号重叠（DE 49 / ID 62）、国家↔区号非单射、同国码内号码类型重叠（toll-free）、国家名/搜索词变体（44/0044/+44/UK/Britain）、非地理号码（+800/+870/+888）、IDD 前缀（00/011）≠ `+`、national prefix（0）剥离规则国别不一（UK 去 0、意大利固话保留）。

**四个工业级机制**：
1. **libphonenumber 元数据是地基**：`PhoneNumberMetadata.xml`（ITU + 电信管理局 + 运营商 + 用户 bug 多渠道合并）；`isPossible`（长度级）与 `isValid`（正则级）两级验证；`country_calling_codes` 显式建模一国码多国、`leading_digits`「匹配即确定、不匹配不排除」；`national_prefix_for_parsing` + `transform_rule` 通用提取。所有工业组件（intl-tel-input、react-phone-number-input、Twilio、Toast）=「UI 壳 + libphonenumber 芯」。
2. **E.164 单格式存储**消解「存什么」；Toast 迁移实录：`countryCode` 列 + 两级回退解析链。
3. **识别链优先级**：显式预选（`initialCountry`）> IP 反查（`initialCountryLookup`，失败优雅降级）> 输入即重解析。
4. **严格模式 + 显式拒绝反馈**：`strictMode` 拒绝非数字/按上限截断/`strict:reject` 事件；`getValidationError` 结构化错误码。

**关键批评（本仓库直接相关）**：
- react-phone-number-input #273：国码被**静默解析**（用户输 `206-555-1234` 被当埃及 +20 而不自知）→「要么始终显示国码、要么始终不显示」。对应本仓库票 31（填充结果三态可观测）。
- 「国家↔区号非单射 → 表单 value 用 ISO 3166 alpha-2、区号由服务端映射」是 UX 界共识（UX SE #131795）→ 印证票 28 要处理的 ISO2-value 括号区号下拉正是真实世界主流形态。
- 下拉框本身是「最后手段」：能免选则免选（批评视角）——本脚本是「帮用户在下拉里少找」，语义上成立。

## 对本周期票的映射

| 结论 | 落点票 |
|---|---|
| 模式库 + 低频冒烟 + 可跳过白名单 + CDP 断言 | 32 |
| ISO2-value 括号区号下拉是主流形态、须给 L3 证据 | 28 |
| 弱信号字段的行业解法（分层 override + 内容验证） | 27 |
| 静默错填反例（#273）→ 三态反馈 | 31 |
| 候选集扩展的结构启发式参照（field finder 分层） | 29 |