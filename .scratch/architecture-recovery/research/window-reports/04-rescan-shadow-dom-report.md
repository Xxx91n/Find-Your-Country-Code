# 窗口实施报告：04 — 可重评估扫描 + Shadow DOM 穿透

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/04-rescan-shadow-dom
> 开工复述：Blocked by: 02 —— 已确认解除（research/window-reports/02-scoring-engine-report.md 已落盘，评分引擎在 src/detect/index.ts 可见，_collect 测试缝按约保留）。必读 7 份（prompt → issue → handoff → misdetection-root-causes → atomcode-industry-models → industry-models → spec → WORKFLOW）已按序读全；现状代码（src/main.ts observe / src/detect/index.ts scan+_done+_collect / src/ui/index.ts attach）已直读。
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 cch/04-rescan-shadow-dom）。分支落位：本票改动 src/detect/index.ts、src/config.ts、tests/fp-regression.spec.ts 均承载于 cch/02 之上，按 §4.2「确有依赖按堆叠」执行：but branch new cch/04-rescan-shadow-dom --above cch/02-scoring-engine。

## 1. 设计（先于实现定稿）

### 1.1 Shadow DOM 穿透（open shadowRoot 递归遍历）

- 新增 `Detect._deepRoots(root)`：从传入根出发 BFS，对每个节点读 `shadowRoot` 属性（仅 open root 可读；closed root 属性为 null，与 atomcode 结论 10 一致——油猴环境无 chrome.dom API，closed 穿透属 spec Out of Scope），把发现的每个 shadowRoot 收入根集合并挂 per-root observer（§1.2）。
- `_collect(root, sel)` 测试缝保留原签名，改为对根集合逐 root 执行 `querySelectorAll(sel)`（每个 root 单独查询——跨 shadow root 的 querySelectorAll 标准 API 不支持，w3c/webextensions#647 与 industry-models M8 一致）；根集合可由 scan 一次计算后复用，避免每个选择器重复全树遍历。
- 宿主遍历成本：每次 scan 对每 root 一次 `querySelectorAll('*')` + 属性读，1000 节点级页面实测见 §4（数字）。
- 穿透范围即扫描范围：scan() 改为「一次 _deepRoots → 4 组候选选择器 × 每 root 收集 → _process」，原有选择器组（select / .iti input / .intl-tel-input input / input 组合）不变。

### 1.2 每 shadow root 单独 MutationObserver + 统一防抖

- 证据基线（M8 cited）：顶层 observer（document.body childList+subtree）看不到 shadow root 内部变更，必须对每个 open shadow root 单独 attach。
- `Detect.watch()`（由 main.ts init 调用，替代原内联 observe()）：
  1. 顶层 observer 挂 document.body：childList+subtree+attributes（attributeFilter 见 §1.3）；
  2. `_deepRoots` 每发现一个新 shadowRoot，`_observeShadow(root)` 对该 root 挂同配置 observer（Map<ShadowRoot, {mo, host}> 登记）；
  3. 所有触发源（顶层 mutation、shadow mutation、路由 hook、§1.4）汇入同一个 `scheduleScan()`：clearTimeout + 350ms 防抖后 `scan(document.body)`（350ms 防抖心智保留，常量化 RESCAN_DEBOUNCE_MS 于 config.ts）；
  4. 泄漏防护：每次 scan 前 `_pruneWatchers()`——host 已 `isConnected === false` 的 shadowRoot observer disconnect 并移出登记表（MutationObserver 对被观察节点持强引用，不清理则宿主移除后泄漏）；
  5. 防回环：attach/detach 产生的 wrapper 变更会被 observer 收到，但扫描对指纹未变的元素直接跳过（§1.3），收敛于一次空扫描。
- 原 main.ts 的 8×500ms 初始化轮询移除：attributes 观测 + shadow observer + 路由 hook 已覆盖其兜底场景（E2E 回归组验证）。

### 1.3 属性指纹快照重评（WeakSet 终态 → 双向纠正）

- `_done: WeakSet` → `_state: WeakMap<Element, {fp, kind, tier, score, signals, attached}>`。fp 只做"是否变化"判据，重评以 DOM 实况（`el.closest('.cch-wrapper')`）为 attach 真值，state.attached 仅辅助跳过路径的补挂判断。
- 指纹构成（评分引擎实际读取的信号面）：
  `tagName | name | id | class | type | placeholder | aria-label | data-name | title | autocomplete | inputmode | disabled | readonly | _isIti 结果 | label 文本 | SELECT options 摘要（数量+逐项 value=text）`
  - label 文本与 options 摘要纳入指纹：框架复用 DOM 常改 label 文案与 option 内容（React 复用 select 节点换 children），二者都是评分强信号。
  - 不含 value 属性值/位置/尺寸：值变化不影响"是否区号字段"的判定，避免输入过程触发无谓重评。
- observer attributeFilter 与指纹对齐：name/id/class/type/placeholder/aria-label/data-name/title/autocomplete/inputmode/disabled/readonly（options 变化走 childList+subtree 捕获）。
- `_process(el)` 重评决策表：

| 实况（wrapped = el.closest('.cch-wrapper') 存在） | 新判定 tier | 动作 |
|---|---|---|
| fp 未变 + state.attached=true + 已 wrapped | — | 跳过（等价旧 _done 短路） |
| fp 未变 + state.attached=true + 未 wrapped（站点/框架剥离了 wrapper） | — | 用 state 内缓存 tier/score 重新 attach（图标自愈） |
| fp 变化/新元素 → 重跑 _isIti + scoreElement | none | wrapped 则 UI.detach（**误挂移除**）；score≥25 登记可召唤 |
| 同上 | auto/lowkey | 未 wrapped 则 UI.attach（**漏挂补上**）；已 wrapped 但 tier 变化则 detach+attach 更新样式 |

- disabled/readOnly 不再前置短路：作为指纹一部分参与重评——字段被禁用 → 视同 none 档撤图标；重新启用 → 属性变化触发补挂。
- 附带修复（重评路径的前置条件）：
  1. `_own` 移除 `closest('.cch-wrapper')` 检查——旧实现依赖 _done 先短路，去掉 _done 后该检查会把已挂图标字段永久挡在重评之外；own 判定改为：#cch-pop/#cch-root 祖先、.cch-btn、#cch-si/#cch-search。
  2. `_label` 改用 `el.getRootNode()`（ShadowRoot 或 Document 都有 querySelector/getElementById）——shadow 内 label[for] 旧实现永远查不到（漏检路径 §3.1 的次生面）。
  3. `UI._lowFields` 强引用清理：scan 时剔除已断连元素；detach 时同步删除登记。

### 1.4 SPA 路由 hook（pushState/replaceState/popstate 定向重扫）

- `Detect.watch()` 内一次性：包装 `history.pushState`/`history.replaceState`（保 this、保返回值、保透传参数，调用后 scheduleScan）+ `window.addEventListener('popstate', scheduleScan)`。
- 路由切换后的新表单字段由下一次防抖扫描检出（全量 scan 兼作"定向"——scan 本身在防抖窗口内完成，见 §1.5 与 §4 实测）。
- 已知边界（记入 §6 风险）：Tampermonkey 沙箱模式下 window.history 可能与页面隔离，hook 未必拦到页面调用；popstate + MutationObserver 双通道兜底（路由切换必然伴随 DOM childList 变更）。E2E 以 Playwright 主世界注入验证语义。

### 1.5 性能基线方法（1000 节点防抖窗口）

- fixture `tests/fixtures/perf-1000.html`：静态 ~2000 节点（40 卡片 × 表格）+ 1 个真区号 select + 1 个 tel input + 注入按钮（再注入 200 节点含 1 个区号字段，触发增量重扫）。
- 测量口径：
  1. `scan()` 单次耗时：scan 内部计时，经 `window.__cchPerfHook(ms)`（可选探针，页面不设置即零开销）回传；
  2. 端到端重扫延迟：注入动作 → 图标出现的 wall time（含 350ms 防抖）。
- 断言：单次 scan 耗时 < RESCAN_DEBOUNCE_MS（350ms）= 「防抖窗口内完成扫描」；实测数字写入 §4。

### 1.6 UI 配套（最小增量）

- `UI.detach(el)`：低置信登记删除 → 若弹出面板锚在被拆 wrapper 内先关面板 → el 移回 wrapper 原位 → 移除 wrapper。与 attach 对称，失败安全（无 wrapper 直接返回）。
- `UI.attach` 增加 shadow 样式采纳：el 的getRootNode() 是 ShadowRoot 时，把 #cch-style 克隆进该 shadow root（document 级样式表不穿透 shadow 边界，否则图标无样式不可用）。

### 1.7 验收映射（issue 4 条 → 证据）

| issue 验收项 | fixture / 用例 |
|---|---|
| open shadowRoot 内区号字段检出并可注入 | tests/fixtures/shadow-dom.html（扩展：单层 + 嵌套 shadow），fp-regression.spec.ts shadow 组摘除 test.fail 转绿 |
| DOM 复用属性变更后重评（误挂移除/漏挂补上） | tests/fixtures/dom-reuse.html，rescan.e2e.spec.ts |
| 三种路由 API 触发重扫 | tests/fixtures/spa-router.html，rescan.e2e.spec.ts |
| 重扫防抖 + 1000 节点防抖窗口内完成 | tests/fixtures/perf-1000.html，rescan.e2e.spec.ts（实测数字 §4） |

## 2. 实现说明

| 模块 | 变更 |
|---|---|
| src/detect/index.ts | ① scan() 改为「一次 _deepRoots → SCAN_SELECTORS × 每 root _collect → _process」；② _deepRoots BFS 收集 body + 全部 open shadowRoot（seen 集合防御性去重），发现即 _observeShadow 挂 per-root observer；③ _collect(roots, sel) 对根集合逐 root 查询（保留测试缝签名，接受单根或根数组）；④ _done WeakSet → _state WeakMap<el, {fp, kind, tier, score, signals, attached}> + _fingerprint(el)（12 个评分读取属性 + disabled/readOnly/iti 标记 + label 文本 + SELECT options 摘要）；⑤ _process 重评决策表（fp 未变跳过 / 自愈补挂 / none→detach / auto·lowkey→attach / 档位变化重挂）；⑥ scheduleScan 统一 350ms 防抖 + _pruneWatchers 断连清理；⑦ watch()：body observer（childList+subtree+attributes 指纹属性面）+ history.pushState/replaceState 包装（保 this/透参/返回值）+ popstate 监听 |
| src/ui/index.ts | ① detach(el)：对称拆除（关面板→el 回位→移除 wrapper→清低置信登记）；② _pruneLow()：断连低置信登记清理；③ attach() 尾部：字段在 open shadow root 内时克隆 #cch-style 进该 root（document 样式表不穿透 shadow 边界，否则图标裸奔不可用） |
| src/main.ts | init() 收口为 Detect.scan + Detect.watch()；移除内联 observe() 与 8×500ms 初始化轮询（attributes 观测 + per-root observer + 路由 hook 已覆盖其兜底场景，E2E 回归组验证） |
| src/config.ts | RESCAN_DEBOUNCE_MS = 350（旧防抖心智常量化） |

实现期发现并修复的回归（E2E 红灯暴露）：重写 _process 时 iti 分支的 kind 曾被统一算成 'input'，导致面板填充走 input 策略、intl-tel-input 选中态不联动（fp-regression iti 用例确定性红 2/2 复现）——已恢复 kind='iti'（适配层三策略分发语义），该回归未进入任何提交。

## 3. fixture 断言结果（全部真实执行，28/28 通过）

| 验收项 | fixture / 用例 | 结果 |
|---|---|---|
| open shadowRoot 内区号字段检出并注入 | shadow-dom.html：单层 #shadow-code + 嵌套两层 #nested-code + shadow 内 label 评分链 #nested-label-input + 负例 #shadow-plain；fp-regression.spec.ts「shadow DOM 穿透（票 04，已转绿）」（06 票预留 test.fail 已摘除） | 4 图标注入、负例 0；PASS |
| DOM 复用属性变更重评（双向） | dom-reuse.html + rescan.e2e.spec.ts：① 区号 select 复用为月份枚举（name+options+label 全变）→ 图标移除；② 普通 select 复用为区号字段 → 图标补上；③ disabled 撤挂 → 重启用补回 | 3 用例 PASS |
| 三种路由 API 触发重扫 | spa-router.html + rescan.e2e.spec.ts：pushState / replaceState / popstate(page.goBack) 各懒渲染视图字段 → 图标出现；另有「路由 hook 引擎级归因」用例（perf 页无路由 handler、无 DOM 变更，仅调三 API，__cchPerf 扫描计数逐次增长 → 证明 hook 本身触发重扫） | 4 用例 PASS |
| 重扫防抖 + 1000 节点防抖窗口 | perf-1000.html + rescan.e2e.spec.ts：静态 ≥1000 节点检出 + 增量注入 200 节点后新字段检出 + 单次 scan 耗时 < 350 断言 | PASS |

实现期 fixture 自身缺陷两处（修复后转绿，如实记录）：dom-reuse 月份值 1..12 中 1/7 属真实拨号表且 name 未改导致 kw 分仍在 → 评分留 lowkey 档（改为同步替换 name）；spa-router 三个视图误共用同一字段 id 模板（rs-code/po-code 实际不存在）→ 参数化 codeHtml(id)。

## 4. 性能实测（probe-perf-04.mjs，两轮）

| 指标 | 第 1 轮 | 第 2 轮 |
|---|---|---|
| 静态节点数 | 1183 | 1183 |
| 初始单次 scan 耗时 | 62ms | 49ms |
| 增量注入后节点数 | 1292 | 1292 |
| 全程单次 scan 峰值 | 62ms | 49ms |
| 点击注入 → 图标可见 wall time | 840ms | 834ms |
| 防抖窗口 RESCAN_DEBOUNCE_MS | 350ms | 350ms |
| 单次 scan < 防抖窗口 | ✓ | ✓ |

wall time ≈ 350ms 防抖 + 2 次防抖重排（attach 写 DOM 触发的变更与本次扫描合并重排）+ Playwright 轮询粒度；单次 scan 峰值 ~50-62ms 是「防抖窗口内完成扫描」的直接证据，5-7 倍余量。

## 5. 验收命令与退出码

| 命令 | 结果 | 退出码 |
|---|---|---|
| npm run build | vite ✓（11 modules，dist 60.42 kB） | 0 |
| npx playwright test | 28 passed (24.8s)：含票 06 全部既有回归 20 例 + 本票新 8 例 | 0 |
| node .scratch/architecture-recovery/research/scripts/verify-ticket-04.mjs | 引擎级门 12/12（穿透 A1-A4 / 双向重评 B1-B6 / iti kind C1 / 装配 D1） | 0 |
| node .scratch/architecture-recovery/research/scripts/verify-ticket-02.mjs | 02 票回归门 36/36（重写后评分行为无漂移） | 0 |
| node .scratch/architecture-recovery/research/scripts/probe-perf-04.mjs | 性能基线 JSON（§4） | 0 |

## 6. 偏离点与风险

**偏离（本地适配）**
1. 仓库无 .gitattributes、core.autocrlf=true：未做全仓 CRLF 归一——全仓归一会触碰 4 条并行分支的共同文件（01-06 均改过 src/tests），冲突风险大于收益；autocrlf=true 保证提交 blob 归一为 LF（HEAD 全 LF，无换行 churn）。留待大脑收口时统一处置。
2. 移除 main.ts 8×500ms 初始化轮询（设计内决策，非默认保留）：由 attributes 观测 + per-root observer + 路由 hook 接管；E2E 28 例全绿背书。
3. 观测面从 childList 扩为 childList+attributes(指纹属性面)：属性变化是重评触发源（验收 2 的前提）；代价是忙页防抖后空扫描更频繁，实测单次 ~50ms 级可承受。

**风险（如实呈报）**
1. Tampermonkey 沙箱模式下 window.history 可能与页面隔离，pushState/replaceState 包装未必拦到页面调用——popstate 与 MutationObserver 构成双通道兜底；「引擎级归因」用例证明 hook 在主世界语义下对三 API 均触发重扫。
2. 已连接宿主上事后 attachShadow（无任何 DOM mutation）不可观测——真实框架在自定义元素构造期 attachShadow，宿主插入即有 childList 变更可捕获；纯事后挂载属已知盲区（与 KeePassXC 同限）。
3. 用户手动召唤的图标在指纹变化重评为 none 档时会被移除（重评真值优先），需再次召唤；量级低，若反馈不佳可在 _state 加 summoned 标记豁免。
4. L2 锚查询（ownerDocument.querySelectorAll('input[type=tel]')）不穿透 shadow root——shadow 内字段的锚分查不到同页 shadow 内 tel 主号（spec 未列、本票不扩）；fixture 已用 light-DOM 锚真实对齐此语义，记为后续票候选。
5. 全页 attributes 监听对高频样式类切换页面（动画库）会以 350ms 节奏产生空扫描——防抖兜底 + 指纹跳过使空扫描成本 ≈ _deepRoots 遍历（~50ms/千节点级），如遇极端页面可在 attributeFilter 收窄。
