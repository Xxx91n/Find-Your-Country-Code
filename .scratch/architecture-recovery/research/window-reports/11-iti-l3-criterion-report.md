# 窗口报告 — 票 11：判定 ITI 形态下 L3 的正确可观测判据

- **窗口**：子窗口（按票实施）
- **分支**：`cch/11-iti-l3-criterion`
- **阻塞项**：票 07（真实站点层与发布门）—— 开工前实测已满足
- **覆盖 A-xxx**：**A-035**（P1）
- **版本控制**：WORKFLOW §4.2（`but` 为唯一 git 写界面）

---

## 0 开工复述（任务书「开工第一句」要求）

**阻塞项**：票 07「真实站点层与发布门」。开工前实物核对：分支 `cch/07-real-site-and-release-gate` 存在、报告 `research/window-reports/07-real-site-and-release-gate-report.md` 已落盘、issue 六条已勾销、远端 tip `55977c21` —— 阻塞条件已解除。

**必读清单（9 份，逐份读完）**：`prompts/11-iti-l3-criterion.md` · `handoffs/11-iti-l3-criterion.md` · `issues/11-iti-l3-criterion.md` · `spec.md` · `WORKFLOW.md` · `architecture-recovery/decision-ledger.md` · `cycle6-grill/decision-ledger.md` · `research/window-reports/07-real-site-and-release-gate-report.md` · `tests/ACCEPTANCE-SURFACE.md` · `docs/adr/0008-real-site-testing-layers.md`。

| # | 文件 | 读到的关键约束 |
|---|---|---|
| 1 | `prompts/11-iti-l3-criterion.md` | 常驻任务书：身份/阻塞项/必读/delta/收尾路径/完成定义 |
| 2 | `handoffs/11-iti-l3-criterion.md` | 通用调研要求（atomcode 串行护栏 / ADR 回顾 / 证据铁律）+ 本票 delta |
| 3 | `issues/11-iti-l3-criterion.md` | 5 条验收项 + `Blocked by: 票 07` + 覆盖 A-035 |
| 4 | `spec.md` | S-03 验收面与阶梯定义；D-004 用户裁定（真实站点跑全阶梯 / L4 自动化） |
| 5 | `WORKFLOW.md` | §2 工具约定 / §4.2 版本控制 / §4.5 升塔纪律 / §8.1 证据边界 |
| 6 | `decision-ledger.md` | A-035 台账原文（「判定前不得以改判据方式消除红项」）+ A-034 邻票边界 |
| 7 | `cycle6-grill/decision-ledger.md` | D-002 裁定权在页面侧外部可观测；D-004 / D-005 层归属与 advisory |
| 8 | `research/window-reports/07-…-report.md` | §5.1 观测结果 / §5.2 根因取证 / §5.4 建议立票 2（本票） |
| 9 | `tests/ACCEPTANCE-SURFACE.md` | §4.1 L3 定义 / §4.2 层归属 / §1 裁定原则 / §7 变更纪律 |
| 10 | `docs/adr/0008` | 第二层真实站点永不进 `pull_request`；失败 advisory |

---

## 1 判定结论（本票核心产出）

> 结论：**L3 的语义（写入结果正确 + 持久化）不变；其「可观测面」必须按写入口形态确定。**
> ITI 接管字段的写入结果 **不是** `input.value`，而是 **选中国家状态**。

### 1.1 依据（atomcode 深度调研，cited）

- **ITI 官方不承诺把所选国家区号写进它接管的 `input.value`**。官方保证的只是：`setNumber` 「插入号码并据此更新所选国家」；`setSelectedCountry` 仅在**已有值以 + 开头时**替换旧区号，或在格式化开启时重排已有数字。
- 官方承诺的读取途径是**实例方法** `getSelectedCountry()`（v24 前 `getSelectedCountryData()`）；DOM 选中态（`.iti__selected-flag` → v21 `.iti__selected-country`，v29 再改名）属**实现细节**。
- 切国时派发官方自定义事件 **`countrychange`**（v17 起，v16–v29 未改名）；**从不派发原生 `change`**。
- 调研载体/会话/来源清单/缺口：`research/atomcode-11-iti-l3-criterion.md`（15 条来源，三引擎交叉，Confidence 高）。

### 1.2 本地确定性复现（reproduced，钉版 `intl-tel-input@18.2.1`）

| 模式 | 动作 | input.value | 选中态 | countrychange | 原生 input/change |
|---|---|---|---|---|---|
| 默认 | `setNumber('+86')` | `"+86"` | cn/+86 | 触发 | **0 / 0** |
| 默认 | `setNumber('+447733123456')` | `"07733 123456"`（国家格式，**无区号**） | gb/+44 | 触发 | **0 / 0** |
| **separateDialCode** | `setNumber('+86')` | **`""`** | cn/+86 | 触发 | **0 / 0** |

⇒ 旧判据（`value == 区号` **且** 原生 `input`·`change` 各 ≥1）在 ITI 形态下：
- **事件面不可满足**：ITI 从不派发原生 `change`（两模式实测均为 0）；
- **value 面不可靠**：separateDialCode 模式下必然为空（**假红**）；默认模式下又可能恰好等于区号（**假绿**）；且本仓库自己的 DOM 兜底 `dispatch(country.code)` 也能往 value 写区号而 ITI 选中态未变。

### 1.3 真实站点实测（reproduced，票 07 红项的真因）

`https://codepen.io/pen/ExzVrPY` 的 `cdpn.io` 帧，`#mobile_code`（容器类含 `iti--separate-dial-code`）：

| 时点 | 选中态 DOM 标记 | 选中态 title | `input.value` | 原生事件 | `countrychange` |
|---|---|---|---|---|---|
| 写入前 | `iti__flag iti__in` | `India (भारत): +91` | `""` | `[]` | — |
| 写入后 | **`iti__flag iti__cn`** | **`China (中国): +86`** | `""` | **`[]`** | **已广播** |

⇒ 票 07 报的 L3 红项是**假红**：填充实际**已成功切到中国**，区号由独立元素（`.iti__selected-dial-code`）承载，而旧判据读的是它不承载的那个面。

### 1.4 采纳的判据（写入本票实现）

ITI 形态下 L3 的决定性检查（**三条，均宿主侧外部可观测**）：

| 检查 | 内容 | 读取路径 |
|---|---|---|
| `L3:iti-selected-country` | 写入后选中国家状态 == 目标国家 | ① 官方读 API → ② DOM 选中态（能力探测降级） |
| `L3:iti-dom-marker` | DOM 选中态（**不经**官方读 API）也反映目标国家 | ② 独立路径交叉核验 |
| `L3:iti-country-event` | ITI 官方 `countrychange` 已广播 | ④ 官方事件（写入前挂载） |

比对优先按**国家身份**（`iso2`）；`iso2` 不可读时退到区号数字（同一事实的两条读取路径，非放宽）。原生 `input`/`change` 读数**仍保留在明细里**（信息不丢失），但**不作 ITI 判据**。

**为何该收敛不是放宽**（验收项 3）：
1. L3 语义（**写后读回**）未变：仍是「写入动作后读回宿主侧提交状态并与意图比对」。
2. 新判据在**精度上更强**：旧判据只能断言「区号数字出现」（+1 无法区分 US/CA），新判据断言**国家身份 iso2**；且旧判据在 ITI 形态下**不可满足**（原生 change 恒为 0），保留它等于保留一个**永远红灯**。
3. 旧判据在 ITI 形态下**也不健全**：本仓库自己的 DOM 兜底写 value 就能满足它，而 ITI 选中态未变 —— 它可被「自己写入自己断言」绕过。
4. 旧判据在**普通字段形态下逐字未改**（见 §4 对照证据）。

---

## 2 影响面清单（判据变更的完整影响面）

| # | 目标 / 形态 | 是否受影响 | 处置 |
|---|---|---|---|
| 1 | `tests/live/live-smoke.mjs` 普通字段路径（`select` / 普通 `input` / `textarea` / `contenteditable`） | **不受影响** | 旧判据逐字保留（`host-value` + `field-events`），只在 `surface === 'field'` 分支执行 |
| 2 | 真实站点层 ITI 目标（`live-codepen-editor`） | **受影响（转绿）** | 改用 ITI 判据；本票内 L3 转绿，见 §5 验收项 4 |
| 3 | 真实站点层 ITI 目标（`live-codepen-pen-fullpage`） | **受影响但结论不变（仍红）** | 仍红，但**归因从「判据口径」转为「ITI 选中国家未变」= A-034 填充从未执行（邻票 P0） |
| 4 | 层归属 / 阻断语义 | **不变** | 真实站点层仍 advisory（仅 `schedule` + `workflow_dispatch`，不进 `pull_request`）；阻断只在 `release.yml` 发布门（ADR-0010）；发布门判据一字未改 |
| 5 | `tests/ACCEPTANCE-SURFACE.md` §4.1 L3 行 / §2.1 #17 | **存在文本不一致（未修改，仅呈报）** | §4.1 L3 行写「目标字段 `value` 正确且派发 `input`/`change`」；#17 写「且底层 `input` 的 `value` 为该区号」——两者对 ITI 形态均与库官方语义不符。本票**未修改**该文件（它是票 01 交付物与测试约定单一来源，且其 §7.2 要求只升不降）——按 §7.3「判据变更须先有实测/语料依据并留痕」在本报告 + §4 密封 fixture 留痕，**建议后续单独立票**收敛其文本（涉及 sealed 断言口径，属产品级变更） |
| 6 | `tests/corpus/forms/mirrors/iti-v29.html`（owned 镜像页） | **形态保真度不足（未修改，仅呈报）** | 该页是**手写 mock**（无真实 ITI 实例），其脚本自行 `tel.value='+'+code` + 派发 `input`/`change`（L3 判据来源）——**与真实 ITI 语义相反**。`tests/corpus-forms.spec.ts` 的 iti-v29 L1–L4 用例之所以绿，是因为适配器走了 DOM 兜底分支、由该 mock 自己写了 value。本票**未修改**它（属票 06 语料工件，且修改会使 PR 阻断门转红，属产品级变更）——已新增**真实库**密封 fixture 补上覆盖（§4），**建议后续单独立票**修正镜像页保真度 |
| 7 | 帧 / 跨上下文路径 | **不受影响** | ITI 检测与判据均在**探针帧内**执行，不涉及跨帧传递 |
| 8 | 性能 | **不受影响** | 新增读取面只在 L3 写入后执行一次，不挂热路径 |

---

## 3 交付物

| 文件 | 变更 | 作用 |
|---|---|---|
| `tests/helpers/primitives.mjs` | M（**只增不改**） | 新增 4 常量 + 4 函数：`readWriteSurface` / `readItiSelectedCountry`（含 `domOnly` 独立路径）/ `recordItiCountryEvents` / `readItiCountryEvents` |
| `tests/live/live-smoke.mjs` | M | L3 按写入口形态分派；新增 ITI 三判据；普通字段旧判据逐字保留 |
| `tests/live/site-manifest.json` | M（只增） | `_meta.writeSurfaceRule` 成文契约 + `_meta.ticketCoverage`；`coveredA`/`ladderRule`/`targets` 一字未改 |
| `tests/fixtures/iti-l3-write-surface.html` | A | 密封 fixture：普通 select 对照组 + **真实** ITI 默认 / separateDialCode 两形态 |
| `tests/iti-l3-criterion.spec.ts` | A | 密封层（PR 阻断）新判据用例 + 对照组旧判据用例 |
| `tests/scripts/verify-ticket-11.mjs` | A | 本票结构门（62 断言） |
| `.github/workflows/verify-11.yml` | A | 本票 PR 门（纯静态断言，node 22，零外网） |
| `research/atomcode-11-iti-l3-criterion.md` | A | atomcode 调研记录（载体/会话/来源/缺口） |
| `research/prompt-11-atomcode.md` | A | 调研问题原文（verbatim） |
| 本报告 | A | 窗口报告 |

**未新增 ADR**：本票是对既有 L3 定义在一种形态上的**可观测面收敛**，未引入不可逆决策或被否决路线（ADR-0008 第二层未重开，发布门判据未改）。

---

## 4 只升不降自证（对照证据）

### 4.1 普通字段路径（旧判据逐字不变）—— live 层

```
$ node tests/live/live-smoke.mjs --target mirror-control
[pass    ] mirror-control   expect=injected errs=0 L0+ L1+ L2+ L3+ L4+   声明阶梯 L0/L1/L2/L3/L4 全部通过
白名单契约 + 全阶梯契约 + harness 自证: PASS
```
`mirror-control` = 本地镜像页的普通 `<select>`（区号值域）→ 判走 `field` 分支 → **原判据（value=+86 + input/change）全绿**。

### 4.2 普通字段路径（旧判据逐字不变）—— 密封层

```
$ npx playwright test tests/iti-l3-criterion.spec.ts --reporter=list
ok 1 … 对照组 · 普通 select 仍按原判据（value == 区号 + input/change ≥1） (1.0s)
ok 2 … ITI · #iti-plain 默认模式 → L3 判据 = 选中国家状态 (1.1s)
ok 3 … ITI · #iti-sep separateDialCode 模式（区号由独立元素承载） → L3 判据 = 选中国家状态 (701ms)
3 passed (4.2s)
```

### 4.3 旧判据在 ITI 形态下确定性红灯（密封层钉住的对照事实）

密封 fixture 实测（`legacy-observables` 注解，写入后读数）：

| 字段 | `input.value` | 原生 `input` | 原生 `change` | 选中态 | 旧判据 |
|---|---|---|---|---|---|
| `#iti-plain`（默认模式） | `"+86"` | **0** | **0** | cn | **红**（事件面不可满足） |
| `#iti-sep`（separateDialCode） | **`""`** | **0** | **0** | cn | **红**（value + 事件两面均不成立） |

### 4.4 断言未删减（逐项）

- 普通字段：`host-value` / `field-events` 两个断言**逐字保留**（`verify-ticket-11` G3 以字面匹配钉住）。
- ITI 字段：旧两断言**未删除，而是被替换为更权威的三条**（选中国家状态 + DOM 独立路径 + 官方事件）；旧两面的**原始读数仍写入明细字符串**（信息不丢失）。净决定性断言数 **2 → 3**（增）。
- 阶梯：`LADDER_ALL` 仍为 L0–L4 五级；`observe` 挂账路径、跳过白名单输出、L1 未成立时如实中断登记 —— 均保留。
- 共享层：既有 4 个导出名与全部原有导出未动；导出数 48 → **56**（只增）。
- `tests/scripts/verify-ticket-05-harness.mjs` 59/0、`verify-ticket-07.mjs` 63/0 —— **两门均未回归**。

---

## 5 验收项逐条勾销（各附只读验证命令 + 输出摘要）

### 验收项 1 —— 判定 ITI 形态下 L3 的可观测判据，给出官方语义或工业界依据

- 依据：`research/atomcode-11-iti-l3-criterion.md`（atomcode 5.0.9 会话 `06894dec…`，15 条来源三引擎交叉，Confidence 高）+ §1.2 本地确定性复现。
- 结论：见 §1.4（选中国家状态，三条决定性检查）。

### 验收项 2 —— 依据判定结果收敛 `tests/live/live-smoke.mjs` 的 L3 判据，并写明影响面

- 只读验证：`node tests/scripts/verify-ticket-11.mjs` → `PASS G2 …（形态判定/三判据/官方事件）`
- 影响面：本报告 §2（8 条，含 2 条「未修改仅呈报」）。

### 验收项 3 —— 说明为何不是放宽 + 对照证据

- 见 §1.4（四条论证）+ §4.1/§4.2（`mirror-control` 与普通 `input`/`select` 路径仍按原判据）。

### 验收项 4 —— 真实站点层 `live-codepen-editor` 的 L3 结论有据

**结论：转绿**（本地实测；CI 证据见 §7）。

```
$ node tests/live/live-smoke.mjs --target live-codepen-editor
[pass    ] live-codepen-editor  expect=injected errs=0 L0+ L1+ L2+ L3+ L4+   声明阶梯 L0/L1/L2/L3/L4 全部通过；嵌套帧 cdpn.io
```
全量（8 目标）：`mirror-control` pass / `live-codepen-editor` **pass** / `live-codepen-pen-fullpage` **fail（归因 A-034，非本票）** / 3 个 `observe` 不变。

### 验收项 5 —— 声明本票覆盖的 A-xxx：A-035

- 只读验证：`node tests/scripts/verify-ticket-11.mjs` → `PASS G7 …`（共享层 / live 层 / manifest / spec / 本门 / workflow 六处声明）

---

## 6 本票 delta 检查点

| delta | 要求 | 实测 | 证据 |
|---|---|---|---|
| D-1 | 判定前不得以「改判据」方式消除红项 | ✅ | 先判定（§1）再收敛（§3）；结论是「旧判据在 ITI 形态下不可满足」，不是「为转绿而放宽」；§4.3 把旧判据的红钉在密封层 |
| D-2 | 不得放宽 L3「写后读回」语义；不得删除任何既有断言（只升不降） | ✅ | §1.4 四条论证 + §4.4 逐项；`verify-ticket-11` G3 以字面匹配钉住旧判据保留 |
| D-3 | 判据变更必须给出影响面清单，并证明 `mirror-control` 与普通 `input`/`select` 路径仍按原判据 | ✅ | §2 影响面 8 条 + §4.1/§4.2 对照证据 |
| D-4 | ITI 官方语义依据须留痕，不得凭记忆合成 | ✅ | `research/atomcode-11-iti-l3-criterion.md`（含来源 URL 清单 + 自报缺口 + 本地辩证差异） |
| D-5 | 真实站点层保持 advisory（不进 `pull_request`）；发布门判据不变 | ✅ | 未改 `real-site-smoke.yml` / `release.yml` / `release-gate.mjs` / ack 文件；`verify-ticket-07` 63/0 仍绿 |

---

## 7 本地验证与回归（全部实跑）

> 按 WORKFLOW §8.1.2：下列结果一律属**本地自证**（附命令与输出摘要），**不构成闭环证据**；行为面闭环证据须来自 CI（§8）。

| 检查 | 命令 | 结果 |
|---|---|---|
| 语法 | `node --check` × 4 文件 | 均 OK |
| 构建 | `npm run build` | EXIT=0（167.89 kB） |
| 类型 | `npm run typecheck` | EXIT=0（0 错） |
| 本票门 | `node tests/scripts/verify-ticket-11.mjs` | **62 PASS, 0 FAIL** |
| 原语门（票 05） | `node tests/scripts/verify-ticket-05-harness.mjs` | **59 PASS, 0 FAIL**（无回归） |
| 阶梯/发布门（票 07） | `node tests/scripts/verify-ticket-07.mjs` | **63 PASS, 0 FAIL**（无回归） |
| 新密封用例 | `npx playwright test tests/iti-l3-criterion.spec.ts` | **3 passed** |
| 全量 E2E | `npm run e2e` ×2 | 第 1 次 **144 passed, 1 failed**（失败项 = `tests/srcdoc-origin.spec.ts`，邻票 10 / A-034）；第 2 次 **145 passed, 0 failed**；该文件单独运行 **5/5 passed** ⇒ 首跑失败为并行/顺序抖动，**非本票引入**（见 §9 E-2） |
| 真实站点层（单目标） | `node tests/live/live-smoke.mjs --target mirror-control` | L0–L4 全绿，EXIT=0 |
| 真实站点层（单目标） | `node tests/live/live-smoke.mjs --target live-codepen-editor` | L0–L4 全绿 |
| 真实站点层（全量） | `node tests/live/live-smoke.mjs` | 1 pass / 1 fail（A-034 归因）/ 3 observe / 2 skipped |

---

## 8 CI 证据（WORKFLOW §8.1：行为面只认 CI run / artifact）

> **状态：待补**（本报告落盘时尚未推送；§8.2.4 要求远端写逐次授权）。
> 推送后需以本票分支的 PR 门（`Verify Ticket 11`）+ `E2E` + `Engine Gates` + `Typecheck` 的 run ID 回填本节；行为面闭环以该证据为准。

---

## 9 偏离点呈报

| # | 偏离 | 说明 |
|---|---|---|
| E-1 | 报告路径 | 按 handoff 要求落 `research/window-reports/`（既有目录），未新建路径 |
| E-2 | 全量 E2E 有 1 项失败，**非本票** | 失败项 `tests/srcdoc-origin.spec.ts:64`（邻票 10 / A-034 的先行用例，已由 `f4aad220` 提交在 `cch/10-srcdoc-origin-fix`）。归因依据：① 该文件不在本票 diff 面；② 单独运行 **5/5 passed**；③ 工作区为多窗口共享，且含他票未提交改动（`src/detect/index.ts` +46、`src/types.ts`、`tests/corpus/manifest.json`、`tests/scripts/14-lib-engine.mjs`），而 `npm run e2e` 会从该共享工作树重建 `dist/`；④ **第二次全量复跑 `145 passed, 0 failed`**，该用例转绿 —— 确定性结论为**抖动**，非确定性红。**本票未修**（超出本票授权面） |
| E-3 | 新增密封 fixture + spec（超出 issue 验收项字面） | 依 WORKFLOW §4.5 升塔纪律：「塔尖暴露的、塔身未覆盖的真实形态缺陷，必须先把该形态沉淀为塔身密封 fixture」。真实 ITI 形态（`separateDialCode` + 真实库语义）此前无任何密封覆盖（唯一 ITI owned 页是手写 mock）。该新增属**只升**，使新判据获得 PR 阻断级证据，不依赖 advisory 的真实站点层 |
| E-4 | 未修改 `tests/ACCEPTANCE-SURFACE.md` 与 `tests/corpus/forms/mirrors/iti-v29.html` | 两者文本均与 ITI 官方语义不符（§2 第 5/6 条），但均属**他票交付物 + 产品级口径变更**，且修改后者会使 PR 阻断门转红。本票只呈报 + 建新 fixture 补覆盖，建议后续单独立票 |
| E-5 | 真实站点层单次运行有抖动 | `live-codepen-editor` 的 `errs` 在多次运行中 0/1 波动（票 07 报告已登记同一现象）；本层 advisory，如实登记不作因果断言 |
| E-6 | 一次性诊断脚本落 OS 临时目录 | 按票 07 E-5 教训，未落 `.scratch/`；已清理（`git status` 无残留） |

---

## 10 完成定义自检

| 完成定义项 | 状态 |
|---|---|
| issue 全部验收项勾销并各附 commit sha（只读验证命令 + 输出摘要） | ✅ §5 五条逐条（commit sha 于提交后回填） |
| 报告落 `research/window-reports/11-iti-l3-criterion-report.md` | ✅ 本文件 |
| 版本控制遵循 WORKFLOW §4.2（`but` 为唯一 git 写界面） | ✅ 全程 `but commit`，未使用 `git add/commit/push/checkout/merge/rebase/stash` |
| 证据边界（§8.1） | ⚠️ 行为面 CI 证据待推送后回填（§8） |
