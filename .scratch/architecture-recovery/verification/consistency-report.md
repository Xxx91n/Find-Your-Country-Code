# 程序化验收报告（consistency-report）

> 生成：2026-09-03 | 工具：`research/scripts/verify-artifacts.mjs`（node）| 结论：**CONSISTENT（258 项检查，0 问题）**
> 复跑命令：`node D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\scripts\verify-artifacts.mjs`（退出码 0=一致 / 1=不一致）

## 比对覆盖（逐字段）

| 维度 | 检查内容 | 结果 |
|---|---|---|
| 路径引用 | prompts+handoffs 内全部 `D:\...` 绝对路径可解析（window-reports 前向引用单列 NOTE，12 处，属实施期产物约定） | PASS |
| 标题/票号 | issue 首行标题 ↔ 票据表 ↔ handoff 标题 ↔ prompt 票号一致 | PASS |
| 阻塞边 | issue `Blocked by` ↔ 内部票据表 ↔ prompt 开工句声明 ↔ README 波次推导（01=W1；02/03/06=W2；04/05/09=W3；07/08=W4；10=W5）四方一致 | PASS |
| 验收清单 | 每票 ≥3 条验收项（10 票共 45 条） | PASS |
| 必读锚定 | 每份 prompt 必读清单含自身 handoff+issue 绝对路径并引用 WORKFLOW.md | PASS |
| 报告要求 | 每份 prompt 含对应 window-reports/NN-slug-report.md 落盘要求 | PASS |
| 合规① | 10 份 prompts 无 `worktree` / `git checkout` / `git branch` 违禁词；无裸 git 写命令 | PASS |
| 合规② | 复述检查：prompt 语句未整句复述 spec/WORKFLOW 上游条款（≥25 字句子双向包含检测） | PASS |
| 行数限制 | 每份 prompt ≤60 行 | PASS |
| 波次表 | README 波次表行数=10，逐行与推导波次一致 | PASS |
| 上游产物 | spec/WORKFLOW/README/报告×2/调研×5/skills-digest 存在且章节完整（to-spec 三章节、WORKFLOW §4.2+裁决规则+偏离点清单） | PASS |

## 首轮曾发现并已修复的真实缺陷

1. prompt 01 开工句把"01"与"Blocked by"同句造成歧义 → 已改写为"本票无阻塞，是首票"。
2. README 波次表行格式与推导波次逐行核对 → 已通过（首轮即一致，为脚本解析缺陷）。

## 残留风险（如实声明）

- 违禁词/复述检查基于正则与句子包含匹配，无法覆盖语义级复述；建议用户抽查 2-3 份 prompts 复核。
- "复述检查"若未来 prompt 加入长引用（如粘贴 spec 段落）会误报/漏报，届时调整阈值。
- window-reports 为前向引用：实施期若子窗口未落盘报告，波次推进核对（WORKFLOW §4.3）会拦截。
