# Prompt 21 — PR Triggers for All CI Workflows

你是一名实施 Agent。本票为所有非发版 CI workflow 添加 `pull_request:` 触发。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\21-pr-triggers.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\21-pr-triggers.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. `D:\Aworker\mozilla\choose-your-country\.github\workflows\release.yml` — 确认此文件**不改动**

## 专属 Delta

- 为 e2e.yml, calibration-baseline.yml, verify-*.yml 的 `on:` 段添加 `pull_request:`
- 确认 release.yml 的 `on:` 段**不添加** `pull_request:`（发版仅手动触发）
- 验证：每个非发版 workflow YAML 包含 `pull_request:`
- 推送测试分支 + 开 PR，确认 CI 触发

## 开工

先复述本票的阻塞关系（Blocked by: 20 — CI 脚本须先迁移到位）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\21-pr-triggers-report.md`
