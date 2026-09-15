# Cycle-6 Spec — 可配置、可解释、可证明

> Brain Agent | 2026-09-16 | Input: `.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016）+ `.scratch/architecture-recovery/decision-ledger.md`（A-026…A-033）+ `report/architecture-review-cycle6.html`
> Previous cycle: Cycle-5 spec 已归档 `spec-cycle5.md`（票 36–45）

> **对账闸**：A-026…A-033 共 8 条均有票去向（见 `decision-ledger.md` §去向登记）；**无去向记录 0 条**。

> **数据源纪律**：本 spec 的每条结论均来自上述两份账本；未从对话回忆补充任何结论。

---

## Problem Statement

Cycle-5 把「送达 + 可见 + 可信」做完了（v1.6.0 已发布、账本 15/15 implemented），但两个用户可见的失效仍然存在，且它们形状相同：**功能已经写进代码，但没有对用户可达的「配置面」，也没有对人与 CI 可读的「解释面」**。

1. **语言设置存在但找不到（A-026 / A-027）**：语言控件 `#cch-locale-tg` 确实存在，但它住在语义标签为「站点规则」的视图里，排在豁免/规则/低调样式**之后**的滚动区底部；GM 菜单只有「打开面板」与「恢复本站检测」两项，**没有任何零置信度入口通向设置**。且切换语言走 `_applyLocaleText()` **手工逐项重写 6 处**，已实测漏刷 3 处（收藏行 `title`、空态文案、图标 `title` 从未本地化）；已注册的 GM 菜单标签**只求值一次**，运行时切换后不更新。用户原话：「依旧没有能设置 i18n 选择脚本语言的地方」。

2. **脚本不会解释自己（A-028）**：`src/` 全目录 `console.` 调用点为 **0**；无 debug 开关；无诊断入口。评分证据链 `signals[]` 算完后只写入私有 `WeakMap` 与 `_lowFields`——**算完即不可达**。三种静默失败均无解释：无可信字段→无图标（理由存在于多道闸门但从不外显）、子帧点图标无响应（fire-and-forget，无 ack 无超时）、选国未填充（能报「失败」但不报「为何失败」）。

3. **指定网页上「工具是否生效」无证据（A-029 / A-030）**：真实站点层 18 项用户可见工具面**只验证 2 项**，且均为存在性弱断言；harness 全文**无任何交互原语**（`.click(` / `.fill(` / `locator(` 零命中），GM 替身为空函数。核心价值「选国→填充」在真实站点上**从未被验证过一次**。且密封层本身也没有可复用交互原语层——`tests/helpers/userscript.ts` 仅 48 行 / 4 个导出。

4. **两处检测形态缺口（A-031 / A-032）**：iti v29 内部搜索框（真实误报面）、值恰为 ISO2 的语言下拉（伪区号陷阱）、无括号区号文本（L3 漏此形态）；视觉替换型隐藏 select 的实测机理（Select2 `width:1px + aria-hidden`）与语料 N7 假设不符。

5. **域建模债（A-033）**：「发布门」这一新机制无 ADR；CONTEXT.md 缺本轮确立的 7 条术语。


## Solution

一轮「**可配置 + 可解释 + 可证明**」周期，按 D-001 的**两阶段**推进（先建验证能力，再由失效清单驱动修复），共 **9 个 message 步骤 / 6 个波次**（见 `.scratch/cycle6-grill/goal-and-messages.md`）：

- **可配置**：GM 菜单新增「设置」项（补上唯一零置信度入口）+ 语言控件改三选一显式控件 + 字典化全量重渲染 + 入口负责把目标行滚入视野并高亮衰减。**不新建独立设置视图、不重排顺序**。

- **可解释**：建一份**结构化诊断事件流**作唯一事实来源，面板（人看）与机器可读输出（CI 断言）是同一数据的两个 serializer；覆盖检测→注入→面板→填充**全链路四层判定**；重诊断进独立诊断视图，既有界面只做入口与摘要；**分级门控**（error/warn 与计数器恒开，全链路 trace 门控且惰性构造）。

- **可证明**：先把验收面与断言阶梯定义清楚（17 项验收 + 1 项诊断；L0–L4 五级；真实站点跑全阶梯），再建 harness 交互原语，再建**形态语料三层架构**（镜像页断言主力 + 结构骨架 + 原始快照库外），最后把真实站点层升到全阶梯并加**发布门**。

核心取径：**先让用户找得到，再让用户看得懂，最后让 CI 证得了。**
## User Stories

### 设置可被找到（A-026 / A-027）

1. As a user who cannot find the language setting, I want a userscript-menu entry that opens the settings, so that I am not dependent on finding a small icon. （A-026）
2. As a user, I want that settings entry to be reachable with zero field confidence, so that it works on pages where no country field is detected. （A-026）
3. As a user, I want the interface-language control to be an explicit three-way choice (Auto / 中文 / English), so that I can see all options instead of cycling blind. （A-026）
4. As a user, I want the settings entry to scroll the language row into view, so that I do not have to hunt for it. （A-027）
5. As a user, I want the language row to be highlighted briefly after I arrive, so that I can orient myself. （A-027）
6. As a user, I want every piece of UI text to switch language immediately, so that no part stays in the old language. （A-027）
7. As a user, I want the userscript menu labels to follow my chosen language without reloading the page, so that the setting feels applied. （A-027）
8. As a screen-reader user, I want the icon's tooltip and accessible name to be localised, so that I get the same language as everyone else. （A-027）
9. As a user, I want my language choice to persist across reloads, so that I do not set it twice. （A-027）
10. As a user, I want the language preference stored separately from favourites and site rules, so that clearing one cannot corrupt the other. （A-027）

### 失效可被解释（A-028）

11. As a user on a page where no icon appeared, I want to know which gate blocked it, so that I can decide whether to override. （A-028）
12. As a user, I want the diagnostic view to light up layer by layer, so that the first dark layer is the answer. （A-028）
13. As a user whose click on the icon did nothing, I want a visible explanation rather than silence. （A-028）
14. As a user whose selected country did not fill the field, I want to know why it failed. （A-028）
15. As a user, I want every failure reason to point at a verified cause, so that I am not sent chasing the wrong switch. （A-028）
16. As a user reporting a bug, I want to turn on a debug switch, reproduce, and export a machine-readable record, so that I can hand over evidence. （A-028）
17. As a user, I want error/warn records and counters always available, so that there is an initial clue even with debug off. （A-028）
18. As a user, I want diagnostics to cost nothing when off, so that normal browsing is not slowed. （A-028）
19. As a user, I want the diagnostic buffer bounded, so that a long session cannot grow memory without limit. （A-028）
20. As a maintainer, I want the same diagnostic record to drive both the panel and the machine-readable output, so that the two can never disagree. （A-028）

### 工具生效可被证明（A-029 / A-030）

21. As a maintainer, I want one shared set of interaction primitives, so that the sealed and live harnesses drive the same way. （A-029）
22. As a maintainer, I want to drive open → search → select → fill and read back the host field's value, so that "the tool works" is proven by the page, not by the script. （A-029）
23. As a maintainer, I want the GM stub to record callable menu commands, so that menu-driven behaviour is testable. （A-029）
24. As a maintainer, I want the acceptance surface enumerated as 17 acceptance items plus 1 diagnostic item, so that "all tools" has a concrete definition. （A-030）
25. As a maintainer, I want each acceptance item judged only by externally observable outcomes, so that self-reported status cannot pass a test. （A-030）
26. As a maintainer, I want the assertion ladder defined as L0–L4 with layer ownership, so that every test knows its ceiling. （A-030）
27. As a maintainer, I want persistence (survives reload) to be a criterion for every stateful tool, so that "I own this setting" is actually verified. （A-030）
28. As a maintainer, I want the cross-frame chain asserted at both ends, so that a broken message can never pass. （A-030）
29. As a maintainer, I want owned designated pages derived from real page shapes, so that deep interaction runs on a controllable surface. （A-030）
30. As a maintainer, I want mirror pages as the in-repo assertion surface, structural skeletons as the long-lived structure baseline, and raw snapshots archived outside the repo, so that fidelity, determinism and licence exposure are each handled by the right artefact. （A-030）
31. As a maintainer, I want the corpus to carry a fingerprint and provenance manifest, so that a stale archive cannot silently rot. （A-030）
32. As a maintainer, I want a degradation loop (re-capture → structural diff → version bump → replay self-check), so that site redesigns are detected instead of discovered by users. （A-030）
33. As a maintainer, I want the real-site layer to run the full ladder but stay advisory, so that deep evidence exists without flaky third-party pages blocking merges. （A-029）
34. As a maintainer, I want a release gate that refuses to publish while the real-site layer is red and unacknowledged, so that "green" means something at the moment it matters. （A-029）
35. As a maintainer, I want unreachable or challenged targets parked as observe with a reason and ticket, so that the page list stays honest. （A-029）

### 检测形态缺口（A-031 / A-032）

36. As a maintainer, I want the three newly-found detection shapes sunk into the calibration corpus first, so that any later detection change has a measurement basis. （A-031）
37. As a maintainer, I want both visual-replacement hiding mechanisms (width:1px+aria-hidden and display:none) to have fixtures, so that the corpus assumption matches reality. （A-032）

### 域建模（A-033）

38. As a future maintainer, I want an ADR explaining why the release gate binds to a flaky third-party layer, so that I do not re-litigate it. （A-033）
39. As a future agent, I want CONTEXT.md to carry the seven new terms, so that the vocabulary I read matches the decisions made. （A-033）
## Implementation Decisions

### S-01 设置面收口　**覆盖 A-026 · A-027**

- GM 菜单新增「设置」项（唯一零置信度入口，不依赖页面有无字段）；面板头部 ⚙ 保留为页内入口。
- 语言控件由循环按钮改为**三选一显式控件**（自动（跟随浏览器）/ 中文 / English 并列可见）。
- 切换语言后走**字典化全量重渲染**（给节点打 `data-i18n`，统一重渲染），**替代**现有的 `_applyLocaleText()` 手工逐项刷新。
- 菜单命令改用 `GM_registerMenuCommand(name, fn, { id })` 的 **id 原地更新**，使切换后无需重载即跟随。
- 补齐未本地化文案：图标 `title`/`aria-label`、收藏行 `title`、空态文案；把 `main.ts` 中就地双语三元表达式收编进 MSG 表。
- 入口负责把语言行**滚入可见区 + 高亮脉冲后衰减**；深链目标用**稳定标识符**（不绑内部实现名或易变排序位置）；面板已开时**原地复用并应用新参数**（不重复入栈、不清返回栈）。
- **不新建独立设置视图、不重排设置顺序**（用户裁定 ③）。
- 语言偏好经 `UI_PREFS_KEY` 独立键持久化，与收藏/规则键解耦。

### S-02 诊断面　**覆盖 A-028**

- 一份**结构化诊断事件流**作为唯一事实来源；面向用户的面板与面向自动化的机器可读输出是同一数据的**两个 serializer**（渲染层分离 ≠ 采集层分离）。
- 覆盖到「写入结果」的**全链路四层判定**：工具失效 / 注入失效 / 脚本逻辑失效 / 写入结果（提交前状态 → 写入动作 → 提交后断言 三元组）。
- 界面分层：**独立诊断视图**承载重诊断（决策链时间线 + 过滤器 + 导出）；**既有界面**只做入口与摘要（总健康状态 + 当前页各工具生效与否一行摘要 + 「打开完整诊断」）。
- 入口收敛为**一个** GM 菜单项打开诊断面板（不为每个诊断功能各设菜单项）。
- **分级门控**：error/warn 与计数器**恒开**；全链路 decision trace 与 dump **门控**；昂贵诊断数据**惰性构造**；记录进**固定容量环形缓冲**。
- 任何 fail 记录的 `reason` 必须指向**已验证因果**（不得猜测）。
- 诊断不得挂在运行热路径上拖慢扫描（1000 节点 scan < 350ms 不回退）。

### S-03 验收面与断言阶梯定义　**覆盖 A-029 · A-030**

- 验收面 = **17 项用户可见工具** + **1 项诊断**（`__cchLastFill` 按 D-002 降为诊断项、移出验收面）。
- 每项的裁定权在**页面侧外部可观测结果**（DOM 变化、字段 `value` + `input/change` 事件、面板可见性、异常计数）；脚本自报只进日志/诊断面板。
- 断言阶梯五级：**L0 静默健康**（pageerror=0，永不单独算生效）/ **L1 元素已注入** / **L2 交互可驱动** / **L3 写入结果正确 + 持久化** / **L4 用户反馈出现**。
- **L4 纳入自动化断言面**（用户裁决覆盖调研的「L4 不自动化」建议）。
- **持久化（reload / 重开面板后效果仍在）为每项有状态工具的通用判据**。
- **跨隔离上下文链路单列为独立验收项**，且必须断言链路**两端的写入结果**。
- 层归属：**owned 可控页跑 L0–L4 全量（PR 阻断）**；**真实站点跑全阶梯但 advisory**。
- 环境真实性：L2 以上必须在**真实浏览器 runtime**；headless 必须 **full Chromium**（headless_shell 加载不了扩展会静默空转仍全绿）。
- **完整定义**：`tests/ACCEPTANCE-SURFACE.md`（票 01 交付；17 项逐项外部可观测判据 + L0–L4 阶梯与逐级层归属 + 持久化通用判据 + 跨上下文双端断言 + 环境真实性；测试侧单一来源）。

### S-04 harness 交互原语　**覆盖 A-029**

- 从**密封层起**建可复用交互原语层（现状 `tests/helpers/userscript.ts` 仅 48 行 / 4 导出，密封层本身就没有原语层）。
- 原语集：inject / open-panel / search-type / select-country / fill-field / feedback。
- 密封与 live 两个 harness **收敛为同一份原语**（不新造第二套）。
- GM 替身改为**记录 `{title, fn}` 并可调用**（现为空函数）。
- 断言改 **web-first** + **`expect.soft` 一次收全量**（第三方页一次访问成本高，能收的信息应一次收完）。

### S-05 形态语料三层架构　**覆盖 A-030**

- ① **镜像页**（入 git，测试主力；去品牌 / 去追踪 / 内容替换，断言确定性最高）。
- ② **结构骨架**（入 git，长期结构断言基线）。
- ③ **原始快照**（**库外**档案：SingleFile HTML + WARC + 截图）；**库内只留 SHA256 指纹与元数据清单**（`source_url` / `captured_at` / `mirror_of` / `license_note`）。
- 目录**适配 ADR-0006 条款 5 的单一 `tests/` 根**（`tests/corpus/forms/`）；库外档案**复用既有的仓库外 archive 模式**，**不引入对象存储/S3**。
- 命名**「形态语料」**，与既有「校准语料」在语义轴上正交。
- **退化回路**：定期重捕 → **确定性结构 diff（非像素 diff）** → 分级 bump 版本 → **回放自检**。
- 纪律：**绝不为修绿而盲目更新快照**。
- 合规口径：只采公开页 / 剥离品牌内容 / 标 `source_url` + `captured_at` / 不含真实 PII。

### S-06 真实站点层全阶梯 + 发布门　**覆盖 A-029**

- 真实站点层按**全阶梯（含 L4）**运行。
- 仅由 `schedule`（周）+ `workflow_dispatch` 触发，**不进 `pull_request` 触发面**。
- 失败**只告警不阻断合入**。
- `release.yml` 加**发布门**：真实站点层最近一次运行必须为绿，或失败已被**显式 ack 并立票**，否则不出包。
- 已知不可达/被挑战的条目以 `observe` 长期挂账，**强制携带非空 reason + ticket**。

### S-07 域建模　**覆盖 A-033**

- 为「发布门」立一条 **ADR**（PR 不阻断 / 发布门阻断的取舍与替代方案）；**不重开 ADR-0008 第二层**。
- CONTEXT.md 补入 **7 条术语**：验收阶梯 · 发布门 · 形态语料 · 结构骨架 · 镜像页 · 诊断面 · 判定记录。
- 术语**不含实现细节**；入库前与既有 29 条逐条比对无冲突；7 条为上限。

### S-08 阶段 B 失效驱动修复　**覆盖 A-031 · A-032**

- 按 D-001 的**阶段 B**：用 S-03–S-06 跑出的**失效清单**驱动修复。
- A-031：三个新形态（iti v29 内部搜索框 / ISO2 语言下拉 / 无括号区号文本）**先入语料再评估**。
- A-032：视觉替换型隐藏 select 的**两个子形态各建 fixture**，并据实修正语料 N7 的机理假设。
- **本周期不预先立独立修复票**；不得据此直接改检测代码。

### S-09 收口　**（不承载 A；收口层）**

- 账本结算（A 台账 + D 账本终态）+ 生成本轮归档 handoff。

## Testing Decisions

- **好测试只断言外部行为**：注入后 DOM 状态、面板可达性、字段 `value` + 事件、门可执行性、workflow 触发面、版本一致性；不断言实现细节。
- **分层（测试塔）**：塔基 引擎 harness / 校准语料（mock DOM）→ 塔身 密封 fixture E2E（真 Chromium + 出厂产物）→ 塔尖 真实站点全阶梯（advisory）→ 塔外 cron 合成监控。
- **升塔纪律**：发现塔身未覆盖的真实形态，**先沉淀为 fixture 再修脚本**；真实站点用例只升不降。
- **先例（prior art）**：`tests/scripts/14-lib-engine.mjs` 装载器 · `tests/live/site-manifest.json` 站点清单 · `tests/*.spec.ts` 密封 E2E · `tests/helpers/userscript.ts` 注入 helper · `tests/corpus/manifest.json` 校准语料。
- **证据铁律**：每票验收锚定 commit sha + CI run ID；报告自述不算证据。

## Out of Scope

- **A-031 / A-032 的检测修复本周期不预先做**——按 D-001 交阶段 B，由验证清单驱动。
- **ADR-0006 条款 5 不重开**——语料适配到单一 `tests/` 根，不新增顶层 `corpus/`。
- **ADR-0008 第二层不重开**——真实站点层仍 advisory，不进 `pull_request`。
- **不引入对象存储/S3**——复用既有仓库外 archive 模式。
- **不改依赖钉死策略**（ADR-0006 条款 4）。
- **CONTEXT.md 不写实现细节**（指纹清单 / 退化回路步骤不入词汇表）。
- **不重写已归零的历史**（不可逆）。

## Further Notes

- **本周期两条调研建议被用户裁决覆盖**（辩证披露）：① 调研建议「L4 不自动化」→ 用户裁定**自动化**；② 调研建议「真实站点止于 L0–L1」→ 用户裁定**跑全阶梯**。
- **一条大脑假设被证伪**：「GM 菜单文案在持久化语言应用之前求值」经子代理实物核验为 **REFUTED**（`main.ts:18` 先 createUI、`:135-137` 后注册菜单）——未立票，改立真缺陷「运行时不可更新」。
- **术语条数 5 → 7**（D-013，含「诊断面」「判定记录」）。
- **波次由 issue 的 `Blocked by` 字段推导**（不新造顺序），波次表写入 `README.md`。
- 本周期为 **8 条 A 记录 / 16 条 D 决策**（13 current + 3 revised）；A 台账与 D 账本均已落盘。
