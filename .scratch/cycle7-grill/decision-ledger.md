# Decision Ledger — Cycle-7 Grill（逐题台账）

> 用途：grill 过程中**每一条被用户确认的实质性结论**当场落盘，不依赖对话记忆。
> 生成：2026-09-17｜基线：origin/main = a93cb3a8（v1.7.0）｜分支：cch/16-cycle7-grill
> 上游：`.scratch/architecture-recovery/handoffs/50-cycle6-round-closeout.md`（交接）＋ `test-results/锐.txt`（Round-4 锐评，已逐条实物核验）
> 机制：ID 自 D-001 起递增（与 `.scratch/cycle6-grill/decision-ledger.md` 的 D-001…D-016 隔离）；每条含【原问题／用户原回答原文／规范化需求／显式约束与负向需求／状态】。
> 状态取值：`current`（已确认生效）／`revised`（被后续回答修订）／`stale`（被证伪或废弃）／`deferred`（登记在案，本周期不做）。
> 硬规则：**结论不许只活在对话里**；触发任何压缩／compact／handoff 动作前，先确认本台账已落盘到最新。
> 调研存档：`.scratch/cycle7-grill/research/q2-industry-benchmark.md`（atomcode，10 条来源）

---

## 台账

| ID | 原问题 | 用户原回答原文 | 规范化需求 | 显式约束 / 负向需求 | 状态 |
|----|--------|---------------|-----------|--------------------|------|
| **D-001** | Q1 — 本轮的落点是什么：这次 grill 要固化的「目标函数」是哪一类？(A) 收口债清账（锐评 5 工单 + backlog B-5…B-15 + 化石清单，逐条裁定立票/不立票/登记）／ (B) 检测与功能面再扩张 ／ (C) 架构恢复新一轮 ／ (D) 其他 | `A+B` | 本轮**同时**推进两条线：**（A）收口债清账** —— 把锐评 Round-4 的 5 条工单 ＋ backlog `B-5…B-15` ＋ 化石清单作为本轮工作集，逐条裁定「立票／不立票／登记」；**（B）检测与功能面再扩张** —— 在既有语料与 ADR 裁决口上推进检测／功能能力扩张。 | **① 排除 (C)**：不新开 `improve-codebase-architecture` 宏观调查周期（用户以 A+B 覆盖 C）。**② 用户标准约束（贯穿本轮 grill）**：grill 期间不动手修源码、不设定其他目标。**③ A 侧边界**：清账为仓库层／文档层动作，**不得夹带业务行为变更**（行为变更须另立票并走语料先行）。**④ B 侧边界**：扩张不得越过既有纪律（语料先行／无地基不立检测票／ADR-0005 登记不注入的档位约束／CONTEXT.md 7 术语上限 D-013）。 | current |
| **D-002** | Q2① — 锐评「把 GF 渠道变成要么自动、要么弃用」如何处置？（经 atomcode 行业对标调研） | `采纳` | 立「GF 送达链诊断与收口」票，口径四条：① **第一动作自查 GF 侧 sync 配置**（若从未配置 `sync_identifier`，GF 静止属**预期行为而非故障**，补齐即可、**不切 `--strict` 红灯**）；② 源仓 README ＋ GF 脚本页加「唯一权威渠道」声明；③ 保留拉取式同步兜底；④ 不建自建 push hack。 | 不得设计任何 CI 主动写 GF 的步骤（**A-011 不变**）；不得自建需伪造 session cookie 的推送 hack；不得据此宣布弃用 GF 渠道（除非另行裁定）；声明属文档层，**不得夹带业务行为变更**（D-001③）；B-6（`gf-alignment-check.yml` 未声明 `pull_request`）仍须按 ADR-0006 条款 2 单独裁定，**不得以本口径默认豁免**。 | current |
| **D-003** | Q2② — 锐评「摘 7 面 `knownResidual` 旗」如何处置？ | `采纳` | ① 摘 7 面旗（`rs-weak-input-name` / `-placeholder` / `-dialcode` / `-placeholder-dial` / `-snake`、`rs-iso2-paren-select`、`ce-dial-positive`）；② 为每条豁免补 `owner` / `reviewBy` / `reason` 三字段元数据；③ 新增 **CI lint 门**校验豁免必带三字段（缺则 CI 红）；④ 到期**必须重新裁定**：摘旗（翻转 `knownResidual`）或续期（更新 `reviewBy`）。 | **禁止物理删除语料条目**（ADR-0008 决策 4 append-only ＋ manifest `appendOnlyRule`）——到期以**状态位翻转替代删除**；不得重写既有条目语义；不得借摘旗降低断言强度；摘旗后须以 calibration 复验 precision/recall 基线不回退、ADR-0009 冻结档位不变；三字段属**机制**，不入 CONTEXT.md 术语表（D-009／D-013 纪律）。 | current |
| **D-004** | Q2④ — 锐评「workflow 合并同类项（30 → 个位数）＋ 删死触发分支」如何处置？ | `采纳` | ① **删除数量 KPI**（不设「个位数」目标）；② 21 个票级 verify workflow 合并为 **1 个 `workflow_call` reusable**（票号作 input）；③ 死触发按**分支生命周期**清理（现确认 ≥2：`verify-13.yml:10` → `cch/13-visibility-l3-hardening`；`verify-05-harness.yml:11` → `cch/05-harness-primitives`）；④ `verify-30.yml` **正名**（现跑 `verify-ticket-05.mjs`）；⑤ 非票级 workflow 按「独立触发／独立 owner／独立门控语义」保留。 | 不得丢失任何票级回归覆盖（**A-008／A-015**）；合并后须**逐门复跑绿**；ADR-0006 条款 1（脚本入 `tests/scripts/`、workflow 禁引 `.scratch/`）与条款 2（非发版 workflow 必声明 `pull_request`）不得被削弱——reusable workflow 本身以 `workflow_call` 定义、`pull_request` 由**调用方**声明。 | current |
| **D-005** | Q2⑤ — 锐评「化石清单一次扫清（8 项）」如何处置？ | `采纳` | **甲级（零行为变更，本轮可做）**：`config.ts:13` 算术快照注释→**删除而非更新**；`fill:253` 注释；`i18n.ts` 去掉 Unicode 反斜杠转义书写（32 处）；`types.ts` `AnyEl` 交叉逃逸→类型守卫收窄；`ui:880` HTML 拼接→**加防御性注释**（不重构）。**乙级（行为／安全变更，须另立票并语料先行）**：`ui:417-421` 群体召唤语义；`detect:823` `getComputedStyle` 入指纹的性能；`countries.ts` 补 Kosovo（XK／+383）与 Vatican（VA／+379）——属 **data gap**，补断言防再犯。 | **HTML 拼接不按安全债处理**（OWASP 判据＝数据可信度；纯静态常量属 not untrusted data，不构成 XSS）；类型修复须 **types-only**（ADR-0006 条款 3）；甲级不得改变运行时行为；乙级**不得混入甲级票**；语料先行（无地基不立检测票）。 | current |

---

## 一致性对撞明细（D-001 逐条 · 2026-09-17 Q2 调研）

| D-001 约束 | 对撞结果 |
|---|---|
| ① 排除 (C) 架构恢复 | 无涉；研究未引入宏观调查需求 |
| ② grill 期间不动源码／不设其他目标 | 一致；本轮仅落账本与调研存档，未动 `src/` |
| ③ A 侧不夹带业务行为变更 | 一致；研究要求的 CI lint 门／文档声明属仓库层；静态数据补全已归入乙级另立票 |
| ④ B 侧不越既有纪律（语料先行／无地基不立检测票／ADR-0005 档位／D-013 七术语上限） | 一致；研究⑤ 的五项心智模型均为**机制**（lint 门、折旧表、backlog 共享），按 D-009／D-013 纪律**不入 CONTEXT.md 术语表**，故不触 7 条上限 |

**结论：与 `current` 记录无冲突 ⇒ 未触发 `revised` 机制，本轮无 D-xxx 被标记为 revised。**

### 与已 accepted ADR／既有纪律的实质张力（已登记，未静默采纳）

- **张力①**：调研的「到期自动删除」↔ **ADR-0008 决策 4**（语料 append-only、漂移即 CI 红）＋ manifest `appendOnlyRule` ＋ **ADR-0009** 冻结档位断言。→ 由 D-003 以「**状态位翻转替代删除**」合成解决。
- **张力②**：锐评「30 → 个位数」↔ **A-008／A-015**（不得丢失票级回归覆盖）＋ **ADR-0006 条款 1/2**。→ 由 D-004 **删除数量 KPI** 解决。

---

## 待拍板（pending · Q3 调研结论已出、未生效）

> 本区条目**不进入**上方台账（台账只收用户已确认的结论）；用户拍板后转入台账并置 `current`。
> 对撞结果：本批调研与 `current` 记录 **D-001…D-005 无冲突**；与 **ADR-0006 条款 2** 存在 1 处实质张力（见 D-007）。
> 调研存档：`.scratch/cycle7-grill/research/q3-process-doc-debt-benchmark.md`（17 条来源）。

| ID | 议题 | 调研口径（工业界） | 与既有记录的张力 | 我的合成建议 | 状态 |
|----|------|-------------------|------------------|-------------|------|
| **D-006** | 验收文档与代码脱节（B-5） | 机器可校验的**单一事实源**；**选择器契约**（`data-testid`）＋ **CI lint** 校验文档中的事实断言（选择器存在性、计数）。分歧：手写文档派 vs 生成派，小项目折中＝手写文档 + 事实断言 CI 校验 | 无 current 冲突；与 **D-003**（CI lint 门）同向；须与 **D-004**（删数量 KPI、合并 workflow）协调——新门应**折叠进既有 workflow**，不新增文件 | 立票（甲级·文档）：① 修正 `#cch-locale-tg`（`:55`／`:172`）→ `#cch-locale-row` / `.cch-locale-seg` / `.cch-locale-opt[data-locale]`；② 修正 `:174`「菜单 2 条」→ **4 条**；③ **新增 doc-facts lint 脚本**（`tests/scripts/`）校验文档中出现的 `#cch-*` / `.cch-*` 选择器均存在于 `src/`、菜单命令计数与 `main.ts` 一致；④ 该 job 折叠进既有门禁 workflow | pending |
| **D-007** | CI 门控范围（B-6） | **gate / monitor 四判据**：结果是否随 PR 内容变化 / 信号源是否确定 / 失败是否作者可行动 / 消费方式（阻塞 vs 报警）；第三方实时状态 monitor **应移出 `pull_request`**，scheduled + allowed-to-fail。**无实质分歧** | **张力③**：**ADR-0006 条款 2** 字面要求「所有非发版 workflow 必声明 `pull_request:`」，例外仅 `release.yml`／`release-dry-run.yml` | **不补触发面**，改为在 ADR-0006 条款 2 增加「**monitor 类例外**」并登记 `gf-alignment-check.yml`，附四判据表；**与 D-002 联动**（若 D-002 自查后停用该 workflow，本条随之关闭） | pending |
| **D-008** | 墙钟绝对阈值门（B-8） | 禁止**裸绝对阈值**进 gate；改**相对比较**（同 CI 环境基线 ± 统计边界）或移入非阻塞性能作业；保留则用宽松烟雾阈值（如 < 500ms）+ CI 专用基线。**研究明确定性本仓 50ms 门为「标定失败」**（实测裕度仅约 30%，低于噪音波动）。分歧：绝对阈值是否可作烟雾底线 | **张力④**：本仓墙钟门不止一处——`verify-03` G8c（100000 次 < 50ms）与 **A-003／A-023** 的「1000 节点 scan < 350ms 红线」 | **修正我 Q3 的原推荐**（原「不立票 + 不得放宽断言」不足以覆盖「门本身设计有误」）：立票，G8c 改为**相对比较**或移出阻塞门为性能作业；**范围限定 G8c**，350ms 红线是否同改**另案**（不扩面） | pending |
| **D-009** | 宿主控制台输出（B-7） | **默认静默**；保留输出则**可门控**（开关）+ **脚本名前缀**；正式诊断通道用 `GM_log`。分歧：`error` 级是否可直接写 | 无 current 冲突 | 立票：改为**门控 + 前缀**（接既有 `GM_registerMenuCommand` 诊断开关），**而非直接删除**；并附**报告补正**（票 03 声明「`src/` console=0」与实物不符） | pending |
| **D-010** | 过程证据一致性（B-14） | **消除人工誊抄层**——报告中的勾销数字由票据**机器生成/校验**并纳入 CI（样板：foxBMS `trace-gen.py --check`）；铁律「**unknown 不得静默合并为 pass**」。**无分歧** | 无 current 冲突 | 立票（甲级·诚信面）：① 补勾 `issues/04`（0/5 → 5/5）；② 报告追加补正（原文保留）；③ **新增校验脚本**：票据勾销数与报告自述数字比对，挂既有 CI 门 | pending |
| **D-011** | 陈旧文档与 ADR 指针（B-15 ＋ **新发现 B-16**） | 审计报告／postmortem 属**时点快照** → **加时点横幅 + status 标注（`superseded-by` 双向指针）**，**保留原文不删除**（删除等于销毁审计线索）；MADR 状态词汇：`Deprecated` / `Superseded` | 无 current 冲突；**新发现 B-16**：`ADR-0003`／`ADR-0004` 的「被取代」只存在于正文散文，**缺 MADR 式结构化 `Superseded-by` 指针** | B-15 不立票：加时点横幅 + `superseded-by` 指向台账；**B-16 随同票处理**（补 `ADR-0003` → `superseded by ADR-0007`、`ADR-0004` → `superseded by ADR-0005` 的结构化指针） | pending |
| **D-012** | 登记纪律与观察项（B-9 / B-10 / B-11 / B-12 / B-13） | 研究未涉；沿用本仓既有登记惯例 | 无 | **不立票**：B-9（跨票审计以分支 tip／时点为准）· B-10（行数口径）登记为纪律；B-11（`_writeRules` 不校验不变量）· B-12（S4 断言粒度）· B-13（`live-codepen-editor` flaky）维持观察项 | pending |

---

## 覆盖率自评

- 已确认条目：**5**（D-001…D-005 = current）｜revised：0｜stale：0｜deferred：0
- 待拍板：**7**（D-006…D-012 = pending，Q3 调研结论）
- 本问覆盖：Cycle-7 目标函数 = **已定**（A+B）；Q2（锐评 5 工单）= **已定稿**；Q3（backlog `B-5…B-15` ＋ 新发现 B-16）= **调研已出，待拍板**
- 待决（frontier）：Q3 拍板 → **B 侧能力集边界**；A/B 排序与耦合；本轮交付单位与验收面
