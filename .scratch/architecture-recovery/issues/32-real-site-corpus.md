# 32 — 真实站点抽样语料 + 覆盖回归

**What to build:** 建真实站点抽样语料作为测量地基——把真实站点区号字段抽象成标注模式库（对标 Bitwarden test-the-web / Mozilla form-fill-examples），加少量真实站点低频冒烟 + CDP `Autofill.trigger` 断言 + 可跳过白名单，挂接 CI，让 CI 绿能代表真实世界 coverage。

**覆盖 A-xxx:** A-006

**Blocked by:** None — can start immediately.

**Status:** done（闭环：4 项验收全销，证据锚见文末）

**闭环分支:** `cch/32-real-site-corpus` | 提交 sha: `4f7102f`（语料+冒烟层+CDP 评估+前置修复）/ `081bea8`（前后对照入 CI）/ `3e3b2ac`（报告+证据锚）/ `b7a7d26`（报告校正）

**闭环报告:** `.scratch/architecture-recovery/research/window-reports/32-real-site-corpus-report.md`

- [x] 真实站点区号字段抽象成标注模式库（corpus/manifest 扩展），覆盖 A-001/A-002/A-003 三类真实形态（弱信号 input / ISO2-value 括号下拉 / 无 ARIA 自定义下拉）—— `tests/corpus/manifest.json` +4 例（`family="real-site"`）+ `realSiteForms` 3 形态元数据段（期望 tier + 信号归因 + 修复归属票 + 基线），append-only 未改既有条目；证据 sha `4f7102f`，CI run `34682668714`（探针步打印 `形态 3 类 / 覆盖探针自证 PASS（21 断言）`）
- [x] 挂接 CI 回归（precision/recall 基线扩展）—— `calibration-baseline.yml` 新增票 32 探针步 + summary 段（node 20→22），artifact 进 `calibration-out/`；CI run `34682530402`（12 step 全绿，cch-23 以来首次转绿）、`34682668714`（含前后对照）
- [x] 少量真实站点低频冒烟 + CDP `Autofill.trigger` 断言 + 可跳过白名单；不破坏密封 E2E 供给边界 —— `tests/live/`（site-manifest 白名单强制 reason+ticket / live-smoke 弱断言 / 本地镜像页）+ `real-site-smoke.yml`（仅 schedule+workflow_dispatch，无 PR 触发面）；密封 E2E 零改动（本地 59 passed）。CDP `Autofill.trigger` 按「先评估后采用」判定 **NOT-ADOPTED**（不硬套），评估工具落 `tests/live/cdp-autofill-fitness.mjs`。偏离点 D1（外部真实站点本轮未启用，待人工校准）与 D7（advisory workflow 需合入 main 后首次 dispatch），见报告 §8；证据 sha `4f7102f`
- [x] 暴露当前实现对上述三类形态的漏检（供 27/28/29 作为复现基线）—— CI run `34682668714` 打印：`[MISS] weak-signal-input score=30 fix=27` / `[MISS] iso2-value-paren-dial-select score=14 fix=28` / `[UNCOVERED] no-aria-custom-dropdown score=14 fix=29（三重缺口）`；前后对照 前 41 例 recall 1.0000 → 后 45 例 recall 0.8696（FN 0→3，FP 恒 0，precision 均 1.0000）
- [x] 证据锚 commit sha + CI run ID（CI-only，不认本地输出）—— 见下表

## 证据锚（CI-only）

| 项 | commit sha | CI run ID | 结论 |
|---|---|---|---|
| Calibration Baseline（首次转绿） | `4f7102f8d37fed362b62fd412ba884ff71d3ed24` | `34682530402` | ✅ success（12 step） |
| Calibration Baseline（前后对照入 CI） | `081bea8ba1a58d1955c9161ecf37998820c0ea92` | `34682668714` | ✅ success（`precision=1 recall=0.8695652173913043 f1=0.9302325581395349 gate=pass`） |
| E2E | `081bea8b` | `34682653098` | ❌ failure（**安装阶段** ERESOLVE；后续 3 步全 skipped，无用例执行 —— 预存债务，非本票回归） |
| Typecheck | `081bea8b` | `34682653351` | ❌ failure（**安装阶段** lockfile 失同步 EUSAGE —— 预存债务，非本票回归） |
| Real-site smoke | `4f7102f` | 无（待合入 main 后首次 dispatch，见偏离点 D7） | ⏳ |

## 本票产出（供 27/28/29 直接取用）

- **票 27（A-001）**：`rs-weak-input-name` / `rs-weak-input-placeholder`，`score=30`（需跨 35），约束 `SCORE_AUTO` 不动
- **票 28（A-002）**：`rs-iso2-paren-select`，`score=14`；改法 = `parenDial` 移出 `if (st.plusDial > 0)` 门；修后预测 38 → lowkey
- **票 29（A-003）**：`rs-noaria-custom-dropdown` 三重缺口（候选集零命中 / `kind=null` / 登记分 14 < 25）；档位仍守 ADR-0005（登记不注入）
- **三票共同**：落地后必须同步更新 `manifest.realSiteForms[].baseline` 与用例 `knownResidual`/`expect`，否则 `Calibration Baseline` 会以精确漂移信息红掉（设计意图）

## 顺带修复（前置，否则本票无法度量）

`tests/scripts/14-lib-engine.mjs` 的函数束装载器自 `188f9c1`（票 23 strict 类型修复）起失效（裸 `new Function` 解析不了 TS 类型标注 → `SyntaxError: Unexpected token ':'`），`Calibration Baseline` 在 `main` 上持续红；已用 Node 标准库 `module.stripTypeScriptTypes` 修复 + workflow node 20→22。证据：run `34682530402` 转绿。