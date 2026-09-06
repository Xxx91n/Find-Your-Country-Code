# Handoff：02 — 多信号加权评分检测引擎

**给谁**：领取 02 号票的子窗口（fresh context）。
**焦点**：把布尔检测重写为五层评分引擎并接分级行动；这是全项目核心票。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\02-scoring-engine.md`（验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Implementation Decisions 的评分引擎与分级行动节）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\misdetection-root-causes.md`（误报 5 类样本 = 你的回归靶子）
4. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\industry-models.md`（L0–L4 蓝图与权重依据）与 `research\atomcode-industry-models.md`（Chromium 分类优先级链）
5. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4）
6. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js` 的 Detect 区块（词表现状）

## 本票 delta

- 权重与阈值必须落为显式常量并注明调研出处；禁止拍脑袋数字。
- 误报 5 类样本全部走 fixture 断言（依赖 06 号票基建；若 06 未完成，先用本地静态页人工验证并在报告声明）。
- 检测核心保持纯函数；UI 接线只做分档样式挂点（完整 UI 是 07 票）。
- 调研级决断（如新歧义词组设计）若证据不足，先用 atomcode 深度调研（遵循 WORKFLOW §2 串行护栏），并回顾 research/ 既有调研避免重复提问。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\02-scoring-engine-report.md`：信号层实现说明、常量表与出处、误报样本断言结果（逐条）、验收命令与退出码、偏离点、风险。

## Suggested skills

`implement`（内部 `tdd`：先把误报样本写成红用例）；`grilling` 心智自查（决策是否都有依据）；版本控制遵循 WORKFLOW §4.2。
