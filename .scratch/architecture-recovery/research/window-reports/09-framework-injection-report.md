# 窗口实施报告：09 — 框架注入加固

> 子窗口（fresh context）实施 | 日期：2026-09-04 | 分支：cch/09-framework-injection
> 开工复述：Blocked by: 02 —— 已确认完成（`research/window-reports/02-scoring-engine-report.md` 落盘、36/36 单测门 + 25/25 harness 全绿、cch-02 代码/文档 commit 入库）。必读 6 份（issue → handoff → atomcode-industry-models → misdetection-root-causes → spec → WORKFLOW）按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler，票分支 `cch/09-framework-injection`）。分支落位：非堆叠建分支被拒（本票 tests/server.mjs、iti-adapter、package-lock 的分块依赖 cch/06 与 cch/03 已提交内容，iti-adapter 同文件修改依赖 cch/03 基线）——按 §4.2「确有依赖按堆叠」：`but branch new cch/09-framework-injection --above cch/04-rescan-shadow-dom`（当时栈顶），代码 commit `twy`。

## 1. 注入层设计

收敛为**单一注入函数** `Fill._inject(el, value)`（`src/fill/index.ts`），替换原 `_dispatch`（只处理 INPUT 的半成品）：

1. **值写入走原生 prototype value setter**：按 `el.tagName` 查 `HTMLInputElement` / `HTMLSelectElement` / `HTMLTextAreaElement` 的 `value` descriptor，`desc.set.call(el, value)` 直写原型——绕过框架在元素**实例**上安装的 value 拦截层。React 16–18 的 `inputValueTracking` 在实例上装 getter/setter 并维护 lastValue 快照：JS 级赋值（`el.value = x`）会同步快照，随后 React 的 `updateValueIfChanged` diff 不出变化 → input/change 被吞（react#11488 同心智，[AM 核心结论9]）；原生 setter 直写不经过实例拦截器 → 快照失同步 → React 感知变化并触发 onChange。Vue 3 无劫持，正常路径；Angular accessor 同样听 DOM 事件。
2. **事件序列固定 `input → change → blur`**（spec「注入安全」节；RHF/Formik 校验链依赖该序列 [AM 核心结论9]）。三事件 `bubbles: true, composed: true`（见 §3）。
3. **`el.ownerDocument.defaultView` 优先于裸 `window`**：正确对待 iframe/多窗口宿主；原型不存在时回落 JS 赋值（mock/异构宿主兜底）。
4. **SELECT prototype setter 缺口补齐** [MD §3.6/§5-6]：旧实现 SELECT 只有 `el.value = m.value` 直写——受控 select（React）会被 tracker 吞掉。现 select 与 input/textarea 同走 native setter。
5. **iti-adapter 兜底收敛**：`fill` 最终兜底与 `_fillByDom` 异步兜底的 `el.value = code` 直写全部删除，改为 `dispatch(value)` 回调（Fill 侧传 `(v) => this._inject(el, v)`）。适配层现在零直接赋值（结构检查 S2 断言）。setNumber/setSelectedCountry/setCountry/DOM 点击等**插件自身路径**不经 `_inject`（插件维护自己的状态，详见 §5 偏离 1）。
6. checkbox/radio 不在本票（脚本不涉及该两类元素，detect 的 INPUT 类型闸门已排除）。

## 2. 三框架 fixture 断言结果

E2E（`tests/framework-inject.spec.ts`，hermetic：React 18.3.1 UMD 与 Vue 3.5 global build 本地 vendored，`tests/server.mjs` 新增 `/vendor/react|react-dom|vue` 路由，无外网依赖）：

| 宿主 | 字段 | 断言 | 结果 |
|---|---|---|---|
| React 18 受控 select `#r-select` | 面板选 +86 | DOM 值 `+86` + 组件状态 `{"code":"+86"}` + **表单提交回读** `+86` + 事件序列 | ✅ |
| React 18 受控 input `#r-input` | 面板选 +81 | DOM 值 + 组件状态 `{"phone":"+81"}` + 提交回读 + 事件序列 | ✅ |
| Vue 3 v-model select `#v-select` | 面板选 +86 | 同上三重断言 | ✅ |
| Vue 3 v-model input `#v-input` | 面板选 +81 | 同上 | ✅ |
| 统一注入 `#s-dial`/`#i-dial` | select 与 input 事件序列一致 + bubbles/composed 元数据 | ✅ |

React 受控组件的「提交回读」断言是值真实进入 React state 的最强证据（受控组件 DOM 值由 state 驱动，直接写 DOM 会在下一渲染帧被还原——本 fixture 若注入失败，`#r-select` 会在 React 重渲染后回到空值且 `#r-submitted` 显示空 code）。

引擎级单测门（`research/scripts/verify-ticket-09.mjs`，node 直跑）：**36/36 pass，exit 0**。React 18 value tracker 以 react-dom `inputValueTracking.js` 语义 mock（实例拦截器 + lastValue 快照），suppression 语义由对照用例自证：C1（直接赋值 + 裸派发 → onChange 被吞）与 C2（原生 setter 直写 → `updateValueIfChanged` 为 true）。覆盖：React select/input/**textarea**、Vue（无 tracker）select/input、TEXTAREA 分支（检测侧当前无 textarea kind，E2E 不可达，引擎级验证——见 §5 偏离 3）、iti 兜底经注入回调（R7）、Angular accessor 事件契约（A 组，见 §4）、结构检查（fill 直接赋值恰 1 次 / adapter 零直接赋值 / `_inject` 单函数）。

## 3. 事件序列与冒泡/composed 证据（issue 验收 4）

- **序列**：E2E 三类元素（select/input）实测均为 `['input','change','blur']` 一次性完整序列（`tests/fixtures/unified-inject.html` 页面级监听 + `recordEvents` 双通道断言）；单测门 mock 元素同样断言该序列（R1–R7 全组）。
- **bubbles**：`:true`。E2E 在**祖先 form 节点**上监听并捕获到事件（`__bubbles` 记录），冒泡路径真实可达。
- **composed**：`:true`。跨 shadow root 场景依据：票 04 已实现 open shadowRoot 穿透检测，填充发生时若目标在 shadow 内，`composed:true` 使事件穿越 shadow boundary 到达页面级监听者（框架委托监听、统计脚本等）。逐事件事实（依据 MDN/WHATWG DOM 标准，cited）：原生 `input`/`change` 本就 composed，原生 `blur` composed:false；本实现三者统一 `composed:true`——对 blur 是**行为放宽**（比原生多穿一层），方向是提高可达性而非破坏（框架监听器不会因事件多冒泡一层而失灵；若站点在 shadow 宿主上对 blur 计数，可能多计一次，影响面极小）。
- 与 React root 委托的关系：React 17+ 把事件委托挂到 root 容器而非 document——事件只要冒泡到 root 即可，`bubbles:true` 已覆盖；`composed:true` 在 shadow 宿主内挂 root 时同样必要。

## 4. Angular 表单验证（handoff「三种宿主」的第三项）

**边界声明：现代 Angular 无 UMD/CDN 构建**（Angular 12 起移除 UMD；ivy 编译器要求构建期 AOT/JIT），无法像 React/Vue 一样建 hermetic E2E fixture。替代验证：**引擎级契约验证**——`@angular/forms` 的 `DefaultValueAccessor` 监听 `input` 事件、`SelectControlValueAccessor` 监听 `change` 事件（cited：angular/packages/forms/src/directives/），均以 `el.value` 写回模型，blur 触发 markAsTouched。单测门 A 组按该契约模拟 accessor：A1 select（`onChange:+86`→`touched`）、A2 input（`onChange:+81`→`touched`）、A3 textarea 全过。契约层面 `_inject` 满足 Angular reactive/ngModel 双路径的值同步条件；**真实 Angular CLI 站点的 E2E 未做**（见 §6 风险 3）。

## 5. 验收命令与退出码（issue 内 4 条验收项）

1. **React 受控 select 与 input 填充终态正确（fixture 断言值与后续提交内容）** ✅
   `npx playwright test tests/framework-inject.spec.ts -g "react-"` → 2 passed（全量 `npx playwright test` → **33 passed，exit 0**，留档 `verification/09-e2e.txt`）。终态断言含提交回读（§2）。
2. **Vue v-model 场景值同步（fixture）** ✅ — 同 spec `-g "vue-"` → 2 passed；三重断言（DOM/状态/提交）。
3. **三类元素事件序列一致（input→change→blur），行为集中在一个注入函数** ✅
   INPUT/SELECT E2E 断言序列一致 + composed/bubbles 元数据；TEXTAREA 在单测门 R5/R6/A3 覆盖（E2E 不可达原因见 §5 偏离 3）。集中性由单测门结构检查 S1–S3 断言（`node .scratch/architecture-recovery/research/scripts/verify-ticket-09.mjs` → **36/36，exit 0**，留档 `verification/09-unit-gate.txt`；红灯证据 `verification/09-unit-gate-red.txt` 19/37，TDD 红绿留痕）。
4. **事件冒泡与 composed 行为写入报告（跨 shadow 场景依据）** ✅ — §3。

补充验证：`npx tsc --noEmit` 零新增（fill 7 / iti-adapter 8 个错误在 HEAD 基线逐文件对比下完全一致，留档 `verification/09-tsc.txt`；01/03 票遗留非本票范围）；`npm run build` exit 0（dist 61.09 kB）。

## 6. 偏离点

1. **setNumber/setSelectedCountry/setCountry 路径不派发 input/change/blur**（修复前也不派发）：这三者经插件实例 API 改值，插件自行维护内部状态与 UI；向 input 派发 change 会让部分版本插件误判用户手动输入而重算国家。`fillIti` 的 dispatch 回调只在**裸赋值兜底**时触发——与本票「注入收敛」目标一致：兜底路径现在也走 `_inject`（修复前是 `el.value=` 直写）。
2. **blur 统一 `bubbles:true, composed:true`**（原生 blur 冒泡/composed 均为 false）：沿袭基线 `_dispatch` 的 `bubbles:true` 心智并补齐 composed（§3）。是有意放宽，非回归。
3. **TEXTAREA 无 E2E 面板流程**：detect 只对 select/input 产出 kind（textarea 无检测路径，属票面外），故 textarea 注入走单测门直调 `Fill.fillInput` 验证；`_inject` 的三元素统一性由同一函数保证。
4. **`npm install` 补录了 intl-tel-input 到 package-lock**（01/03 票遗留未提交的一行 diff），随本票 package.json/react/vue 一并入库——lock 与 manifest 同步，已在提交说明注明。
5. **E2E 断言两处测试代码修正**（`page.evaluate` 未 await 的 Promise 比较、React UMD 的 `umd/` 路径段 404）：均为本票新增测试自身缺陷，非产品代码缺陷，红灯阶段修复后复测。

## 7. 给大脑的风险提示

1. **React 19 未专项核验**（atomcode 缺口 5 原样保留）：本票验收基线 React 18.3.1 UMD；React 19 并发渲染对 `_valueTracker` 的影响无本地证据。建议票 07/10 或后续调研窗口补 React 19 fixture（npm 包形态，无需 UMD）。
2. **Angular 仅契约级验证**：真实 Angular CLI 站点（zone.js + ngModel）E2E 缺失；accessor 契约来自 angular/packages/forms 源码（cited），但 zone/cd 时序组合未实测。
3. **`composed:true` 的 blur 放宽**（§3）：理论上 shadow 宿主上的 blur 统计会多收到一次穿透事件；如遇站点计数异常再收紧为 blur 单独 composed:false（`_inject` 单点可改）。
4. **`_inject` 兜底路径的赋值时机**：mock/异构宿主（原型描述符缺失）回落 `el.value=` 直写——此时事件仍按统一序列派发，但 tracker 型框架在该宿主本就无实例拦截器，无功能性影响。
5. **并行分支互不冲突**：本票只触碰 fill/iti-adapter/tests(package) 范围；脏区内 detect/main/store/i18n 等属其他窗口，未触碰未提交。
