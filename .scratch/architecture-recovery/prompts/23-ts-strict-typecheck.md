# Prompt 23 — TypeScript Strict Mode + CI Typecheck Gate

你是一名实施 Agent。本票启用 `"strict": true`，修复所有类型错误，并添加 CI typecheck 门禁。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\23-ts-strict-typecheck.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\23-ts-strict-typecheck.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\docs\adr\0001-*.md` 至 `0005-*.md`（现有 ADR 上下文）

## 专属 Delta

- `tsconfig.json`: `"strict": false` → `"strict": true`
- 推送 CI，捕获第一轮 `tsc --noEmit` 的全部类型错误输出
- 逐文件修复所有类型错误 — 禁止 `as any` 除非在 ADR 中记录原因
- `package.json` scripts 添加 `"typecheck": "tsc --noEmit"`
- 创建 `.github/workflows/typecheck.yml`（触发: `[pull_request, push]`）
- 最终 CI typecheck 绿通过

## 调研可用

你可以使用 `atomcode-research` 调研 TypeScript strict 模式在 userscript 项目中的最佳实践和已知坑位。

## 开工

先复述本票的阻塞关系（Blocked by: None — 可立即开工。注意：若 22 票先于本票执行，删除死代码后会减少类型错误数）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\23-ts-strict-typecheck-report.md`
