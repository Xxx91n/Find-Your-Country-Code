# 窗口实施报告：15 — React 19 填充能力探测兜底

> 子窗口（fresh context）实施 | 日期：2026-09-05/06 | 分支：cch/15-react19-fill-probe（堆叠于 cch/12-iframe-governance 之上）
> 开工复述：Blocked by: None（Wave 1）——以 issues/15-react19-fill-probe.md 验收清单原文确认 Blocked by 字段为空；必读 9 份（prompts/15 → issues/15 → handoffs/15 → spec.md → WORKFLOW.md → atomcode-mental-model-v2.md → mental-model-v2/report.md → src/fill/index.ts → tests/fixtures/framework-react.html → atomcode-industry-models.md）已按序读全。
> 版本控制遵循 WORKFLOW §4.2（GitButler 唯一权威；提交/堆叠/amend/push 全程 but；只读 git 检查例外）。

## 0. 一句话结论

填充层 `_inject` 增加**能力探测 + 强制 diff 兜底**（探测只读、三重 try/catch、纯增量 45 行），React 19 受控组件在「tracker 快照已被站点 JS 同步」的经典吞事件形态下仍能真实同步 React state；React 19.2.8 hermetic E2E（npm 生产构建现场转译 ESM，无 CDN）与全量回归在 CI 执行。

## 1. 设计与证据基础（observed，非假设）

**React 19 机制实读**（node_modules/react19@19.2.8 / react-dom19@19.2.8 npm 生产构建逐字阅读）：
- `_valueTracker` 挂实例、实例级 `value` 拦截器（setter 先同步 `currentValue` 快照再委托原型 setter）、`updateValueIfChanged`：无 tracker 返回 true；lastValue≠nextValue 才触发 onChange——**与 React 16–18 语义逐字同构**（atomcode 调研「机制仍在」结论的源码级确认）。
- React 19 **不再发布 UMD 构建** → hermetic fixture 的供给方式是本票的工程点（见 §3）。

**兜底语义（比直觉更窄、更安全）**：原生 prototype setter 直写本就不经实例拦截器 → 快照保持落后 → 常规填充（React 18 fixture 组）**不需要**兜底。真正会吞事件的是「快照已被 JS 级赋值同步到填充值」（react#11488 经典形态：站点 JS 直接赋值、React state 滞后）。故 `forceDiff` **仅在 `tracker.getValue() === nextValue` 时干预**（回拨为 prev；prev==next 时加零宽空格哨兵），其余情形不动快照——最小干预，不改变任何既有成功路径的行为。gate F1/F2/F3 对照组证明该语义。

## 2. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| src/fill/index.ts | +45 行（纯增量，0 删改）：`_probe`（hit/forceDiff）+ `_inject` 内 prev 捕获与兜底挂点 | 探测与兜底收敛于单一注入函数（票 09 结构契约不变：fill 直接赋值恰 1 处、事件派发单点）；textarea/select 原型路径零改动（只增不改检查点） |
| tests/server.mjs | `/gen/react19/*` 路由 + `react19Esm` CJS→ESM 现场转译器 | React 19 无 UMD；npm 生产构建（react19/react-dom19 别名包）按真实 require 图（react → scheduler → react-dom → client）转译为 ESM。转译只改写 require()/exports. 赋值，模块体逐字保留；守卫拒绝任何残留 CJS API（fail loud 不静默错装） |
| tests/fixtures/framework-react19.html | 新增 | 与 React 18 fixture 同构（受控 select/input + 提交回读 + BOOT-ERROR 可见性），id 前缀 r19- |
| tests/framework-react19.spec.ts | 新增 3 例 | 页面健康（无 BOOT-ERROR + 注入就绪）+ select/input 填充后组件状态与提交值三重断言 + 事件序列 |
| package.json / package-lock.json | devDeps `react19@npm:react@^19.2.8`、`react-dom19@npm:react-dom@^19.2.8` | npm 别名包与顶层 react@18 并存（React 18 fixture 供给不受影响）；lock 记录 legacy-peer-deps 解析 |
| .github/workflows/verify-15.yml | 新增（ticket-scoped，票 10/16 先例） | 引擎门（15 + 09 基线）+ 全量 E2E 一条 push 全跑；npm ci 带 --legacy-peer-deps（与本地安装一致） |
| .scratch/…/verify-ticket-15.mjs | 新增引擎门 28 例 | P（探测语义）/ F（强制 diff 对照）/ D（安全降级）/ E（既有路径回归，等价 09 门主链）/ S（结构检查）五组 |

**排除项（他人工作，未触碰）**：票 12 的 e2e.yml / iframe fixtures / userscript.ts GM stub / server.mjs handler 重构（已在其分支提交）；票 10 停放的 version bump hunk（package.json 1.3.4→1.4.0 保持未提交）；README/README_EN 等脏区一律未选入提交。

## 3. 关键实现细节

1. **探测条件 = 实例级 value setter 补丁（own accessor）∧ `_valueTracker` 存在且 getValue/setValue 均为函数**（issue 原文双信号）。任一缺失或探测抛错 → 标准路径（探测不引入新失败面检查点）。
2. **强制 diff 挂点在事件派发之前**（`_inject` 内：prev 捕获 → 原型 setter 写值 → 探测命中则 forceDiff → input/change/blur 派发）——react#11488 行业标准位置。
3. **CJS→ESM 转译器三个防呆**：① `exports.X =` 改写为运行时对象赋值 + `export { id as X }` 别名导出（处理 `exports.X = X` 自引用与缩进赋值、CJS 重复赋值语义=后者生效）；② 守卫：转译产物若残留 `module.` / 裸 `exports` 引用直接 500（宁可响红不可静默错装）；③ 沙箱内以 file:// 动态 import 全链验证 4 模块（react 42 导出 / scheduler 16 / react-dom 14 / client createRoot+hydrateRoot+version），0 残留。
4. **npm 别名包（`react19@npm:react@^19`）而非替换顶层 react@18**：React 16–18 fixture 与 Vue/iti fixture 的供给零改动；peer 冲突（react-dom19 期望 react@^19）以 --legacy-peer-deps 承载（fixture 不走 node 解析，转译器手工接模块图，peer 仅是声明性约束）。
5. **转译完备性 = 赋值改写 + 读取 sweep + 守卫三层**：行首/缩进 `exports.X =` 赋值改写之外，函数体内的 `exports.X()` 读取也必须统一 sweep（scheduler 5 处 unstable_now 读取，node 静态检查不可见、唯调用级暴露）；守卫按「__r19exports 前缀之外的一切 exports token」判残留。

## 4. 验收对照（issue 5 条）

1. **能力探测实现；探测失败安全降级** ✅ gate P1–P4 + D1–D3（28/28 全绿；D 组专门验证 tracker 半残/投毒下值路径与事件序列不受影响、绝不崩）。
2. **兜底路径：强制 diff + 既有事件序列；textarea/select 原型路径不受影响** ✅ gate F1–F4（吞事件形态 → onChange fired；F4 为 select）+ S1–S5（结构契约）+ E5/E6（TEXTAREA 原型路径）。
3. **React 19 hermetic fixture E2E：填充后组件状态与提交值正确** ✅ CI run 33981972381（verify-15.yml，绿）：react19-select/react19-input 提交回读断言 + react19 页面健康例；hermetic = 本地 npm 生产构建转译，全程无外部 CDN。（docs 提交复跑 33982244611 同绿。）
4. **React 16–18 既有 fixture 无回归** ✅ 同 run：全量 E2E 52 例（含 framework-inject.spec.ts React 18 组、票 12 iframe 治理组、rescan、rules-ui、scenarios）全过；票 09 引擎门 36/36 同 run 绿。
5. **全部证据走 CI** ✅ verify-15.yml 两个 job（run 33981972381 feat 提交 + 33982244611 docs 提交，均 success）为唯一证据源；build 仅发生在 CI。

（红绿迭代明细见 §6；issue 复选框勾销属大脑 S8 收口动作，本窗口以报告映射表交付。）

## 5. 偏离点

1. **堆叠到 cch/12 而非独立分支**：GitButler 依赖检查拒绝在 base=common base 的分支上提交（package-lock/server.mjs 分块依赖 cch/01/06/12 提交）。按 §4.2「确有依赖按堆叠」与票 10 教训，`but branch new cch/15-react19-fill-probe --above cch/12-iframe-governance`。
2. **v1 半成品被票 12 分支带入**：票 12 窗口提交时把工作区里我此前的 react19Esm v1（含两个缺陷：转译路径漏 node_modules 段、exports 正则不处理缩进/自引用/重复赋值）一并带入其分支。其 CI 绿是因为 fixture 无引用（路由惰性死代码）。本分支的 v2 演进 hunk 叠加修复——合并后以 v2 为准。
3. **CI-only 政策下的 TDD 适配**：本机不跑 build/E2E/项目测试；引擎门（node 脚本）在本地做红绿迭代（首轮 24/28 红：3 处断言期望值与 React 消费快照的真实时序不符 + 1 处 mock 自身缺陷，归因自身后修复），权威证据只认 CI run。依赖安装（npm install）本地执行以产出 lockfile 变更——安装非构建/测试，既往窗口同例。
4. **ticket-scoped workflow 与票 12 e2e.yml 并存**：票 12 的 e2e.yml 触发 cch/** 且用裸 `npm ci`，在含 react19 别名的 ref 上必然 ERESOLVE 红。我未修改他人文件；本票证据以 verify-15.yml（--legacy-peer-deps）为准。**给大脑**：收口合并时建议把 e2e.yml 的 install 统一为 `npm ci --legacy-peer-deps`（或合并两 workflow），消除跨分支红噪音。
5. **临时回退 package.json 版本号**：为防 lockfile 根版本混入 lkq 停放的 1.4.0 bump，安装期间临时置 1.3.4（lock 根保持 1.3.4 与分支基线一致），完成后原样恢复 1.4.0（停放态未被提交、未被丢弃）。

## 6. 验收证据（CI）

| 项 | run | 结论 |
|---|---|---|
| **verify-15.yml（gate 15 + gate 09 + full E2E）— 最终证据** | **33981972381（success，1m05s）** | **绿：引擎门 28/28 + 36/36，E2E 52 例全过（含 react19 组 3 例 + React 18 组 + iframe 组全量回归）** |
| 中间迭代（非验收证据） | 33980929474 红（npm ci ERESOLVE + gate 脚本未随提交）→ 33981076849 红（fixture server 崩溃：react19Esm 把 fs/promises 的 readFile 当同步用 + headersSent 双写头杀进程）→ 33981604171 红（3 例 react19 剩红：scheduler 函数体内 5 处 exports.unstable_now() 读取未改写，浏览器 ReferenceError；49 passed 已恢复基线）→ 158ac65 **33981972381 绿** | TDD 红绿链完整 |
| 票 12 e2e.yml（被动触发，非本票验收） | 33980929467 / 33981076827 / 33981604169 | 红（install 阶段 peer 冲突，见偏离 4） |

本地门（TDD 迭代用，非验收证据）：verify-ticket-15.mjs 28/28、verify-ticket-09.mjs 36/36；react19Esm 沙箱验证（真实 fs/promises + mock res + file:// 动态 import + unstable_now() 调用级执行）全过。
CI 修复链（报告价值）：a) npm ci 需 --legacy-peer-deps（别名包 peer）；b) 转译器必须先 await 再写响应头 + headersSent 防御（进程级崩溃防护）；c) CJS 改写必须含「函数体内 exports.X 读取」sweep（node --check / import 不执行函数体，唯独调用级能暴露）——已回写进 §3 要点。

## 7. 未完成 / 未验证项

1. 真实 Tampermonkey 环境下的 React 19 站点实烟（CI 无 TM 宿主；机制层面 E2E+gate 已覆盖，与票 12 的 real-TM 烟测同类残留）。
2. React 19 **并发/transition** 场景（useTransition 包裹的受控填充）未专项建模——探测语义与渲染模式解耦（tracker 是 DOM 层事实），风险低。
3. `npm ci --legacy-peer-deps` 的修复只落在本票 workflow；票 12 e2e.yml 待收口统一（偏离 4）。

## 8. 给大脑的风险提示

1. **合并顺序**：本分支依赖 cch/12（server.mjs v1 helper 在其分支上）——收口合并必须包含 cch/12→cch/15 顺序，单独 cherry-pick cch/15 的 server.mjs 部分会在缺 react19 路由的树上留下孤儿 helper（v1 状态,有缺陷）。
2. **e2e.yml 的 install 统一**（偏离 4）：否则任何包含 react19 别名的分支/合并结果在票 12 workflow 下持续红。
3. **lockfile 根版本 1.3.4 vs package.json 1.4.0**：票 10 停放的 version bump 尚未落任何分支；后续任何窗口 `npm install` 都可能无意把它带进自己的提交（我已按 hunk 排除）。建议收口时由大脑把 version bump 与 lock 根版本一起收进票 10/19。
4. React 19 上游若变更 inputValueTracking（改名/移除 _valueTracker），探测自动降级为标准路径（原生 setter 直写仍有效，updateValueIfChanged 无 tracker 返回 true）——设计上无脆断点；但 forceDiff 兜底将静默失效，建议在真正出现 React 19 填充问题的站点复测时重读本报告 §1 的源码证据。
