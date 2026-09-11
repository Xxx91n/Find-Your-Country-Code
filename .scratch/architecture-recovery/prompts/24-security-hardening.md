# Prompt 24 — Security Hardening: postMessage Origin + SCAN_SELECTORS Dedup

你是一名实施 Agent。本票为跨帧 postMessage 和 BroadcastChannel 添加 origin 校验，并去重 SCAN_SELECTORS。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\24-security-hardening.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\24-security-hardening.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md` — SCAN_SELECTORS 设计上下文

## 专属 Delta

- `src/ui/index.ts`: 子帧→顶层的 postMessage 入站消息校验 `e.origin === location.origin`；顶层→子帧的 `'*'` 回发在跨域不可避免，加注释说明
- `src/store/index.ts`: BroadcastChannel `onmessage` 添加 `e.origin` 校验
- `src/detect/index.ts`: SCAN_SELECTORS 迭代前用 `new Set()` 去重
- 回归：所有 E2E 测试通过，特别确认 iframe 跨帧 E2E 仍正常

## 开工

先复述本票的阻塞关系（Blocked by: None — 可立即开工）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\24-security-hardening-report.md`
