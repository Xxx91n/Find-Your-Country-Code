# 窗口报告 29 — 扫描候选集扩展（A-003）

> Cycle-4 | 票: `issues/29-scan-candidates-expansion.md` | 覆盖 A-003
> 分支: `cch/29-scan-candidates-expansion`（按 WORKFLOW §4.2 堆叠于 `cch/28-iso2-dial-evidence`）
> 阻塞关系: Blocked by 32（真实站点语料）— **票 32 已 `done`，阻塞解除后开工**
> 完成时间: 2026-09-12

---

## 1. 结论摘要

无 ARIA 手写自定义下拉（div 触发器 + `ul>li` 选项面板，无 `role=combobox`/`aria-controls`）此前在扫描阶段**完全不可见**。本票以「形态描述符」扩展候选集，使该形态**进入候选面 + 登记面可达**，同时**档位仍守 ADR-0005（登记 + 手动召唤，不自动注入）**。

语料实测：`rs-noaria-custom-dropdown` **14(none) → 34(none)**，候选集命中选择器由「零命中」变为 `div[tabindex="0"]`，`verdict: UNCOVERED → COVERED`。三重缺口（候选集 / kind 分发 / 登记线）全部闭合。

---

## 2. 复现基线（动手前先留证据）

票 32 落地的模式库已登记该形态的复现基线（`tests/corpus/manifest.json` 的 `realSiteForms`）：

| 项 | 基线（修复前） | 实测（修复后） |
|---|---|---|
| 命中选择器 | **零命中** | `div[tabindex="0"]` |
| `coveredByCandidateSet` | `false` | `true` |
| score / tier | 14 / none | **34 / none** |
| verdict | `UNCOVERED` | `COVERED` |
| 登记面（≥ `ITI_LOW_REGISTER_SCORE` 25） | 不可达 | **可达** |

三重缺口原文（票 32 登记）：
1. `candidate-set`：SCAN_SELECTORS 五组零命中，扫描阶段不可见；
2. `kind-dispatch`：`_process` 的 kind 分发无 div/自定义触发器分支 → `kind=null` 直接 return，`rememberLow` 登记路径不可达；
3. `register-threshold`：即便进入评分，14 < 25，仍不进召唤面。

---

## 3. atomcode 深度调研（串行护栏，本会话 1 次）

**调研问题**：浏览器自动填充与密码管理器在识别无 ARIA 语义的手写自定义下拉时，如何在不产生误报爆炸与性能爆炸的前提下做候选元素发现与收敛？

**核心结论（15 条，多源交叉验证，含 Chromium/Firefox 源码直读）**：

1. **行业候选发现一律收敛在语义控件白名单**。Firefox 候选集就是一条 `querySelectorAll("input, select")`（commit c99e343）；Chromium 只对 `input/select/textarea` 做字段类型预测（`form_structure.cc`）；Dashlane「searching for form tags and their associated input fields」；Bitwarden 走 id→name→label→aria-label→placeholder 属性降级链。**无 ARIA 的 div+ul 下拉在四家实现里一律「不发现」**（vuetify#5936、Bitwarden 社区 15926 双源实证）。
2. **本脚本是唯一要主动识别该形态的实现**，因此必须比浏览器多做一层**形态描述符匹配**，但严禁退化为全 DOM div 扫描。
3. **收敛靠选项文本内容验证**（对标 Chromium/Firefox 的 select 选项内容匹配），而非靠结构宽匹配。
4. **误报前车之鉴**：子串匹配必炸（Bitwarden `login` 案例 #20320）；负模式必须全属性生效（Chromium c990531）。
5. **档位设计对齐**：登记 + 手动召唤 == 密码管理器「识别失败 → 用户手动兜底」的行业姿态（hidde.blog / Dashlane / ADR-0005 三方一致）。
6. 官方出路是 `appearance: base-select`（Chrome 135，让 `<select>` 全可定制），长期会消解手写下拉，但不影响本票。

**采用**：① 形态描述符候选（可聚焦非表单容器）；② 内容证据作门槛；③ 档位 cap 在 none；④ 复用既有常量不开新权重。
**不采用**：① 服务端/ML 预测（无基础设施，且 CONTEXT.md 未采纳该心智）；② 全量 DOM 遍历；③ 宽 `ul li` 选择器。

---

## 4. 实现

### 4.1 候选集：形态描述符（`src/detect/index.ts`）

```ts
'div[tabindex="0"],span[tabindex="0"]',
```

两条硬约束：
- **不做全 DOM div 扫描**、**不放裸 `ul li`**（候选爆炸 + 误报）——只收「可聚焦（`tabindex="0"`）的非表单容器」；
- 结构/选项内容证据**全部在 `scoreElement` 内裁决**，不在此处放宽。

### 4.2 结构探测 `customDropdownStats`（新增）

- 与票 18 的 ARIA combobox 层**互斥**：有 ARIA 语义走 `comboboxEvidence`，完全无语义才走本分支；
- 触发器闸门：仅 `DIV`/`SPAN` 且 `tabindex` 存在（不可聚焦的静态容器不是交互控件）；
- 选项来源：`[role=option]` 优先，缺失回退 `li`；
- 内容验证**复用 L3 口径 `pseudoOptionStats`**，不自造判据、不开新误报后门（票 18 检查点二纪律）。

### 4.3 内容证据「只作门槛、不作加分」（关键设计）

结构分**复用票 18 的 `ARIA_COMBO_STRUCT_SCORE`(20)**，不新造权重：
- 单独 20 < 登记线 25（无国家语义上下文不进召唤面）；+ L1 `kw:country`(14) = **34**，稳过登记线且 **< `SCORE_LOWKEY`(35)**，与语料期望 `tier=none` 自洽；
- **为何不并入 L3 加分**：自定义下拉无 ARIA 语义背书，若把 `parenDial`/`isoName` 计入（`L3_ISO_BONUS=30`）会直接击穿低调注入线，把 ADR-0005 的「登记不注入」档位上限架空。故内容证据只用于**否决**（无任何区号/国家证据的列表 = 导航菜单/普通列表，留痕 `custom:gate:no-dial-evidence` 并不登记）。

### 4.4 指纹面 = 观测面（票 04 契约）

`OBSERVED_ATTRS` 与 `_fingerprint` **同步新增 `tabindex`**（可聚焦态翻转触发重评）。

### 4.5 fill 侧 li 回退（`src/fill/index.ts`）

`_pseudoFillByListbox` 在 `_listboxOf` 无 id 可解（无 `aria-controls`）且无 `role=option` 时，回退按触发器后代 `li` 定位选项——**与检测侧 `customDropdownStats` 同源口径**；既有 `role=option` 路径零改动（仅在其为空时回退）。这使「登记 → 召唤 → 填充」闭环成立，而非登记后填不了的空头承诺。

### 4.6 语料与验收工具

- `tests/corpus/manifest.json`：`no-aria-custom-dropdown` 形态基线翻转（`coveredByCandidateSetBaseline: false→true`、`matchedSelectors`、`observed`、`verdict: UNCOVERED→COVERED`、gaps 改为 closed/residual）；
- `tests/scripts/14-lib-engine.mjs`：harness 镜像 `ul>li` 子树（非原生 select 的 options 构造为后代 li，值走 `data-value`），使结构探测在语料上跑**真实路径**（引擎无 mock 专用分支）；`bundleEngine` 增加可选 UI 注入以断言 `attach/rememberLow`；
- `tests/scripts/32-real-site-corpus.mjs`：补形态描述符自证 5 条（含 `tabindex="-1"` 不匹配的反向断言）+ **登记面可达硬断言**（登记线从 `config.ts` 真源提取，不硬编码）。

---

## 5. 验收证据

### 5.1 票级门（`tests/scripts/verify-ticket-29.mjs`，27 断言）

| 组 | 内容 | 结果 |
|---|---|---|
| 1 | 候选集形态描述符（含 `div`/`span`、`tabindex=0`；无裸 `ul li`；无全 div；`[role=combobox]` 未被移除；contenteditable 未进候选集） | PASS |
| 2 | 正例：结构命中 `custom:dropdown`、score≥25、tier=none、<35 | PASS |
| 3–6 | 负例：导航菜单/单选项/不可聚焦/无列表/INPUT 不落本分支 | PASS |
| 7 | 指纹面 = 观测面（`tabindex` 同步） | PASS |
| 8 | `_process`：不自动注入 + `rememberLow` 登记 `kind=pseudo` | PASS |
| 9 | fill 侧 li 回退且不破坏既有路径 | PASS |

**CI**：`Verify Ticket 29` run **34693186397**（sha 9d621c3）绿；run **34693447618**（sha 213355e）绿。

### 5.2 E2E（`tests/custom-dropdown.spec.ts`，4 条）

1. ADR-0005 档位：不自动注入图标，原生 anchor select 正样本不回归；
2. 登记 → 召唤 → 面板选 Canada → **承值 `CA`**（无 `aria-controls` 下 li 回退生效）；
3. 负例：导航菜单（无区号证据）与不可聚焦容器均不登记，且正例仍在（排除「整体没登记」的假阴性）；
4. 性能：1000 节点（含 50 个可聚焦 div 容器）单次 scan < 350ms。

**本地全量**：`npx playwright test` **80 passed**（含票 27 新增 weak-signal 等，零失败）。

### 5.3 性能（Delta 要求：附 `__cchPerfHook` 实测）

```
[cch-29 perf] 1000 节点（含 50 个可聚焦 div 容器）scan 实测:
scans=1 maxMs=73 avgMs=73.00 samples=[73]
```

**73ms < 350ms 红线**（`RESCAN_DEBOUNCE_MS`），候选集扩大后无性能回退。

### 5.4 类型门禁

本地 `npx tsc --noEmit` 通过；CI `Typecheck` run **34693447628** 绿（在本票 lockfile 修复之后）。

---

## 6. 偏离点（呈报用户）

| # | 偏离 | 说明与建议 |
|---|---|---|
| **D-29a** | 本票对 `src/detect/index.ts` 的核心改动被**票 28 的提交 `761ac3b` 一并带走** | 共享 GitButler 工作区下，票 28 窗口提交时整文件进入其分支。本票分支已按 §4.2 **堆叠于 `cch/28`** 消解依赖（远端实测含改动）。**教训**：多窗口改同一文件时，应先确认归属再动手，或约定「核心引擎文件串行」。 |
| **D-29b** | `package-lock.json` 与 `package.json` 失同步（仓库级债务） | HEAD lockfile 解析成 `typescript@7.0.2`/`vite@8.2.2`，不满足钉死范围 `^5.7`/`^6.0`，`npm ci` 必 EUSAGE 失败 → main 与各分支 Typecheck/Calibration/verify-* 长期红（票 32 已登记为 ADR-0006 后果 3）。本票以 `npm install --package-lock-only` 重生成（typescript 5.9.3 / vite 6.4.3 / playwright 1.62.1），**Typecheck 由红转绿实证有效**（run 34693447628）。与票 34 R1 的 `lockfile-regen.yml` 同源，归属建议归票 34/33，或由维护者 `but discard` 后改走 artifact 入库。 |
| **D-29c** | 本票 **E2E 未能在 CI 取证** | E2E 失败于 `npm install` 安装阶段（13s 即红，非测试失败）：`.npmrc`（票 31 D-31a 产物）与票 34 R1 的内联 `--legacy-peer-deps` 均在**独立分支**、未进入本票基线。票 28 记录同一现象：「E2E 在 27/28/29 三条 W2 分支同因失败于 npm install 安装阶段」。**属跨分支共因，非本票回归**。证据替代：本地全量 80 passed + verify-29 CI 两度绿 + Typecheck CI 绿。任一安装面修复合入 main 后重跑即可取证。 |
| **D-29d** | `contenteditable` 未进候选集 | issue 提及该形态，但**票 32 未提供对应语料**（`realSiteForms` 只有 3 形态），无测量地基。且 `[contenteditable]` 会捞到所有富文本编辑器（候选爆炸），行业无先例。按数据驱动校准原则（CONTEXT.md）**不盲扩**；建议由票 32 补语料后另立票。 |
| **D-29e** | 懒渲染面板的登记时点 | 选项面板未渲染时无 `li` 可探测，依赖 `childList` observer 重扫后登记（面板常驻形态不受影响）。已写入 manifest `gaps` 的 residual 项。 |
| **D-29f** | 填充可达性的站点侧局限 | fill 侧已补 li 回退，但手写下拉的选值交互由站点脚本决定；行业实证（Bitwarden 15926）存在「打不开/选不中」形态。失败信号由票 31 的填充反馈闭环承接，不静默。 |
| **D-29g** | 本票 docs 推送**连带改写了他票分支的远端基址**（已修复） | 第二次 `but push cch/29`（docs 收口）输出显示 `cch/28` 同步 `6bb7e58 → 656ab97`：GitButler 重算基址，把 `cch/28` 从「票 27 栈」rebase 到「票 32 栈」，**票 27 的 410 行内容整体丢失**（`verify-27.yml`、`src/config.ts` 的 `L1_ATTR_PHRASE_SCORE`、`27-weak-signal-calibration.mjs`、`verify-ticket-27.mjs`、`weak-signal.html/spec.ts`、`manifest`），导致 `cch/28` 与 `cch/29` 的 `detect/index.ts` 引用未定义常量 → Typecheck 同步转红（28 run 34694069205 / 29 同批）。**修复**：按依赖真序 `main → 32 → 27 → 28 → 29` 执行 `but move cch/28 --above cch/27` 与 `but move cch/29 --above cch/28` 后重推，票 27 内容已回到两条分支（远端 `config.ts` 常量复现、`weak-signal.html`/`verify-ticket-27.mjs` 在树）；本地 `tsc --noEmit` exit 0，CI Typecheck（29 run 34694371157）与 Verify Ticket 29（34694371007）转绿。**副作用**：同批连带推送了 `cch/27` 的 3 个待推提交（票 27 窗口产物，`b4cc43b → e65c2c3`）；该分支三门红灯为**预存**（`b98a1b7` 时代 Calibration/E2E/Typecheck/Verify-27 已全红，同 lockfile EUSAGE 口径），非本次引入。**教训**：堆叠分支的 `but push` 会重写祖先分支远端头，推送后必须 `git merge-base --is-ancestor` + 远端 grep 复验依赖完整性（D-28b 的二次实证）。 |

---

## 7. 给 WORKFLOW §5 的教训候选

1. **共享工作区下的文件归属**：多窗口并行改同一源文件时，晚提交者会连带带走他人在工作区的未提交改动（本票 detect 改动被票 28 带走）。建议§4.2 增补：「核心引擎文件（如 `src/detect/index.ts`）在波次内串行，或先提交再动手」。
2. **分支快照依赖**：未堆叠分支的远端快照 = common base + 本票提交，缺栈上依赖（票 10 教训复现）。本票以 `but branch new --above` + `but push` 连带推栈消解。
3. **验收工具先自证**：本票 verify 脚本首轮 4 项失败全为 mock 缺陷（引擎读 `el.className` 而非 `getAttribute('class')`）而非产物缺陷——与既有 §5 教训同源，已通过修正 mock 而非改引擎解决。

---

## 8. 证据锚（commit sha + CI run ID）

| 内容 | commit sha | CI run ID | 结果 |
|---|---|---|---|
| 本票实现（候选集 + 结构探测 + 指纹 + fill 回退 + 门 + fixture/spec/workflow） | `3e204ca`（本地 `yuv`） | Verify Ticket 29 **34693186397** | 绿（27/27） |
| lockfile 同步（仓库级债务） | `23a9173`（本地 `nnr`） | Verify Ticket 29 **34693447618** / Typecheck **34693447628** | 绿 / 绿 |
| 首轮红灯（基线缺 detect 改动，堆叠前） | `dc7898f` | Verify Ticket 29 34693000589 | 红 → 已由堆叠消解 |
| E2E（跨分支安装面共因） | 同上 | E2E **34693447646** | 红（安装阶段，见 D-29c） |
| docs 收口（窗口报告 + atomcode 调研纪要 + issue 勾销） | `27bddd3`（本地 `tkq`） | Verify Ticket 29 **34693990564** / Typecheck **34693990552** / E2E **34693990551** | 绿 / 绿 / 红（`react-dom@19.2.8` vs `react@18.3.1` ERESOLVE，安装阶段，见 D-29c） |
| 重堆叠修复（D-29g：28/29 挂回票 27，恢复 `L1_ATTR_PHRASE_SCORE` 依赖） | `6621336`（本地栈顶，29）；连带 `cch/28` → `6a7a03f`、`cch/27` → `e65c2c3` | Verify Ticket 29 **34694371007** / Typecheck **34694371157** / E2E **34694371081** | 绿 / 绿 / 红（安装阶段，见 D-29c）；`cch/28` Typecheck 红为旧 lockfile EUSAGE（票 28 D-28a 预存，非本次引入） |
