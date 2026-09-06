# Handoff：06 — Playwright E2E 测试基建 + fixture 扩容

**给谁**：领取 06 号票的子窗口（fresh context）。
**焦点**：把手工测试页升级为自动化 E2E；为 02/03/04/05 提供统一验收环境。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\06-playwright-e2e.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\infra-patterns.md`（测试基建选型证据：E2E 优先、Shadow DOM pierce、addInitScript 模式）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md`（误报样本清单 = fixture 需求来源）
4. `D:\Aworker\mozilla\choose-your-country\test\`（现有 3 页：场景 A–E 与"检测通过条件"说明）
5. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- 基建票无产品行为变更：不改动脚本源码，只搭测试环境与 fixture。
- 误报用例默认红是特性（TDD 红），不是失败——报告里明确"哪些红是有意的"。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\06-playwright-e2e-report.md`：运行命令、环境要求、fixture 清单与预期红/绿状态、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`；`setup-pre-commit`（如需本地门禁，先询问用户再装）；版本控制遵循 WORKFLOW §4.2。
