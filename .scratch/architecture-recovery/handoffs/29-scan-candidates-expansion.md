# Handoff 29 — 扫描候选集扩展

> Cycle-4 | 票: issues/29-scan-candidates-expansion.md | 覆盖 A-003（摩擦点原文与显式约束见 decision-ledger.md，此处不复制）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\29-scan-candidates-expansion.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md`
- `D:\Aworker\mozilla\choose-your-country\CONTEXT.md`

**通用调研要求（本票适用，Cycle-4 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0006）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。

**本票 Delta（issue 验收项之外的检查点）:**
- 复现先行：无 `role=combobox` 的 div+ul 下拉完全不在 SCAN_SELECTORS 候选面内。
- 扩展路线调研后定：结构启发式（div/button 邻接 ul / option 类名特征）进候选，仍走 scoreElement 全瀑布——禁止直接加裸 `ul li` 类选择器（候选爆炸 + 误报风险）。
- 档位上限：非原生形态新候选遵守 ADR-0005 登记不注入；证据强到走正常瀑布的形态按既有分档行动。
- 性能红线：候选集扩大后 1000 节点 scan < 350ms（`RESCAN_DEBOUNCE_MS`）须复测，报告附 `__cchPerfHook` 实测数据。
- 指纹一致性：观测属性新增时 `_fingerprint` 与 `OBSERVED_ATTRS` 同步（observer 监听面 = 指纹读取面）。

**完成定义:** issue 全部验收项勾销并各附 commit sha + CI run ID；报告落 `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\29-scan-candidates-expansion-report.md`；GitButler 分支 `cch/29-scan-candidates-expansion`，版本控制遵循 WORKFLOW §4.2。