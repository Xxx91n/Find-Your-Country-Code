# Cycle-5 程序化比对审计报告

> 生成：大脑 Agent，2026-09-14 | 方法：**程序化逐字段比对，不接受自述一致**

> 对象：30 份工件（issues/36-45、handoffs/36-45、prompts/36-45） ↔ 依据文件（`spec.md` / `decision-ledger.md` / `WORKFLOW.md` / `CONTEXT.md` / `docs/adr/*`）

## §1 逐字段比对（5 字段）

| 字段 | 检查内容 | 结果 |
|------|---------|------|
| **路径引用** | handoff/prompt 中所有绝对路径 `fs.existsSync`；handoff 必须引用本票 issue；prompt 必须引用本票 handoff | ✅ 0 不一致（修复后） |
| **标题** | issue `# NN: T` = handoff `# Handoff NN — T` = prompt `# 启动器 NN — T` | ✅ 10/10 三者逐字相同 |
| **需求原文** | 声明的 A-id 均存在且 `current`；A 集 issue=handoff=prompt；ledger 去向表与 spec 去向表均指向本票 | ✅ 0 不一致 |
| **阻塞边** | Blocked by 文本与 id 集合互不矛盾；无环；推导波次 = README 波次 | ✅ 0 不一致 |
| **验收清单** | 每票 AC ≥1；handoff delta = prompt delta（逐字） | ✅ 0 不一致 |

## §2 合规检查（2 维）

### 2.1 禁止模式引入

扫描对象：prompts + handoffs + issues（30 份全文）

| 模式 | 命中 |
|------|------|
| `worktree` | 0 |
| 裸 git 写命令（`git add/commit/push/pull/merge/rebase/stash/cherry-pick/reset/rm/mv/checkout/branch`） | 0 |
| `force-push` / `--force` | 0 |
| `rm -rf` | 0 |
| `git config` 写 | 0 |

### 2.2 复述上游条款

方法：把 `WORKFLOW.md` / `spec.md` / `decision-ledger.md` / `CONTEXT.md` 中长度 ≥25 字符的行集作为上游行集；检查 prompt 的非 delta 行与 handoff 的非「通用调研要求」行是否逐字命中上游。

| 对象 | 逐字命中上游行 |
|------|----------------|
| prompts（非 delta 行） | 0 |
| handoffs（非调研要求块） | 0 |

即：版本控制只以 `遵循 WORKFLOW §4.2` 引用，完成定义只存在于 handoff，通用调研要求只在 handoff 出现一次——启动器零复述。

## §3 三段覆盖检查

| 段 | 等式 | 结果 |
|----|------|------|
| **段 1** | spec 声明的 A-xxx 并集 = decision-ledger 全部 current 记录 | ✅ 15 = 15，双向差集为空 |
| **段 2** | 票声明的 A-xxx 并集 = spec 声明的全集 | ✅ 15 = 15，双向差集为空 |
| **段 3** | 无孤票 A（ledger current 但无票）、无越界 A（票声明非 current） | ✅ 0 / 0 |

实际集合（两段逐项相同）：

`A-011 A-012 A-013 A-014 A-015 A-016 A-017 A-018 A-019 A-020 A-021 A-022 A-023 A-024 A-025`

**三段均无缺漏 → 不触发停下呈报条件。**

## §4 审核发现与修复记录

### 4.1 工件缺陷（已修复）

| # | 缺陷 | 影响面 | 修复 |
|---|------|--------|------|
| **D-1** | 10 份启动器的「必读清单」**缺少本票 handoff 路径**（只有 issue/spec/WORKFLOW/decision-ledger/ADR），违反启动器硬规则 1（清单应含 handoff）与硬规则 5（启动器须引用 handoff 路径） | prompts/36–45（全部 10 份） | 已在每份「必读」首位插入本票 handoff 绝对路径；重检 0 命中 |

### 4.2 审计器自身修正（诚实披露：审计器也会产生幻觉）

| # | 误报 | 根因 | 处置 |
|---|------|------|------|
| **H-1** | 首轮报 20 条「路径缺失」 | 路径正则误写为 `D:\\`（要求两个反斜杠），实际文件为 `D:`；**先做正则 sanity 探针后确认是审计器误报，非工件缺陷** | 改用 `D:\`（单反斜杠）后误报清零 |
| **H-2** | 首轮报 2 条波次不符（41→W2、45→W3） | 阻塞边解析器用 `/票 (d+)/` 只捕获首个编号，而 issue 文本为「票 36,37,38,39,40,42,43,44」 | 改为提取该行全部 `\b(3[6-9]|4[0-5])\b`；重导波次与 README 完全一致（0 不符） |

**结论：首轮 26 条告警中，真实工件缺陷仅 10 条（D-1），其余 16 条为审计器误报。** 两处误报均已在确认前修正，未污染结论。

## §5 结论

- 逐字段不一致：**0**
- 合规命中（2 维）：**0**
- 覆盖缺漏（3 段）：**0**

**审计通过。** 30 份工件与依据文件一致；无禁止模式；无上游复述；三段覆盖闭合。

## §6 执行指引（窗口启动器完整路径）

### 修复顺序 / 并行指示（由 Blocked by 推导）


**W1**（六票全并行，互不堆叠）

- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\36-gate-integrity-repair.md` — 票 36（A-014, A-015, A-020）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\37-entry-point-accessibility.md` — 票 37（A-012, A-013）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\40-frame-governance-degradation.md` — 票 40（A-017）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\42-locale-switch.md` — 票 42（A-019）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\43-dependency-peer-rootfix.md` — 票 43（A-021）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\44-detection-semantics-adjudication.md` — 票 44（A-022, A-023）

**W2**

- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\38-distribution-last-mile.md` — 票 38（A-011）  ← 需先完成票 36
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\39-real-site-enablement.md` — 票 39（A-016）  ← 需先完成票 40

**W3**

- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\41-process-evidence-archive.md` — 票 41（A-018）  ← 需先完成票 36,37,38,39,40,42,43,44

**W4**

- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\45-repo-process-closeout.md` — 票 45（A-024, A-025）  ← 需先完成票 41

### 单票启动器路径（完整）

| 票 | 覆盖 A | 启动器完整路径 |
|----|--------|----------------|
| 36 | A-014, A-015, A-020 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\36-gate-integrity-repair.md` |
| 37 | A-012, A-013 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\37-entry-point-accessibility.md` |
| 38 | A-011 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\38-distribution-last-mile.md` |
| 39 | A-016 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\39-real-site-enablement.md` |
| 40 | A-017 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\40-frame-governance-degradation.md` |
| 41 | A-018 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\41-process-evidence-archive.md` |
| 42 | A-019 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\42-locale-switch.md` |
| 43 | A-021 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\43-dependency-peer-rootfix.md` |
| 44 | A-022, A-023 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\44-detection-semantics-adjudication.md` |
| 45 | A-024, A-025 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\45-repo-process-closeout.md` |

**并行指示**：W1 六票可同时开窗（36/37/40/42/43/44）；W2 两票（38 待 36、 39 待 40）；W3 单票（41 待 W1+W2 全部）；W4 单票（45 待 41）。同波互不堆叠，版本控制遵循 WORKFLOW §4.2。
