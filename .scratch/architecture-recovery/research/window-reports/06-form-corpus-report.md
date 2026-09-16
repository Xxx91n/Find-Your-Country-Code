# 窗口报告 06 — 形态语料三层架构

> Cycle-6 | 票：`issues/06-form-corpus.md` | 覆盖 A-xxx：**A-030**
> 分支：`cch/06-form-corpus`（按 WORKFLOW §4.2）| 提交：`a4b9150e`（32 文件 / +4144）
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
