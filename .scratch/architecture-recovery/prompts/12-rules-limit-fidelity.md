# 启动器 12 — 规则上限强制点裁定 + BC 替身克隆保真度修复

身份：你是 Cycle-6 票 12 的实施子窗口。本票覆盖 A-xxx：A-036。

**阻塞项**：票 10（srcdoc origin 修复）

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\12-rules-limit-fidelity.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\12-rules-limit-fidelity.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\cycle6-grill\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\10-srcdoc-origin-fix-report.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-wave5-review.md
- D:\Aworker\mozilla\choose-your-country\src\store\index.ts
- D:\Aworker\mozilla\choose-your-country\tests\scripts\verify-ticket-05.mjs

本票 delta（issue 验收项之外的检查点）:
- **不得以「保留假绿」方式回避**——本票核心是让断言反映**真实保证**；靠替身别名旁路维持 S4 绿属禁止项
- 不得放宽或删除任何既有断言；`verify-05` 100/100 基线必须在**保真度修正后**仍成立（若暴露真实缺口须**修实现**而非改断言）
- 替身保真度修正须与票 10 的 `SELF_ORIGIN` **同源定义**，不得出现第二套 origin 取值
- 强制点裁定须**有据**（工业界语义或本仓既有语义）；若裁定「读路径强制」，须在 CONTEXT/文档层显式说明，不得只留代码注释
- 证据只认 CI run；真实站点层（advisory）如受影响须如实登记，不得伪造绿

开工第一句：先复述本票的阻塞项与必读清单，再动手。

收尾：报告写入 `research/window-reports/12-rules-limit-fidelity-report.md`。

完成定义：遵循 handoff 内的完成定义。

版本控制：遵循 WORKFLOW §4.2。
