# Cycle-6 W3 返工轮次 R1 复核 + 跨票污染系统发现（首脑，2026-09-16）

> 复核人：大脑 Agent | 方法：**不信自述，逐条回仓库实物验证 + CI 实物查询**（gh run view / git show 分支内容 / 本地重跑门与 spec）
> 范围：① 复核票 06 的 R1 返修；② 推送后全分支 CI 终态核查（新发现）

## 一、R1 返修复核：**R-1 已修复，属实**

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| 新增唯一口径模块 `06-probe-common.mjs` | 实体 1,980B；`:10` `export const UA`、`:13-15` `NAV/IDLE_MS=8000/SETTLE_MS=1500`、`:21-24` `settle(page,url)`、`:28` `scanWrappers()` | ✅ 属实 |
| 两份探测**零就地字面量**（改只 import） | `06-probe-mirrors` 与 `06-probe-real` 各自：UA 字面量 **0** / `waitForTimeout` **0** / `waitUntil` **0** / 自行 `goto` **0** | ✅ 属实（结构性修复，非人工对参） |
| 门新增 S9，187 → **209**，零削弱 | 我实跑 `node tests/scripts/verify-ticket-06.mjs` → **209 PASS / 0 FAIL**（自计 PASS 行 = 209）；S9 存在 | ✅ 属实 |
| 受控重跑一致性仍 8/8（未为凑数调参） | 报告 R1-4 给出逐页表 + 新增精度声明（一致性层级 = wrappers+tier，不含 score） | ✅ 合理（新增精度声明是诚实加分项） |
| 报告**追加式**，原文一字未改 | `diff 78ff8938:report current` → **0 删除**，唯一变化 `158a159,356`（纯追加 198 行） | ✅ 属实 |
| spec 18 / 本地全量 E2E 135 / typecheck 0 | 我实跑 spec → **18 passed**；W3 首轮实跑全量 → **135 passed** | ✅ 属实 |
| 跨票边界 | R1 四个提交（`6d0462ae/e5a0a542/f2304687/1e661ed2`）文件列表均在票 06 自身工件内 | ✅ 属实 |
| 提交完整性事故自曝（R1-11） | 首轮 R1 按 hunk ID 致部分 hunk 未入库 → 已以**文件 ID** 补齐（`e5a0a542`）；当前树实测门 209 / 口径模块与探测均在 | ✅ **自曝属实且已修复** |
| CI 证据（`35089360445` / `35090400764` / `35090650159`） | gh 逐条查：**Verify Ticket 06 = success** ×3；`Typecheck 35090650206` = success | ✅ 属实 |

**R-1 判定：返修到位，无遗留。** 且 R1-10 的红归因方法（先排除基线/基础设施两类，再逐支定位引入点）**符合 WORKFLOW §8.1.3**，质量高。

## 二、❗新发现 R-2（源码层面）：**cch/02 分支在 CI 上构建失败**

### 实物证据

- CI run `35089321289`（cch/02 @ b95f672f）在 **Build userscript 步**失败（未到测试步）：
  `src/ui/index.ts (4:41): "DIAG_TRACE_PREF" is not exported by "src/config.ts"` → `✗ Build failed in 148ms`
- 逐分支矩阵（`config.ts` 导出数 / `ui/index.ts` 引用数）：
  - cch/01 = **1 / 3** ✓　cch/03 = **1 / 3** ✓　cch/05 = **1 / 3** ✓　cch/06 = **1 / 3** ✓
  - **cch/02 = 0 / 2 ✗**（导入但**从未导出**）
- 引入点：`git log -S DIAG_TRACE_PREF cch/02 -- src/config.ts` → **空**（从未添加）；而 `git log -S … -- src/ui/index.ts` → **`61f3ebe7`（fix(cch-02)）**
- `61f3ebe7` 的 diff 实测新增了**票 03 的 import 与注释块**（`+// 票 03 [A-028]：诊断面常量…`、`+import { DIAG_REASON, DIAG_POINT_PREFIX, DIAG_TRACE_PREF } from '../config'` 等 5 处），但**未同步添加** `config.ts` 的对应导出。

### 根因

**票 02 的提交 `61f3ebe7` 把票 03 的在途改动切走了一部分**（`src/ui/index.ts` 整体取自含票 03 的混合树，并额外扫入 `tests/entry-access.spec.ts` / `tests/iframe.e2e.spec.ts`），但**未带走 `src/config.ts` 的配套导出** → 分支自身不自洽 → 构建失败。

**这是 P-1 同类违规的第二次发生，但后果更重：第一次（票 03 改他票工件）是披露且实质必要；这一次直接把一个分支弄成不可构建。**

### ❗回溯修正 W1 对票 02 的结论（诚实自纠）

我在 W1 复核中判定票 02「8/8 声明属实，**无源码返工**」。该结论基于**多分支混合工作树（并集）**——并集里票 03 的 `config.ts` 导出存在，故构建通过。**逐分支看，cch/02 是不可构建的**。

→ **W1 对票 02 的结论作废**，改为：**存在源码层面问题，需返工**。
我在 W1 已披露「闸门/spec 跑在并集树上，非逐分支」这一局限，但**没有跟进做逐分支构建检查**——CI 把这一步暴露了。教训：**多分支工作区的验收必须包含逐分支构建**，不能只跑并集。

## 三、❗新发现 R-3：entry-access 垂直居中在 CI 上红（票 37 spec）

- 失败断言：`tests/entry-access.spec.ts:55` `Math.abs(box.y + box.height/2 - vh.height/2) < 30` → **Received 36.50001525878906**（水平同断言 :54 通过）。
- 本地不复现（我实跑 `tests/entry-access.spec.ts` → **7 passed**）⇒ **CI-only**，环境/度量敏感。
- 归因链（我独立复现）：cch/47 = **success** · cch/48 = **success** · cch/02 = failure（构建步，见 R-2）· **cch/03 = 首个测试级红** · cch/01 / cch/05 / cch/06 逐支继承。
- 机制推测（未证实）：票 03 给面板加了**诊断摘要条 + 独立诊断视图**，面板高度变化使垂直居中偏移越过 30px 容差；与票 37 R1 的「字体度量敏感几何」同类。
- 处置：票 06 窗口按边界**不修**并呈报（正确）；**建议立修复票**（修法二选一：容差按面板高度自适应 / 面板 `max-height` 钳制后居中语义显式化）。

## 四、过程违规（单独呈报，**不替你追认**）

| # | 违规 | 实物证据 | 待裁定 |
|----|------|---------|--------|
| **P-12（新，重）** | 票 02 提交 `61f3ebe7` **切走票 03 的部分在途改动**（`src/ui/index.ts` 整体 + 2 个他票 spec），且**未带走配套 `config.ts` 导出** → 分支不可构建 | `git show 61f3ebe7 -- src/ui/index.ts` 新增 5 处「票 03 [A-028]」行；`git log -S DIAG_TRACE_PREF cch/02 -- src/config.ts` = 空；CI 35089321289 构建失败 | 需返工（见 R-2） |
| **P-13（新）** | 推送/rebase 后分支内容与本地复核时的 sha 不一致（`cch/01` 本地 193018de → 推送 18fbf99b），致**本地复核与 CI 对象不同** | `git rev-parse` vs `ls-remote` 对比 | 需明确「复核对象 = 推送后的分支」 |
| **P-2** | 已部分缓解：远端现有 7 支 `cch/*`（含 01/02/03/05/06/47/48）；**cch/04 仍未推送** | `git ls-remote --heads origin 'refs/heads/cch/*'` | cch/04 是否补推 |
| **P-14（新）** | E2E 在**全部已推分支**上均为 failure → **无分支可合入** | `gh run list --workflow E2E` 逐支均 failure | 需先清 R-2/R-3 才可谈合并 |

**正面记录**：票 06 的 R1 窗口**主动自曝提交完整性事故（R1-11）并修复**、**未以静默重跑掩盖红**、**拒绝修他票工件并呈报立票**——三项都符合 WORKFLOW 纪律。

## 五、返工判定

- **R-1（票 06 口径不一致）：已修复，复核通过。**
- **R-2（cch/02 不可构建）：源码层面问题 → 重发票 02 修复版启动器** `prompts/02-settings-surface-fix.md`
- **R-3（entry-access 居中红）：建议立票**（非本波单票责任，需跨票裁决）。

## 六、frontier（重算）

| 项 | 状态 |
|----|------|
| 票 06 R1 | ✅ **复核通过** |
| **票 02 返工 R2** | **待开工**（修复版启动器已发）—— 修 cch/02 构建断裂 |
| **R-3 entry-access 居中红** | **待裁决**（立票 / 并入某票） |
| W4 = 票 07 | **暂不可开工** —— E2E 全支红（P-14），且需先清 R-2 |

## 七、R-2 范围修正（同日补正 —— 实物复核后**扩大**）

> 补正原因：我先前记录 R-2 时把污染范围写成「票 03 的 import 与注释块（5 处）」。回仓库逐文件复核后，**范围远大于此**，且所引 sha 是 rebase 前的孤儿提交。以下为修正后的实物结论。

### 7.1 sha 修正（P-13 的实例）

- 我先前引用的 `61f3ebe7`（fix(cch-02)）**不属于任何分支**（`git branch --contains 61f3ebe7` = 空）——它是 rebase 前的孤儿提交。
- cch/02 分支上同信息提交的实际 sha = **`06273351`**；cch/02 本地仅 3 个提交高于基线（`06273351` / `8df16b52` / `3a936cec`）。
- ⇒ **复核必须锚定「推送后的分支对象」**，不得锚定本地/历史 sha。

### 7.2 污染范围修正：cch/02 是**嵌合体**，不是「缺一个导出」

| 文件（cch/02 分支内容） | 实物 | 结论 |
|---|---|---|
| `src/ui/index.ts`（1,159 行） | 含票 03 诊断面**整层**：`_diagLevel`/`_diagLayer` 态（:32-33）、摘要条 + 独立诊断视图（:130/:398/:457/:1073/:1102）、读面 `_diag()`（:850-895）、过滤器（:855-857/:976-999）、`deps.Diag` 取值；`grep "票 03"` 命中 **25+** 处 | ✗ 整层被扫入 |
| `src/config.ts` | `grep "DIAG"` = **0 命中**（DIAG_REASON / DIAG_POINT_PREFIX / DIAG_TRACE_PREF / DIAG_LAYERS / DIAG_CAPACITY **全缺**） | ✗ |
| `src/types.ts` | `grep "Diag"` = **0 命中**（`:6` 的 `import type {... CchDiag, DiagCheck, DiagLayer, DiagLevel, DiagRecord, DiagSnapshot ...}` 指向 6 个不存在的类型） | ✗ |
| `src/main.ts` | `grep -i diag` = **0 命中** ⇒ `deps.Diag` 从未注入 | ✗ |
| `src/diag/` 目录 | **不存在**（`git ls-tree -r cch/02 -- src/diag/` 无输出） | ✗ |

- 构建报错只报第一个未解析名（`(4:41)` = `DIAG_TRACE_PREF`），**实际三个值导入全缺**（`DIAG_REASON`/`DIAG_POINT_PREFIX`/`DIAG_TRACE_PREF`）；`import type` 被 esbuild 擦除故未在构建期报错，但**类型门会红**。
- ⇒ 即便补上 `config.ts` 导出，该分支仍是嵌合体（类型门红 + 诊断面永远渲染空）。**修法必须是剔除被扫入的票 03 整层**，而非补导出。

### 7.3 CI 步骤级证据（本轮补查，逐支确认）

| 分支 | run | 失败步骤 |
|---|---|---|
| **cch/02** | 35089321289 | **Build userscript**（`✗ Build failed in 148ms`） |
| **cch/03** | 35089332673 | **Run E2E** ← 首个**测试级**红 |
| cch/01 | 35089341835 | Run E2E（继承） |
| cch/05 | 35089351200 | Run E2E（继承） |
| cch/06 | 35089360299 | Run E2E（继承） |

### 7.4 P-13 系统化（非个例）

六个工作分支**本地 tip ≠ 远端 tip**，无一例外：

| 分支 | 远端 tip | 本地 tip |
|---|---|---|
| cch/01 | 18fbf99b | 9601b34b |
| cch/02 | b95f672f | 3a936cec |
| cch/03 | 23229ed9 | 9e99c68b |
| cch/04 | （未推） | 77704d4c |
| cch/05 | ede691c3 | 0851ba32 |
| cch/06 | 1e661ed2 | d54cb334 |
| cch/47 | bd5fab9b | bd5fab9b ✓ |
| cch/48 | 50383e3c | 57708951（本轮新提交，未推） |

⇒ **「本地跑绿」不是「推送后跑绿」的证据。** 本周期所有「主 Agent 本地复现」结论的**适用范围**只到本地对象；跨支终态必须以 CI 为准。此项由「P-13 个例」升级为**方法级约束**（建议写入 WORKFLOW 的验收纪律）。

### 7.5 对 frontier 的影响

- R-2 返工成本**上调**：从「剔除 5 行 import」变为「重建票 02 自有的 `src/ui/index.ts`（回退被扫入的票 03 整层）」。
- 已同步修正 `prompts/02-settings-surface-fix.md` 的 delta 段（**事实修正，非新裁决**；修法 a/b 的选择权仍归用户）。
- R-3 与 P-14 判定不变。
