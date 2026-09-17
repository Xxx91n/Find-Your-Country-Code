# Prompt 22 — Dead Code Elimination

你是一名实施 Agent。本票删除 `src/Find-Your-Country-Code.js`（985行，0 imports）并清理所有未引用导出。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\22-dead-code-elimination.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\22-dead-code-elimination.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\CONTRIBUTING.md` — 检查是否引用了旧文件

## 专属 Delta

- 删除 `src/Find-Your-Country-Code.js`（需先确认全仓 rg 零 import 引用）
- 删除 config.ts 中 `L3_PLUS_LIKE_MIN_RATE`（确认零外部引用）
- 删除 store/index.ts 中 `_notifySubs` 和 `subscribe`（确认零外部调用者）
- 清理 rules/index.ts 中 `tierOf` 引用
- 若 CONTRIBUTING.md 引用了旧文件，改为指向 git 历史
- CI 构建验证：删除后 `npm run build` 通过

## 开工

先复述本票的阻塞关系（Blocked by: None — 可立即开工）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\22-dead-code-elimination-report.md`
