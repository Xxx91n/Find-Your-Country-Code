# 窗口实施报告 — 票 20：CI Script Relocation (.scratch/ → tests/scripts/)

> 实施窗口 | 2026-09-11 | 分支 `cch/20-ci-script-relocation` | 提交 `uur`（change-ID，远端 `56bed88`）

## 0. 开工复述（票要求）

- **阻塞关系**：Blocked by: None — 立即开工。波次内与票 21-26 互不堆叠、并行。
- **必读清单**：已全部完整阅读 — ① handoffs/20（6 检查点+报告要求）② issues/20（6 验收项）③ spec.md（Cycle-3，CI script relocation 决策 + Out of Scope"仅迁移 CI 引用脚本"）④ WORKFLOW.md（§4.2 版本控制唯一权威 = but；§2.6 node 防嵌套）。

## 1. CP1 — 迁移清单（workflows 扫描，`node .*scratch` 全量 12 处引用 / 8 个脚本）

| # | 旧路径 (`.scratch/architecture-recovery/research/scripts/`) | 新路径 (`tests/scripts/`) | CI 引用点 |
|---|---|---|---|
| 1 | 14-calibration-harness.mjs | tests/scripts/14-calibration-harness.mjs | calibration-baseline.yml L29 |
| 2 | 14-threshold-calibration.mjs | tests/scripts/14-threshold-calibration.mjs | calibration-baseline.yml L35 |
| 3 | 14-lib-engine.mjs | tests/scripts/14-lib-engine.mjs | **间接**：被 1/2/7/9 以 `./14-lib-engine.mjs` import（传递依赖闭包扫描确认无其他外溢） |
| 4 | verify-ticket-13.mjs | tests/scripts/verify-ticket-13.mjs | verify-13.yml L25 |
| 5 | verify-ticket-02.mjs | tests/scripts/verify-ticket-02.mjs | verify-13.yml L38 / verify-16.yml L24 / verify-18.yml L38 |
| 6 | misdetect-repro-v2.mjs | tests/scripts/misdetect-repro-v2.mjs | verify-13.yml L40 / verify-16.yml L26 / verify-18.yml L40 |
| 7 | verify-ticket-15.mjs | tests/scripts/verify-ticket-15.mjs | verify-15.yml L24 |
| 8 | verify-ticket-09.mjs | tests/scripts/verify-ticket-09.mjs | verify-15.yml L26 |
| 9 | verify-ticket-18.mjs | tests/scripts/verify-ticket-18.mjs | verify-18.yml L25 |

耦合审读结论：9 个脚本内 **零功能性 `.scratch` 代码引用**（仅 4 处 usage 注释）；数据依赖全部经由 ROOT 拼 `src/`、`tests/`、`test/`、`.github/`，与脚本所在深度无关。

## 2. 偏离声明（呈报大脑裁决）— "逐字节复制不修改" 检查点不可原样满足

- **事实**：9 个脚本中 7 个用 `ROOT = join(here, '..','..','..','..')`（自脚本位置向上 4 级）锚定仓库根；原件深度 = 4 级（`.scratch/architecture-recovery/research/scripts/`），`tests/scripts/` 深度 = 2 级。逐字节复制到票定路径后 ROOT 必然解析到仓库根**之外**，CI 必红 — 检查点 2（不修改）与检查点 6（CI 干跑绿）在票定路径下**互斥**。
- **裁决**：以票目标（".scratch 不再是 CI 单点故障" + user story 1）为准，采用**最小必要偏离**：仅改 ROOT 定义行（4 级→2 级，7 文件 × 1 行）+ 4 处 usage 注释同步（防误导）。每个转换以断言固化预期替换次数，事后逐行 diff 证明改动面恰为上述行。
- **佐证**：14-calibration-harness.mjs / 14-threshold-calibration.mjs 不定义 ROOT，保持**逐字节一致**（sha256 前 16 位相同）。

## 3. CP5 — diff/一致性证据（删除原件前采集；sha256[:16]）

| 文件 | 原件 sha | 副本 sha | 结论 |
|---|---|---|---|
| 14-calibration-harness.mjs | a136c8707d927c4c | a136c8707d927c4c | **byte-identical** |
| 14-threshold-calibration.mjs | 51de0885b3fc3164 | 51de0885b3fc3164 | **byte-identical** |
| 14-lib-engine.mjs | 3b2a9b01bf0a82e2 | 7f2f02e731f2767a | 差异=L16（ROOT 行） |
| verify-ticket-13.mjs | 92fca8aeaff5a944 | ef8c26ed82b7884a | 差异=L21（ROOT 行） |
| verify-ticket-18.mjs | c4445991741ac247 | 3fa6aa5e3a4caf67 | 差异=L18（ROOT 行） |
| verify-ticket-02.mjs | fe96c187f1029128 | 3c17c9ce39d8ea2e | 差异=L8（usage）+L15（ROOT） |
| misdetect-repro-v2.mjs | c04ea7bcd7371471 | dfc378cb564f3b6a | 差异=L8+L15 |
| verify-ticket-15.mjs | a2edaad184b4a014 | 956ca146005fc7e9 | 差异=L12+L19 |
| verify-ticket-09.mjs | 1049f2f093c0e058 | be68981488ac45d6 | 差异=L15+L22 |

ROOT 行统一：`join(here, '..','..','..','..')` → `join(here, '..','..')`。原件已删除（move 语义，spec "仅 CI 引用脚本迁移"）。

## 4. CP3/CP4 — YAML 更新与验证

- 5 个 workflow 共 12 处引用更新：calibration-baseline.yml（2）、verify-13.yml（3）、verify-15.yml（2）、verify-16.yml（2）、verify-18.yml（3）。
- 验证：`rg '.scratch/' .github/workflows/` → **0 命中（exit 1）**；工作区全目录 `.scratch/` 字面量残留 = 0。
- e2e.yml / release*.yml 本就无 scratch 引用，未触碰。

## 5. ⚠ 并行窗口竞态事故（未修改他人提交，仅呈报）

- **经过**：本窗口于 5 个 YAML 完成路径替换后，另一并行窗口（票 25）于 14:07:27 执行 but commit，**把本票 4 个 verify-*.yml 的路径 hunk 一并吸入其提交** `mzv (df8c185) feat(cch-25)`（`git show` 实证：该提交同时含其 `--legacy-peer-deps` 移除与本票 `node tests/scripts/...` 替换）。calibration-baseline.yml 未被 cch-25 触碰，仍在本票提交中。
- **处置**：按 AGENTS.md 规则不 amend/改写他人提交。本票分支快照（= common base + uur）**自洽**：脚本在 tests/scripts/ + calibration-baseline 指向新路径；仅 4 个 verify-*.yml 在本分支上仍指旧路径（其旧脚本已被本票 rename 删除 ⇒ **不要在本分支上手动派发 verify-***）。
- **对收口的影响（请大脑合并时把关）**：
  1. cch-20 与 cch-25 **必须同波合并**；合并后 main 上重跑 `rg '.scratch/' .github/workflows/` 应为 0。
  2. 若 cch-25 被放弃，4 个 verify-*.yml 的路径修复随其消失，需在 main 上单独补齐（hunk 内容见本表 §4）。

## 6. CP6 — CI 干跑证据（本机零构建，全部云端实证）

| Workflow | Run ID | 触发 | 结论 | 关键日志 |
|---|---|---|---|---|
| Calibration Baseline | [34569015933](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34569015933) | workflow_dispatch @ cch/20-ci-script-relocation | **success**（全 9 step 绿） | `precision=1.0000 (TP=20, FP=0)`、`precision=1 recall=1 f1=1 gate=pass` |
| E2E | [34568992880](https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34568992880) | push cch/** 自动 | **success**（e2e job 绿） | 全量 Playwright 套件通过 |

calibration-baseline 在派生 ref 上以新路径执行了 14-calibration-harness / 14-threshold-calibration / 14-lib-engine（含 ROOT 修复），路径解析与引擎装载实证通过。verify-* 6 脚本的 ROOT 修复未获云端实证（原因见 §5 事故 + handoff 未要求）；其正确性由 §2 机制（ROOT 唯一深度敏感点）+ §3 逐行 diff 界定，待 cch/13/15/16/18 分支后续 dispatch 时自然验证。

## 7. 报告要求 (d) — 发现于 scratch 但**未迁移**的脚本（36 个，spec 明确保留）

非 CI 引用（`.github/workflows/` 零命中），按 spec "此周期不动 scratch 其余内容" 原样保留：
17-cdn-check.mjs, 17-pseudo-select-probe.mjs, behavior-compare.mjs, brain-probe-07-fb.mjs, brain-probe-iti-sync.mjs, brain-rg-wave3.mjs, brain-verify-10.mjs, closing-1-crosscheck.mjs, closing-2-finalgates.mjs, closing-3-docs.mjs, cycle3-crosscheck.mjs, diag-new.mjs, digest-skills.mjs, digest-ticket08-facts.mjs, iti-adapter-verify.mjs, misdetect-repro.mjs(v1), mmv2-crosscheck.mjs, mmv2-selfcheck.mjs, probe-iti-fill.mjs, probe-perf-04.mjs, probe-ticket08-src.mjs, probe-ticket08-src2.mjs, repro-03-fix.mjs, verify-artifacts.mjs, verify-ticket-01/04/05/07/08/10/11.mjs, _cf-patch.mjs, _fix-s4.mjs, _fix-s6.mjs, _mktree-closing.txt, _rules-backup.ts

## 8. 验收清单（issues/20 六项）

- [x] 扫描 workflows 识别 CI 引用脚本 → §1（8 引用 + 1 传递依赖）
- [x] 创建 tests/scripts/ 并复制 → §1/§3（无子目录结构需保留）
- [x] 更新全部 workflow YAML node 路径 → §4（12 处；4 处经 §5 事故落入 cch-25 提交，工作区/合并结果完整）
- [x] rg '.scratch/' .github/workflows/ = 0 → §4
- [x] 复制脚本与原件一致性验证 → §3（2 个逐字节 + 7 个改动面逐行界定）
- [x] calibration-baseline workflow_dispatch 干跑确认路径可解析 → §6 绿

## 9. 风险提示

1. §5 合并耦合：cch-20 与 cch-25 需同波合并（已呈报）。
2. 票面"逐字节复制"检查点与本偏离冲突的裁决权在大脑（§2）。
3. 磁盘 CRLF 为 Windows 写痕，`.gitattributes`（eol=lf）在提交时归一，`git diff --check` 通过。
