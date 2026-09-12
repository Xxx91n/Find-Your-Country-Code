# Prompt 27-fix — 弱信号补分组·返工轮（P8 跨线裁决）

身份：Cycle-4 返工窗口，票 27 `detection-coverage-floor` 返工轮 R1（覆盖 A-001 收尾；跨栈全门复核发现）。

## 必读文件（开工前完整阅读）

1. 大脑复核结果: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave2-cycle4.md`（先复核本发现再动手）
2. 首轮报告: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\27-detection-coverage-floor-report.md`
3. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\27-detection-coverage-floor.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\tests\scripts\verify-ticket-02.mjs`（P8 断言，约 123 行）与 `D:\Aworker\mozilla\choose-your-country\src\config.ts` / `src\detect\index.ts`（L1_ATTR_PHRASE_SCORE 消费点）

## 大脑发现（复核输入，非我预设结论）

- 全栈合入 main 后 Engine Gates 唯一红：run 34708464239，P8 expect=lowkey got=auto score=76（68+attr:phrase 8 跨 auto 线）。
- P8 形态 = aria-label「Select country calling code」+ 全 +NN 选项 + tel 锚。首轮票 27 只跑自有 verify-27 + calibration；票 34 R1 的 EG 绿取自不含 27 改动的栈——**全合序组合从未被两票任何一方验证过**（登记教训：跨栈行为改动须在合序栈复跑公共门）。

## 返工 Delta（二选一裁决，atomcode 调研支撑 + 呈报理由）

- 路线 A（承认 auto 为正确行为）：P8 期望 lowkey→auto，附理由（结构短语 + 内容验证 + 锚三重独立证据 = 高置信；auto 对「calling code」下拉无歧义）；同时全量核对 P 组 36 例 + N 组负例**仅此一例漂移**并逐例登记。
- 路线 B（保 lowkey 语义）：限制 attr:phrase 与 L3 区号内容证据的叠加（如 SELECT 且 plusDial>0 时不重复计短语分，或 attr 短语仅作用 INPUT），使 P8 回 68/lowkey；须 verify-27 弱信号正例 38/lowkey 不回退、recall 1.0 保持。
- 无论何路：rs-* 真实语料形态判定不变；护栏（负例零抬升）不变；SCORE_AUTO/LOWKEY 常量不动。

## 验收（重跑首轮同一套标准，且必须在合序态）

- Engine Gates 全绿（36/36 + 25/25）在合入后 main 头或含本修复的分支头。
- verify-27（81 断言）+ verify-28（19）+ verify-29（27）+ Calibration Baseline 同栈全绿。
- 全部 CI run ID 锚定；本地不跑构建（CI-only）。

## 开工第一句

先复述本返工的发现（P8 跨线 + 组合未验证根因）与上述必读清单，确认无误后再动手。

## 收尾

完成定义遵循首轮 handoff 内完成定义。**报告追加写入原文件**（不覆盖）：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\27-detection-coverage-floor-report.md`
追加节标题：`## 返工轮次 R1（2026-09-12）`，含裁决路线 + 理由 + 三门绿 run ID。