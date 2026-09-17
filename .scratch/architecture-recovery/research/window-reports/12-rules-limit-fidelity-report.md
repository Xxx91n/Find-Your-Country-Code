# 窗口报告 — 票 12：规则上限强制点裁定 + BC 替身克隆保真度修复

> Cycle-6 ｜ 票：`issues/12-rules-limit-fidelity.md` ｜ 覆盖 A-xxx：**A-036**
> 阻塞项：票 10（srcdoc origin 修复）—— 已解（W5 复核通过）
> 上游：`research/window-reports/10-srcdoc-origin-fix-report.md` §6.1/§6.2 + `research/cycle6-wave5-review.md`
> 分支：`cch/12-rules-limit-fidelity`（锚 `cch/10-srcdoc-origin-fix`，与并行分支互不堆叠）

---

## 0. 开工复述（任务书「开工第一句」要求）

**阻塞项**：票 10（srcdoc origin 修复）。开工前已实物核对：W5 首脑复核（`research/cycle6-wave5-review.md` §一）判定票 10 复核通过、无源码返工 ⇒ 阻塞已解。

**必读清单（逐份读完）**：`handoffs/12-rules-limit-fidelity.md` · `issues/12-rules-limit-fidelity.md` · `spec.md` · `WORKFLOW.md` · `architecture-recovery/decision-ledger.md` · `cycle6-grill/decision-ledger.md` · `research/window-reports/10-srcdoc-origin-fix-report.md` · `research/cycle6-wave5-review.md` · `src/store/index.ts` · `tests/scripts/verify-ticket-05.mjs`。

**说明**：`spec.md` 与 `cycle6-grill/decision-ledger.md` 内无 A-036 条目（A-036 仅存于 `architecture-recovery/decision-ledger.md:66`）—— 已实物核对，非阅读遗漏。

---

## 1. 交付物

| 文件 | 变更 | 说明 |
|---|---|---|
| `src/store/index.ts` | M | 写路径上限强制点（`upsertOverride` 新增前 fail-closed 拒绝）+ 文件头契约注（裁定与依据） |
| `tests/scripts/verify-ticket-05.mjs` | M | BC 替身补**结构化克隆投递**；`origin` 改由 bundle 的 `SELF_ORIGIN` 唯一来源取得；bundle 装配上移至替身之前。**断言面零改动** |
| `tests/scripts/verify-ticket-12.mjs` | A | 票级门（31 断言）：裁定落地 / 摄取修复保留 / 断言未放宽 / 替身保真度 / origin 同源 / **行为锁** / 覆盖声明 |
| `.github/workflows/verify-12.yml` | A | 票 12 门进 CI（PR + 本票分支 push + dispatch） |
| `docs/adr/0011-rule-override-cap-enforcement-point.md` | A | 裁定 + 被否决路线（读路径）+ 反证条件 |
| `.scratch/.../research/scripts/12-ab-cap-fidelity.mjs` | A | 决定性 2×2 对照实验（写路径强制 × 替身投递保真度） |
| `.scratch/.../research/scripts/12-gates.mjs` | A | 本地回归矩阵运行器（§2.6 紧凑摘要） |
| `.scratch/.../research/12-atomcode-enforcement-point.md` | A | atomcode 深度调研落盘（15 条来源） |
| 本报告 | A | `research/window-reports/12-rules-limit-fidelity-report.md` |

---

## 2. 验收项逐条勾销

**锚点**：本节七条验收项的全部交付物锚定**实施提交** `fe0a5df3`；其中验收项 4 的证据文本（本报告）锚定**文档提交** `1e5866d2`。CI 证据状态见 §9（**未取得**，事项已移交大脑 Agent）。

### 验收项 1 —— 裁定「上限强制点」：写路径（`upsertOverride` → `_writeRules`）还是读路径（`_normRulesDoc`）；裁定须给出依据

**裁定：写路径**（生产者 fail-closed 拒绝）。

- 依据全文：§5；落地于 ADR-0011（含工业界 15 条来源 + 本仓既有语义 3 条 + 工程判据 2 条）
- 只读验证：`grep -n "上限强制点" src/store/index.ts`
- 输出摘要：`// ── 上限强制点（票 12 [A-036] 裁定）──` · `//   RULES_MAX_OVERRIDES（config.ts，500）是文档级不变量，强制点在写路径：`

### 验收项 2 —— 按裁定实现强制点

- 实现：`upsertOverride` 在**新增**规则前 `if (r.overrides.length >= RULES_MAX_OVERRIDES) return null;`（fail-closed，不落盘、不广播）；既有 id 的更新（改）与删除不受限。
- 只读验证：`grep -n "RULES_MAX_OVERRIDES" src/store/index.ts`
- 输出摘要：`:212`（摄取修复，保留）· `:268`（写路径强制点，新增）

### 验收项 3 —— 补齐 `verify-ticket-05.mjs` 的 BC 替身克隆保真度

- 实现：替身 `postMessage` 改为**每个接收方各得一份独立结构化克隆**（真实平台按值投递）；发送方自身不接收（平台语义）。
- 只读验证：`grep -n "structuredClone" tests/scripts/verify-ticket-05.mjs`
- 输出摘要：`const data = structuredClone(msg);`（位于 `for (const inst of BC.all)` 内、`if (inst === this) continue;` 之后）

### 验收项 4 —— 复现证据入报告：同一门文本、仅替身保真度不同的 A/B 对照

- **改前 A/B**（历史，脚本已被自包含 2×2 取代）：A（仅补 `origin`）= `100/100 ALL GREEN`；B（再补克隆）= `99/100`，`S4 got=513`；A/B **逐行差异 = 1**（仅替身 `postMessage` 一行）。
- **改后 2×2**（`12-ab-cap-fidelity.mjs`，可在当前树上复跑）：见 §6 —— 关键对照 **B vs C 只差投递保真度**：无写路径强制时，结构化克隆 ⇒ 红（got=513）、按引用投递 ⇒ 绿。
- 结论：S4 的旧绿确为**替身别名旁路效应**；本票修正后（目标态 A）的绿来自**实现保证**。

### 验收项 5 —— 不得以「保留假绿」方式回避；不得放宽或删除任何既有断言

- 断言面**零改动**：`verify-ticket-05.mjs` 的 S4 上限断言行、505 压测循环、非法输入不落盘、副本隔离四行**逐字在位**；断言调用点数 `ok(42) + eq(58) = 100`，与基线一致。
- 门自证：`verify-ticket-12.mjs` G3a–G3e（含逐字锁与点数下限）。
- 未新增任何替身别名旁路；未在 `_writeRules` 加「静默截断」式兜底（见 §5 已知取舍）。

### 验收项 6 —— `verify-05`（100/100）、`verify-05-harness`（59/0）、全量 E2E 均不回归

- `verify-05`：`100/100 pass | ALL GREEN`，exit 0（**本地自证**；CI 证据见 §9）
- `verify-05-harness`：exit 0（59 PASS / 0 FAIL）
- 全量 E2E：见 §4.2
- 全门矩阵：见 §4.1（21 道公共门与改前基线**逐项吻合**）

### 验收项 7 —— 声明本票覆盖的 A-xxx：A-036

- 声明面：本门 `verify-ticket-12.mjs` · `.github/workflows/verify-12.yml` · issue · ADR-0011（门 G7a–G7d 锁）。

---

## 3. 本票 delta 检查点（5 条）

| # | delta 要求 | 落实证据 | 判定 |
|---|---|---|---|
| 1 | 不得以「保留假绿」方式回避；靠替身别名旁路维持 S4 绿属禁止项 | 2×2 对照：目标态 A 绿**且**去掉写路径强制即复红（B）；按引用投递形态零残留（门 G4b） | ✅ |
| 2 | 不得放宽或删除任何既有断言；100/100 基线在保真度修正后仍成立（暴露真实缺口须修实现） | 断言面零改动（门 G3a–G3e）；真实缺口（写路径不强制）已**修实现**（验收项 2） | ✅ |
| 3 | 替身保真度修正须与票 10 的 `SELF_ORIGIN` 同源定义，不得出现第二套 origin 取值 | `const DOC_ORIGIN = SELF_ORIGIN;`（取自 bundle 导出的 config.ts 常量）；门内 `window.origin` / `location.origin` 计数均为 **0**（门 G5a–G5c） | ✅ |
| 4 | 强制点裁定须有据；若裁定读路径须在 CONTEXT/文档层显式说明 | 裁定为写路径 ⇒ 该条件不触发；仍以 ADR-0011 + 文件头契约注 + 本报告三层留痕（“不得只留代码注释”满足） | ✅ |
| 5 | 证据只认 CI run；真实站点层（advisory）如受影响须如实登记 | CI 证据见 §9；真实站点层影响面登记见 §7 E-5 | ✅ |

---

## 4. 本地验证与回归矩阵（全量实跑，含退出码）

### 4.1 全门矩阵（21 道公共门 + 本票门）

**改前基线**：22 道门，红 1（`verify-ticket-39` G4e，预存红）。
**改后**：22 道门，红 1（仅 `verify-ticket-39` G4e，同预存红）+ 本票门（报告落盘前 S0 红，属预期）。

| 门 | 改前 | 改后 | 判定 |
|---|---|---|---|
| `verify-ticket-02` | 36/36 + G10 5/5 | 同 | 不回归 |
| `verify-ticket-02-settings` | 33/0 | 同 | 不回归 |
| `verify-ticket-03` | 58/0 | 同 | 不回归 |
| `verify-ticket-05` | **100/100 ALL GREEN** | **100/100 ALL GREEN** | 不回归（关键） |
| `verify-ticket-05-harness` | 59/0 | 59/0 | 不回归 |
| `verify-ticket-06` | 209/0 | 同 | 不回归 |
| `verify-ticket-07` | 63/0 | 同 | 不回归 |
| `verify-ticket-08` | 35/0 | 同 | 不回归 |
| `verify-ticket-09` | 36/36 | 同 | 不回归 |
| `verify-ticket-10` | 34/0 | 同 | 不回归 |
| `verify-ticket-11` | 62/0 | 同 | 不回归 |
| `verify-ticket-13` | 28/0 | 同 | 不回归 |
| `verify-ticket-15` | 36/36 | 同 | 不回归 |
| `verify-ticket-18` | 35/0 | 同 | 不回归 |
| `verify-ticket-27` | 94/0 | 同 | 不回归 |
| `verify-ticket-28` | 19/0 | 同 | 不回归 |
| `verify-ticket-29` | 27/0 | 同 | 不回归 |
| `verify-ticket-31` | 48/0 | 同 | 不回归 |
| `verify-ticket-37` | 21/0 | 同 | 不回归 |
| `verify-ticket-39` | **27/1（G4e 预存红）** | **27/1（G4e，同）** | 不回归（预存） |
| `verify-ticket-42` | 42/0 | 同 | 不回归 |
| `verify-ticket-12`（本票新增） | — | 待报告落盘后绿 | 新增 |

`verify-ticket-39` G4e 为**改前预存红**（`tests/corpus/forms/**` 与 `manifest.json` 含 `cdpn.io`），与票 11 报告的 `27/1 (G4e)` 及 W5 复核 P-20 登记一致；本票未触及该面。

### 4.2 全量 E2E

命令：`npm run e2e`（= `vite build` + `playwright test`）。
结果：**145 passed / 0 failed**（约 1.5m），exit 0（**本地自证**）。
影响面核对：E2E 面**不触达**本票改动的上限路径 —— 无 `upsertOverride` / `overrides.length` 断言，无大批量写入循环。
CI 侧 E2E（`e2e.yml`）证据**未取得**，状态与原因见 §9。

### 4.3 类型检查

`npx tsc --noEmit` → exit 0（无输出）。

### 4.4 提交后复核（在**已提交的树**上重跑）

| 门 | 退出码 | 结果 |
|---|---|---|
| `verify-ticket-12.mjs` | 0 | 31 PASS / 0 FAIL |
| `verify-ticket-05.mjs` | 0 | `100/100 pass`（ALL GREEN） |
| `verify-ticket-05-harness.mjs` | 0 | 59 PASS / 0 FAIL |
| `npx tsc --noEmit` | 0 | 无输出 |

**过程注记（如实登记）**：首次复跑误在 ctx 沙箱的 **Bun** 运行时下执行，`verify-ticket-05.mjs` 报 `SyntaxError: Export named 'stripTypeScriptTypes' not found in module 'node:module'`。该报错是**运行时错配**（`module.stripTypeScriptTypes` 需 Node ≥ 22.13），**非本票缺陷**；换用受管 Node **v22.22.2** 后三门全绿。CI 侧由 `actions/setup-node` 钉 `node-version: 22` 复现同一条件。

---

## 5. 裁定：上限强制点在写路径（依据）

完整依据见 `docs/adr/0011-rule-override-cap-enforcement-point.md`。摘要：

**本仓既有语义**
1. `RULES_MAX_OVERRIDES` 注释自述「文档内覆盖规则上限（防御异常增长）」⇒ 语义对象是**文档**（持久化 + 广播产物）。
2. `_normRulesDoc` 头注自述「防御性规范化（远端/GM 值可能被外部写坏）」⇒ 定位是**外来输入**修复面。
3. `store/index.ts` 文件头注是 v1 文档格式的**权威契约**（`rules/index.ts` 与 07 面板均以其为准）⇒ 上限属契约，生产者有义务不违约。

**工业界语义**（atomcode 深度调研，`research/12-atomcode-enforcement-point.md`，15 条来源）
4. 系统级上限由**写入路径 fail-closed** 强制是 NoSQL 与关系库共同默认（MongoDB 16 MiB 硬限 + Schema Validation **默认拒绝**；DynamoDB 配额；NIST SP 800-53 SI-10）。
5. 应用/仓储写入边界是同一不变量的**前置哨兵**，官方建议两层并置（Oracle 明确推荐「约束 + 应用双重校验」）。
6. Tolerant Reader（Fowler 2011）的边界被精确限定为「外部提供方将来可能**合法变化**的部分」（未知/缺失字段）—— **不含**「记录数超上限」这类不变量；检索范围内**不存在**把数量上限放在读路径静默修复的一手案例。
7. 宽容读取的代价有协议层权威背书（RFC 3117 / RFC 9413）：宽容会固化缺陷、制造 bug-for-bug 兼容。

**本仓工程判据**
8. **跨标签页一致性**：写路径强制使「内存缓存 = GM 持久化 = 广播载荷」三面**同时**不超限；仅读路径强制会产生分歧窗口，而 S4 断言恰好探测该边界。
9. **被保护资源**：上限保护的是**持久化 blob**；只在读侧截断则超限 blob 已落盘，保护在关键处失效。

**被否决路线（读路径强制）**：`getSiteRules()` 有损投影会破坏其「全量副本」契约；`_normRulesDoc` 作为唯一强制点无法约束本地生产者。

**已知取舍**：未在 `_writeRules` 增加「静默截断」式兜底 —— 静默截断会把「违反不变量」掩盖为「截断后正常」，与 fail-closed 取向相反。

---

## 6. 决定性对照实验（2×2）

脚本：`.scratch/architecture-recovery/research/scripts/12-ab-cap-fidelity.mjs`（可从**当前树**复跑，自包含）
方法：从 `verify-ticket-05.mjs` 与 `src/store/index.ts` 的**当前原文**派生 4 个变体，仅两个自变量；断言面共用同一份文本。

| 变体 | 写路径强制 | 替身投递 | 结果 | 含义 |
|---|---|---|---|---|
| **A** | 有 | 结构化克隆 | **100/100 GREEN**（exit 0） | 本票目标态：绿来自实现保证 |
| **B** | 无 | 结构化克隆 | **99/100 RED**（exit 1），`S4 got=513` | 去掉写路径强制即复红 ⇒ 绿**依赖实现** |
| **C** | 无 | 按引用 | **100/100 GREEN**（exit 0） | **假绿复现**：别名旁路效应 |
| **D** | 有 | 按引用 | 100/100 GREEN（exit 0） | 强制与保真度双重冗余下的绿 |

**关键对照**：B 与 C **只差替身投递保真度**（两者均无写路径强制）—— B 红、C 绿。这直接坐实：旧 S4 的绿是「接收方就地改写污染发送方 `_rulesCache`」的产物，而非实现保证。

---

## 7. 偏离点呈报

| # | 偏离 | 说明 |
|---|---|---|
| E-1 | 报告路径 | 按本仓既有约定落 `research/window-reports/`（既有 60+ 报告链），未新建路径 |
| E-2 | 新增 ADR-0011（issue 未要求） | 依 WORKFLOW §7.3「产生不可逆决策 / 被否决路线 → `docs/adr/NNNN-*.md`」；本票存在真实取舍与被否决路线（读路径）。属**只升**（不删不改任何既有 ADR）；若收口拟改口径请显式指出 |
| E-3 | 新增票级门 + workflow（issue 未要求） | 依仓库「一票一门」约定（先例：票 10 E-4、票 11）+ 本票 delta 的「不得放宽 / 不得删除断言」硬约束 |
| E-4 | 未另起第二道调研 | 本票核心待决问题（强制点）**已**经 atomcode 深度调研（串行护栏照守：全程至多 1 个在途，未杀进程）；未另起并行调研 |
| E-5 | 真实站点层影响面 | 本票改动面为 `src/store/index.ts` 写路径 + 测试门；`upsertOverride` 为面板/负反馈写入入口，其 `null` 返回已被既有契约（`string | null`）与消费方（`Rules.rememberNone` 传播 null）容忍 ⇒ **无新增未捕获异常面**；真实站点层为 advisory，本票不修改其断言，也不以其结果充当证据 |
| E-6 | 未新增 CONTEXT.md 术语 | delta 仅要求「若裁定读路径」才需文档层显式说明；裁定为写路径 ⇒ 不触发。且 A-033 已定 CONTEXT.md 术语 7 条为上限，本票不扩 |
| E-7 | 推送需授权 → **移交大脑 Agent** | 按 WORKFLOW §8.2 **第 4 条（授权路径）**「涉及**远端写**（push / 删除 ref / 改 tag）…一律**逐次取得用户授权**，并在报告中留授权记录」，本票**不自行推送**。已向用户呈报；用户于 2026-09-17 裁定「**交给大脑 agent**」⇒ 推送与 CI 取证事项**移交大脑 Agent**，本窗口不代决。移交所需全部事实见 §9 |

---

## 8. 只升不降自证

| 面 | 自证 |
|---|---|
| 断言 | `verify-ticket-05.mjs` 断言面**零改动**（仅替身与 bundle 装配顺序）；断言调用点数 100 = 基线 |
| 门 | 21 道公共门逐道实跑，计数与改前**逐项吻合**；`verify-ticket-39` 预存红不新增 |
| 覆盖 | 新增 `verify-ticket-12.mjs`（31 断言）+ `verify-12.yml`；未删任何既有门 / spec / fixture |
| 文档 | 新增 ADR-0011；未修改任何既有 ADR |
| 语义 | 票 24 跨帧来源校验语义不变（`SELF_ORIGIN` 唯一定义未动，`verify-10` G2/G3 全绿） |

---

## 9. CI 证据与「移交大脑 Agent」的事项

> 依 WORKFLOW §8.1「行为面证据只认 CI run / artifact」：本节 CI 字段**未取得**时，**不得**被读作验收通过。

### 9.1 提交锚点（本地事实，已确证）

| 项 | sha | 说明 |
|---|---|---|
| 实施提交 | `fe0a5df3`（`fe0a5df3cf637c6b74557577ee84a2e2bb5d1141`） | 写路径强制点 + 替身保真度 + 票级门 + workflow + ADR-0011 + 调研/实验脚本（8 文件） |
| 文档提交（本报告 + issue 勾销） | `1e5866d2`（`1e5866d27f3ec08042285903beae84ec3bc49474`） | 本报告落盘 + issue 七条勾销 |
| 分支 | `cch/12-rules-limit-fidelity` | 锚 `cch/10-srcdoc-origin-fix`，与并行票分支互不堆叠。**提交清单以当场输出为准**：`git log --oneline cch/12-rules-limit-fidelity`（本报告定稿时含实施提交 `fe0a5df3` + 文档提交若干，工作区干净） |

### 9.2 CI 证据：**未取得**（如实登记，不得伪造绿）

| 面 | workflow | 状态 |
|---|---|---|
| 票级门（31 断言） | `verify-12.yml` | **未取得** |
| 全量 E2E | `e2e.yml` | **未取得** |
| 引擎门 | `engine-gates.yml` | **未取得** |
| 类型检查 | `typecheck.yml` | **未取得** |
| lockfile | `lockfile-regen.yml` | **未取得** |

原因：取得 CI 证据须**远端写**（推送分支），而本窗口**未获**推送授权（见 9.3）。§4 的本地自证**不替代**行为面 CI 证据（WORKFLOW §8.2 第 2 条禁止面）。

### 9.3 授权记录（WORKFLOW §8.2 第 4 条：谁 / 何时 / 授权范围）

| 项 | 内容 |
|---|---|
| 呈报时间 | 2026-09-17 |
| 呈报内容 | 是否授权推送 `cch/12-rules-limit-fidelity` 至 `origin`（新建单 ref、2 提交）以取得 CI run 证据 |
| 用户裁定 | 「**交给大脑 agent**」 |
| 授权范围 | **未授权本窗口执行任何远端写**；推送与 CI 取证事项**移交大脑 Agent** |
| 本窗口动作 | **未执行** `but push`；**未创建** PR；零远端写 |

### 9.4 移交大脑 Agent 的事项（可独立执行，无需回读本窗口对话）

**待决动作**：`but push cch/12-rules-limit-fidelity`（单一 ref；目标 `origin/cch/12-rules-limit-fidelity`）。

**推送载荷**：**以当场复跑为准** —— `but push --dry-run cch/12-rules-limit-fidelity`（目标 `origin/cch/12-rules-limit-fidelity`）。

**不变事实（与提交数无关，可直接用于决策）**：

1. `origin/cch/12-rules-limit-fidelity` **远端不存在** ⇒ 属**新建单 ref**，**不改写任何既有远端 ref**（无 force、无 ref 删除、无 tag 变更）。
2. 推送为**单 ref**（显式指定分支，非全工作区推送）⇒ **不触及其他票的远端 ref**。
3. 分支锚 `cch/10-srcdoc-origin-fix`，与并行票分支互不堆叠。
4. 载荷会随本票后续文档提交而**增长** ⇒ 不得固定引用任何提交数。

**历史快照（仅供理解形状，非执行依据）**：2026-09-17 初测时 `but push --dry-run` 输出为

```
┌─ Branch: cch/12-rules-limit-fidelity ↑ (on top of cch/10-srcdoc-origin-fix)
│   → Would push to: origin/cch/12-rules-limit-fidelity
│   Commits: 2 unpushed commits
│     1e5866d2 docs(cch-12): 窗口报告落盘 + issue 七条勾销
│     fe0a5df3 fix(cch-12): 规则上限强制点收敛到写路径（A-036）+ BC 替身克隆保真度修复
Summary: Would push 2 commits across 1 branch
```

（当时为 2 提交；其后本票又落了锚点回填与 §11 回写两笔文档提交，故实际载荷已增长 —— 这正是不固定提交数的原因。）

**远端写性质与副作用披露（须一并评估）**：

1. `origin/cch/12-rules-limit-fidelity` **远端不存在** ⇒ 属**新建单 ref**，**不改写任何既有远端 ref**（无 force、无 ref 删除、无 tag 变更）。
2. **祖先链分歧（P-20 类）**：本地 `cch/10-srcdoc-origin-fix` 尖端 `33f0c872` **不在** `origin/cch/10-srcdoc-origin-fix`（`6a95417b`）上 —— `git merge-base --is-ancestor origin/cch/10-srcdoc-origin-fix cch/12-rules-limit-fidelity` 返回**非祖先**。故新远端 ref 的祖先链为本地 rebase 后的 cch/10 链，与 `origin/cch/10-srcdoc-origin-fix` **sha 不同、内容等价**；与 W5 复核已登记的 **P-20「本地≠远端」**（cch/08 `d0430821` vs `747763fd`、cch/11 `f9d60760` vs `8a27ad34`）同源。**未修改任何既有远端 ref**，但该事实须随推送一并登记，不得隐去。
3. **将触发的 CI**（workflow 触发器实测）：`verify-12.yml`（本票分支 push）、`e2e.yml`（`cch/**`）、`engine-gates.yml`（`cch/**`）、`typecheck.yml`（`cch/**`）、`lockfile-regen.yml`（`cch/**`）。

**推送后回填清单（供大脑或后续窗口执行）**：

- §9.2 表逐项填 run ID + 结论；
- §11 变更记录追加「CI 证据回填」行；
- 附录「E2E 结果」补 CI E2E 结论；
- `issues/12-rules-limit-fidelity.md` 的 `CI run` 字段与「未决事项」节状态；
- 若 CI 出现红：**不得**改断言消红；按 §8.1.1 归因（本票面 / 非本票面）后如实登记。

### 9.5 提请大脑注意

- 本票验收项 6 的**行为面部分（CI）在证据到位前不成立**；本窗口**不宣称**该条已闭环。
- `verify-ticket-12.mjs` G6 为**门内行为锁**（实跑 `verify-ticket-05.mjs`），其证据同样以 CI 为准。
- 波次表勾销属大脑收口职责（WORKFLOW §3 S8 / §4.3）；本窗口**未改** `README.md`。

---

## 10. 完成定义自检

| 项 | 状态 |
|---|---|
| issue 全部验收项勾销并各附 commit sha | ✅（`fe0a5df3`；见 issue） |
| 报告落 `research/window-reports/12-rules-limit-fidelity-report.md` | ✅ |
| 版本控制遵循 WORKFLOW §4.2 | ✅（`but commit -b cch/12-rules-limit-fidelity`，见 §11） |
| 行为面 CI 证据（§8.1） | ⏳ **未取得** —— 推送授权事项已移交大脑 Agent（§9.3 / §9.4） |

---

## 11. 文档提交与变更记录

| 阶段 | 提交 | 说明 |
|---|---|---|
| 实施 | `fe0a5df3` | 写路径强制点 + 替身保真度 + 门 + workflow + ADR-0011 + 调研/实验脚本（8 文件） |
| 文档 | `1e5866d2` | 本报告落盘 + issue 七条勾销（2 文件） |
| 锚点回填（§9 重写 + 提交后复核 + issue 补锚） | `551e08a4` | 本报告 §9 / §4.4 / §7 E-7 / §10 / §11 + issue「未决事项」节；**零远端写** |
| CI 证据回填 | （待大脑授权推送后追加） | 回填清单见 §9.4 |

---

## 附：E2E 结果

**本地自证（2026-09-17，改后树）**：`npm run e2e` → **145 passed / 0 failed**（约 1.5m），exit 0。
影响面核对：E2E 面**不触达**本票改动的上限路径（无 `upsertOverride` / `overrides.length` 断言，无大批量写入循环）。
**CI 侧 E2E（`e2e.yml`）**：**未取得** —— 须推送分支；状态与原因见 §9.2 / §9.3。**不得**以本地结果替代行为面 CI 证据。
