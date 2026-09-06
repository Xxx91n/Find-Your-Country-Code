# Handoff：01 — 模块化工程骨架迁移

**给谁**：领取 01 号票的子窗口（fresh context）。
**焦点**：行为等价的架构迁移，不做任何功能变更。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\01-modular-skeleton.md`（本票验收清单）
2. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`（Solution 与 Implementation Decisions 节）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§1 角色、§2 工具、§4 全部）
4. `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js`（迁移基准，唯一现状事实源）
5. `D:\Aworker\mozilla\choose-your-country\.github\workflows\release.yml`（发布链路影响评估对象）
6. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\infra-patterns.md`（工具选型证据）

## 本票 delta

- 行为等价是最高约束：迁移前后 test/ 三页表现一致；不要顺手改任何检测/填充逻辑（那是 02/03 的票）。
- 模块边界以 spec Implementation Decisions 为准；跨模块只走入口接口。
- 验收命令要求真实执行（构建 + 本地 fixture 行为对照），把命令与退出码写进报告。
- 完成定义：遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\01-modular-skeleton-report.md`：变更清单与理由、验收命令与退出码与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。

## Suggested skills

`implement`（驱动 `tdd` 收尾 `code-review`）；版本控制一律遵循 WORKFLOW §4.2；工具约定遵循 WORKFLOW §2（node 脚本防嵌套、codegraph 探索）。
