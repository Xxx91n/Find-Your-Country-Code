# Prompt 27 — 检测覆盖率下限补强

身份：Cycle-4 实施窗口，票 27 `detection-coverage-floor`（覆盖 A-001）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\27-detection-coverage-floor.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\27-detection-coverage-floor.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-001 条目
6. `D:\Aworker\mozilla\choose-your-country\src\config.ts` / `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts` — 评分常量与信号瀑布落点

## 本票 Delta（检查点与专属验收项）

- 先留复现证据：弱信号 input（name=countryCode / placeholder="Country code"）当前 30 分 < SCORE_LOWKEY=35 落 none。
- 改法与标定：① attrStr 强短语补分组；② 无锚单强关键字 + tel 语义入低置信；③ 阈值重调为最后手段。选定路线须附 corpus 正负例标定数据。
- 护栏：`SCORE_AUTO` 不动；L4 排除与裸词降权链保持有效；「本地固话区号 / 语言前缀」类负例不得被抬回 lowkey。
- 专属验收：calibration baseline precision/recall 不回退 + E2E 全绿，均须 CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: 32 — 需真实站点语料已落盘且复现基线可用）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\27-detection-coverage-floor-report.md`