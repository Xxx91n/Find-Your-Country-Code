# 票 14 实施报告 — 校准语料与回归基线

> 实施窗口（fresh context）| 2026-09-05 | 分支 `cch/14-calibration-corpus`（提交 `eb0055c` → amend 后 `4a1e5a8`）| 状态：**闭环，5/5 验收全过，CI 绿**

## 1. 变更清单与理由

| 文件 | 变更 | 理由 |
|---|---|---|
| `tests/corpus/manifest.json`（新增，231 行） | 39 例正负例语料 manifest | issue 验收 1：fixtures + 误报样本 + 新周期样本，每例标注正/负/来源；`_meta.appendOnlyRule` 固化「新样本只加不删」 |
| `.scratch/architecture-recovery/research/scripts/14-lib-engine.mjs`（新增） | 共享装载库：函数束方式装载 `src/config.ts + countries.ts + detect/index.ts`（零构建零依赖）+ mock DOM + config 常量内存覆盖 | 沿用 misdetect-repro-v2.mjs 已验证的引擎消费面；标定需要在不写回源文件的前提下改变量 |
| `.scratch/.../scripts/14-calibration-harness.mjs`（新增） | precision/recall harness：全语料评测 → TP/FP/TN/FN → precision/recall/F1/accuracy + 回归门禁 + `--json`/`--out` 产物 | issue 验收 2；门禁口径=全部非 knownResidual 用例符合 expect（knownResidual 如实计入 precision 分母但不拦 CI） |
| `.scratch/.../scripts/14-threshold-calibration.mjs`（新增） | 阈值标定：基线分布 + (AUTO,LOWKEY) 全网格重评测可行域 + L1/L2/L3/L4 常量单变量敏感性 → 「建议参数+报告」 | issue 验收 3；只输出建议，绝不写 `src/config.ts`（参数变更走 16 票） |
| `.github/workflows/calibration-baseline.yml`（新增） | CI 接线：`workflow_dispatch` + `push: cch/14-calibration-corpus`；harness → 标定 → Assert 数字存在 → artifact 上传 → step summary | issue 验收 4「扩展既有验证链」；纯 node 零依赖故无需 npm ci（规避分支快照缺 lockfile 的 §5 教训面） |
| `.scratch/architecture-recovery/research/calibration/`（新增 3 文件） | **CI artifact 证据副本**：baseline-report.md / baseline-summary.json / calibration-report.md | 由 run 33973341795 的 artifact 下载落盘，非本地重跑产物 |
| `.scratch/architecture-recovery/research/window-reports/14-calibration-corpus-report.md`（本文件） | 实施报告 | handoff 完成定义 |

**零 `src/` 变更——本票不改检测行为（issue 验收 5）。**

## 2. 验收对照（issue 14 五条，逐条证据）

| # | 验收项 | 证据 | 结论 |
|---|---|---|---|
| 1 | 语料 manifest：fixtures + 误报样本 + 新周期样本，每例标注正/负与来源 | `tests/corpus/manifest.json`：39 例 = legacy 25 例（id 与 repro-v2 一一对应，来源标 fixture 锚点/harness 用例号/调研文件节号）+ mm2 新周期 14 例（来源标 fixture 转录锚点与 mmv2 报告 §2.3 等） | ✅ |
| 2 | precision/recall harness 在 CI 可运行并产出数字基线 | **CI run [33973341795](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/33973341795) success（headSha 4a1e5a8）**，Assert 步骤实测输出 `precision=0.9473684210526315 recall=1 f1=0.972972972972973 gate=pass`；artifact `calibration-baseline`（id 9971573562），副本在 `research/calibration/` | ✅ **首次基线已跑出** |
| 3 | 阈值标定脚本：语料→最优 auto/lowkey 阈值与 L1 权重建议，输出标定报告；可重复运行 | 同 run 的 `calibration-report.md`（CI 产出）：建议 = **keep-current (SCORE_AUTO=70, SCORE_LOWKEY=35)**，可行域 120 组参数对（AUTO 边际 45..160，LOWKEY 边际 20..40）；权重敏感性 60 组扰动中 58 组可行。可重复性：本地干跑与 CI 输出逐字一致（确定性网格+无时钟随机）。**不写 config** | ✅ |
| 4 | CI workflow 接线完成（扩展既有验证链），证据只认 CI run | `calibration-baseline.yml` 已随分支入库并真实触发两次红灯迭代 + 一次绿灯；证据全部取自 CI run/artifact | ✅ |
| 5 | 本票不改检测行为 | 无 src/ 变更；harness/标定对 src 只读；标定建议未生效 | ✅ |

检查点三项：首次基线跑出数字 ✅（见验收 2）；标定可重复、输出「建议参数+报告」不改配置 ✅（见验收 3）；manifest 每条标注正/负与来源、新样本只加不删 ✅（`_meta.appendOnlyRule`）。

## 3. 基线数字（CI 产出，权威）

- 语料 39 例（正 18 / 负 21）| TP=18, FP=1, TN=20, FN=0
- **precision = 0.9474**（唯一 FP = `mm2-neg-itires`，knownResidual）
- **recall = 1.0** | F1 = 0.9730 | accuracy = 0.9744
- 回归门禁 PASS（非 residual 用例 38/38 符合 expect，含 legacy 25/25 = repro-v2 口径全数保持）

## 4. 偏离点

1. **本地干跑用于脚本排错**：开发期以 node 干跑验证脚本正确性（WORKFLOW §2.6 防嵌套约定的标准做法，未产生任何构建产物）；**验收证据全部取自 CI run 33973341795，本地输出不作为证据**（符合 CI-only 政策的证据条款）。
2. **分支拓扑调整**：cch/10 上的 `lkq` 冲突提交（v1.4.0 bump，mmv2 报告 §6 已登记的遗留）阻断堆叠推送；进入 GitButler 解冲突流程后 `resolve finish` 两次因基底合并内部错误失败，按「失败先归因路径再重试」原则放弃硬解，改将本票分支堆叠至 `cch/07` 之上（lkq 变为下游、不进推送）。**src/ 引擎状态不受影响**：cch/08（docs）、cch/10（workflows/greasyfork/版本号）、mmv2-tickets/11（.scratch/CONTEXT.md）均未改 src/，推送树引擎与工作区 HEAD 逐字一致。副作用：远端新增 `cch/08-docs-adr` 分支（624a580，栈推送固有行为）。lkq 本身未动，仍留给大脑/用户决策。
3. **证据副本落盘**：`research/calibration/` 三文件来自 CI artifact 下载（GitHub api zip），不是本地重跑；文件头均注明 run id。
4. 新周期样本（mm2-*）为依据 mmv2 报告/spec 衍生的手写样本（非新 HTML fixture），来源字段如实标注「mm2 语料新增」与衍生出处。

## 5. 未完成/未验证项

- 无——issue 内 5 条验收项全部真实执行并留 CI 证据。
- 说明：语料对引擎行为是抽样覆盖（39 例），不是全量等价验证；Playwright E2E 层不受本票影响（未触碰）。

## 6. 给大脑的风险提示

1. **`mm2-neg-itires` 修复联动**：16 票取消 `_isIti` 无条件短路后，应把该例 `knownResidual` 翻转为 `false`（append-only 规则允许状态位更新、不算删除），届时 precision 应升至 1.0——这将成为 16 票的验收数字之一。
2. **小整数 option 值撞拨号集**：月份 1..3 命中 +1/+31 等真实区号获得 L3 plus-dial 加分并压制 numeric-enum 罚分（N0b=4、F1b=11、F6=4、N0a=-66）。现均未达注入档，但 16 票做 L3 加码/ISO 全集成员测试时这是已知敏感面。
3. **country 语义抑制与 SCORE_AUTO 耦合**：抑制仅在 tier=lowkey 时生效——AUTO≤44 会令 F2 升 auto 绕过抑制而注入；AUTO>162 会把 l0country（score=162）压入 lowkey 被抑制而漏检。**任何阈值调整必须复跑本语料**（标定脚本即为此准备）。
4. **权重承重墙**：L1_STRONG_KW×0.5 → 8 个正例漏检；L1_COMPOUND×0.5 → N2/N2b 漏检 + N1 auto→lowkey。16 票调整词表权重时的回归红线即本语料。
5. **合并顺序建议**：本分支现挂 cch/07 之下（提交只含新增文件、无冲突面）；建议 cch 链按既有顺序收口后合并本分支。lkq 冲突与 cch/10 的 unpushed 提交（lkq/usw/plx）仍未解决，后续任何堆叠在 cch/10 之上的票推送都会被同样阻断——建议大脑收口时统一裁决（原 §6.3 登记项）。
6. **workflow 触发面**：`calibration-baseline.yml` 现仅触发于 `cch/14-calibration-corpus` push + 手动 dispatch；建议收口时（19 票）把触发面扩为 main，使语料基线成为全仓库回归门禁。
