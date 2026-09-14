# Cycle-5 启动器自检报告（launcher-selfcheck）

> 生成：大脑 Agent，2026-09-14（**审计后重修**：D-1 修复后重跑）| 对象：prompts/36…45（10 份）+ handoffs/36…45（10 份）

## 硬规则校验结果

| 启动器 | 行数(≤60) | 违禁词 | 复述上游 | handoff 调研要求 | 引用本票 handoff | handoff 引用本票 issue | 路径可解析 | 声明 A-xxx | 结论 |
|--------|-----------|--------|----------|------------------|------------------|-----------------------|-----------|-------------|------|
| 36-gate-integrity-repair | 23 | 0 | 0 | 1 | ✓ | ✓ | 7/7 | I:✓ H:✓ | **PASS** |
| 37-entry-point-accessibility | 22 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |
| 38-distribution-last-mile | 22 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |
| 39-real-site-enablement | 21 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |
| 40-frame-governance-degradation | 21 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |
| 41-process-evidence-archive | 21 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |
| 42-locale-switch | 20 | 0 | 0 | 1 | ✓ | ✓ | 5/5 | I:✓ H:✓ | **PASS** |
| 43-dependency-peer-rootfix | 22 | 0 | 0 | 1 | ✓ | ✓ | 7/7 | I:✓ H:✓ | **PASS** |
| 44-detection-semantics-adjudication | 24 | 0 | 0 | 1 | ✓ | ✓ | 8/8 | I:✓ H:✓ | **PASS** |
| 45-repo-process-closeout | 21 | 0 | 0 | 1 | ✓ | ✓ | 6/6 | I:✓ H:✓ | **PASS** |

失败数：**0/10**（全部 PASS）

---

> 程序化比对审计见 `research/cycle5-audit-report.md`（逐字段 + 2 维合规 + 3 段覆盖）。
