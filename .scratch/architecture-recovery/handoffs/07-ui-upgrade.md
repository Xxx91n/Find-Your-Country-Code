# Handoff：07 — 面板 UI 升级

**给谁**：领取 07 号票的子窗口（fresh context）。
**焦点**：分档注入样式、负反馈入口、规则管理的 UI 接线。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\07-ui-upgrade.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\05-site-rules-engine-report.md`（规则数据格式契约；若 05 未完成，以 issues/05 的验收 4 为准并注明）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（User Stories 17/18 + Solution 的分级行动）
4. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 UI 区块（面板结构/样式现状）
5. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）

## 本票 delta

- 体验红线：搜索/收藏/双语/动态渲染不回退（issue 验收 4 逐条回归）。
- 合成事件不得外溢到宿主表单（验收 5）。
- 调研级决断（如低调样式设计）不足时先 atomcode 调研（串行护栏）。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-ui-upgrade-report.md`：交互变更清单、回归结果逐条、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd` + 收尾 `code-review`）；版本控制遵循 WORKFLOW §4.2。
