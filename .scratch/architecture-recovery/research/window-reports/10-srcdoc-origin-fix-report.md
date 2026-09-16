# 窗口报告 — 票 10：修复 `about:srcdoc` 帧跨帧 origin 校验误判

- **窗口**：子窗口（按票实施）
- **分支**：`cch/10-srcdoc-origin-fix`（堆叠于 `cch/07-real-site-and-release-gate` 之上；建支命令 `but branch new --anchor`，依 `Blocked by: 票 07` 的语义位置锚定在栈顶，避免插入栈中段触发其余分支重排）
- **实施提交**：`f4aad220`（9 文件，+516 / −9）
- **文档提交**：`914b690e`（本报告 + issue 六条勾销 + WORKFLOW §5 教训；锚点回写提交见 §11）
- **阻塞项**：票 07（真实站点层与发布门）—— 开工前实测已满足
- **覆盖 A-xxx**：A-034（**P0**）
- **版本控制**：WORKFLOW §4.2（`but` 为唯一 git 写界面）

---

## 0. 开工复述（任务书「开工第一句」要求）

**阻塞项**：票 07。开工前实物核对：`cch/07-real-site-and-release-gate` 分支存在且在栈顶；其交付物实物齐全（`tests/scripts/release-gate.mjs` · `tests/scripts/verify-ticket-07.mjs` · `.github/workflows/verify-07.yml` · `.github/release-gate-ack.json` · `tests/live/site-manifest.json` · 窗口报告）；首脑复核（`research/cycle6-wave4-review.md`）判定「实现属实 · 账本 A-029 达成 · 无源码返工」⇒ **阻塞条件解除**。

**必读清单（10 份，逐份读完并索引）**：

| # | 文件 | 读到的关键约束 |
|---|---|---|
| 1 | `prompts/10-srcdoc-origin-fix.md` | 常驻任务书：身份 / 阻塞项 / 5 条 delta / 收尾路径 / 完成定义 |
| 2 | `handoffs/10-srcdoc-origin-fix.md` | 必读清单 + 通用调研要求 + delta + 完成定义 + 偏离点呈报 |
| 3 | `issues/10-srcdoc-origin-fix.md` | 6 条验收项 + `Blocked by: 票 07` + 覆盖 A-034 |
| 4 | `spec.md` | S-03 阶梯定义 / S-06 真实站点层全阶梯 + 发布门 / Out of Scope |
| 5 | `WORKFLOW.md` | §2 工具约定 / §4.2 版本控制 / **§4.5 升塔纪律** / §8.1 CI-only / §8.2.4 远端写须逐次授权 |
| 6 | `architecture-recovery/decision-ledger.md` | A-034 三条显式约束（不得放宽 / 不得删校验替代 / 票 12 拒绝语义不回归） |
| 7 | `cycle6-grill/decision-ledger.md` | D-002 外部可观测裁定 / D-004 真实站点纳入测试面 / D-005 advisory + 发布门 |
| 8 | `research/window-reports/07-real-site-and-release-gate-report.md` | §5.2 根因取证（`location.origin==="null"` / `window.origin` 为真值）/ §5.4 建议立本票 |
| 9 | `research/cycle6-wave4-review.md` | §四 首脑独立复现（`frameLocOrigin:"null"` / `frameWinOrigin` 真值）/ §八 新票 A（P0） |
| 10 | `docs/adr/0008-*.md` + `docs/adr/0010-*.md` | 真实站点层 advisory 不进 `pull_request`；发布门判据不变 |

**通用调研要求（handoff 引用，本票适用）**：① 动手前先做 atomcode 深度调研（串行护栏）—— **本票为纯缺陷修复，取径由上游取证报告 §5.2 + 首脑独立复现已唯一确定（`window.origin`）**，无「心智模型路线 / 工业级方案选型」级待决问题，故不另起调研（属 YAGNI；依据：`window.origin` 为平台原生定义，语义无争议，非选型）；② 回顾 `docs/adr/` 0001–0010 与 `CONTEXT.md`，本票零违背（不重开 ADR-0008 第二层，不改 ADR-0010 发布门判据）；③ 外部事实均为 **observed**（本地实测）或 **reproduced**（CI 独立复现，见 §9）。

---

## 1. 交付物

| 文件 | 变更 | 作用 |
|---|---|---|
| `src/config.ts` | M | 新增 `SELF_ORIGIN`（本帧「文档 origin」全仓唯一定义：`window.origin` 优先，宿主不支持时回退 `location.origin`） |
| `src/main.ts` | M | 两处操作数改用 `SELF_ORIGIN`：`:120`（顶层入站）/ `:134`（子帧入站，**根因面**） |
| `src/store/index.ts` | M | 两处 BroadcastChannel 同源校验操作数改用 `SELF_ORIGIN`（`:67` / `:97` 同面） |
| `tests/fixtures/srcdoc-frame.html` | A | 塔身密封 fixture：顶层字段 + `srcdoc` 内联子帧（帧 URL = `about:srcdoc`）含区号字段 |
| `tests/srcdoc-origin.spec.ts` | A | 塔身密封 spec（5 例）：根因前提 / 跨帧填充 L3+L4 / L0 静默健康 / 来源锚点未放宽 / 票 12 delta |
| `tests/scripts/verify-ticket-10.mjs` | A | 票级结构门（34 断言） |
| `.github/workflows/verify-10.yml` | A | 本票 PR 门（纯静态断言，node 22，零外网） |
| `.scratch/.../research/scripts/10-probe-srcdoc-origin.mjs` | A | 取证探针（复用 `tests/helpers/primitives.mjs` 同一份原语） |
| `tests/scripts/verify-ticket-05.mjs` | M | 门保真度修正（BC 替身补齐 `origin`，见 §6；断言面零改动） |

---

## 2. 验收项逐条勾销（各附 commit sha + 只读验证命令 + 输出摘要）

实施提交：**`f4aad220`**

### 验收项 1 —— 修复 `src/main.ts:134`（srcdoc 帧判真并丢弃顶层 `FRAME_FILL_MSG`）

- 只读验证：`grep -n "SELF_ORIGIN" src/main.ts`
- 输出摘要：`122: if (e.origin !== SELF_ORIGIN && !isEmbeddedFrame(e.source)) {` · `139: if (isTopFrameSameOrigin() && e.origin !== SELF_ORIGIN) return;`（根因面已改用文档 origin）
- 行为验证（同一目标 / 同一阶梯，修复前红 → 修复后绿）：
  - 修复前：`npx playwright test tests/srcdoc-origin.spec.ts --retries=0` → **`1 failed / 4 passed`**，唯一红为「跨帧填充链路」：`L3 srcdoc 帧宿主字段 value 应写入区号` — `Expected: "+86" / Received: ""`；连跑 3 次逐次同因（确定性红灯）
  - 修复后：同命令 → **`5 passed`**

### 验收项 2 —— 同面排查并修复 `src/main.ts:120` 与 `src/store/index.ts:67` / `:97`

- 只读验证：`grep -rn "location.origin" src/` + `node tests/scripts/verify-ticket-10.mjs`
- 输出摘要：全 `src/` 内 `location.origin` 仅存于 `config.ts` 的注释与**回退分支**（`return location.origin;`，仅当宿主不支持 `window.origin` 时启用）；不存在以 `location.origin` 作**比较操作数**的残留（门 G2g PASS）
- 四处操作数均已改用 `SELF_ORIGIN`（门 G2d / G2e / G2f PASS，其中 store 命中数 = 2）
- **同面实测（BroadcastChannel）**：探针在 srcdoc 帧内挂 `BroadcastChannel("cch-rules-sync-v1")` 记录器，由顶层同源广播一条消息 → 子帧收到 `e.origin = "http://127.0.0.1:4273"`，而子帧 `location.origin = "null"` ⇒ 旧判据 `e.origin !== location.origin` 必为真 ⇒ 同源同步被误拦。修复后操作数改为 `window.origin`（= 同一值）⇒ 判定通过

### 验收项 3 —— 复现证据：修复前后 srcdoc 帧 `location.origin` vs `window.origin` 实测对照

- 只读验证：`node .scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs`
- 输出摘要（同一探针、同一目标、同一阶梯；探针复用 `tests/helpers/primitives.mjs` 同一份原语，零第二套）：

| 测量面 | 修复前 | 修复后 |
|---|---|---|
| 帧 `href` / `location.origin` / `window.origin` | `about:srcdoc` / `"null"` / `http://127.0.0.1:4273` | 同左（帧属性不因修复而变） |
| 顶层可读性（`isTopFrameSameOrigin()` 前提） | `topReadable: true` | 同左 |
| postMessage 入站 `e.origin`（顶→子） | `http://127.0.0.1:4273` | 同左 |
| BroadcastChannel 入站 `e.origin` | `http://127.0.0.1:4273` | 同左 |
| L1 注入 | `wrappers: 2 · tier: auto` | 同左 |
| **L3 宿主 value** | `""`（期望 `+86`） | **`"+86"`** |
| **L3 字段事件** | `[]` | **`["input","change"]`** |
| **L4 反馈** | `present: false · text: "" · on: false` | **`present: true · on: true · text` 非空（`已填入: … +86`）** |
| 诊断（`__cchLastFill`） | `null`（`Fill.run` 从未执行） | `status: "filled" · asserted: true · reason: "write-post-assert-passed"` |
| **L0 异常计数** | **`pageErrors: 0`** | `pageErrors: 0` |

> L0 两态同为绿 —— 这正是缺陷被弱断言掩盖的直接取证（票 07 §5.2 的因果链在塔身复现：消息链路完好、`Fill.run` 从未执行、**无异常**）。

### 验收项 4 —— 真实站点层 `live-codepen-pen-fullpage` 的 L3/L4 转绿（以 CI run 证据为准）

- 见 **§9 CI 证据**（待推送后追加：`real-site-smoke.yml` 的 `workflow_dispatch` run）

### 验收项 5 —— 密封 E2E 135 例、`verify-37`、`verify-42`、`verify-39` 均不回归

- 密封 E2E：`npx playwright test --retries=0` → **`140 passed / 0 failed`**（135 既有 + 本票 5 新增；只升不降，零删减 —— 门 G4a 静态锁）
- `node tests/scripts/verify-ticket-37.mjs` → `21 PASS, 0 FAIL`
- `node tests/scripts/verify-ticket-42.mjs` → `42 PASS, 0 FAIL`
- `node tests/scripts/verify-ticket-39.mjs` → `27 PASS, 1 FAIL`（**既有非本票红**，归因见 §4）

### 验收项 6 —— 声明本票覆盖的 A-xxx：A-034

- 只读验证：`node tests/scripts/verify-ticket-10.mjs` → `PASS G7a`（fixture）/ `G7b`（密封 spec）/ `G7c`（探针）/ `G7d`（本门 + issue）四处声明全部在位

---

## 3. 本票 delta 检查点（5 条）

| delta | 要求 | 实测 | 证据 |
|---|---|---|---|
| D-1 | **不得放宽**跨帧来源校验（票 24 语义不变）；**不得**以删除校验替代修复 | ✅ | 四处拒绝语句与来源锚点逐字保留（门 G3a–G3e）；不存在 `e.origin` 与 `null` 比较类放行写法（G3f）；票 24 语义零修改 |
| D-2 | 票 12 跨域顶层 fixture 既有拒绝语义不得回归，只纠正 `location.origin === "null"` 类**误判** | ✅ | 票 12 fixture 与既有用例在位（G5a/G5b）；新增「非嵌入来源仍被拒绝」用例（G5c）且已实跑通过 |
| D-3 | 修法优先 `window.origin`；若用回退分支须同时覆盖 `store/index.ts:67` 与 `:97` | ✅ | 采用 `window.origin` 优先 + 回退分支（G2a–G2c）；**四处**（含 store 两处）统一取用同一常量（G2d–G2f），非仅修 main |
| D-4 | 复现证据须含修复前**红**与修复后**绿**（同一目标、同一阶梯），不接受仅「本地通过」 | ✅ | §2 验收项 3 对照表 + 修复前 3/3 确定性红灯；**且**真实站点层 CI 证据见 §9 |
| D-5 | 真实站点层保持 advisory（不进 `pull_request`）；发布门判据不变 | ✅ | 门 G6a/G6a2（`on:` 块无 `pull_request`，仅 schedule + workflow_dispatch）/ G6b（`release` 仍 `needs: release-gate`）；本票新增 workflow 也不把真实站点拉进 PR 面 |

## 4. 本地验证与回归矩阵（全量实跑，含退出码）

| 检查 | 命令 | 结果 |
|---|---|---|
| 类型 | `npm run typecheck` | `exit=0`（0 错） |
| 构建 | `npm run build` | `exit=0`（`dist/find-your-country-code.user.js` 167.29 kB） |
| 全量密封 E2E | `npx playwright test --retries=0` | **`140 passed / 0 failed`**（1.2m） |
| 本票密封 spec | `npx playwright test tests/srcdoc-origin.spec.ts` | `5 passed` |
| 本票结构门 | `node tests/scripts/verify-ticket-10.mjs` | `34 PASS, 0 FAIL`（exit 0） |
| 引擎门 | `node tests/scripts/verify-ticket-02.mjs` | `36/36 pass` + `G10 5/5 pass` |
| 设置门 | `node tests/scripts/verify-ticket-02-settings.mjs` | `33 PASS, 0 FAIL` |
| 诊断门 | `node tests/scripts/verify-ticket-03.mjs` | `58 PASS, 0 FAIL` |
| 规则引擎单元门 | `node tests/scripts/verify-ticket-05.mjs` | `100/100 pass · ALL GREEN` |
| 原语门 | `node tests/scripts/verify-ticket-05-harness.mjs` | `59 PASS, 0 FAIL` |
| 语料门 | `node tests/scripts/verify-ticket-06.mjs` | `209 PASS, 0 FAIL` |
| 真实站点层门 | `node tests/scripts/verify-ticket-07.mjs` | `63 PASS, 0 FAIL` |
| 适配层门 | `node tests/scripts/verify-ticket-09.mjs` | `36/36 pass` |
| 可见性门 | `node tests/scripts/verify-ticket-13.mjs` | `28 PASS, 0 FAIL` |
| React19 门 | `node tests/scripts/verify-ticket-15.mjs` | `28/28 pass` |
| 伪选择门 | `node tests/scripts/verify-ticket-18.mjs` | `35 PASS, 0 FAIL` |
| 弱信号门 | `node tests/scripts/verify-ticket-27.mjs` | `90 passed / 0 failed` |
| ISO2 门 | `node tests/scripts/verify-ticket-28.mjs` | `19 PASS, 0 FAIL` |
| 候选集门 | `node tests/scripts/verify-ticket-29.mjs` | `pass=27 fail=0 RESULT: PASS` |
| 反馈门 | `node tests/scripts/verify-ticket-31.mjs` | `48 PASS, 0 FAIL` |
| 入口门 | `node tests/scripts/verify-ticket-37.mjs` | `21 PASS, 0 FAIL` |
| 语言门 | `node tests/scripts/verify-ticket-42.mjs` | `42 PASS, 0 FAIL` |
| 误检 harness | `node tests/scripts/misdetect-repro-v2.mjs` | `25 例符合预期；FP 全家桶不注入：YES` |
| 发布门自证 | `node tests/scripts/release-gate.mjs --self-test` | `11/11 用例通过`（exit 0） |

**已知非本票红（归因留痕，不做任何掩盖）**：`node tests/scripts/verify-ticket-39.mjs` → `27 PASS, 1 FAIL`，红项 `G4e live 目标 host 不出现在密封 spec/fixture/corpus/helper/config`，命中 5 处**全部**位于 `tests/corpus/forms/**`（`manifest.json` · `mirrors/codepen-iti-v17.html` · `mirrors/codepen-iti-v17-child.html` · `skeletons/codepen-iti-v17.json` · `sources.json`）。

- **归因**：该红由**票 06**（形态语料 provenance 元数据）引入，票 07 窗口报告 §4 与首脑复核 `research/cycle6-wave4-review.md`（§二 #12）已各自留痕并判定成立。
- **本票无关性论证**：本票 diff 不含 `tests/corpus/**`、不含 `tests/live/site-manifest.json`、不含 `verify-ticket-39.mjs`；`G4e` 的全部输入均为本票**未触碰**的文件 ⇒ 该红不可能由本票引入。
- **本票未处置该红**的理由：修面在票 06 语料/门口径，超出本票 delta（票 07 已呈报，归其归属票处置）。

---

## 5. 修复设计：为何改用 `window.origin` 不放宽任何来源校验

1. **取值语义纠正**：`location.origin` 是 **URL 序列化**的结果，对 `about:srcdoc` / `about:blank` 这类本地方案文档恒为字符串 `"null"`；而校验要的是**本帧文档的 origin**（继承自父级），其正确读取口就是 `window.origin`。旧写法不是「宽松 / 严格」之争，而是**取错了值**。
2. **普通文档下两者恒等**（平台定义）⇒ 对非 srcdoc 场景**零语义变化**；本票改动不改变任何既有判定结果。
3. **回退分支不引入新行为**：仅当宿主不支持 `window.origin`（非字符串或空）时退回 `location.origin`，即**完全退回既有语义**，既不放大也不缩小接受面。
4. **不透明 origin 仍被拒**：sandboxed iframe 等不透明 origin 的 `window.origin` 也是 `"null"`，与真实跨域发送方的 `e.origin` 仍不等 ⇒ 仍走拒绝分支。
5. **判据强度不变**：`e.origin` 由浏览器按**发送方 origin** 填充，跨域发送方无法伪造 ⇒ 把比较基准从「URL 序列化值」换成「文档真实 origin」不降低伪造难度。
6. **零删除自证**：两处拒绝语句、两处来源锚点（`e.source !== window.top` · `!isEmbeddedFrame(e.source)`）与票 40 的降级 toast 逐字保留（门 G3a–G3e），并额外锁住「不得出现 `e.origin` 与 `null` 比较类放行写法」（G3f）。

---

## 6. 门保真度缺口（本票新发现，**如实登记**）

### 6.1 现象与处置

`tests/scripts/verify-ticket-05.mjs` 的 BroadcastChannel 替身旧形态为 `fn({ data: msg })` —— **不含 `origin`**。而真实 `BroadcastChannel` 的 `message` 事件**恒携带 `origin`**（发送方 origin 的序列化）。后果：被测的 origin 守卫在门内退化为 `undefined !== undefined` 恒放行，**守卫从未被真实行使**（票 10 修复后 `SELF_ORIGIN` 在 Node 下为回退值 `"null"`，`undefined !== "null"` 判真 ⇒ 误拦同源广播，该缺陷才显形）。

**处置**：按平台语义补齐同一文档 origin（`DOC_ORIGIN`，与 `SELF_ORIGIN` 同源定义式），**断言面零改动**（不放宽、不删除、不新增）⇒ `100/100 ALL GREEN` 恢复。

**决定性对照实验**（同一门文本、仅替身保真度不同）：

| 变体 | 结果 | 含义 |
|---|---|---|
| A：仅补 `origin` | `100/100 ALL GREEN` | 本票修复正确；红由替身缺 `origin` 引起 |
| B：补 `origin` + 结构化克隆（完全保真） | `99/100`，`S4 got=513` | 见 6.2 |

### 6.2 附带发现（本票**不改**，仅登记）

该替身同时未做**结构化克隆**（真实 BC 按结构化克隆投递），而接收方 `_normRulesDoc(msg.rules)` 会**就地改写** `msg.rules.overrides`（`slice(0, RULES_MAX_OVERRIDES)`）—— 由于替身按**引用**投递，被截断的正是**发送方**的 `_rulesCache`。因此 S4「`RULES_MAX_OVERRIDES` 上限生效」断言当前的绿是**替身别名旁路截断**的产物，而非实现保证（变体 B 以 `got=513` 复红直接坐实）。

**实现事实**：`RULES_MAX_OVERRIDES` 只在 `_normRulesDoc` 内截断，而 `_normRulesDoc` 只在外来输入路径（BC 接收 / GM 远端监听 / 首次从存储载入）被调用；**本地写路径（`upsertOverride` → `_writeRules`）不截断**，内存文档可超过 500（下次载入时会被截断）。

**未在本票处置的理由**：① 「上限的强制点在哪」属**规则引擎语义**，超出本票 delta（A-034 面）；② 处置它需同时补克隆保真度，会改动票 05 门的第二处保真度与产品行为；③ 本票只做「使其显形」的最小修正并留痕，避免带着未裁定语义一起改。**建议**：后续票裁定「上限强制点（写路径 or 读路径）」并据此补齐断言 + 替身克隆保真度。

## 7. 偏离点呈报

| # | 偏离 | 说明 |
|---|---|---|
| E-1 | 报告路径 | 按 handoff 要求落 `research/window-reports/`（既有目录，与既有 58 份报告链一致），未新建路径 |
| E-2 | 建支锚点 | `but commit -b` 首跑报依赖（`src/main.ts` 依赖 `cch/03-diagnostics-surface`）。本票**未**按提示锚到 cch/03（那会把本支插入栈中段并触发 cch/01/05/06/07 重排），而是按 `Blocked by: 票 07` 的语义位置执行 `but branch new cch/10-srcdoc-origin-fix --anchor cch/07-real-site-and-release-gate` —— 既等价满足技术依赖（cch/07 在 cch/03 之上），又对既有分支零重排 |
| E-3 | 未另起 atomcode 深度调研 | 本票为**纯缺陷修复**，取径已由上游取证（票 07 §5.2）+ 首脑独立复现（W4 §四）**唯一确定**（`window.origin`），无「心智模型路线 / 工业级方案选型」级待决问题。按 WORKFLOW §2.5 的 YAGNI 梯子，不为一字不改的既定取径另起调研；外部事实均为 observed/reproduced |
| E-4 | 新增票级结构门 + workflow（issue 未要求） | 依仓库「一票一门」约定 + 本票 delta 的「不得放宽 / 不得删校验」硬约束，补 `tests/scripts/verify-ticket-10.mjs`（34 断言）与 `.github/workflows/verify-10.yml`；属**只升**（不删不改任何既有断言） |
| E-5 | 改动票 05 工件 `tests/scripts/verify-ticket-05.mjs` | 本票修复使其 BC 替身保真度缺陷**显形**（见 §6.1），属必要的最小修正（补 `origin`）；**断言面零改动**，`100/100` 与基线一致 |
| E-6 | 未改 `RULES_MAX_OVERRIDES` 强制点 | 见 §6.2：属规则引擎语义面，不在本票 delta 内；已留痕并建议后续票裁定 |
| E-7 | 真实站点层结果受第三方影响 | `live-codepen-*` 依赖外部站点与网络；本票对其只作如实登记，不伪造绿、不放宽断言（advisory 语义不变） |
| E-8 | 推送需授权 | 按 WORKFLOW §8.2.4「涉及远端写一律逐次取得用户授权」，本票**不自行推送**；推送授权与随之的 CI 证据见 §9 |

---

## 8. 只升不降自证

- **断言零删除 / 零弱化**：票 24 的四处校验、票 40 的降级 toast、票 12 的跨域 fixture 与用例逐字保留；本票只改**操作数取值**，不改判定结构（门 G3a–G3e）。
- **密封 spec 零删减**：既有 20 个 spec 文件逐个存在且非空（门 G4a 静态锁）；E2E 用例数 `135 → 140`。
- **新增断言全为加强**：本票 5 例覆盖 L0/L1/L3/L4 四层（`pageErrors` / `wrappers`+`tier` / `value`+`input·change` / `toast`）与两条反放宽锁（来源锚点 / 非嵌入来源），均为「新增覆盖」而非「替代旧断言」。
- **真实站点用例只增不减**：`tests/live/site-manifest.json` 与 `live-smoke.mjs` 本票**零改动**（advisory 触发面与阶梯契约不动）。
- **塔尖弱断言未被用来冒充塔身**：本票的验收主张全部锤在塔身密封 fixture（`tests/fixtures/srcdoc-frame.html` + `tests/srcdoc-origin.spec.ts`）上，真实站点层仅作独立复现位。

---

## 9. CI 证据（§8.1 证据边界：行为面只认 CI run / artifact）

锚点：commit sha **`f4aad220`**（分支 `cch/10-srcdoc-origin-fix`）

> **待推送后追加**：推送属远端写，按 WORKFLOW §8.2.4 需用户逐次授权。本节将在获得授权并推送后补入：push 触发的全部门 run ID 与结论（含 `verify-10` · `verify-05` · `e2e` · `typecheck` · `engine-gates`）+ 真实站点层 `workflow_dispatch` run（验收项 4）。

---

## 10. 完成定义自检

| 完成定义项 | 状态 |
|---|---|
| issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要） | ✅ §2 六条逐条，锚 `f4aad220`（验收项 4 的 CI 证据待 §9 追加） |
| 报告落 `research/window-reports/10-srcdoc-origin-fix-report.md` | ✅ 本文件 |
| 版本控制遵循 WORKFLOW §4.2（`but` 为唯一 git 写界面） | ✅ 全程 `but branch new` / `but commit`；未使用任何 git 写命令（未 `add`/`commit`/`push`/`checkout`/`merge`/`rebase`/`stash`） |

---

## 11. 文档提交与变更记录

| 提交 | 内容 |
|---|---|
| `f4aad220` | 实施提交（9 文件，+516 / −9） |
| `914b690e` | 文档提交：本报告 + issue 六条勾销 + WORKFLOW §5 教训行（3 文件，+278 / −9） |

