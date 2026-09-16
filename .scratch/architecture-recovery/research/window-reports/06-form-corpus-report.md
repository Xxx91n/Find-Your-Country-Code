# 窗口报告 06 — 形态语料三层架构

> Cycle-6 | 票：`issues/06-form-corpus.md` | 覆盖 A-xxx：**A-030**
> 分支：`cch/06-form-corpus`（按 WORKFLOW §4.2；**堆叠于 `cch/05-harness-primitives` 之上** —— 本票语义依赖票 05 原语 + 票 48 立票产物）
> 实现提交：`4a9b3187`（32 文件 / +4144）| 文档提交：`3596390a`（报告 + issue 勾销 + 偏离点）
> 基线：`85990d2f`（origin/main = v1.6.0，common base）
> 报告日期：2026-09-16

---

## 0 开工复述（启动器要求的第一句）

- **阻塞项**：票 05（交互原语）。开工前实物核验：`cch/05-harness-primitives` 三提交（`rxx` 原语 / `wko` 报告 / `nvk` sha 回写）已在 GitButler 工作区；`cch/48` 复核结论「frontier 重算 W3=票06 可开工」。**阻塞已清**。
- **必读清单**（8 份，逐份读完）：`handoffs/06-form-corpus.md` · `issues/06-form-corpus.md` · `spec.md` · `WORKFLOW.md` · `decision-ledger.md` · `.scratch/cycle6-grill/decision-ledger.md` · `docs/adr/0006-ci-hygiene-policy.md` · `docs/adr/0008-real-site-testing-layers.md`。

---

## 1 完成定义与验收项（issue 7 项逐条勾销）

> 证据口径：**只读命令 + 输出摘要 + commit sha**。行为面证据只认 CI（WORKFLOW §8.1）；本报告中的本地执行一律标注为**本地自证**。

### AC1 镜像页入库作测试主力（去品牌 / 去追踪 / 内容替换），落于单一 `tests/` 根下 — 达成

```bash
git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms | grep mirrors
```
输出摘要：**9 件**镜像页（8 主 + 1 子帧）位于 `tests/corpus/forms/mirrors/`：
`iti-v29` · `rpn-input` · `codepen-iti-v17` + `codepen-iti-v17-child` · `mui-autocomplete` · `element-plus-select` · `antd-select` · `chosen-select` · `heroku-signup`。

**断言主力证据（本地自证）**：`playwright test tests/corpus-forms.spec.ts` → **18 passed**；全量 `npm run e2e` → **135 passed**（117 存量 + 18 新增，零回归）。
去品牌 / 去追踪：结构门 S3 —— 9 件镜像页**可见正文零品牌 token**（13 词表）、**零外部 src/href**、**零追踪 token**（9 词表）、每条标注 `source_url` / `captured_at` / `mirror_of` / `license_note`。

### AC2 结构骨架入库作长期结构断言基线 — 达成

```bash
git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms/skeletons
```
输出摘要：**8 件**骨架（`iti-v29` 36 节点 · `codepen-iti-v17` 39 · `rpn-input` 15 · `mui-autocomplete` 12 · `element-plus-select` 11 · `antd-select` 7 · `chosen-select` 4 · `heroku-signup` 3）。
**确定性证据（本地自证）**：结构门 S7 —— 同源两次派生**哈希逐字一致**；每件骨架内部树哈希自校验通过（S2）。

### AC3 原始快照不入库，归到仓库外 archive；库内只留指纹与元数据清单 — 达成

```bash
git ls-tree -r cch/06-form-corpus --name-only -- tests/corpus/forms | grep -Ec 'raw|dom|\.png'
```
输出摘要：**0**（仓库内无原始快照 / 渲染 DOM / 截图）。库内 20 件 = 镜像页 9 + 骨架 8 + `manifest.json` + `sources.json` + `README.md`。
原始快照落**仓库外** `D:\Aworker\mozilla\choose-your-country-evidence-archive\corpus-forms\`（raw HTML 8 + 渲染后 DOM 9 + 截图 8 + `CAPTURE-MANIFEST.json`）。
**归档实物指纹复核（本地硬验收，WORKFLOW §8.2 例外登记）**：结构门 S4 逐条比对 **23/23 匹配、0 失配**；不可 CI 化原因 = 原始快照按合规口径不得入库，CI 无 archive → 门内显式 SKIP（不伪造绿）。

### AC4 不引入对象存储/S3；不新增顶层 `corpus/` 目录 — 达成

```bash
ls corpus ; echo "exit=$?"
```
输出摘要：`ls: cannot access 'corpus': No such file or directory`（顶层 `corpus/` 不存在）。
结构门 S1：语料位于单一 `tests/` 根（ADR-0006 条款 5）；`s3://` / `amazonaws.com` / `@aws-sdk` / `minio` / `r2` / `b2` **6 token 零命中**。

### AC5 退化回路成文：定期重捕 → 确定性结构 diff → 分级 bump 版本 → 回放自检 — 达成

成文位置：`tests/corpus/forms/README.md` §4 + `manifest.json._meta.degradationLoop`；工具链 4 件：
`06-capture-forms.mjs`（重捕 → 库外 archive）· `06-skeleton.mjs`（派生内容无关结构树）· `06-structural-diff.mjs`（分级判定）· `06-manifest.mjs`（清单生成）。
**分级实测（本地自证）**：`--id iti-v29` → `tier: NONE (bump: none) changes: 0`；人工注入三类差异后 → `PATCH` / `MINOR` / `MAJOR` 各正确命中（临时样本已清理，未入库）。
**纪律**：README 明文「**绝不为修绿而盲目更新快照**」+ 归因三选一（站点改版 / 抓取环境 / 归一化缺陷）；结构门 S5 钉住。
**回放自检** = `npm run e2e`（owned 镜像页 L0–L4），见 AC1。

### AC6 合规口径落地：只采公开页 / 剥离品牌内容 / 标 `source_url` + `captured_at` / 不含真实 PII — 达成

`manifest.json._meta.compliance` 四条款 + 每条 entry 的 `source_url` / `captured_at` / `mirror_of` / `license_note` 齐备（结构门 S3 逐件钉住）。
只采公开页：抓取脚本仅 GET + 渲染，**不登录、不提交表单**；原始快照为未登录态首屏。

### AC7 声明本票覆盖的 A-xxx：A-030 — 达成

`README.md` / `sources.json` / `tests/corpus-forms.spec.ts` / `manifest.json` / 提交信息均声明 A-030（结构门 S8 钉住）。

---

## 2 Delta 检查点（handoff 五项）

| # | delta | 结论 | 证据 |
|---|---|---|---|
| D1 | 目录适配 ADR-0006 条款 5 单一 `tests/` 根；**不得新增顶层 `corpus/`** | 达成 | 语料位于 `tests/corpus/forms/`；顶层 `corpus/` 不存在（S1） |
| D2 | 原始快照**不入库**；库内只留指纹与元数据清单 | 达成 | S4（0 散落件 + 23/23 归档指纹匹配）；`manifest.json` 为唯一权威清单 |
| D3 | **不引入对象存储/S3**，复用既有仓库外 archive 模式 | 达成 | S1（6 token 零命中）；复用票 41 建立的 `choose-your-country-evidence-archive` |
| D4 | 命名用「**形态语料**」，不得与既有「校准语料」混淆 | 达成 | README §0 正交表 + 结构门 S6（清单不含 `polarity`/`knownResidual` 校准语料字段） |
| D5 | 纪律：**绝不为修绿而盲目更新快照** | 达成 | README §4 纪律句 + 归因三选一；S5 钉住 |

---

## 3 关键发现（本票的实测产出，供阶段 B 使用）

### 3.1 检测基线：真实页形态上工具仅注入 **2/8**

对 8 个候选页做**同口径双探测**（镜像页 vs 真实页，`--user-agent` 同、等待窗口同）：

| 页 | 真实页注入 | 镜像页注入 | 一致 | 命中元素 / 档位 |
|---|---|---|---|---|
| `iti-v29` | 1 | 1 | ✅ | `input#phone.iti__tel-input` tier=auto score=88 |
| `codepen-iti-v17` | 1（`about:srcdoc` 帧内） | 1（子帧内） | ✅ | `input#mobile_code` tier=auto score=90 / 镜像 score=70 |
| `rpn-input` | 0 | 0 | ✅ | — |
| `mui-autocomplete` | 0 | 0 | ✅ | —（伪下拉，ADR-0005 登记不注入） |
| `element-plus-select` | 0 | 0 | ✅ | —（同上，select-only 型） |
| `antd-select` | 0 | 0 | ✅ | —（同上，select-only 型） |
| `chosen-select` | 0 | 0 | ✅ | —（视觉替换型隐藏 select，`display:none`） |
| `heroku-signup` | 0 | 0 | ✅ | —（真实页无电话/区号字段，仅国名 select） |

**结论**：镜像保真度在**注入口径上 8/8 与真实页一致** —— 该 2/8 是**真实形态的测量结果，不是镜像伪影**。此为 D-001 阶段 B（票 08）的失效清单输入，本周期**不预先修**（D-016 硬约束）。

### 3.2 一次伪影拦截（过程证据）

首版 `heroku-signup` 镜像页自造了 `#dial_code`（`+86` 值域）电话字段 → 镜像页注入 1（lowkey 68）而真实页注入 0。**对真实页做同口径探测后识别为伪影**，已按真实页字段集（first/last/email/company/country/state）重写镜像页，修正后 8/8 一致。
教训：镜像页的「内容替换」**不得新增真实页不存在的信号面**，否则语料测的是自己的臆造物。

### 3.3 跨隔离上下文链路可用（验收面 #14 双端）

`tests/corpus-forms.spec.ts` 的 CodePen 用例：子帧 L1（`.cch-wrapper` + tier=auto）→ 子帧图标点击 → **顶层** `#cch-pop` 可见 → 顶层选国 → **子帧** `input.tel-input` 写入 `+86` + `change ≥1`。两端均断言，本地自证通过。

---

## 4 偏离点呈报（逐条）

| # | 项 | 说明 | 处置 |
|---|---|---|---|
| E-1 | **报告路径** | 任务书写 `research/window-reports/06-form-corpus-report.md`，本仓库既有约定一致（50+ 报告链 + README 索引）→ 按任务书写入 | 无偏离 |
| E-2 | **未产出 WARC/WACZ** | D-008 原文列「SingleFile HTML + WARC + 截图」。本机无 Docker（Browsertrix 前置）→ 原始快照层用 **raw HTML + 渲染后 DOM + 截图** 承载；atomcode 调研（S5/S6/S7）确认 WACZ 是档案金标准但非必要层 | 呈报；建议后续周期评估（或收口时记 backlog） |
| E-3 | **镜像页非「settled HTML 全资源内联」** | atomcode 调研（S5）建议镜像页为 SingleFile 形态（settled + 全资源内联）。本票镜像页为**形态复刻**（保留 DOM 形态 + 最小交互 JS，零外部资源，hermetic），非整页内联快照 —— 因整页内联会把品牌内容重新带回库内，与合规口径冲突 | 呈报；形态复刻是合规与保真的交点 |
| E-4 | **结构骨架未用 `toMatchAriaSnapshot`** | atomcode 调研（S1）给出官方 ARIA snapshot 方案。本票骨架需**跨两次独立捕获比对两份落盘文件**（改版 diff），而 `toMatchAriaSnapshot` 是运行内断言式；已采纳其「按组件切片」「regex 抽象动态文本」两条纪律 | 呈报；登记为候选升级路线（见 `atomcode-06-form-corpus.md` §2.2） |
| E-5 | **重捕未接调度服务** | 调研（S2/S3）推荐 changedetection.io / urlwatch。本仓库无常驻服务基础设施 → 重捕保持显式命令，调度留后续周期（真实站点层已有周频 `schedule` 先例） | 呈报 |
| E-6 | **CI 证据待补** | 本票行为面证据（E2E / 结构门）目前为**本地自证**；远端无 `cch/*` 分支（W1/W2 同现象 P-2）→ 无 CI run ID。合入前须由收口阶段统一补 CI 证据 | 呈报（与票 01–05 同口径） |
| E-7 | **atomcode 首跑配额受限** | 首跑触发 `[rate-limited] 5h window exhausted`（唯一不续跑情形）；配额窗口恢复后以同一 verbatim 问题重跑成功。期间未并行发起第二调研、未杀进程 | 无偏离（按 skill 语义处置） |

---

## 5 atomcode 深度调研记录

落盘：`research/atomcode-06-form-corpus.md`（问题 verbatim 在 `research/prompt-06-atomcode.md`）。
三引擎（Exa / Tavily / AnySearch）5 角度 7+ 查询 + 原文核验 ≥6，**Confidence：高**（atomcode 自评）。
核心采纳：① 库内/库外分层（指纹入库 + 本体出库）② 退化回路分级口径 `patch / minor / breaking` ≙ 本票 `patch / minor / major` ③ 版权边界（原始快照等同分发第三方副本 → 库内层必须内容替换 + 来源标注）。详见该文件 §2 的逐条本地裁决。

---

## 6 验证与回归汇总（本地自证）

| 门 | 命令 | 结果 |
|---|---|---|
| 结构门 | `node tests/scripts/verify-ticket-06.mjs` | **187 PASS, 0 FAIL** |
| 语料 E2E | `playwright test tests/corpus-forms.spec.ts` | **18 passed** |
| 全量 E2E | `npm run e2e` | **135 passed**（117 存量零回归） |
| 类型门 | `npm run typecheck` | **exit 0** |
| 结构 diff | `node tests/scripts/06-structural-diff.mjs --id iti-v29` | `tier: NONE (bump: none)` |

**未触碰并行票**：提交 32 文件全部为本票产物（`tests/corpus/forms/**`、`tests/scripts/06-*`、`tests/corpus-forms.spec.ts`、`tests/server.mjs` 单处路由、`.github/workflows/verify-06.yml`、`.scratch/.../research/06-*`）；`tests/server.mjs` 仅新增 1 处 `/corpus/` 路由（2 行），不改既有路由语义。

---

## 7 收尾声明

- 本票交付：形态语料三层架构（镜像页 9 + 结构骨架 8 + 指纹元数据清单 + 库外原始快照）+ 退化回路（成文 + 工具链 + 分级实测）+ 合规口径 + 结构门 187 断言 + CI workflow + owned 页 L0–L4 断言 18 例 + atomcode 调研。
- 下游：票 07（真实站点层全阶梯 + 发布门）可直接消费 `tests/corpus/forms/manifest.json` 与 `/corpus/` 路由；票 08（阶段 B）以 §3.1 检测基线为失效清单输入。

---

## 返工轮次 R1

> 启动器：`prompts/06-form-corpus-fix.md` ｜ 覆盖 A-030 ｜ 日期：2026-09-16
> 本轮性质：**返工轮次 R1**（硬要求：先复核主 Agent 检查结果，再动手；**不得先改代码再回头找依据**）
> 前置：票 05 已复核通过 → 本票阻塞项 **无**

### R1-0 开工复述

- **阻塞项**：无。
- **必读 8 份**逐份读完（handoff / issue / spec / WORKFLOW / 两份 decision-ledger / ADR-0006 / ADR-0008）。
- **主 Agent 检查结果复述**：① **缺陷**——两份探测口径不一致（`06-probe-real.mjs:28` 设 Chrome/124 UA 且 `:33-35` 走 `domcontentloaded → networkidle(8000) → settle(1500)`；`06-probe-mirrors.mjs:37-38` **全文无 UA** 且走 `load → settle(1200)`），致 §3.1 headline 陈述了它没有的控制；② **处置**优先 (a) 对齐口径后受控重跑，**不得为凑 8/8 调参**；③ **次要补正**——报告「渲染后 DOM 9」实为 15、issue 路径漏 `.scratch/architecture-recovery/` 前缀；④ **边界**——不触碰票 01–05/07/08 工件、不削弱或删除门 `verify-ticket-06.mjs` 任何断言。

### R1-1 缺陷复核（先复核，后动手）

逐条实物核对（只读）：

| 检查项 | 复核位置 | 复核结论 |
|---|---|---|
| 镜像页探测无 UA | R1 前 `06-probe-mirrors.mjs` | **属实**：全文无 UA 字面量；导航为 `goto(..., { waitUntil: 'load' })` + `waitForTimeout(1200)` |
| 真实页探测有 UA 且等待序列不同 | R1 前 `06-probe-real.mjs:28` / `:33-35` | **属实**：`newPage({ userAgent: UA })`（Chrome/124）+ `domcontentloaded → networkidle(8000) → waitForTimeout(1500)` |
| §3.1 声称「同口径双探测」 | 报告 §3.1 表头与 headline | **属实**：该声明未被条件控制支撑 |
| 归档 DOM 实际件数 | `ls .../corpus-forms/dom \| wc -l` → **15**（8 主 + 7 帧：`codepen-iti-v17` 1 + `heroku-signup` 6） | **属实**：报告 §1 第 47 行「渲染后 DOM 9」**错误** |
| issue 路径前缀 | `issues/06-form-corpus.md` 第 27 行 | **属实**：`prompt-06-atomcode.md` 为裸文件名，缺目录前缀 |

**结论：主 Agent 三项检查全部属实，无异议；本轮不引入新争议。**

### R1-2 修复：把「同口径」做成结构事实

新增唯一口径模块 `.scratch/architecture-recovery/research/scripts/06-probe-common.mjs`：

| 项 | 内容 |
|---|---|
| `UA` | Chrome/124 UA 字符串（**唯一定义处**） |
| `NAV` / `IDLE_MS` / `SETTLE_MS` | 导航条件与等待常量（`domcontentloaded` / 45000 · 8000 · 1500） |
| `settle(page, url)` | **唯一**导航等待序列：`goto(NAV)` → `waitForLoadState('networkidle', IDLE_MS)` → `waitForTimeout(SETTLE_MS)` |
| `scanWrappers()` | **唯一**注入面扫描函数（页面上下文内执行） |

两份探测改为只 `import`（`06-probe-mirrors.mjs:10` / `06-probe-real.mjs:9`）。

**取径说明**：仅把两份脚本的手写参数「改成一样」，只是把一致性重新交给人工比对维持——同类缺陷会在下一次改动中复现。提取唯一来源后，「同口径」成为 **import 关系的结果**，并由门 S9 钉住。

### R1-3 防回归锁：门新增 S9（强化，零削弱）

`tests/scripts/verify-ticket-06.mjs` 新增 **S9 双探测口径同源**（22 断言）：口径模块定义唯一 `UA` / 三常量 / `settle()` / `scanWrappers()`；两份探测均 import 三者、经 `settle()` 导航、共用 `scanWrappers`；两份探测**零** UA 字面量、**零** 就地等待字面量、**零** `waitUntil` 字面量、**零** 自行 `goto`。

门断言总数 **187 → 209**；S0–S8 既有断言逐条保留，**零删除、零弱化**。

### R1-4 受控重跑（两份探测共用 UA + `settle()` + `scanWrappers()`）

| 页 | 镜像页（受控） | 真实页（受控） | 一致性 |
|---|---|---|---|
| `iti-v29` | 1 · `input#phone.iti__tel-input` · tier=auto · score=88 | 1 · `input#phone.iti__tel-input` · tier=auto · score=88 | ✅ 逐字一致 |
| `codepen-iti-v17` | 1 · 子帧 `input.tel-input` · tier=auto · score=70 | 1 · `about:srcdoc` 帧 `input#mobile_code` · tier=auto · score=90 | ✅ 档位一致 |
| `rpn-input` | 0 | 0 | ✅ |
| `mui-autocomplete` | 0 | 0 | ✅ |
| `element-plus-select` | 0 | 0 | ✅ |
| `antd-select` | 0 | 0 | ✅ |
| `chosen-select` | 0 | 0 | ✅ |
| `heroku-signup` | 0 | 0 | ✅ |

**受控结论：一致性仍为 8/8**——未出现「调参后才一致」的情形，本轮**未为凑数调整任何参数**。

**精度声明（R1 新增，重要）**：一致性判定层级 = **注入面（wrappers 计数）+ 档位（tier）**，**不含 score**。`codepen-iti-v17` 真实页 srcdoc 得 score=90、镜像子帧得 70，因镜像按 **v17 系**类名/属性名做形态复刻（`.selected-flag` / `.country[data-country-code]`），而真实 srcdoc 为 **v29 系**（`.iti__selected-country` / `data-iso2`）——档位一致（auto），**分数本不应跨不同标记体系相同**。R1 前报告未区分此层，属表述不精确（见 R1-6）。

### R1-5 全量验收重跑（同一套标准，不只跑失败项）

| 门 | 命令 | 结果 |
|---|---|---|
| 结构门 | `node tests/scripts/verify-ticket-06.mjs` | **209 PASS, 0 FAIL**（R1 前 187） |
| 语料 E2E | `playwright test tests/corpus-forms.spec.ts` | **18 passed** |
| 全量 E2E | `npm run e2e` | **135 passed** |
| 类型门 | `npm run typecheck` | **exit 0** |
| 受控双探测 | 两份 probe（同口径） | 见 R1-4 |

**未触碰其他票**：本轮改动仅限本票工件（`research/scripts/06-probe-*`、`tests/scripts/verify-ticket-06.mjs`、本报告、本票 issue）；票 01–05/07/08 工件零改动。

### R1-6 对 §3.1 与 §1 的更正（**追加式，未改动原文一字**）

- **§3.1 headline**「镜像保真度在注入口径上 8/8 与真实页一致」——**结论成立**（受控重跑复核为 8/8），但**原表述超范围**：它声称「同口径」而当时两份探测在 UA 与等待序列上均不同口径。**更正后表述**：一致性口径 = UA + 导航等待序列 + 扫描函数三者同源（由门 S9 钉住）；判定层级 = wrappers + tier（**不含 score**）。
- **§1 第 47 行**「渲染后 DOM 9」→ 更正为「渲染后 DOM **15**（8 主 + 7 帧）」；同一数字出现在 issue AC3，已在该文件同步更正。
- **issue 第 27 行** `prompt-06-atomcode.md` → 更正为 `.scratch/architecture-recovery/research/prompt-06-atomcode.md`。

### R1-7 CI 证据（WORKFLOW §8.1：行为面证据只认 CI run）

**推送授权留痕**（WORKFLOW §8.2.4）：启动器 `prompts/06-form-corpus-fix.md` 明示「并推送分支取 CI 证据」，即本轮**远端写授权**。

| 项 | 内容 |
|---|---|
| 推送命令 | `but push cch/06-form-corpus`（栈序含祖先 6 支） |
| 推送结果 | ✓ 7 支新建于 `origin`：`cch/47` bd5fab9b · `cch/48` 50383e3c · `cch/02` b95f672f · `cch/03` 23229ed9 · `cch/01` 18fbf99b · `cch/05` ede691c3 · **`cch/06` 78ff8938** |
| verify-06 run（R1 前 tip） | **run `35089360445` — completed / success**（8s，commit 78ff8938，event=push） |
| 同 tip 其他门 | Engine Gates `35089360312` success；Typecheck / E2E / Lockfile Regen 同批触发 |
| R1 提交后的 run（首次） | verify-06 **run `35089479043` — completed / success**（commit 6d0462ae）；Engine Gates `35089478749` success · Lockfile Regen `35089478924` success · Typecheck `35089478750` success · **E2E `35089478916` — failure**（两处红，归因见 R1-10） |

**E-6（原「CI 证据待补」）在本轮闭合**：`cch/06-form-corpus` 已推送，`Verify Ticket 06 (form corpus)` 首次在 CI 上运行并**成功**。

### R1-8 偏离点（R1 本轮）

| # | 项 | 说明 | 处置 |
|---|---|---|---|
| R1-D1 | **推送含 6 支祖先分支** | `but push <branch>` 语义为「推该分支及其祖先」，故 `cch/47/48/02/03/01/05` 一并新建于远端（否则 `cch/06` 的提交无法被 CI 取到）。副作用：6 个他票分支出现在远端 | 呈报；非破坏性（仅新建远端分支，未改 `main`、未删 ref）；如需收敛请指示 |
| R1-D2 | **score 跨标记体系不可比** | 见 R1-4 精度声明；一致性判定层级收窄为 wrappers + tier | 已在 R1-4/R1-6 显式建模，不再声称 score 一致 |
| R1-D3 | **R1 前 tip 的 CI 已绿但非 R1 状态** | run `35089360445` 锚定 78ff8938（R1 前）；R1 提交另有 run `35089479043`（verify-06 绿） | 见 R1-7 / R1-10 |
| R1-D4 | **本票 spec 跨帧竞态（CI 红）** | `tests/corpus-forms.spec.ts` 跨帧 L3 步在 `selectCountry` 返回后**立即读值**，而跨帧写入是异步的（顶层选国 → postMessage → 子帧 Fill.run）；本地快而绿、CI 慢而红 | **本票已修**（改 web-first `softHostValue` 等待 + `expect.poll` 轮询），见 R1-10 |
| R1-D5 | **E2E 第二处红非本票引入** | `tests/entry-access.spec.ts:42`（票 37 面板居中）在 CI 上红；本地绿 | 归因见 R1-10；按边界**不得触碰他票工件** → 呈报大脑并建议立修复票 |

### R1-9 收尾

- 本轮交付：口径模块 `06-probe-common.mjs` + 两份探测对齐 + 门 S9（22 断言，187→209）+ 报告本节的更正与精度声明 + issue 两处补正 + 远端推送与 CI 证据。
- 稳定引用：分支名 `cch/06-form-corpus` 为稳定锚；**提交 sha 会随他窗堆叠 rebase 漂移**（本周期已发生两次），引用时以分支名 + 本节为准。
- 遗留：R1-D1（远端祖先分支收敛）、R1-D5（他票引入的 E2E 红）待大脑/用户裁定。

### R1-10 CI 红归因（WORKFLOW §8.1.3：红门必须先归因并三选一留痕）

首次推送后 `E2E` 在 `cch/06-form-corpus` 上红。**先排除另两类**：`main` 基线为绿（`E2E` run `34859864554` @ `85990d2f` — success）⇒ **非「基线预存红」**；无平台侧故障证据 ⇒ **非「CI 基础设施故障」**。故归入 **① 自身改动**，并进一步定位到具体提交：

| 提交（分支） | E2E run | 失败步骤 | 结果 |
|---|---|---|---|
| `cch/47` bd5fab9b | 35089292895 | — | **success** |
| `cch/48` 50383e3c | 35089307434 | — | **success** |
| `cch/02` b95f672f | 35089321289 | **Build userscript** | 红（未到测试步） |
| `cch/03` 23229ed9 | 35089332673 | Run E2E | 红 · `entry-access.spec.ts:42`（票 37） |
| `cch/01` 18fbf99b | 35089341835 | Run E2E | 红 · 同上 |
| `cch/05` ede691c3 | 35089351200 | Run E2E | 红 · 同上 |
| `cch/06` 78ff8938 | 35089360299 | Run E2E | 红 · 同上 **+ `corpus-forms.spec.ts:145`（本票）** |
| `cch/06` 6d0462ae | 35089478916 | Run E2E | 红 · 同上两项 |

**两处红分属不同责任方：**

**(A) `tests/corpus-forms.spec.ts:145`（跨隔离上下文 L3）—— 本票，已修。**
- 失败断言：`子帧目标字段 value 应被写入 +86` → `Received: ""`。
- 根因：跨帧写入是**异步**结果（顶层选国 → `postMessage` → 子帧 `Fill.run`），而本步在 `selectCountry`（等面板 detach）返回后**立即读值**——面板 detach 早于子帧落值。本地机器快 → 绿；CI 慢 → 读到空串。
- 修法：改 **web-first 等待**——`softHostValue(child, '.tel-input', '+86')`（自动重试）+ `expect.poll(() => countFieldEvents(child,'change'), { timeout: 5000 })`（轮询）。**未用固定 sleep**（验收面 §4.2 L2 禁止固定 sleep）。
- 本地复核：spec `18 passed` · 门 `209 PASS / 0 FAIL` · 全量 E2E `135 passed` · typecheck `exit 0`。

**(B) `tests/entry-access.spec.ts:42`（票 37 面板居中）—— 非本票引入。**
- 失败断言：`Math.abs(box.y + box.height/2 - vh.height/2) < 30` → `Received: 36.50001525878906`。
- **引入点定位**：`cch/47`、`cch/48` 的 E2E **均为 success**；**首个测试级红出现在 `cch/03-diagnostics-surface`（23229ed9, run 35089332673）**，其后 `cch/01`/`cch/05`/`cch/06` 逐支继承同一失败 ⇒ 该红由**栈内他票（票 03 诊断面）引入**，本票仅为继承者。
- 本地不复现（本地全量 E2E `135 passed`）⇒ 环境敏感（面板高度 / 视口度量在 CI runner 上的差异使居中偏移越过 30px 容差）。
- 处置：按启动器边界「**不得触碰其他票的工件**」**不修**；呈报大脑并**建议立修复票**（候选修法二选一：① 票 37 居中容差按面板高度自适应；② 面板 `max-height` 钳制后居中语义显式化）。归属印证 WORKFLOW §5「跨栈行为改动的组合从未被任何单票验证」教训。
- **未以静默重跑掩盖**（§8.1.5 禁令）。

**(C) 附记**：`cch/02` 的 E2E 红发生在 **Build userscript** 步（未到测试步），与本票无关，一并登记供大脑收口。

**本票 CI 状态小结**：`Verify Ticket 06 (form corpus)` **绿**（`35089360445` / `35089479043`）· `Typecheck` **绿** · `Engine Gates` **绿** · `Lockfile Regen` **绿** · `E2E` **红**（一处本票已修、一处他票引入已呈报）。

### R1-11 提交完整性事故（本票自身缺陷，自曝并修复）

**事故**：R1 首次提交（`6d0462ae`）我按 **hunk ID** 提交（`sm:8 rn:a yw:ae km:e oq:d vv:8`），而 `06-probe-mirrors.mjs` / `06-probe-real.mjs` / `verify-ticket-06.mjs` 各含**多个 hunk**——结果每个文件只入了被点名的那个 hunk：**探测主体改动（UA/settle/scanWrappers 消费）与门 S9 均未入库**，分支实际状态与提交信息不符（**P-7 类失真：提交信息断言与实物不一致**）。该次推送后 CI 跑的仍是**未修完**的状态。

**发现方式**：`git show --stat 6d0462ae` 显示 `06-probe-mirrors.mjs +3` / `verify-ticket-06.mjs +4`（与「主体改动 + S9 共 20+ 行」不符）→ 与 `but diff` 残留 hunk 交叉核对后定位。

**修复**：以**文件 ID**（`sm yw km oq uk vv`）重新提交 → `vrl`（tip `e5a0a542`）；核验 `but status` 无未提交改动、tip 内 S9 与探测主体改动齐备、门 **209 PASS / 0 FAIL**。

**教训（建议写回 WORKFLOW §5）**：**多 hunk 文件一律用文件 ID 提交**；或在提交后立即以 `git show --stat <sha>` 核对「提交信息声明的文件与规模 ↔ 实际入库」。`but commit` 成功返回**不等于**全部改动入库。

### R1-12 二次推送与 CI 终态（tip `e5a0a542`）

| 门 | run | 结果 |
|---|---|---|
| Verify Ticket 06 (form corpus) | **35090400764** | **success** |
| Typecheck | 35090400773 | success |
| Engine Gates | 35090400767 | success |
| Lockfile Regen | 35090400742 | success |
| E2E | 35090400731 | **failure · 1 failed / 134 passed** |

**E2E 失败清单（逐条归因）**：

- ✘ `tests/entry-access.spec.ts:42`（票 37 面板居中）—— **非本票**；引入点为 `cch/03-diagnostics-surface`（run `35089332673`，47/48 均绿），见 R1-10 (B)。按启动器边界**不修**，呈报大脑并建议立修复票。
- ✅ `tests/corpus-forms.spec.ts:145`（本票跨帧 L3）—— **已由本次修复在 CI 上转绿**（同一 run 内该用例通过；`134 passed` 含本票 18 例）。

**本票 CI 结论**：本票全部工件在 CI 上绿（verify-06 · typecheck · engine-gates · lockfile · 本票 18 例 E2E）；**唯一红为他票引入并已归因呈报**。

### R1-13 终态 CI 证据（tip `f2304687`）与 bookkeeping 终止声明

| 门 | run | 结果 |
|---|---|---|
| Verify Ticket 06 (form corpus) | **35090650159** | **success** |
| Typecheck | 35090650206 | success |
| Engine Gates | 35090650139 | success |
| Lockfile Regen | 35090650151 | success |
| E2E | 35090650166 | **failure · 1 failed / 134 passed**（唯一红 = `entry-access.spec.ts:42` 票 37，非本票） |

与 `e5a0a542`（R1-12）**逐门一致** ⇒ 纯文档提交不改变任何门的行为。

**bookkeeping 终止声明**：`f2304687` 之上的后续纯文档提交（含本节载体提交）**不再逐轮回填其自身 run ID**——否则形成「为记录 run 而提交、提交又产生 run」的无限回归。约定：**行为面 CI 证据以 R1-12（`e5a0a542`）与 R1-13（`f2304687`）为准**；纯文档提交以 `git show --stat` 的入库清单自证（R1-11 教训）。

### R1-14 本轮收尾（R1 终态）

- **主 Agent 缺陷处置**：三项检查**全部属实** → ① 口径对齐（唯一模块 `06-probe-common.mjs` + 两份探测改为消费）② 受控重跑一致性 **8/8**（未调参）③ 门 **S9** 防回归锁（22 断言，187→209）④ 两处次要补正（DOM 15、issue 前缀）。
- **本票自身缺陷（自曝并修复）**：跨帧异步竞态（CI 红 → 改 web-first 等待）· 提交完整性事故（hunk-ID 部分提交 → 以文件 ID 补齐）。
- **非本票红**：`tests/entry-access.spec.ts:42` 归因 `cch/03-diagnostics-surface`（run `35089332673`；`cch/47`/`cch/48` 均绿），按边界不修，**呈报大脑并建议立修复票**。
- **CI 终态**：本票全部工件绿（verify-06 · typecheck · engine-gates · lockfile · 本票 18 例 E2E）。
- **报告约束遵守**：本轮全部新增均为**追加**——原 §0–§7 与 §3.1 原文**一字未改**（`grep -c "^## 返工轮次 R1$"` = 1；原 headline 行仍在原位）。
- **遗留待裁定**：R1-D1（远端 6 支祖先分支收敛）· R1-D5（他票引入的 E2E 红 → 修复票）。
