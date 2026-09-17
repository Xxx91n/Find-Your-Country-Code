# Handoff：09 — 框架注入加固

**给谁**：领取 09 号票的子窗口（fresh context）。
**焦点**：统一原生 setter 注入层，跨 React/Vue/Angular 值同步。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\09-framework-injection.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\atomcode-industry-models.md` 结论 9（native setter + 事件序列行业共识、_valueTracker 细节）与结论 22-24
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md` §3.6（SELECT prototype setter 缺口）
4. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Implementation Decisions 的注入安全节）
5. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 Fill._dispatch 与三个 fill 函数（现状）
6. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- 注入逻辑收敛为单一注入函数（消灭三处重复 dispatch 行为）；checkbox/radio 不在本票（脚本不涉及）。
- React 19 行为未专项核验（atomcode 缺口 5）——fixture 用 React 18 验证并在报告标注该边界。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\09-framework-injection-report.md`：注入层设计、三框架 fixture 断言结果、事件序列证据、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd`）；版本控制遵循 WORKFLOW §4.2。
