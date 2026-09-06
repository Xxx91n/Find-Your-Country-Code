# 票 16-fix 修复报告 — 校准重测与 mm2-neg-itires 判定

> 复核修复窗口 | 2026-09-06 | 分支 cch/16-fix-calibration-mirror（above cch/15-react19-fill-probe，快照含票 16 引擎 + 票 14 语料 + 票 12 帧治理 + 票 15 probe）
> 输入: verification/review-mmv2-wave1.md（首脑复核）+ prompts/16-scoring-consistency-fix.md（修复任务书）
> 版本控制遵循 WORKFLOW §4.2；证据只认 CI run。

## 1. 开工第一句：对首脑复核结论的独立再质检（先质检后动手）

首脑复核 review-mmv2-wave1.md §16 全部结论为「属实」；本窗口逐条以实际命令复验，结果如下：

| # | 复核结论 | 本窗口实际执行的验证 | 输出 | 判定 |
|---|---|---|---|---|
| 1 | 短路摘除（无 score:100 形态） | 全文正则 /score:\s*L0_TOKEN_SCORE,\s*tier:\s*'auto'/ 扫 src/detect/index.ts | 无命中；L170-171 `if (tag === 'INPUT' && this._isIti(el)) score += add('L0','iti:container',ITI_CONTAINER_SCORE)` | 属实 |
| 2 | L3 罚分独立叠加 | 定位 L221 `if (st.numeric / st.total >= L3_NUMERIC_MIN_RATE)`（独立 if，非 else-if） | 在；票 16 注释在 | 属实 |
| 3 | 常量集中 | 读 src/config.ts | ITI_CONTAINER_SCORE=60 / ITI_LOW_REGISTER_SCORE=25 | 属实 |
| 4 | .gitignore test/ 放行 | 读 .gitignore | `!test/` 在；test-results/、playwright-report/ 仍忽略 | 属实 |
| 5 | CI run 33975761519 绿 | gh run view --json | {"conclusion":"success","headSha":"3e06b3eade…","status":"completed"} | 属实 |
| 6 | 文件范围 11 文件 | git log --stat origin/cch/16-scoring-consistency ^origin/cch/07-ui-upgrade | report+2 门禁脚本+verify-16.yml+.gitignore+3 测试页+config+detect，全在本票圈 | 属实 |
| 7 | 票 14 遗留（residual 待判） | 读 tests/corpus/manifest.json | mm2-neg-itires knownResidual=true（唯一 residual 用例） | 属实 |

**再质检补充发现（非首脑结论错误，首脑已声明「按 CI 实测翻转」的条件的依附项）**：票 14 harness 的 iti 通道（14-lib-engine.mjs evaluateCase）镜像的是**旧** _process（ctx.iti → _isIti 固定 100/auto，注释自述「镜像 _process 分发」）。票 16 摘除短路后该镜像失真——若不同步，重测数字模拟的是已删除的代码路径。首脑结论无错误，此项为修复窗口职权内的口径同步（与 16 窗口同步 verify-ticket-02/misdetect-repro-v2 P4 通道同理），已修复并留 CI 证据。

必读清单复述：① verification/review-mmv2-wave1.md（首脑复核，含 16/14 对照表与本票遗留）② issues/16-scoring-consistency.md（原始验收 4 条）③ handoffs/16-scoring-consistency.md（完成定义）④ spec.md（评分一致性决策）⑤ WORKFLOW.md（§4.2 版本控制/§2 工具）⑥ tests/corpus/manifest.json（39 例语料，mm2-neg-itires 现状 residual=true）⑦ .github/workflows/calibration-baseline.yml（dispatch+push 触发面）。

## 2. 修复 diff 说明

**唯一代码变更：14-lib-engine.mjs iti 通道镜像同步**（4 行 → 2 行）：
- 删除 `if (ctx.iti) { hit=_isIti; return 100/auto 'iti-short-circuit' }` 模拟分支；
- ctx.iti 用例与其余用例同走 `Detect.scoreElement(el, {anchorHasTel})`，容器信号由引擎内 iti:container 加分（镜像新 _process）；
- 文件头口径注释同步。**src/、manifest.json 零改动**（appendOnly 规则未触发任何删除/翻转，见 §4 判定）。

提交：quu test(cch-16-fix)（分支 cch/16-fix-calibration-mirror，parent 栈 = cch/15 → 12 → 14 → 16 → 07 → … → 01，即「含 16 改动的快照」）；推送 d9f142f。

## 3. 验收证据（CI run，只认 CI）

Run: https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34012435513（workflow_dispatch calibration-baseline.yml --ref cch/16-fix-calibration-mirror，success，artifact calibration-baseline）

| 指标 | 票 14 原基线（run 33973341795） | 本票重测（run 34012435513） | 变化 |
|---|---|---|---|
| 语料 | 39 例 | 39 例 | — |
| precision (TP/FP) | 0.9474 (18/1) | 0.9474 (18/1) | 无变化 |
| recall (FN) | 1.0000 (0) | 1.0000 (0) | 无变化 |
| f1 / accuracy | 0.9730 / 0.9744 | 0.9730 / 0.9744 | 无变化 |
| 回归门禁 | PASS | PASS | — |
| knownResidual | mm2-neg-itires | mm2-neg-itires | 未翻转 |
| P4 测量口径 | 模拟短路 100/auto | **真实引擎 70/auto（容器 60 + type=tel 10）** | 口径修正，结论（inject）不变 |

CI 日志关键行：`[RESID] mm2-neg-itires negative expect=none got=inject/lowkey score=60`；`回归门禁（非 residual 用例全部符合 expect）: PASS`。

证据副本（append-only，票 14 原件未动）：research/calibration/baseline-summary-post16.json（含 evidenceRun/ref/note）、baseline-report-post16.md。

## 4. 判定：mm2-neg-itires 仍不通过 → 不翻转（appendOnly）

- 用例：input[name=qty][type=text] 位于 .iti 容器，无 label/关键词/锚，expect=none。
- 票 16 引擎实测：容器信号 iti:container +60 → 无其他信号 → **tier=lowkey → 注入**（injectionRule: tier ∈ {auto, lowkey}）。expect=none 不满足 → RESID。
- 按 appendOnly 规则，**knownResidual 保持 true 不翻转**；manifest.json 未做任何修改。基线数字（§3）已在 CI 重测刷新，precision 分母继续如实计入该 FP。
- 该用例相对票 16 前的行为变化：无条件 100/auto（auto 档醒目样式注入）→ 60/lowkey（低调样式注入，且可被 L1 本地固话 -30 / L4 排除 -70 压制）。误报面收窄但未闭合。

## 5. 给 13 票的输入（分档与信号明细）

- 信号明细（mm2-neg-itires）：`[{layer:'L0', name:'iti:container', pts:60}]`，score=60，tier=lowkey，无任何负信号（无 L1 命中、无 L4 排除、非 select 故 L3 不参与、ctx 无 tel 锚）。
- 结构定位：ITI_CONTAINER_SCORE=60 使「容器唯一证据」的 input 单独越过 lowkey 阈（35）；「容器+type=tel」恰达 auto（70）是有意标定（E2E cch-test-page2 场景 C），不能整体调低，否则真 iti 字段（无锚页面常态）跌档。
- 13 票可评估的防线方向（仅列事实供裁决，未动代码）：① 容器内 input 若除容器分外零其他正信号，要求最低佐证（type=tel/autocomplete/inputmode/L1 任一）才保留容器分；② 或容器分单独封顶低于 lowkey 阈、与 type=tel 信号组合计分；③ 任何调整走 14 票标定脚本重跑基线（本票已备好镜像同步后的重测通道）。

## 6. 声明 → 证据 → 结论对照表（对照 README 完成定义 + issue 验收项）

| 声明 | 证据 | 结论 |
|---|---|---|
| issue 16 验收 1（iti 评分路径） | 复核已核 + 本票再质检 #1；E2E 42 passed（run 33975761519）含 iti 注入/填充/补挂 | 闭合 |
| issue 16 验收 2（L3 独立叠加） | 再质检 #2；harness 25/25 + corpus 39 例门禁 PASS（两次 run） | 闭合 |
| issue 16 验收 3（常量集中） | 再质检 #3；本票零调值 | 闭合 |
| issue 16 验收 4（门禁 CI 全绿） | run 33975761519 / 33976269268 双绿 | 闭合 |
| 修复项① 含 16 快照重跑校准 | run 34012435513（ref d9f142f，15→12→14→16 祖先链） | 完成 |
| 修复项② 转通过则翻转 | CI 实测仍不通过（§4） | 不触发 |
| 修复项③ 仍不通过如实报告+信号明细 | 本报告 §4/§5 | 完成 |
| 报告落盘 | 本文件 + baseline-*-post16 证据副本入库 | 完成 |
| 票 14 基线数字刷新 | precision/recall/f1 与原基线数值相同（口径修正后复测），post16 副本落盘 | 完成 |

## 7. 风险提示（给大脑）

1. **更正 16 报告一处笔误**：16-scoring-consistency-report.md §6 风险 2 写「无关 text input 得 60 分 none」——实为 **60 分 lowkey（注入）**，本票 §4 实测已更正，以 CI 为准。
2. mm2-neg-itires residual 保持 true，波次表中票 13（被 16 阻塞的 Wave 2）启动后应把本票 §5 列为输入；若 13 落了防线，需再次 dispatch 校准 workflow 翻转并刷新基线。
3. 本票只改 harness 镜像口径，未触碰票 14 任何语料/脚本原件语义；cch/14 分支无需返工。
4. 校准 workflow 触发面未改（仍为 cch/14 push + dispatch）；后续翻转重测可继续用 dispatch --ref 模式。
