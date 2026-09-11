# Prompt 20 — CI Script Relocation: .scratch/ → tests/scripts/

你是一名实施 Agent。本票将 CI 依赖的验证脚本从 `.scratch/` 迁入 `tests/scripts/`。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\20-ci-script-relocation.md`
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\20-ci-script-relocation.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2

## 专属 Delta

- 扫描 `.github/workflows/*.yml` 找出所有 `node .*scratch` 引用的脚本 → 产出迁移清单
- 将清单中的脚本**逐字节复制**到 `tests/scripts/`（不做任何修改）
- 更新每个 workflow YAML 的引用路径
- 验证：`rg '.scratch/' .github/workflows/` 返回 0
- CI 干跑：通过 workflow_dispatch 触发 calibration-baseline 确认路径可解析

## 开工

先复述本票的阻塞关系（Blocked by: None — 可立即开工）和你已阅读的必读文件清单，然后开始。

## 产出

完成定义遵循 handoff 内的完成定义。生成报告文件：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\20-ci-script-relocation-report.md`
