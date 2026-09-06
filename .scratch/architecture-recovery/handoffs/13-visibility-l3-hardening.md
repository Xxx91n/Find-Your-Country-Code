# Handoff:13 — 可见性闸门与 L3 内容验证加码

**给谁**: 领取 13 号票的窗口(fresh context)。
**焦点**: 误报再收敛: 可见性闸门 + L3 加码,均落在检测管线内部,不新增跨模块 seam。

## 必读(按序)

1. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/issues/13-visibility-l3-hardening.md(本票验收清单)
2. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/spec.md(Problem/Solution/Implementation Decisions/Testing Decisions)
3. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/WORKFLOW.md(§1 角色、§2 工具、§4 全部)
4. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-mental-model-v2.md(调研标准提示词 + 决策证据)
5. D:/Aworker/mozilla/choose-your-country/.scratch/mental-model-v2/report.md(宏观调查报告,痛点与残留风险)
6. D:/Aworker/mozilla/choose-your-country/src/detect/index.ts(闸门与 L3 落点,修改对象)
7. D:/Aworker/mozilla/choose-your-country/src/config.ts(阈值与罚分常量)
8. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/misdetection-root-causes.md(误报样本集与历史防御点)
9. D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/atomcode-industry-models.md(KeePassXC #2184 / Bitwarden visibility 教训)

## 本票 delta

- 检查点一: 闸门只改「注入档位」,不改「检测登记」——隐藏但承载值的原生 select 必须仍可面板填充(视觉替换型站点是正样本)。
- 检查点二: ISO2 成员测试以数据全集为域;共享区号消歧走文本+国家名;占位首项剔除仅作用于计分,不影响填充匹配。
- 检查点三: 与 16 票共享检测文件——开工前确认 16 已完成(Blocked by),基于其代码基座之上修改;冲突一律走 WORKFLOW §4.2 的 resolve 流程。
- 检查点四(16-fix 交接): iti 容器唯一证据防线——CI 实测 .iti 容器内无其它正信号的 input 得 60/lowkey 注入(mm2-neg-itires,expect=none 仍不通过)。防线三选一或组合(16-fix 报告 §5): 容器内 input 除容器分外零正信号时要求最低佐证(type=tel/autocomplete/inputmode/L1 任一)才保留容器分;或容器分单独封顶低于 lowkey 阈;或与 type=tel 组合计分。落地后 dispatch 校准 workflow 重测,若该例转通过则按 appendOnly 翻转 knownResidual 并刷新基线数字。
- 专属验收: issue 内 6 条验收项全部真实执行并留证据(CI run)。
- 完成定义: 遵循上方 issue 内验收清单全部勾选 + 报告落盘。

## 报告

完成后必须写 D:/Aworker/mozilla/choose-your-country/.scratch/architecture-recovery/research/window-reports/13-visibility-l3-hardening-report.md: 变更清单与理由、验收证据(CI run 链接/产物路径)与关键输出、偏离点、未完成/未验证项、给大脑的风险提示。报告未落盘=票未完成。

## Suggested skills

implement(驱动 tdd 收尾 code-review);调研级决断用 atomcode-research(标准提示词见必读第 4 条,串行护栏);版本控制一律遵循 WORKFLOW §4.2;工具约定遵循 WORKFLOW §2。
