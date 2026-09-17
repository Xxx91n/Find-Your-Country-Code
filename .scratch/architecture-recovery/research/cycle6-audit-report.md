# Cycle-6 程序化比对审计报告

> 生成：大脑 Agent，2026-09-16 | 方法：**程序化逐字段比对，不接受自述一致**
> 对象：27 份工件（issues/01-09、handoffs/01-09、prompts/01-09）↔ 依据（spec.md / decision-ledger.md / WORKFLOW.md / .scratch/cycle6-grill/decision-ledger.md）

---

> ## ⚠️ 时点横幅 — 本报告已被取代（superseded）
>
> - **时点**：本报告是 **2026-09-16**（Cycle-6 收口时）的**时点快照**，结论仅对该时点成立。
> - **最新权威结论**：`.scratch/cycle7-grill/decision-ledger.md`（D-001…D-019，**19/19 current**）与 `.scratch/cycle7-grill/spec.md`；两者优先于本报告，冲突时以它们为准。
> - **superseded-by**：`.scratch/cycle7-grill/decision-ledger.md` · `.scratch/cycle7-grill/spec.md`
> - **superseded-on**：2026-09-17
> - **status**：`superseded`（历史留痕）
> - **保留声明**：本文件为审计留痕，**不得删除、不得改写正文**；以下 §1 起全部内容保持 2026-09-16 原样。
> - **ADR 指针**：已在整理环节落文，本报告不重复维护。

## §1 逐字段比对（5 字段）

| 字段 | 检查内容 | 结果 |
|------|---------|------|
| **路径引用** | 所有绝对路径 fs.existsSync；handoff 必须引用本票 issue；prompt 必须引用本票 handoff | ✅ 0 不一致 |
| **标题** | issue 标题 = handoff 标题 = prompt 标题 | ✅ 9/9 三者逐字相同 |
| **需求原文** | 声明的 A-id 均存在且为 live；A 集 issue=handoff=prompt | ✅ 0 不一致 |
| **阻塞边** | Blocked by 文本与 id 集合互不矛盾；无环；推导波次 = README 波次 | ✅ 0 不一致（W1–W6 逐波完全相等） |
| **验收清单** | 每票 AC ≥1；handoff delta = prompt delta | ✅ 0 不一致 |

## §2 合规检查（2 维）

### 2.1 禁止模式引入

扫描对象：prompts + handoffs + issues（27 份全文）

| 模式 | 命中 |
|------|------|
| worktree | 0 |
| 裸 git 写命令（add/commit/push/pull/merge/rebase/stash/cherry-pick/reset/rm/mv/checkout/branch） | 0 |
| force-push / --force | 0 |
| rm -rf | 0 |
| git config | 0 |

### 2.2 复述上游条款

方法：把 spec.md / decision-ledger.md / WORKFLOW.md / cycle6-grill/decision-ledger.md 中长度 ≥25 字符的行集作上游行集；检查 prompt 的非 delta 行与 handoff 的非「通用调研要求」行是否逐字命中上游。
（已排除两类合法引用行：prompt 内的「遵循 handoff 内的完成定义」/「遵循 WORKFLOW §4.2」；handoff 内的调研要求块。）

| 对象 | 逐字命中上游行 |
|------|----------------|
| prompts（非 delta 行） | 0 |
| handoffs（非调研要求块） | 0 |

## §3 三段覆盖检查

| 段 | 等式 | 结果 |
|----|------|------|
| **段 1** | spec 声明的 A-xxx 并集 = decision-ledger 全部 **current** 记录 | ⚠️ **见 §3.1 口径说明** |
| **段 1b** | A 台账去向表 = spec 正文声明 | ✅ 8 = 8，双向差集为空 |
| **段 2** | 票声明的 A-xxx 并集 = spec 声明的全集 | ✅ 8 = 8，双向差集为空 |
| **段 3** | 无孤票 A（live 但无票）、无越界 A（票声明非 live） | ✅ 0 / 0 |

实际集合（段 1b/2/3 逐项相同）：`A-026 A-027 A-028 A-029 A-030 A-031 A-032 A-033`

### 3.1 段 1 口径说明（**非缺漏，但必须显式裁定**）

- A 台账 **current** 严格集 = `A-027 A-028 A-029 A-030 A-031 A-032 A-033`（**7 条**）。
- spec 声明集 = 上述 7 条 **+ A-026**（共 **8 条**）。
- A-026 的状态是 `revised`（其「设置视图独立」「语言控件前置」两条被 D-010 取消，但「GM 菜单新增设置项」一条**仍生效**，因此仍需一张票——票 02）。
- 即：严格按「全部 current」读，spec 多出一条 A-026；按「live（current + 保留条款的 revised）」读，**8 = 8 完全相等**。
- **结论：段 1 在 live 口径下 PASS；严格 current 口径下存在 1 条越出，原因已明且已落账，不视为缺漏。** 若你要求严格口径（把 A-026 从 spec 声明集移出），则票 02 将失去其 A 声明依据——**请裁定。**

## §4 审核器自身修正（诚实披露：审计器也会产生幻觉）

| # | 误报 | 根因 | 处置 |
|----|------|------|------|
| **H-1** | 首轮报 A-031/A-032 **不在 current 集**（显示 current=5 而非 7） | 审计器用 `split("|")` 取第 6 列作状态；而 A-031 文本含字面 `AC|Ascension Island +247`、A-032 含 `select2|chosen`，字面管道符把列位打偏 | 改为取**倒数第二列**（状态恒为末列）→ current 正确回到 7 条；**数据无错，审计器有错** |

**结论：本次审计首轮仅 1 条告警，且已确认为审计器误报；工件侧 0 缺陷。** 该误报在出具结论前修正，未污染结果。

## §5 结论

- 逐字段不一致：**0**
- 合规命中（2 维）：**0**
- 覆盖缺漏（3 段）：**0**（段 1 有 1 条已说明的口径越出，见 §3.1）
- 波次推导与 README：**逐波完全相等**（W1=01,02,03,04 · W2=05 · W3=06 · W4=07 · W5=08 · W6=09）

**审计通过，无工件需返工。**

## §6 执行指引（窗口启动器完整路径 + 修复顺序/并行指示）

### 波次与并行指示（由 issue Blocked by 推导）

**W1**（4 票可同时开窗，互不堆叠）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\01-acceptance-surface-and-ladder.md` — 票 01（A-029 · A-030）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\02-settings-surface.md` — 票 02（A-026 · A-027）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\03-diagnostics-surface.md` — 票 03（A-028）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\04-domain-modeling.md` — 票 04（A-033）

**W2**（单票）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\05-harness-primitives.md` — 票 05（A-029）

**W3**（单票）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\06-form-corpus.md` — 票 06（A-030）

**W4**（单票）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\07-real-site-and-release-gate.md` — 票 07（A-029）

**W5**（单票）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\08-phase-b-failure-fixes.md` — 票 08（A-031 · A-032）

**W6**（单票）
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\09-cycle6-closeout.md` — 票 09（（无；收口层））

### 单票启动器路径（完整）

| 票 | 标题 | 覆盖 A-xxx | 启动器完整路径 |
|----|------|-----------|----------------|
| 01 | 验收面与断言阶梯定义 | A-029 · A-030 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\01-acceptance-surface-and-ladder.md` |
| 02 | 设置面收口 | A-026 · A-027 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\02-settings-surface.md` |
| 03 | 诊断面 | A-028 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\03-diagnostics-surface.md` |
| 04 | 域建模：发布门 ADR + CONTEXT 术语 | A-033 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\04-domain-modeling.md` |
| 05 | harness 交互原语 | A-029 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\05-harness-primitives.md` |
| 06 | 形态语料三层架构 | A-030 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\06-form-corpus.md` |
| 07 | 真实站点层全阶梯 + 发布门 | A-029 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\07-real-site-and-release-gate.md` |
| 08 | 阶段 B：失效驱动修复 | A-031 · A-032 | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\08-phase-b-failure-fixes.md` |
| 09 | Cycle-6 收口 | （无；收口层） | `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\prompts\09-cycle6-closeout.md` |

**修复顺序**：**无工件需返工**（审计 0 缺陷），因此无修复轮次。

**并行指示**：W1 四票（01/02/03/04）可同时开窗；W2–W6 为线性链（05←01、06←05、07←06、08←07、09←01–08）。同波互不堆叠，版本控制遵循 WORKFLOW §4.2。
