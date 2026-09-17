# Handoff：03 — intl-tel-input 适配层独立化

**给谁**：领取 03 号票的子窗口（fresh context）。
**焦点**：fillIti 五层 fallback → 能力探测适配层，v16–v29 覆盖。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\03-iti-adapter.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md`（版本矩阵 + 结论 6/7/8：getInstance 稳锚、setNumber 优先、改名区间与双代类名矩阵）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Implementation Decisions 的 iti 适配层节）
4. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 Fill.fillIti 与 Detect._isIti（现状）
5. `D:\Aworker\mozilla\choose-your-country\test\cch-test-page2.html`（场景 C 验收环境）
6. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- setNumber 优先、方法名双名探测、双代类名兜底——三层顺序不可颠倒（理由见 atomcode 矩阵）。
- 版本覆盖表必须逐版本给依据；覆盖不了的版本如实标注缺口，不许"应该可以"。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\03-iti-adapter-report.md`：适配层结构、版本覆盖矩阵表（版本×路径×依据）、场景 C 验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd`）；`diagnosing-bugs`（若遇到特定版本行为不符）；版本控制遵循 WORKFLOW §4.2。
