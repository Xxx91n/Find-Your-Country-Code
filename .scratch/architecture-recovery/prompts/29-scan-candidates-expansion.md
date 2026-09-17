# Prompt 29 — 扫描候选集扩展

身份：Cycle-4 实施窗口，票 29 `scan-candidates-expansion`（覆盖 A-003）。

## 必读文件（开工前完整阅读）

1. handoff: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\29-scan-candidates-expansion.md` — 通用调研要求与完成定义以本文为准
2. issue: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\29-scan-candidates-expansion.md`
3. spec: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
4. WORKFLOW: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md` — 版本控制遵循 §4.2
5. decision-ledger: `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md` — 看 A-003 条目
6. `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`（SCAN_SELECTORS / _deepRoots）与 `D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md`

## 本票 Delta（检查点与专属验收项）

- 先留复现证据：无 `role=combobox` 的 div+ul 自定义下拉完全不在候选面内。
- 路线纪律：先 atomcode 调研行业做法再定；结构启发式候选必须仍走 scoreElement 全瀑布；禁止裸 `ul li` 类宽选择器（候选爆炸）。
- 档位上限：新形态遵守 ADR-0005 登记不注入；证据强者按既有分档行动。
- 性能：1000 节点 scan < 350ms 复测，报告附 `__cchPerfHook` 实测数据。
- 指纹一致性：观测属性新增时 `_fingerprint` 与 `OBSERVED_ATTRS` 同步。
- 专属验收：E2E 全绿，证据锚 commit sha + CI run ID。

## 开工第一句

先复述本票阻塞关系（Blocked by: 32 — 需无 ARIA 自定义下拉真实形态语料已入模式库）与上述必读文件清单，确认无误后再动手。

## 收尾

完成定义遵循 handoff 内完成定义。报告落盘：
`D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\29-scan-candidates-expansion-report.md`