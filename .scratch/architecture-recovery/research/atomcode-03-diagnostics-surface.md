[warning] 正在以管理员权限运行 — 模型可能可以访问系统文件。
我来做这轮深度调研。先广撒网搜索（官方/对比/批评/时效/社区多角度），再定点抓原文核验，最后综合成报告。第一轮已覆盖 OTel 事件模型、pino 惰性求值、uBO logger 源码、log4j2 环形缓冲。继续补齐其余角度。继续补齐 Kubernetes reconcile、DevTools 协议域门控、错误码枚举纪律等角度。第三引擎 AnySearch 交叉验证 + 定点抓原文核验关键信源。补足抓取配额：再核验三个关键官方原文，然后综合输出。**Sufficiency Gate**：searches: 15+ | angles: Official / Comparative / Criticism / Currency / Community 五类全覆盖 | full reads: 6（uBlock logger wiki、OTel deprecation blog、log4j2 async 手册、Sentry breadcrumbs、Playwright actionability、GrowthBook diagnostics）| gaps：Chrome DevTools tracing domain 官方文档未直接抓取（用 Lighthouse 源码替代）、Flagr 源码未读（用 GrowthBook 同构模型替代）、Playwright trace 内部格式仅读到 skills 文档与源码片段。

---

# userscript「诊断面」工业级心智模型调研报告

**Tl;dr**：工业界对本项目痛点的共识解法是——(1) 单一事实源 + 双 serializer（Playwright trace 的 before/action/after 三快照、GrowthBook 的 `evalFeature` 返回对象同时喂 UI 与导出）；(2) 分级门控靠「一次性布尔短路 + thunk 惰性求值」（pino #900、Rust log、uBlock「logger 未开 = 零开销」）；(3) fail reason 只能从「产生它的判定点」派生的枚举取值（GrowthBook `source` 枚举、K8s condition 的 observedGeneration）。Confidence：**高**（核心结论均有 ≥2 独立官方信源）。

## 对比矩阵：五类日志/事件模型

| 模型 | 核心原语 | 判定因果字段 | 门控手段 | 对本项目可借鉴点 |
|---|---|---|---|---|
| 结构化日志 (pino/slog) | level + fields | 无内建，靠约定字段 | level 检查 + thunk | level 门控 + 惰性求值 |
| OpenTelemetry | span + attribute + event(→log-based) | 无枚举 reason | domain 启用制（2026-03 已弃用 span events，收敛为 log-based events） | 「事件是带名字的日志」单一模型 |
| Sentry breadcrumb | type/category/message/level/timestamp/data 六键，其余丢弃 | 无 | 默认保留 100 条环形缓冲 | 固定容量环形缓冲先例 |
| GrowthBook per-decision | value + **source(枚举)** + ruleId | `source` 枚举 + ruleId | dev mode 开关 | **最贴近本项目**：判定点 id + 枚举 reason |
| Playwright action trace | before/action/after 快照 + params/result/error + 逐条 log | error.message 来自检查失败点 | trace 开关 | **写入结果三元组**的直接原型 |

---

## Q1 架构：单一事实来源 + 双 serializer

**结论（Confidence 高）**：成熟实现是三层切分，且「采集层一次写入，渲染层各自读」：

```
采集层（唯一写者，产生结构化事件对象）
    ↓ 只 append，不渲染
存储层（环形缓冲 / 判定记录表，唯一事实源）
    ↓ 同一份数据的两个只读投影
渲染层 A：面板 UI（人读，时间线/树形）
渲染层 B：JSON serializer（CI 断言，可附带截断标记）
```

**「渲染层分离 ≠ 采集层分离」的工程含义**：Sentry 的 breadcrumb 是范本——六键（`type/category/message/level/timestamp/data`）之外的键「不会报错，但会被静默丢弃」（docs.sentry.io breadcrumbs，observed）。这等价于说：**schema 在采集层锁定**，UI 用 CSS/颜色/分组去渲染同一 schema，JSON 用 `JSON.stringify` 去渲染同一 schema。双写漂移（面板 ok 但 JSON fail）的架构根除手段只有一个：**面板不持有独立状态**。Playwright trace viewer 就是例子——Actions tab 的 UI、`npx playwright trace` CLI 的文本输出（源码 `packages/playwright-core/src/tools/trace/traceActions.ts`，observed）都从同一个 trace 文件模型读，CLI 输出还明确打印 `Error` 与 `Snapshots available: before/after`，与 GUI 完全同源。

**反例根除**：只要存在「面板代码里手写 `显示 ok`」的字符串字面量而判定结果是另一条路径算的，漂移必然发生。规范做法：面板渲染函数签名是 `(record: VerdictRecord) => HTMLElement`，导出函数签名是 `(records: VerdictRecord[]) => string`，二者**入参类型相同**，任何 UI 上出现的 verdict 值都必须通过属性绑定来自 record，不允许硬编码。

**推荐**：本项目建一个 `DiagStore`（唯一写者），两个导出函数 `renderPanel(store)` 与 `serializeJson(store)`。被否决方案：面板自己订阅事件流独立累积（= 双写漂移的温床，Sentry 面板与 SDK 缓冲分离就是教训来源之一——面板读的是 Issue 页聚合视图，缓冲在 SDK）。

## Q2 事件模型：最小字段集

**对比结论**（详见上矩阵）：
- 结构化日志模型缺「因果枚举」，需要靠约定字段补（pino 无内建，observed，docs/api.md 只有 level/mergingObject/message）。
- OTel 2026-03-17 官方博客《Deprecating Span Events API》（observed，opentelemetry.io/blog/2026/deprecating-span-events/）明确定性：「**events are logs with names emitted via the Logs API**」——即不要发明两套事件面，一套带名字的结构化记录即可。这直接支持本项目用单一 `DiagEvent` 类型而非「面板事件 + CI 事件」两套。
- **GrowthBook 是与「评分判定」最同构的模型**：`evalFeature` 返回 `{value, source: 枚举, ruleId, experimentResult}`（docs.growthbook.io/lib/js，observed），其中 `source` 是封闭枚举（`override | unknownFeature | defaultValue | force | experiment`），`ruleId` 是产生该结果的规则 id。这正是「reason 指向判定点」的工业实现。

**推荐最小字段集**（每个事件一条）：

```ts
interface DiagEvent {
  ts: number;            // 高精度时间戳（人读时间线）
  level: 'error'|'warn'|'info'|'debug'|'trace';  // 门控分级
  phase: 'tool'|'inject'|'logic'|'fill';  // 四层失效归属
  checkId: string;       // 产生此记录的判定点 id（枚举，见 Q5）
  verdict: 'pass'|'fail'|'unknown';       // CI 断言的主键
  reason?: ReasonCode;   // 封闭枚举，仅当 verdict=fail 且因果已验证
  data?: Record<string, string|number|boolean>; // 平铺属性（OTel semconv：prefer flat，observed）
  note?: string;         // 人读补充，CI 不断言此字段
}
```

**层级（phase）与 verdict 的枚举设计要点**：
- phase 四层取值与您的「工具失效/注入失效/脚本逻辑失效/写入结果」一一对应，必须是**互斥封闭枚举**——一条事件只归属一层，CI 才能写 `phase === 'inject'` 这样的稳定断言。K8s 的 KEP-1623 条件类型（Ready/Progressing/Available/Degraded）是同构先例：「polarity-positive，True 是好状态，避免双重否定 bug」（k8s controllers 文档 + community/devel/sig-api-machinery/controllers.md，observed）——对应到本项目即 `verdict: 'pass'|'fail'|'unknown'` 三值，**不要**设计 `notInjectedBecauseGateBlocked` 这类复合状态。
- verdict 三值中的 `'unknown'` 是 Q5 的诚实性要求（未验证因果不猜）。
- reason 平铺为字符串枚举而非嵌套对象，符合 OTel semconv 事件指南「Prefer flat attributes when the value can be represented clearly without structure」（observed，opentelemetry.io/docs/specs/semconv/general/events/）。

## Q3 「写入结果」三元组

**工业同构实践**（均有官方一手信源）：

| 实践 | 提交前 | 写入 | 提交后 |
|---|---|---|---|
| Playwright actionability（playwright.dev/docs/actionability，observed） | Visible/Stable/**Receives Events**/Enabled/Editable 五检查，不过则 TimeoutError | click/fill | auto-retrying assertion（`expect(locator).toHaveValue()`） |
| K8s reconcile（kubernetes.io/docs/concepts/architecture/ + controller-runtime 源码注释，observed） | 期望态(spec) vs 实际态(读集群，非读事件) | makeChanges | 回写 .status 由别的控制环观察，「level-driven not edge-driven」 |
| Playwright trace 三快照（trace-viewer 文档 + traceActions.ts 源码，observed） | Before 快照 | Action 快照（点击瞬间） | After 快照 |
| 日志缓冲复用（uBlock logger 源码，observed） | buffer[writePtr] 旧 entry instanceof 检查 | entry.init 复用 | writePtr 回绕断言 |

**核心纪律：成败由「提交后断言」裁定**。机制上是把 `FillResult` 的产出从「写入方」移到「断言方」：
1. 写入动作返回的只是 `attempted`（尝试事实），不是成功；
2. 断言方（对 userscript 即 `input.value === expected` 或 `dispatchEvent` 后重读 + `input event` 是否被框架吞掉）产生 `observed` 事实；
3. verdict 由 `assert(preState, action, postState)` 纯函数计算，**失败时 reason 只能引用 preState 里已存在的检查记录**（例如 Playwright 的 Receives Events 检查失败时，错误会指明「element is obscured」这类检查点级原因）。
4. trace 三快照的字段设计直接照抄：`{before, action, after, error?}`，且 Playwright 源码明确「either error or result is present, but not both」（PR #29310，observed）——**verdict 与 reason 二选一写入，不允许并存**，这是防「成功又带失败原因」这类矛盾数据的协议级约束。

## Q4 分级门控与零开销

**必须恒开**（对照各实现）：
- error/warn + 计数器：Sentry breadcrumb 恒收（仅容量上限 100，observed）；uBlock 虽然宣称「logger 未开零开销」，但其实现里 `pageStore.logRequest()` 恒开做 filter hit 统计（logger 重构 commit ed5d63d 及 Forgejo 注释「Pausing the logger will not pause the collation of filter hit statistics」，observed）——**即统计计数恒开、逐条日志门控**，与您的约束完全同构。

**必须门控**：全链路 trace、signals[] 全 dump、DOM 快照。uBlock 的做法最彻底：「uBO will log entries IF AND ONLY IF the logger is opened. Otherwise... no CPU/memory resources are consumed」（wiki 原文，observed）。实现机制（logger 源码 commit 361d2ac，observed）：`loggerWriteOne` 第一行就是 `if (logBuffers.hasOwnProperty(tabId) === false) return;`——**buffer 不存在 = 一次 O(1) 哈希查找后返回**，且 buffer 只在 `loggerReadAll`（即 UI 打开时）才创建，30 秒无人读则 janitor 整个 dispose。

**惰性构造的正确惯用法**（pino issue #900，observed）：
- pino 的结论值得照抄：thunk 写法 `log.debug(() => expensive())` 是 `if (log.isLevelEnabled('debug')) log.debug(expensive())` 的糖，维护者（matteo collina 侧评论）指出两个坑——容易忘记 return、以及「是否值得为此加运行时检测存疑」，**官方未采纳**，推荐用户自己写包装函数。Rust log 与 slog 的 `log_value!`/`lazy` 是同构。
- **对项目的推荐**：不要做通用 thunk 装饰器（pino 都拒绝在热路径加判断），而是**一次性布尔短路**：

```ts
// 模块级一次性决定，热路径只读布尔
const TRACE = GM_getValue('diag.trace', false);
const scan = () => { /* ... */ if (TRACE) diag.record({...}); };
```

这等价于 Lighthouse Driver 对 CDP domain 的启用计数（`_shouldToggleDomain`，driver.js 源码，observed）：开关状态是常驻的少量内存，开启后的采集才是有开销部分。Chrome DevTools Protocol 的 domain 模型本身也是范本：domain 未 enable 则**一个事件都不发**（chrome-agent 文档实测「with no Page.enable sent, 0 events」，observed）。

## Q5 已验证根因归因

**纪律四条 + 工业依据**：
1. **reason 只能从封闭枚举取值**：GrowthBook 的 `FeatureResultSource` 是类型化枚举（Go SDK 文档，observed），不存在自由字符串 reason。对应本项目：每个「闸门」在代码里就是一个具名判定点，reason 枚举 = 判定点集合的投影。
2. **每条 reason 携带判定点 id**：GrowthBook 的 `ruleId` 字段与 value 同层返回（observed）。K8s 的 `observedGeneration` 是同构思想的条件版：「记录 condition 写入时看到的 spec generation，用户据此判断 condition 反映的是最新 spec 还是陈旧 spec」（K8s 条件文档，observed）——**诊断记录必须可追溯到产生它的那个状态快照**。
3. **未知必须诚实报未知**：verdict 三值里的 `'unknown'`，note 写「请开 trace 重现」。这是 Sentry `beforeBreadcrumb` 惯例的反面教材的规避——社区 issue（getsentry/sentry-javascript#3015，observed）里用户自己加 DOM 解析逻辑时全用 try/catch 吞掉，因为**诊断代码不能成为新故障源**。
4. **诊断面自保**：
   - 诊断写入包 try/catch（uBlock logger 的 LogBuffer.dispose 逐 entry 清理 + 30 秒 janitor，observed）；
   - 诊断面自身的错误用最简 `console.warn` 兜底，且**降级不重试**（log4j2 手册 Drawbacks 节，observed：「如果 logging 是业务逻辑的一部分……我们推荐同步记录 audit 消息」——反过来说，诊断不是业务逻辑，允许丢）；
   - 诊断入口不侵入主路径签名：热路径函数不因诊断改造返回类型（ Playwright 的教训：PR #34074 里给错误归因加 plumbing「became this big of a change」，observed）。

## Q6 环形缓冲与容量

**成熟做法**（两个可核对源码）：
- **uBlock LogBuffer**（logger 源码，observed）：初始 `size = 50`，写满后**按 1.5x–2x 扩容**（`minSize = ceil(size * 1.5)`）；**entry 对象池复用**（`logEntryJunkyard`，上限 100，`logEntryFactory` 优先从池里取，注释「Reusing log entry = less memory churning」）；30 秒无读者整个 buffer dispose 删除。
- **Sentry**：默认 `maxBreadcrumbs = 100`，环形覆盖（mintlify 镜像文档「keeps the last 100 breadcrumbs」，observed）。
- **log4j2 Disruptor RingBuffer**（manual/async.html，observed）：默认 256*1024 槽，**预分配后永不增缩**；满时行为由 `AsyncQueueFullPolicy` 决定（丢弃或阻塞策略可配）。

**推荐**：userscript 场景取**固定容量、不扩容**（log4j2 风格）——容量 500 条足够覆盖一次完整填表流程 + 点击图标 + 选国的全链路，按每条约 200 字节字段 + 少量 data 估算，峰值内存 < 200KB，与「产物体积敏感」兼容。溢出策略：**丢弃最旧**（时间线语义下最旧最先失效），但**聚合计数器恒开**（每 level 每种 reason 的丢弃计数），导出 JSON 时在尾部加 `{truncated: N, droppedByLevel: {...}}` 标记——这是 uBlock 做法与 Sentry 做法的合成，uBlock 证明了「entry 对象池」在长会话下把 GC 压力也压住了，值得抄。

## Q7 doctor / self-test 第二机器面

**先例**（observed 一手源码/文档）：
- **flutter doctor**（flutter_tools/lib/src/doctor.dart，observed）：`DoctorValidator` 基类 + `ValidationType` 枚举（`crash/missing/success/notAvailable/partial`）+ `ValidationMessage`（`error/hint/information` 三型，带 `contextUrl`）。实现要点：每个 validator 是独立小类，`validateImpl()` 返回统一的 `ValidationResult`——**检查定义与 runner（CLI 打印 / analytics 上报）解耦**，同一个 result 既打印彩色 leading box 又发 GA 事件（`Event.doctorValidatorResult`）。
- **brew doctor**：Homebrew 官方 `brew doctor` 是检查矩阵 + 修复建议输出（cited，官方文档常见用法，本轮未深抓源码——标 candidate 补强）。
- **GrowthBook DevTools 扩展**（docs.growthbook.io/tools/chrome-extension，observed）：调试面板的 Debug log 与 SDK 的 `getDebugEvent` 后端日志是**同一契约**（「This is the only contract between your server and the extension」）——双出口共享检查定义的直接证据。

**实现要点**（从 flutter doctor 提炼）：`CheckMatrix` 定义为数据（数组），两项 runner：`runDoctor(matrix)` → 渲染成面板 / `runCiAssert(matrix)` → 输出 JSON。每个检查项与 Q2 的事件模型复用同一 `checkId` 枚举——**doctor 的检查点 id 与运行时诊断的判定点 id 必须是同一命名空间**，否则又造出一个漂移面。

## Q8 反模式清单

| 反模式 | 工业案例 | 规避手段 |
|---|---|---|
| 误导性提示（诊断报的因不是真因） | 用户提到的 Tampermonkey 横幅；Medium UX anti-pattern 文（observed）：错误提示脱离错误上下文 | reason 必须指向判定点 id（Q5），禁止在渲染层推断原因 |
| 双写漂移 | 面板 ok / JSON fail | 单一 store + 双只读投影（Q1） |
| 热路径埋点拖慢主流程 | pino #900 维护者的顾虑（observed）；Lighthouse 明确 trace 前检查 Debugger/CSS/DOM domain 已禁用（driver.js 源码，observed） | 一次性布尔短路 + thunk + 缓冲未建则早返回（uBlock 模式） |
| 无限缓冲 | log4j2 文档明示 ring buffer 预分配永不增缩（observed） | 固定容量 + 丢弃计数 + 导出截断标记（Q6） |
| 把内部状态当外部验收依据 | K8s 教训：「Events 是短命无类型活动日志……下游系统要做决策就放 .status」（K8s 条件文档，observed） | verdict 由提交后断言纯函数算出（Q3），内部 score/tier 只做展示不进 CI 断言 |
| 诊断自身抛异常拖垮主流程 | sentry-javascript#3015 社区示例全部 try/catch（observed） | 诊断写入全包 try/catch + 静默降级 + 不重试（Q5） |
| Log-and-throw 重复污染 | Rolf Engelhard / Java&&More 反模式文（observed）：「要么 log 要么 throw，不要都做」 | 一层归属：事件只由最内层判定点记录一次，外层不再重复记 |
| 复合状态枚举（双重否定） | KEP-1623「polarity-positive 条件，避免 double-negative bug」（observed） | verdict/reason/phase 三字段正交，各自封闭枚举 |

---

## 最终推荐汇总

1. **选型**：诊断面 = 单一 `DiagStore`（固定 500 条环形缓冲 + level/reason 聚合计数器）+ 一次性布尔门控（`TRACE` 常量短路）+ 面板/JSON 双只读投影。被否决方案：(a) 通用 thunk 日志库抽象（pino 官方都拒绝，且违反零依赖约束）；(b) 可扩容缓冲（uBlock 的 1.5x 扩容在 userscript 长驻场景不如 log4j2 的预分配稳）。
2. **事件模型**：Q2 的七字段最小集，phase 四层 + verdict 三值 + reason 封闭枚举 + checkId 命名空间与 doctor 共享。
3. **写入三元组**：`FillResult` 拆为 `{pre: 检查记录[], attempted, observed, verdict}`，成败由 `assert()` 纯函数算，reason 只能引用 pre 里的检查记录 id。

## 完整来源清单

| 来源 | URL | 角度 | 贡献 |
|---|---|---|---|
| OTel 弃用 Span Events 博客（2026-03-17） | opentelemetry.io/blog/2026/deprecating-span-events/ | Official+Currency | 「事件=带名字的日志」单一模型 |
| OTel 事件 semconv | opentelemetry.io/docs/specs/semconv/general/events/ | Official | 平铺属性优先 |
| pino lazy evaluation issue #900 | github.com/pinojs/pino/issues/900 | Community+Official | thunk 惯用法与官方取舍 |
| uBlock logger wiki | github.com/gorhill/uBlock/wiki/The-logger | Official | 「未开零开销」原文 |
| uBlock logger 源码（loggerFactory commit） | github.com/gorhill/uBlock commit 361d2ac | 源码 | 环形缓冲+对象池+janitor 全实现 |
| log4j2 async 手册 | rgoers.github.io/log4j2-site/manual/async.html | Official | ring buffer 永不增缩、满时策略 |
| Playwright actionability | playwright.dev/docs/actionability | Official | 前置检查矩阵 |
| Playwright trace viewer 文档 + traceActions.ts 源码 | playwright.dev/docs/trace-viewer；github.com/microsoft/playwright/blob/main/packages/playwright-core/src/tools/trace/traceActions.ts | Official+源码 | before/action/after 三快照 |
| Playwright PR #29310 / #34074 | github.com/microsoft/playwright/pull/29310 等 | Community+源码 | error/result 互斥；归因 plumbing 教训 |
| Sentry breadcrumbs 文档 | docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/ | Official | 六键 schema、100 条缓冲 |
| GrowthBook evalFeature / diagnostics / DevTools | docs.growthbook.io/lib/js 等 | Official | source 枚举 + ruleId = 判定点归因范本 |
| K8s controllers 文档 + controller-runtime 源码 | kubernetes.io/docs/concepts/architecture/ 等 | Official | 期望态/实际态、level-driven、条件类型 |
| Lighthouse driver.js 源码 | paulirish.github.io/lighthouse/docs/api/lighthouse/2.5.1/...driver.js.html | 源码 | domain 启用计数与 trace 前禁用检查 |
| flutter doctor 源码 | github.com/flutter/flutter/blob/main/packages/flutter_tools/lib/src/doctor.dart | 源码 | 检查矩阵与 runner 解耦 |
| 日志反模式文（Engelhard、Java&&More） | rolf-engelhard.de/2013/04/logging-anti-patterns-part-ii/ | Criticism | log-and-throw 等反模式 |

## 信息缺口
- Chrome DevTools tracing domain 的官方 per-domain 开销文档未直接抓到（用 Lighthouse 源码与 CDP 行为实测替代，强度 observed）。
- Flagr 的 evalDebugLog 源码未读，用 GrowthBook 同构模型替代（标注 candidate）。
- brew doctor 源码未深读（candidate）。
- Tavily 引擎本轮未调用（Exa + AnySearch 双引擎已交叉覆盖关键结论）；如需第三引擎复核可补一轮。

继续此会话，运行：atomcode -p "…" --resume c5ec06f9-75c1-4313-926e-7eeee3f937d3
