# 程序化比对报告(心智模型 v2 周期)

> 生成: 2026-09-05 | 脚本: research/scripts/mmv2-crosscheck.mjs(可重复运行)
> 比对对象: 9 issues + 9 handoffs + 9 prompts <-> spec.md / WORKFLOW.md 逐字段
[OK]   title triplet consistent: 11-mental-model-docs
[OK]   title triplet consistent: 12-iframe-governance
[OK]   title triplet consistent: 13-visibility-l3-hardening
[OK]   title triplet consistent: 14-calibration-corpus
[OK]   title triplet consistent: 15-react19-fill-probe
[OK]   title triplet consistent: 16-scoring-consistency
[OK]   title triplet consistent: 17-pseudo-select-forensics
[OK]   title triplet consistent: 18-pseudo-select-e2e
[OK]   title triplet consistent: 19-release-links
[OK]   blocking edge consistent: 11-mental-model-docs (none)
[OK]   blocking edge consistent: 12-iframe-governance (none)
[OK]   blocking edge consistent: 13-visibility-l3-hardening [16]
[OK]   handoff 13-visibility-l3-hardening mentions all 1 blockers
[OK]   blocking edge consistent: 14-calibration-corpus (none)
[OK]   blocking edge consistent: 15-react19-fill-probe (none)
[OK]   blocking edge consistent: 16-scoring-consistency (none)
[OK]   blocking edge consistent: 17-pseudo-select-forensics (none)
[OK]   blocking edge consistent: 18-pseudo-select-e2e [13,16,17]
[OK]   handoff 18-pseudo-select-e2e mentions all 3 blockers
[OK]   blocking edge consistent: 19-release-links [12,13,14,15,16,18]
[OK]   handoff 19-release-links mentions all 6 blockers
[OK]   acceptance count consistent: 11-mental-model-docs (4)
[OK]   acceptance count consistent: 12-iframe-governance (5)
[OK]   acceptance count consistent: 13-visibility-l3-hardening (6)
[OK]   acceptance count consistent: 14-calibration-corpus (5)
[OK]   acceptance count consistent: 15-react19-fill-probe (5)
[OK]   acceptance count consistent: 16-scoring-consistency (4)
[OK]   acceptance count consistent: 17-pseudo-select-forensics (5)
[OK]   acceptance count consistent: 18-pseudo-select-e2e (5)
[OK]   acceptance count consistent: 19-release-links (5)
[OK]   spec covers domains of 11-mental-model-docs: 心智模型/术语
[OK]   spec covers domains of 12-iframe-governance: iframe/帧
[OK]   spec covers domains of 13-visibility-l3-hardening: 可见性/ISO2/共享区号/占位
[OK]   spec covers domains of 14-calibration-corpus: 语料/基线/标定
[OK]   spec covers domains of 15-react19-fill-probe: React 19/valueTracker
[OK]   spec covers domains of 16-scoring-consistency: iti/常量/罚分
[OK]   spec covers domains of 17-pseudo-select-forensics: 取证/ADR-0005
[OK]   spec covers domains of 18-pseudo-select-e2e: combobox/伪 select
[OK]   spec covers domains of 19-release-links: 发布/下载链接
[OK]   spec decision has owner: 帧治理 -> 12-iframe-governance
[OK]   spec decision has owner: 可见性闸门 -> 13-visibility-l3-hardening
[OK]   spec decision has owner: L3 内容验证加码 -> 13-visibility-l3-hardening
[OK]   spec decision has owner: React 19 -> 15-react19-fill-probe
[OK]   spec decision has owner: 评分一致性 -> 16-scoring-consistency
[OK]   spec decision has owner: 校准语料 -> 14-calibration-corpus
[OK]   spec decision has owner: 伪 select -> 17-pseudo-select-forensics,18-pseudo-select-e2e
[OK]   spec decision has owner: 术语 -> 11-mental-model-docs
[OK]   Out of Scope terms absent from all 9 issues
[OK]   read-list paths identical: 11-mental-model-docs (9)
[OK]   report path identical: 11-mental-model-docs
[OK]   read-list paths identical: 12-iframe-governance (9)
[OK]   report path identical: 12-iframe-governance
[OK]   read-list paths identical: 13-visibility-l3-hardening (9)
[OK]   report path identical: 13-visibility-l3-hardening
[OK]   read-list paths identical: 14-calibration-corpus (8)
[OK]   report path identical: 14-calibration-corpus
[OK]   read-list paths identical: 15-react19-fill-probe (8)
[OK]   report path identical: 15-react19-fill-probe
[OK]   read-list paths identical: 16-scoring-consistency (8)
[OK]   report path identical: 16-scoring-consistency
[OK]   read-list paths identical: 17-pseudo-select-forensics (7)
[OK]   report path identical: 17-pseudo-select-forensics
[OK]   read-list paths identical: 18-pseudo-select-e2e (8)
[OK]   report path identical: 18-pseudo-select-e2e
[OK]   read-list paths identical: 19-release-links (8)
[OK]   report path identical: 19-release-links
[OK]   spec reference resolves: .scratch/mental-model-v2/report.md
[OK]   spec reference resolves: research/atomcode-mental-model-v2.md
[OK]   spec reference resolves: spec-cycle-v1.4.0-2026-09.md
[OK]   spec reference resolves: .scratch/architecture-recovery/README.md
[OK]   no absolute paths in issues
[OK]   forbidden-pattern scan: 27 files clean (git verbs + worktree)
[OK]   restatement checks complete
