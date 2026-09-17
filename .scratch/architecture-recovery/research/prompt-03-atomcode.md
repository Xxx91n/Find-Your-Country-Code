# 深度调研请求：userscript 的「诊断面」工业级心智模型与轮子

## 背景（被调研对象的现状与约束）

项目：单文件 Tampermonkey userscript（TypeScript + vite-plugin-monkey 构建为单个 .user.js）。
功能：在任意网页上检测「国家区号」表单字段，注入一个图标按钮，点开面板选国家，自动填入选中的国家区号。
架构：多信号加权评分引擎（L0 语义标准层 → L1 结构文本层 → L2 锚关联层 → L3 选项内容验证层 → L4 排除层），输出 {score, tier, signals[]}；tier 分为 auto / lowkey / none。
已知缺陷（本次要解决的痛点）：
1. 全项目 console 调用点为 0；无 debug / trace / verbose 开关；无 doctor / self-test 入口。
2. 评分证据链 signals[] 算完后只写入私有 WeakMap，算完即不可达（用户与维护者都看不到「为何没识别到」）。
3. 三种静默失败无解释：(a) 无可信字段导致不注入图标——理由存在于多道闸门（input 类型闸门 / aria-hidden 闸门 / 国家选择器语义抑制 / 可见性闸门 / 分数不足）但从不上报；(b) 子帧点击图标无响应（fire-and-forget postMessage，无 ack 无超时）；(c) 选国后未填充（能报失败，但 FillResult 无 reason 字段，报不出「为何失败」）。
4. 用户要求：面板（人看）与机器可读输出（CI 断言）必须从同一份数据渲染。

## 硬约束（不得违背）

- 单文件 userscript：不新增运行时依赖（不接受任何 NPM 运行时包，含日志库）；产物体积敏感。
- 不重写评分引擎（signals[] 已存在，只需一条读出管道）。
- 诊断不得挂在运行热路径上：1000 节点规模单次 scan 必须 < 350ms，不得回退。
- 分级门控：error/warn 与计数器恒开（「默认零开销」指高开销诊断，不是零可观测）；只有全链路 trace 与 dump 门控。
- 环形缓冲必须有固定容量上限（长会话不得无限增长内存）。
- 任何 fail 记录的 reason 必须指向「已验证因果」，不得猜测（反例：Tampermonkey 的误导横幅）。
- userscript 菜单（GM_registerMenuCommand）在目标宿主无子菜单、无图标，故诊断入口必须收敛为一个菜单项。

## 需要你回答的问题

### Q1 架构：单一事实来源 + 双 serializer
工业界成熟实现如何做到「面板 UI 与机器可读输出从同一份数据渲染」？请给出可复用的分层（采集层 / 存储层 / 渲染层）边界，并说明「渲染层分离 不等于 采集层分离」的具体工程含义。反例：面板显示 ok 但 JSON 报 fail 的双写漂移如何从架构上根除？

### Q2 事件模型
一条诊断事件应包含哪些字段才能同时满足「人读时间线」与「CI 断言」？请对比：
- 结构化日志（pino / bunyan / slog）的 level + fields 模型；
- OpenTelemetry 的 span + attribute + event 模型；
- Sentry 的 breadcrumb + context 模型；
- Flagr evalDebugLog / GrowthBook 的 per-decision debug log 模型；
- Playwright trace viewer 的 action trace 模型。
给出一个适合本场景的最小字段集（含判定记录需要区分「四层」：工具失效 / 注入失效 / 脚本逻辑失效 / 写入结果），并说明层级与 verdict 的枚举应如何设计才可被 CI 稳定断言。

### Q3 「写入结果」三元组
「提交前状态 → 写入动作 → 提交后断言」这种三元组在工业界有哪些同构实践（如 Selenium/Playwright 的 actionability check、数据库事务的 pre/post condition、Kubernetes 的 reconcile 期望态/实际态）？如何让「写入动作」的成败由「提交后断言」裁定而非由写入方自报？

### Q4 分级门控与零开销
对比实现：
- uBlock Origin logger 的「未打开时零 CPU/内存开销」；
- Chrome DevTools 的 protocol domain 启用/禁用（tracing domain）；
- Android logcat / log4j2 RingBuffer / .NET EventSource 的 EventLevel 门控；
- 惰性构造（log.debug(() => buildExpensiveDump()) 的 thunk 惯用法，来自 pino / Rust log / OpenTelemetry lazy attributes）。
给出：哪些级别必须恒开、哪些必须门控、惰性构造的正确惯用法、以及如何用一次性布尔判断把热路径开销压到接近零。

### Q5 已验证根因归因
如何设计「fail 记录的 reason 必须指向已验证因果」？请给出工业界的纪律与实现手段（如：只允许从已知枚举中选择 reason、每条 reason 必须携带产生它的判定点 id、未知错误必须诚实报「未知 + 请开 debug」、以及「诊断面自身不得猜测」）。同时说明「诊断面自身可能成为新的失败面」时如何自保。

### Q6 环形缓冲与容量
固定容量环形缓冲在浏览器端诊断面中的成熟做法（容量取值依据、溢出策略：丢弃最旧 vs 聚合计数、导出时的截断标记、内存量级估算）。

### Q7 doctor / self-test 第二机器面
「面板 + doctor 双出口共享同一检查矩阵定义，仅 runner 不同」这一模式在工业界的先例（brew doctor / flutter doctor / mv3-doctor / Rails db:doctor 类）与实现要点。

### Q8 反模式清单
列出诊断面设计的常见反模式（误导性提示、双写漂移、热路径埋点、无限缓冲、把内部状态当外部验收依据、诊断自身抛异常拖垮主流程等），并给出规避手段。

## 输出要求

- 每个结论标注来源（官方文档 / 源码 / 规范），并标注证据强度：observed（亲见源码或文档原文）/ cited（引用他人结论）/ candidate（候选，未验证）。
- 给出明确推荐（选型 + 理由 + 被否决的替代方案）。
- 所有引用的实现必须给出可核对的出处（仓库路径 / 文档 URL / 文件行号）。
- 不凭记忆合成；不确定就标注 candidate。
- 用中文输出。