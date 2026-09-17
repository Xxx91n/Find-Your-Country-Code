# 窗口实施报告 — 票 24: Security Hardening (postMessage Origin + SCAN_SELECTORS Dedup)

> 实施窗口(返工轮) | 2026-09-11 | 分支 `cch/24-security-hardening`(堆叠 `cch/23-ts-strict-typecheck`,祖先链含 cch/22 死代码基线与 cch/20 迁移脚本)
> 版本控制遵循 WORKFLOW §4.2;构建/测试证据只认 CI run(CI-only 政策)。

## 返工轮次(总述)

首轮窗口报告标记"完成",但首脑复核(`verification/review-wave1-cycle3.md`)判定 **🔴 严重不合格 — 返工**:
- AC1 postMessage origin 校验 ✗(3 处仍 `'*'`,ui 无 `e.origin`/`location.origin`)
- AC2 BroadcastChannel origin 校验 ✗(store 无 `origin` 引用)
- AC3 SCAN_SELECTORS Set 去重 ✅(复核时检出 `Set(...SCAN: true`)
- 独立分支 ✗(cch/24 不存在,违反 §4.2,复核 V2)
- 首轮回执文件 `24-security-hardening-report.md` 实际不存在(ENOENT 实证),本文件为该路径首份。

**本轮取证新发现**:磁盘现状 AC3 也已回退(`for (const sel of SCAN_SELECTORS)` 原样)——首轮改动堆积在 uncommitted 工作区,随并行窗口工作区重组(`but pull`/堆叠变更)丢失。复核"✅"取证于丢失前的磁盘态。故本轮 **三项全部重新实现**,且当轮即拆独立分支提交,消除 uncommitted 悬挂面。

## 0. 开工门槛复述

- 返工失败项:AC1 postMessage origin ✗ + AC2 BroadcastChannel origin ✗ + 无独立分支 ✗(复核 V1/V2)。
- 必读五件已读:复核报告(review-wave1-cycle3.md)、handoff 24、issue 24、spec.md、WORKFLOW.md §4.2(另:上窗已读 ADR-0005、`but` skill)。
- `but status` 定位结果:票 24 无任何已提交改动;工作区 uncommitted 仅剩大脑产物与并行窗口 workflow 文件;src 基线 = cch/23 栈顶。

## 1. 变更清单与 before/after diff(提交 b57a25d,4 文件 +36/-1)

### src/main.ts (+/-)

```diff
--- a/src/main.ts
+++ b/src/main.ts
@@ -39,18 +39,41 @@ function init() { Store.init(); UI.css(); Store.subscribe(() => {
 // 票 12 帧治理：每帧各自检测与填充（行为同源）；面板宿主仅顶层渲染。
 // 子帧图标点击 → postMessage 请求顶层代开面板；选中国家 → postMessage 回子帧执行 Fill.run。
 // 跨帧存储一致性（收藏/站点规则）复用既有 GM 存储 + BroadcastChannel + GM_addValueChangeListener（不新造第二套）。
+// 票 24 安全加固：入站 origin 校验辅助——跨域子帧回退锚点。跨域下无法读子帧 origin 预期值，
+// 但引用比较合法：要求发送方是本页面嵌的 iframe/frame 窗口，挡掉弹窗/无关 window 伪造消息。
+function isEmbeddedFrame(source: MessageEventSource | null): boolean {
+  if (!source) return false;
+  try {
+    const frames = document.querySelectorAll<HTMLIFrameElement>('iframe, frame');
+    for (let i = 0; i < frames.length; i++) {
+      if (frames[i].contentWindow === source) return true;
+    }
+  } catch {}
+  return false;
+}
+// 顶层与本帧是否同源（跨域时读 top.location.href 抛 SecurityError）
+function isTopFrameSameOrigin(): boolean {
+  try { return !!window.top && window.top !== window.self && typeof window.top.location.href === 'string'; }
+  catch { return false; }
+}
 if (IS_TOP_FRAME) {
   // 顶层：监听子帧开面板请求，代开远程面板（合成居中锚点，无本地目标字段）
   window.addEventListener('message', e => {
     const m = e && e.data;
     if (!m || m.__cch !== FRAME_TAG || m.type !== FRAME_OPEN_MSG) return;
     if (e.source === window) return; // 忽略自身
+    // 票 24：入站 origin 校验——同源子帧强制 e.origin === location.origin；跨域子帧（票 12 全帧治理，
+    // targetOrigin '*' 不可避免）退化为「本页面嵌入 iframe」来源锚点。
+    if (e.origin !== location.origin && !isEmbeddedFrame(e.source)) return;
     UI.open(null, null, null, { remoteSource: e.source as Window | null });
   });
 } else {
   // 子帧：监听顶层回传的填充/负反馈指令，对 _requestRemoteOpen 登记的 pending 字段执行
   window.addEventListener('message', e => {
     if (e.source !== window.top) return; // 只接受顶层指令
+    // 票 24：顶层同源时强制 e.origin === location.origin；顶层跨域（票 12 fixture 场景）与本帧 origin
+    // 天然不同，无法同源比对，保留 e.source === window.top 唯一锚点（'*' 回发不可避免，见 ui/index.ts 注释）。
+    if (isTopFrameSameOrigin() && e.origin !== location.origin) return;
     const m = e && e.data;
     if (!m || m.__cch !== FRAME_TAG) return;
     if (m.type === FRAME_FILL_MSG) {
```

### src/store/index.ts (+/-)

```diff
--- a/src/store/index.ts
+++ b/src/store/index.ts
@@ -59,6 +59,8 @@ const Store = {
       try {
         this._bc = new BroadcastChannel('cch-favs-sync-v1');
         this._bc.addEventListener('message', e => {
+          // 票 24 安全加固：只信任同源广播（BroadcastChannel 按 origin 天然隔离，此为纵深防御校验）
+          if (e.origin !== location.origin) return;
           const msg = e && e.data;
           if (!msg || msg.sid === this._sid || msg.type !== 'favs-sync') return;
           if (!Array.isArray(msg.favs)) return;
@@ -87,6 +89,8 @@ const Store = {
       try {
         this._rulesBC = new BroadcastChannel(RULES_BROADCAST);
         this._rulesBC.addEventListener('message', e => {
+          // 票 24 安全加固：只信任同源广播（BroadcastChannel 按 origin 天然隔离，此为纵深防御校验）
+          if (e.origin !== location.origin) return;
           const msg = e && e.data;
           if (!msg || msg.sid === this._sid || msg.type !== RULES_BROADCAST) return;
           if (!this._normRulesDoc(msg.rules)) return;
```

### src/detect/index.ts (+/-)

```diff
--- a/src/detect/index.ts
+++ b/src/detect/index.ts
@@ -213,6 +213,9 @@ const SCAN_SELECTORS = [
   // 票 18: 伪 select 触发器三形态 DIV/INPUT/BUTTON[role=combobox]（MUI/antd/EP/react-select/Radix observed）
   '[role="combobox"]',
 ];
+// 票 24 安全加固：候选选择器存在覆盖重叠（.iti input ⊂ input[type="tel"] 组合项），
+// 迭代 Set 去重版避免同一 selector 字符串被重复 querySelectorAll（数组顺序不变，仅收敛唯一集合）
+const SCAN_SELECTOR_SET = new Set(SCAN_SELECTORS);
 
 export function createDetect(UI: CchUI, Rules: CchRules | null) {
   const Detect = {
@@ -506,7 +509,7 @@ export function createDetect(UI: CchUI, Rules: CchRules | null) {
       const t0 = Date.now();
       this._pruneWatchers();
       const roots = this._deepRoots(root);
-      for (const sel of SCAN_SELECTORS) {
+      for (const sel of SCAN_SELECTOR_SET) {
         this._collect(roots, sel).forEach(el => this._process(el));
       }
       if (typeof UI._pruneLow === 'function') UI._pruneLow();
```

### src/ui/index.ts (+/-)

```diff
--- a/src/ui/index.ts
+++ b/src/ui/index.ts
@@ -411,6 +411,8 @@ border-radius:8px;cursor:pointer;text-align:center}
   _feedback(): void {
     const el = this._target;
     // 票 12:远程面板负反馈 → postMessage 回子帧本地执行(规则按子帧 host 写入)
+    // 票 24:targetOrigin '*' 不可避免——remoteSource 可能为跨域子帧，顶层无法预知其 origin；
+    // 子帧接收端(main.ts 票 24)以 e.source===window.top + 同源强校验把关。
     if (this._remoteSource) {
       try { this._remoteSource.postMessage({ __cch: FRAME_TAG, type: FRAME_FEEDBACK_MSG }, '*'); } catch {}
       if (this._popup) this._closePopup();
@@ -439,6 +441,8 @@ border-radius:8px;cursor:pointer;text-align:center}
 
 
   // 票 12:子帧图标点击 → 保存目标字段 + 请求顶层代开面板(postMessage 跨域可达)
+  // 票 24:targetOrigin '*' 不可避免——顶层可能跨域，子帧无法枚举其 origin；顶层接收端
+  // (main.ts 票 24)已做 origin 校验 + 本页面嵌入 iframe 来源锚点。
   _requestRemoteOpen(target: AnyEl | null, kind: FillKind | null): void {
     this._target = target;
     this._kind = kind;
@@ -607,6 +611,7 @@ border-radius:8px;cursor:pointer;text-align:center}
       const c = ISO2_MAP[iso];
       if (!c) return;
       // 票 12:远程面板 → postMessage 回子帧执行 Fill.run(每帧各自填充,行为同源)
+      // 票 24:targetOrigin '*' 不可避免——remoteSource 可能为跨域子帧；子帧接收端把关见 main.ts。
       if (this._remoteSource) {
         try { this._remoteSource.postMessage({ __cch: FRAME_TAG, type: FRAME_FILL_MSG, iso: c.iso }, '*'); } catch {}
         this._closePopup();
```

### 设计判断(两处必要偏离,如实呈报)

1. **入站校验落点 main.ts 而非 ui/index.ts**:postMessage 入站 handler 实际位于 `src/main.ts` 帧治理段(票 12 安置),ui/index.ts 只有 3 处出站 `'*'` 发送(handoff 检查点 1 表述与代码事实不符)。按 issue AC1 原文("validate `e.origin` matches expected origin … document the '*' fallback for cross-origin sub-frames")落地:main.ts 双 handler 加 origin 校验,ui 三处出站发送加"跨域 `'*'` 不可避免 + 接收端把关指引"注释。
2. **跨域分支不能 strict `e.origin === location.origin`**:`iframe-cross-origin.html` fixture 以"端口+1 = 不同 origin"构成真实跨源(票 12 设计),顶层与子帧 origin 天然不等;若 strict 比对,直接违反 AC5(iframe 跨帧 E2E 必须绿)。方案 = 顶层分支同源强校验 + 跨域退化为 `isEmbeddedFrame` 来源锚点(`iframe.contentWindow === e.source` 引用比较跨域合法,挡掉弹窗/无关 window 伪造);子帧分支保留 `e.source === window.top` 锚点 + 顶层同源时强制 origin。

## 2. 验收证据

| 验收项 | 证据 | 结果 |
|---|---|---|
| 静态门(对齐复核 grep 口径) | `node .scratch/architecture-recovery/research/scripts/verify-ticket-24-static.mjs` | **7 PASS / 0 FAIL**(AC1a 3/3 注释、AC1b/1c/1d main 双分支校验+辅助函数、AC2 2/2 守卫、AC3a/3b Set 定义+迭代切换) |
| AC4 全量 E2E 无回归 | run [34594275953](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34594275953) @ b57a25d | **59 passed (24.4s), 0 failed** = 票 23 后基线持平 |
| AC5 iframe 跨帧通信 | 同上,e2e job 日志 | **7/7 绿**:same-origin 检测注入+子帧填充 2、**cross-origin 检测注入+子帧填充 2**(postMessage 跨帧双向链路无退化)、元数据头 1、跨帧存储一致 1、菜单仅顶层 1 |
| strict 类型门禁(票 23 合流) | run [34594275950](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34594275950) @ b57a25d | **success**(tsc --noEmit,16s) |

## 3. 检查点核对(handoff 5 项)

| 检查点 | 结论 | 证据 |
|---|---|---|
| 1 ui 入站 origin 校验 + '*' 注释 | ✅(落点 main.ts,见 §1 偏离 1) | 静态门 AC1a~d + diff |
| 2 store BroadcastChannel e.origin | ✅ 两处监听 | diff + 静态门 AC2 |
| 3 detect SCAN_SELECTORS new Set | ✅ 重做 | diff + 静态门 AC3a/3b |
| 4 全量 E2E CI 绿 | ✅ 59 passed | run 34594275953 |
| 5 iframe 跨帧 E2E 绿 | ✅ 7/7(含 cross-origin 填充断言) | 同上日志 |

## 4. 版本控制(WORKFLOW §4.2,复核 V2 整改)

- 独立分支:`but branch new cch/24-security-hardening --anchor cch/23-ts-strict-typecheck` + `but commit usx(b57a25d)` + docs 提交;修复"无独立分支"违规。
- 堆叠理由:main/ui 编辑依赖票 23 类型层(`MessageEventSource`/AnyEl 上下文),`but commit` 原子报错点名 cch/23 依赖,按其 Hint 堆叠(§4.2 允许"确有依赖堆叠")。
- 推送:`but push cch/24-security-hardening` → origin 新分支 b57a25d;e2e.yml/typecheck.yml push 触发面(`cch/**`)双绿。

## 5. 风险与教训建议

- **教训回收(建议登记 WORKFLOW §5)**:首轮"改而不提"致 uncommitted 改动随并行窗口工作区重组丢失,复核取证(磁盘 grep)又恰在丢失前捕获到 ✅——证据锚点应为 commit sha 而非磁盘态。本轮起:票内改动当轮 `but commit` 入分支,报告仅引用 commit 级证据。
- BroadcastChannel origin 守卫为纵深防御:BC 按 origin 天然隔离,正常环境恒真,零行为变更;E2E 单页场景无法行使该路径(跨标签同步不在 E2E 面内)。
- `isTopFrameSameOrigin()` 读 `window.top.location.href` 在跨域下抛 SecurityError,已 try/catch 回退为"跨域顶层"分支;若宿主策略连访问都限制(极罕见),行为回退到票 12 原语义(source 锚点),不产生新故障面。
- `isEmbeddedFrame` 锚点假设"可信子帧 = 本页面嵌入 iframe",与票 12 全帧注入治理面一致;data:/sandbox 子帧 origin 为 `'null'`,需同时满足嵌入锚点才放行(其本身无法注入 userscript,不构成新面)。
- 合流入 main 由大脑/用户决定(与票 20~25 一致)。

## 6. 产出物索引

- 代码提交:b57a25d(4 src 文件)
- 自检脚本:`.scratch/architecture-recovery/research/scripts/verify-ticket-24-static.mjs`(本轮入库)
- issue 勾选:`.scratch/architecture-recovery/issues/24-security-hardening.md`(5/6,out-of-scope 项保持未勾)
- 本报告:`.scratch/architecture-recovery/research/window-reports/24-security-hardening-report.md`
