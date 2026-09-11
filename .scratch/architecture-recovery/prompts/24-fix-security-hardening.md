# Prompt 24-fix — Security Hardening: postMessage Origin + SCAN_SELECTORS Dedup (返工轮次)

你是一名实施 Agent。本票为返工轮次。**先完整阅读首脑复核报告再动手。**

## 必读文件（开工前完整阅读）

1. 首脑复核: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave1-cycle3.md`
2. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\24-security-hardening.md`
3. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\24-security-hardening.md`
4. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
5. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2

## 专属 Delta

- 首脑复核发现: SCAN_SELECTORS Set 去重已实现 ✅；postMessage origin 校验 ✗（3 处仍用 `'*'`）；BroadcastChannel origin 校验 ✗
- `but status` 查明票 24 当前修改在工作区的真实位置
- `src/ui/index.ts`: postMessage 入站 handler 加 `e.origin === location.origin` 校验；顶层→子帧 `'*'` 回发加注释说明（跨域不可避免）
- `src/store/index.ts`: BroadcastChannel onmessage 加 `e.origin` 校验（信任 same origin）
- 拆到独立分支: `but commit -b cch/24-security-hardening -m "..."`（遵循 WORKFLOW §4.2）
- 推送 CI 跑 E2E + iframe E2E，确认跨帧通信无退化

## 开工

先复述首脑复核报告中本票的失败项（AC1 postMessage origin ✗ + AC2 BroadcastChannel origin ✗ + 无独立分支 ✗）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。报告追加写入（标注 ## 返工轮次，不覆盖原记录）:
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\24-security-hardening-report.md`
