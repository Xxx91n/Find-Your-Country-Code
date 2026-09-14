# 窗口报告 44 — 检测语义裁决与语料先行（A-022 + A-023）

> Cycle-5 | 票: `issues/44-detection-semantics-adjudication.md` | 覆盖 A-022, A-023
> 分支: `cch/44-detection-semantics-adjudication`（WORKFLOW §4.2；波次内互不堆叠）
> Blocked by: None（W1 可并行）
> 完成时间: 2026-09-14 | 状态: **A-022 + A-023 均已闭环**（A-022 用户裁决 = 方案 C，已留档 ADR-0009 + CI 锁定）

---

## 1. 结论摘要

- **A-022（同证据不同档位）**：复现坐实 P1/P8 的档位差**仅由 L3 区号选项个数驱动**（6→24 分 = 72/auto；5→20 分 = 68/lowkey，SCORE_AUTO=70 恰落在两者之间）。**用户裁决 2026-09-14 = 方案 C「显式建模差异」**（不统一）：承认 L3 按证据量单调计分为有意设计。已实施留档（ADR-0009 + CONTEXT.md 分级行动词条 + decision-ledger A-022=done）与 CI 锁定（verify-ticket-02 G10 组，负控实测 exit 1）。**零引擎改动、零档位变更。**
- **A-023（contenteditable 语料先行）**：语料 append 3 例（1 正 + 2 负），precision/recall 基线**不回退**（1.0000 → 1.0000），回归门禁 PASS；**不改任何检测/扫描代码**（无地基不立检测改动）。

---

## 2. 复现基线（动手前先留证据）

### 2.1 全语料基线（票 14 harness，动手前）

| 指标 | 值 |
|---|---|
| 语料 | 48 例（TP=26, FP=0, FN=0） |
| precision / recall / f1 | 1.0000 / 1.0000 / 1.0000 |
| 回归门禁 | PASS |

### 2.2 P1/P8 档位边界（`verify-ticket-02.mjs -v`，逐信号）

| 用例 | 形态 | 信号（逐层） | 合计 | 档位 |
|---|---|---|---|---|
| **P1** | `select name=countrycode` + **6** 个 +NN + tel 锚 | L1 kw:strong 30 + L3 opts:plus-dial **24** + L1 attr:phrase:country code:dedup 0 + L2 anchor:tel 18 | **72** | **auto** |
| **P8** | `select aria-label="Select country calling code"` + **5** 个 +NN + tel 锚 | L1 kw:strong 30 + L3 opts:plus-dial **20** + L1 attr:phrase:calling code:dedup 0 + L2 anchor:tel 18 | **68** | **lowkey** |

**证据结构逐项相同**（kw:strong 30 同、anchor 18 同；attr phrase 同走 R1 去重留痕 0 分），**唯一差异 = L3 区号选项个数**（6×4=24 vs 5×4=20）。SCORE_AUTO=70 恰落在 68 与 72 之间 → 6 选项 auto / 5 选项 lowkey。旁证：P7（5 选项、label 短语 26）= 64/lowkey；P10（5 选项、kw:strong 30）= 68/lowkey。

---

## 3. atomcode 深度调研（串行护栏，本会话 1 次）

**调研问题**：浏览器自动填充与密码管理器识别电话国家区号字段时，如何把识别置信度映射为分级行动？当两字段证据类型相同、仅证据数量（下拉选项个数）不同而恰好落在阈值两侧导致分档不同时，业界是统一档位还是显式建模证据量差异？contenteditable/富文本字段如何在不候选爆炸前提下发现并分级？

**核心结论（16 搜索 / 7 全文核读 / 三引擎交叉）**：

1. 业界**不把证据数量建模为分档依据**；数量只作**二值门**：Chromium `kMaxListSize`（>512 选项）整组丢弃 → 字段降为「无证据」，不是「更高档」。
2. Chromium 的**打分式**回溯解析器（`address_field_parser_ng`，权重 Match("ZIP_CODE",1.0)）**上线数日即 revert**（+9/−1439）——同证据类型内分数化分档被工程否定。
3. Firefox 国家 select 识别是**匹配**（option value+text + ALTERNATIVE_COUNTRY_NAMES），**候选数量不影响档位**。
4. 分级行动按**数据敏感度 + 交互要求**切分（1Password：凭据永不无交互注入），字段级置信度只决定「是否进候选」。
5. **contenteditable：Chromium/Firefox/Bitwarden/1Password 一致不扫描**（管线只认 input/textarea/select）；「仅登记」档是业界共识。防候选爆炸 = 显式 opt-in 注解（`data-1p-ignore` / `data-form-type` / `data-bwautofill`）+ focus 触发，**不扩启发式扫描面**。

**对本票的含义**：

- **A-022**：业界「同证据应同档、数量只作二值门」的倾向，与本引擎的**连续评分 → 分级行动**（ADR-0001）是**有意的架构分叉**——本引擎的 L3 本就是**量化**证据面。故差异必须**显式建模并留档**，不能留作偶然；「统一」向 auto 会抬 ceiling、向 lowkey 会降既有 auto，均被封死（见 §4.2）。
- **A-023**：业界一致不扫描 contenteditable，佐证本票「先立语料地基、不仓促扩扫描」的姿态；负例须覆盖「富文本编辑器候选爆炸」这一 D-29d 原始风险。

---

## 4. A-022 裁决（提案，待用户确认）

### 4.1 问题陈述

P1 与 P8 的证据**结构**相同（强区号关键词 + tel 主号锚 + 全 +NN 选项值域 + 属性短语同源去重），仅**区号选项个数**不同（6 vs 5），却因 SCORE_AUTO=70 恰好落在 68/72 之间而分档 auto/lowkey。票 27 R1 §6 建议独立裁决。

### 4.2 候选与约束分析

| 方案 | 做法 | 结果 | 约束判定 |
|---|---|---|---|
| A-统一→auto | 抬 P8（5 选项）到 ≥70（如 L3_PLUS_DIAL_SCORE 4→5） | P8 lowkey→auto | **违反 delta「禁借补分越线 / floor 不抬 ceiling」** + ADR-0008「既有档位逐例不变」；且波及 P7/P9/P10 |
| B-统一→lowkey | 压 P1（6 选项）到 <70（如 L3_DIAL_CAP→21） | P1 auto→lowkey | 降既有 auto 档 = **冻结档位违规 + 覆盖率回退** |
| **C-显式建模差异（推荐）** | 承认 L3 **按证据量单调计分**（线性 4/选项，cap 45）为**有意设计**；把边界（强 kw + 锚 + ≥6 区号选项 ⇒ auto；5 ⇒ lowkey）写成显式、受 CI 锁定的规则并留档 | 档位零变化 | **满足全部 delta**：不抬 ceiling、基线不回退、有语料标定依据 |

### 4.3 推荐裁决

**显式建模差异（方案 C）**。理由：(1) 两条「统一」路径分别被 floor≠ceiling 与冻结档位封死（§4.2）；(2) 本引擎架构前提（ADR-0001 连续评分 → 分级行动）本就以**证据强度**驱动分档，L3 量化计分是**有意**而非偶然；(3) 业界「数量只作二值门」的对标结论构成**有意的偏离**，须显式记录（而非默认偶然），恰是 spec US27「intentional rather than accidental」的要求。

### 4.4 实施（已落地）

1. **留档**：新增 `docs/adr/0009-evidence-quantity-tier-boundary.md`（决策 + 两条被否决路线 + 与业界对标的有意偏离 + 后果）；`CONTEXT.md` 分级行动词条补注证据量语义与边界；`decision-ledger.md` A-022 → `done`（附裁决摘要）。
2. **锁定**：`tests/scripts/verify-ticket-02.mjs` 增补 **G10 组 5 条断言**（P1=72/auto、P8=68/lowkey、`68 < SCORE_AUTO ≤ 72`、`L3_PLUS_DIAL_SCORE=4`、`SCORE_LOWKEY < 68`），常量经 `src/config.ts` 解析而非硬编码。已由 `engine-gates.yml` 承载（`pull_request` + `push(main, cch/**)`），**无需新增 workflow**。
   - **负控实测**：把 `L3_PLUS_DIAL_SCORE` 改为 5（模拟「统一→auto」）→ 用例门 34/36、G10 2/5、`exit 1`（CI 变红）；还原后 36/36 + 5/5、`exit 0`。`src/config.ts` 已逐字节还原（`git diff` 零改动）。
3. **不改引擎**：零行为变更、零档位变更、precision/recall 不变（实测 51 例 1.0000/1.0000）。

> **用户裁决（2026-09-14）：采纳方案 C「显式建模差异」。** 留档与锁定已按 §4.4 实施完毕。

---

## 5. A-023 实现（语料先行）

`tests/corpus/manifest.json` append 3 例（append-only；不改任何 src/ 检测代码）：

| id | 极性 | expect | 形态 | 引擎实测 | knownResidual |
|---|---|---|---|---|---|
| `ce-dial-positive` | positive | inject | `div[contenteditable][role=textbox][aria-label="Country code"]` + tel 锚 | 56 / lowkey | true（残留=扫描层，非评分层） |
| `ce-neg-richtext` | negative | none | `div[contenteditable][aria-label="Message"]` | 0 / none | false |
| `ce-neg-country` | negative | none | `div[contenteditable][aria-label="Country of residence"]` | 14 / none | false |

- **正例**：评分层（harness 评测面 `scoreElement`）已满足 expect（kw:strong 30 + attr:phrase 8 + anchor 18 = 56/lowkey）——属性证据面与原生控件同口径。**残留不在评分层而在候选集/扫描层**：`SCAN_SELECTORS` 未含 contenteditable（D-29d），端到端注入待扫描扩展票；本票只立地基。
- **负例 2 例**：`ce-neg-richtext` 锁「contenteditable 结构本身不构成区号证据」（D-29d 候选爆炸风险）；`ce-neg-country` 锁「国家选择≠区号选择」的语义分层在 contenteditable 形态下不变。
- `_meta.caseFields.family` 增补新族值 `ce`（contenteditable，Cycle-5 票 44）。

---

## 6. 验收证据

| 门 | 命令 | 结果 |
|---|---|---|
| 全语料基线 | `node tests/scripts/14-calibration-harness.mjs` | 语料 51 例；precision=1.0000 (TP=27,FP=0) / recall=1.0000 (FN=0) / f1=1.0000；**回归门禁 PASS** |
| 引擎门 | `node tests/scripts/verify-ticket-02.mjs` | 用例门 36/36 pass + **G10 边界锁 5/5 pass**（A-022） |
| 票 27 门 | `node tests/scripts/verify-ticket-27.mjs` | 90 passed / 0 failed |
| 票 28 门 | `node tests/scripts/verify-ticket-28.mjs` | 19 PASS / 0 FAIL |
| 真实站点语料 | `node tests/scripts/32-real-site-corpus.mjs` | 契约+覆盖+复现基线硬门禁 **PASS**；前后对照 precision/recall Δ=0 |
| 阈值标定 | `node tests/scripts/14-threshold-calibration.mjs` | exit 0（只建议不写回） |

**precision/recall 基线不回退**：48 例 1.0000/1.0000 → 51 例 1.0000/1.0000。新增 3 例对分母无负面影响（正例 TP+1、两负例 TN+2）。

---

## 7. 偏离点（呈报用户）

| # | 偏离 | 说明与建议 |
|---|---|---|
| ~~**D-44a**~~ | ~~A-022 裁决未实施（仅提案）~~ → **已解除** | 用户 2026-09-14 裁决方案 C；留档与锁定已落地（见 §4.4）。 |
| **D-44b** | contenteditable 正例标记 `knownResidual: true` | 残留语义在**扫描层**（非评分层，评分层已满足 expect）。取保守口径：不计入门禁、计入 precision/recall，登记待扫描扩展票翻转。若用户认为应 `false`（gate 强锁评分行为），可一行翻转。 |
| **D-44c** | 新增 `family` 值 `ce` | `family` 仅文档字段（无脚本消费）；新增族值已在 `_meta.caseFields.family` 登记。 |
| **D-44d** | `verify-ticket-13/18` 的语料规模断言（`cases === 41`）为陈旧值 | 该二门属 A-014 已登记「裸 new Function 崩」的四门（verify-09/13/15/18），修复票 36 将「语料规模断言改动态读取」；本票新增语料**不新引入红**（二门当前即崩）。 |
| **D-44e** | CI 证据待推送后取 run ID | 按 WORKFLOW §4.2 与全局纪律，未推送（push 需用户授权）；本报告证据为本地确定性复现（脚本可重复、纯确定性）。 |
| **D-44f** | 分支按 §4.2 堆叠在 `cch/cycle5-ticketing` 之上 | 留档载体（`decision-ledger.md`）与锁定载体（`verify-ticket-02.mjs`）均由 Cycle-5 立票提交 `894e6efb` 引入、不在 `cch/44` 的原始基线上；`but commit` 明确拒绝并给出堆叠提示。按 §4.2「确有依赖按 `but move <branch> --above <dependency>` 堆叠」执行——依赖真实存在（票 44 的票面文件与公共引擎门同在 ticketing 分支），非波次内无故堆叠。 |
| **D-44g** | 环境级阻塞：`but status`/`but diff` 报 `os error 1`，根因是仓库根 0 字节文件 `nul` | Windows 保留设备名导致 GitButler 工作树读取器 stat 失败（**非本票产物**；由并行窗口 `>nul` 重定向产生）。已把该文件移出仓库（可恢复）解除阻断，并实测 `.gitignore` 收 `nul` 可作持久缓解；教训已写回 WORKFLOW §5（2026-09-14 行）。 |

---

## 8. 给 WORKFLOW §5 的教训候选

1. **「同证据不同档位」的根因是阈值与证据量的耦合**：连续评分模型里，任何「按量计分」的证据面都会在某两个相邻样本间跨过固定阈值，产生看似「同证据不同档」的现象。裁决时应先做**约束分析**（能否统一），再决定「统一」还是「显式建模」；本票两条统一路径被 floor≠ceiling 与冻结档位同时封死，只剩显式建模。
2. **「CLI 全坏」先怀疑工作树内容，不是 CLI 本身**：`but status`/`but diff` 一律 `os error 1` 而 `but --version`/`but branch list`/`--help` 全正常——这个「部分坏」指纹说明命令解析层健康、只有工作树读取路径失败。Windows 宿主上保留设备名文件（`nul`/`CON`/`PRN`/`AUX`）是最高优先级嫌疑，且共享工作区下它会同时阻断所有窗口。已写回 WORKFLOW §5。

---

## 9. 证据锚

| 内容 | 锚 |
|---|---|
| 本票变更 | `tests/corpus/manifest.json`（+3 例，48→51）+ `docs/adr/0009-*.md`（新）+ `CONTEXT.md` + `decision-ledger.md`（A-022/A-023→done）+ `tests/scripts/verify-ticket-02.mjs`（G10 组）+ `WORKFLOW.md` §5 + `issues/44-*.md`（勾销）+ 本报告 |
| A-022 CI 锁 | `node tests/scripts/verify-ticket-02.mjs` → 用例门 36/36 + G10 5/5；负控（`L3_PLUS_DIAL_SCORE` 4→5）→ `exit 1` |
| P1/P8 复现 | `node tests/scripts/verify-ticket-02.mjs -v`（P1=72/auto，P8=68/lowkey） |
| 基线不回退 | `node tests/scripts/14-calibration-harness.mjs`（51 例，1.0000/1.0000，gate PASS） |
| atomcode 调研 | 本会话串行 1 次（16 搜索 / 7 全文核读；Chromium / Firefox / 1Password / Bitwarden / Dashlane 多源交叉） |
| 分支 | `cch/44-detection-semantics-adjudication`，按 §4.2 堆叠于 `cch/cycle5-ticketing` 之上（见 D-44f） |
| CI | 待推送后取 run ID（CI-only 证据铁律；未推送）→ 见 §10 补录 |

---

## CI 证据补录（首脑授权 push 后，2026-09-14）

**推送远端头**：`a8ee1a83c51842d7c7c670f6db458a8c4f2f8ed2`（分支 `cch/44-detection-semantics-adjudication`，实现提交 `894e6efb`）

**说明**：本票**无专属 verify 工作流**（`verify-ticket-44.mjs` 不存在），故仅共享工作流运行。以下为全部 run 的终态结果（均为 `push` 事件，headSha 一致）。

| Run ID | Workflow | Conclusion | headSha | Event |
|---|---|---|---|---|
| 34845611095 | Lockfile Regen | success | `a8ee1a83` | push |
| 34845611809 | Engine Gates | success | `a8ee1a83` | push |
| 34845608176 | Typecheck | success | `a8ee1a83` | push |
| 34845607981 | E2E | success | `a8ee1a83` | push |

**E2E 与兄弟票 37 的对照**：票 37 的 E2E 曾在 `tests/pseudo-select.spec.ts:34` 因面板拦截指针事件而失败；本票 E2E 该用例 **`✓ 43 tests/pseudo-select.spec.ts:34:3`（758ms）通过**，全量 **80 passed (28.1s)**，无 failure/flaky。故 37 的失败**未在本票复现**。

**裁决**：4/4 共享工作流全绿（E2E 80/80 含 pseudo-select:34），CI 证据缺口已闭合，本票无回归。
