# atomcode 调研纪要 — 票 30：页面级 vs 元素级规则作用域的收敛形态

> Cycle-4 | 票 30 window | 2026-09-12 | 载体：ctx_batch_execute(atomcode -p …)，全文已索引 FTS5（source: atomcode，本会话 2026-09-12 07:5x 批次）
> 问题：在浏览器自动填充/密码管理器产品中，站点规则的数据模型如何区分与收敛「页面/站点级行为覆盖」与「元素级(CSS selector 字段级)规则」两种作用域语义，使元素级规则不会意外放大影响整页？行业主流用哪种形态表达页面级规则：独立规则类型、显式 scope 字段、还是通配选择器约定？既有规则格式如何做向后兼容？

## 执行摘要（cited）

行业主流数据模型把两种作用域放进**两个分离的命名空间**：页面/站点级行为规则 = 以域名（或 URI/窗口标题）为键、携带**显式 scope 字段**（全子域/精确域/条目级覆盖）的**独立规则类型**（Apple quirks JSON、Bitwarden URI + match detection、Chrome "declined sites"、KeePassXC Auto-Type 窗口关联）；元素级规则 = 挂在站点键之下、用 CSS 选择器或 autocomplete 语义锚定单个字段。**通配选择器约定（`*`）只出现在桌面工具的小众场景（KeePassXC 窗口标题匹配），主流不用它表达整页语义——`*` 在元素匹配语境会命中一切**（这正是本票要避免的放大失效模式）。Confidence: 高（六家官方文档交叉验证 + WHATWG/IEEE ACSAC/arXiv 佐证）。

## 对票 30 设计的直接输入

1. **C1 分离命名空间**：元素规则永远收敛在站点键之下（本仓 OverrideRule 已含强制 host 祖先字段 ✓）；本票把「分档覆盖是否页面级」从隐式（任意 selector 规则均放大全页）改为显式规则类型。
2. **C2 放大事故类别**：元素级规则放大到整页是真实事故类别（Bitwarden substring 误命中、HN 邻接启发式越界、ACSAC 2024 Leaky Autofill 58.7% 隐藏字段填充实证），闸门 = 站点键前置门控 + 元素规则只 matches 自身 + 引擎作用域硬限制。
3. **C3 主流形态 = 独立规则类型 + 显式 scope 字段**（Apple exact-domain-match-only、Bitwarden match-detection 枚举 + 条目级覆盖、Dashlane 站点/字段/条目三粒度）；通配选择器仅补充约定（KeePassXC 桌面场景）。→ 票 30 采纳：`scope?: 'element' | 'page'`（缺省 element）。
4. **C4 向后兼容**：新键默认行为与旧版一致（Apple 新字段缺省 = 旧语义）+ 默认值保守化 + 历史数据文件。→ 本仓 v1 文档不迁移：既有全部规则（无 scope 字段）读作 element 级；页面级须显式声明（页面级规则从无 UI 入口，无真实存量数据）。
5. **1Password 同构先例**：`data-1p-ignore`（字段级）vs `data-op-ignore`（body 级）——同一动作词汇，作用域由挂载对象表达，与本票 scope 字段同构。

## 关键来源（本轮实际打开，节选）

- [1] Apple Password Manager Resources — github.com/apple/password-manager-resources（quirks 域名键全集、site-bound scoping、exact-domain-match-only）
- [6] Bitwarden「Forming URIs for Autofill」— bitwarden.com/help/uri-match-detection/（match detection 枚举 + 条目级覆盖）
- [7] Bitwarden「Autofill from Browser Extension」— bitwarden.com/help/auto-fill-browser/（Blocked domains；1.56 page-load 默认翻转事故）
- [11] 1Password 官网兼容设计指南 — 1password.dev/web/compatible-website-design（data-1p-ignore vs data-op-ignore 双作用域）
- [12] Chrome Help「Manage passwords」— 「Declined sites and apps」独立站点拒绝列表
- [16] KeePassXC Auto-Type 文档 — 窗口标题 `*` 通配（桌面语境，非网页 DOM）
- [18] IEEE ACSAC 2024《Leaky Autofill》doi 10.1109/acsac63791.2024.00037 — 放大/泄漏实证
- [22] 本地代码库 docs/adr/0003-site-rules-engine.md + src/rules/index.ts（与行业实现同构对照）

## 落选形态记录（防重复调研）

- 通配 selector '*' 作为页面级唯一形态：调研否定（主流不用；'*' 在元素匹配语境命中一切，恰是 forcedTier 放大路径）。
- 页面级语义直接移除：调研与票面均倾向显式建模（Bitwarden/Dashlane 保留站点级行为粒度）；且移除会使既有 S2/S3 覆盖断言失去承载。
