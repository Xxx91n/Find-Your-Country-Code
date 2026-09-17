# Handoff：10 — 发布链路与版本策略适配

**给谁**：领取 10 号票的子窗口（fresh context）。
**焦点**：release.yml 适配构建产物；发布就绪但 beta 发布须用户确认。

## 必读（按序）

1. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\10-release-pipeline.md`（验收清单；注意验收 4 的人工确认边界）
2. `D:\Aworker\mozilla\choose-your-country\.github\workflows\release.yml`（现状：从 src 提取 @version、tag 判重、Glog 双语 changelog）
3. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\01-modular-skeleton-report.md`（构建产物路径事实；若 01 未完成则阻塞本票，报告以 issues/01 验收 3 为准）
4. `D:\Aworker\mozilla\choose-your-country\greasyfork\Glog.md` / `Glog_EN.md`（changelog 流程对象）
5. `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`（§2/§4；边界：外发动作需用户确认）

## 本票 delta

- dry-run/fork 验证优先，不碰真实 main 发布；beta 发布动作明确标注"待用户确认"。
- 版本号跳跃策略（1.3.4 → 2.0.0 的取舍）写入报告供用户决策，不擅自定版。
- 完成定义：遵循 issue 内验收清单 + 报告落盘。

## 报告

完成后必须写 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\10-release-pipeline-report.md`：workflow diff 说明、dry-run 证据、链接验证方法与结果、版本策略建议、偏离点、待用户确认事项。

## Suggested skills

`implement`；`wizard`（若发布需要人工在 GitHub 界面操作，生成引导脚本）；版本控制遵循 WORKFLOW §4.2。
