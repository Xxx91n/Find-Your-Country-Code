# Decision Ledger — Cycle-9 Grill（逐题台账）

> 用途：grill 过程中**每一条被用户确认的实质性结论**当场落盘，不依赖对话记忆。
> 生成：2026-09-18｜基线：`origin/main` = `752c4bb2`｜本会话分支：`cch/18-cycle9-grill`
> 上游：`.scratch/cycle8-grill/handoffs/2026-09-18-audit-closeout-handoff.md`（§0–§12.9）＋ `.scratch/evidence/findings-register.md`（FR/FC/FN）＋ `docs/adr/0001…0016`
> **输入缺口登记**：用户指定的 `test-results/锐.txt` **已不存在**（实证：工作区无、`git ls-tree HEAD` 零命中、广域搜索命中 7 个同名文件但**逐一判归属后全部属其它项目**，其中 `D:/Aworker/6F/.code-tmp/锐评.txt` 经 git remote 验证属独立仓库 `Xxx91n/6F`）。本轮**未获该输入**，未做任何锐评核验。
> 机制：ID 自 D-001 起递增（与 `.scratch/cycle6-grill/`、`cycle7-grill/`、`cycle8-grill/` 的 D-xxx 隔离）。
> 状态取值：`current`（已确认生效）／`revised`（被后续回答修订）／`stale`（被证伪或废弃）／`deferred`（登记在案，本周期不做）／`pending`（调研已出、待拍板）。
> 硬规则：**结论不许只活在对话里**；触发任何压缩／compact／handoff 动作前，先确认本台账已落盘到最新。

---

## 台账

| ID | 原问题 | 用户原回答原文 | 规范化需求 | 显式约束 / 负向需求 | 状态 |
|----|--------|---------------|-----------|--------------------|------|
| **D-001** | Q1 — 本轮的落点（目标函数）是哪一类？(A) 发版收割（按 ADR-0016 判据 7 收割一个版本，并入 GF 送达链核验）／ (B) 站点级语料建设（FR-11）／ (C) 收口债清账（FR 14 条签核 + ADR 形式债 4 篇 + `CONTRIBUTING.md` 漂移 + 备份 ref 清理）／ (D) B 侧能力再扩张 ／ (E) 组合 | `AC` | 本轮**同时**推进两条线：**（A）发版收割** —— 按 **ADR-0016 判据 7**（`commits > 30` 或 `diff 行数 > 2000` ⇒ 立即收割）收割一个版本；实测自 `v1.7.0` 以来 **66 提交 / 8481 diff 行**（超限 2.2× / 4.2×）；**并入 GF 送达链核验**（否则送不到用户）。**（C）收口债清账** —— FR-01…FR-07 · FR-09…FR-15（**14 条 open**）签核 ＋ **ADR 形式债 4 篇**（`0007`/`0008`/`0010`/`0011` 缺 MADR 状态行）＋ `CONTRIBUTING.md` 漂移（FR-13，未反映 ADR-0014/0016）＋ 备份 ref 清理（FR-03）。 | **① 排除 (B)**：本轮**不做**站点级语料建设（FR-11）—— 体量大（~3838 站点 + ~500 pilot）、依赖外部数据源与标注责任、且「库外归档载体」选型未定；**留作独立轮次**。**② 排除 (D)**：本轮不做 B 侧检测/功能面新能力扩张。**③ grill 期间不动 `src/` 源码**（沿用 cycle6/7/8 标准约束）。**④ 不设定其他目标**。**⑤ 硬边界沿用** `handoff §6`（`but` 唯一入口；未获授权不得 `land`/`push`；门禁证据只认 CI run/artifact；语料先行；`.scratch/` 为受管工件区、清理只允许触 `draft/`）。**⑥ 发版属 handoff §6 明文例外**（「本轮不发版」为 Cycle-7 D-018 的一次性裁定；若拍板收割则需你明确授权）——**未获授权前不得 bump 版本、不得打 tag、不得触发 release**。**⑦ GF 送达链未核验前不得声称「送达已闭合」**（cycle7 D-002③ 同向）。**⑧ FR 签核必须由授权人本人作出**（铁律：*auditors care about the trail, not the intent*；执行者自证无效）。**⑨ FR-03 备份 ref 清理属破坏性操作**，须你明确确认后方可执行。 | current |
| **D-002** | Q2 — 发版收割的口径怎么定？（版本号 / 收割范围 / 发布门口径 / Glog 双语 / 时序） | `b` | **第 3 项（发布门口径）= (b)**：**先 `workflow_dispatch` 补跑一次 fresh `real-site-smoke`，再发版** —— 使发布门依据覆盖当前 `main`（与 handoff §4「从采纳到证据闭环的真实运行」方向一致；ADR-0014 决策 2「权威验收锚点 = 目标分支上的成功 run」同向）。**若补跑为红 ⇒ 按 ADR-0010 条款 2 走显式 ack + 立票**（`reason` ≥ 20 字 / `ticket` 可解析 / `runId` 与最近一次运行一致 / `acknowledgedBy` 非空）—— 该条款正是此用途，**不得以「反正之前绿过」为由跳过 ack 路径**。**其余四项按建议包执行**（用户未提出异议）：**① 版本号 = `v1.8.0`（MINOR）**；**② 收割范围 = 自 `v1.7.0` 全部 66 提交，一次收割**；**④ Glog 双语新建 `## v1.8.0` 节，写 4 条用户可见变更**；**⑤ 时序 = A 先、C 随后（同一轮内）**。 | **① 版本真源唯一** = `package.json`（只改这一处；`vite.config.ts` 构建时注入 `// @version`）。**② Glog 双语逐条对应**（`greasyfork/Glog.md` + `Glog_EN.md`），**不得只改一边**。**③ 未获你明确授权前，不得 bump 版本、不得打 tag、不得 `workflow_dispatch`、不得 `but land`/`but push`**。**④ 不得以「发布门本来就绿」为由跳过补跑**（用户已明确选择 (b)）。**⑤ 补跑结果须原样登记（含红）**，不得只登记绿。**⑥ 不得为凑补跑绿而放宽任何断言或改 `real-site-smoke` 的判据**。**⑦ 发版不得夹带 C 侧清账内容**（除非属版本 bump 必需的机械同步）。 | current |
| **D-003** | Q3 — C 侧（收口债清账）的口径怎么定？（findings register 回写 / FR 待签核 9 条 / ADR 形式债 4 篇 / `CONTRIBUTING.md` 同步 / FR-03 备份 ref / `package-lock.json` 版本漂移） | `全部签核，删` | **① register 回写**：**FR-04 · FR-05 · FR-06 · FR-15 转 closed**（记 **FC-10…FC-13**）；原文保留、**追加带日期状态行**（register 自述「只增不改」）。**② FR 待签核 9 条——用户一次性批量签核（由用户本人作出，Agent 仅代笔记录）**，逐条处置：**FR-01**（dist 数字不闭合）= **accept（登记）**；**FR-02**（锐评输入缺口）= **accept（登记）**；**FR-03**（备份 ref）= **本轮删除**；**FR-09**（站点级语料库外归档可恢复性）= **accept（登记）**；**FR-10**（revert/发版/证据单元不重合）= **accept（登记）**；**FR-11**（门槛②不可判定）= **accept（维持 defer，B 侧本轮排除）**；**FR-12**（报告数字时点快照）= **accept（登记）**；**FR-13**（`CONTRIBUTING.md` 漂移）= **本轮修**（修完转 closed）；**FR-14**（Wilson/OC α 口径）= **accept（登记，方向安全）**。**③ ADR 形式债 4 篇**（`0007`/`0008`/`0010`/`0011`）**补 MADR 状态行**，只加不改。**④ `CONTRIBUTING.md` 同步**：「发布链路」节指向 **ADR-0014**；新增「发版节奏」小节指向 **ADR-0016**。**⑤ FR-03 备份 ref `refs/backup/main-pre-rewrite`（`b1fcf96d…`）删除**。**⑥ `package-lock.json` 根 version 漂移（`1.5.0` → 对齐）并入本轮版本 bump 的机械同步**。 | **① FR 签核必须由授权人本人作出**（铁律：*auditors care about the trail, not the intent*）；Agent **仅代笔记录**，须写明「由用户签核 + 日期」；**不得打包成一个笼统「同意」**——必须逐条列明处置。**② FR-03 删除为不可逆操作**：删前必须把 3 个旧 sha（`e63e8253` / `337461e8` / `b1fcf96d`）**与「旧 tip tree == 当前 main tree」的事实写入 register**（作为删后仅存的追溯面）；删除后**不得声称旧 sha 仍可恢复**。**③ register 回写不得删除/改写原行**（只追加带日期状态行）。**④ ADR 只加状态行，不得改写 Context/Decision 正文**。**⑤ 本轮不得因清账而改动 `src/` 行为**（C 侧为仓库层/文档层动作，D-001③）。**⑥ 未获你明确授权前，不得 `workflow_dispatch`、不得 bump 版本、不得 `but land`/`but push`**（D-002③ 仍生效）。 | current |
| **D-004** | Q4 — 执行授权面与验收面怎么定？（授权范围 / 执行顺序 / 硬验收 / 诚实边界） | `采纳` | **① 授权范围 = (A) 一次性全授权**：本轮内授权 **1** `workflow_dispatch` 补跑 `real-site-smoke`（main）· **3** bump `package.json` 1.7.0→1.8.0 + 修正 `package-lock.json` + 新建 Glog 双语 `## v1.8.0` 节 · **4** `but push` · **5** `but land`（触发 `release.yml`）· **6** 删除 `refs/backup/main-pre-rewrite` · **7** C 侧清账提交 + `but land`。**② 第 2 项（`release-gate-ack.json`）例外**：保留为「**条件触发 + 当场确认**」——仅当补跑为**红**时发生；**Agent 可拟写 ack 文本，但必须经你确认后才能写入**（ack 内容是事实断言 + 具名签核，Agent 不得代签）。**③ 执行顺序**：W1 补跑 →（绿 / 红则停下呈报）→ W2 bump+lockfile+Glog → 提交 → push → land → 验 release-gate + Release v1.8.0 + 产物附件 → W3 写 register 追溯面 → 删备份 ref → C 侧清账 → push → land → W4 收口（重跑硬验收 + 账本结算 + 再生 handoff）。**④ 硬验收照此执行**：本地（typecheck 0 · build 0 sha256 可复现 · E2E 全绿（基线 151）· 21 票级门 **21/21** · `--audit` 19-0 · calibration P=R=F1=1.0 · real-site gate=pass · `git diff --check` 净）· CI（land 后 main **6 run 全 success**，含 `Verify Tickets` **21/21**）· 发布门（补跑绿 **或** 显式 ack 具名）· Release（tag `v1.8.0` + Release + `.user.js` 附件）· C 侧（register 15 条全有终态且全部具名签核 · ADR 16 篇全有状态行 · CONTRIBUTING 指向 ADR-0014/0016 · 备份 ref 已删且追溯面已写入）。**⑤ 诚实边界照此执行**。 | **① 授权为一次性、仅限本轮**，不得据为先例推导出「后续可自由 push/land/发版」。**② 第 2 项 ack 不得由 Agent 代签**（铁律：追认必须由授权人本人作出）；若补跑红，**必须停下呈报**补跑失败详情 + 拟写 ack 文本，**待你确认后**才能写入。**③ 补跑结果的 sha（`752c4bb2`）≠ 发版 sha**——报告须写明这一差异，**不得声称「补跑验证了被发版的代码」**。**④ GF 送达不得声称已闭合**（Sync ≤ 1 次/天），只能写「已发布，GF 同步待验（≤ 1 天）」。**⑤ 发版不得夹带 C 侧清账内容**（除 `package-lock.json` 的机械版本对齐）。**⑥ 不得为凑硬验收绿而降低任何门禁/断言**。**⑦ 删除备份 ref 前必须先写入追溯面**（3 个旧 sha + 旧 tip tree == 当前 main tree），删除后**不得声称旧 sha 仍可恢复**。 | current |
| **D-005** | Q5 — `v1.8.0` 的 Glog 双语文案定稿 ＋ 本轮收口形态 | `OK` | **① Glog 双语文案按拟稿定稿**（含两处措辞：第 1 条加「（低置信档，仅低调提示）」以免用户误以为会自动填充；第 3 条写明「密码管理器生态的通用退避约定」以解释 `data-1p-ignore` 为何物）。中文 5 条 / 英文 5 条，逐条对应，节标题 `## v1.8.0 更新日志` / `## v1.8.0 Changelog`。**② 收口形态 = (A)+(B)**：(A) **账本结算**（无去向记录必须为 0）＋ **再生 handoff**（写入受管区，ADR-0013 决策 3 的路径例外）；(B) **另加一份实施报告**（逐任务证据）。 | **① Glog 双语必须逐条对应**，不得只改一边。**② 实施报告必须显式标注时点**——「补跑 run ID / 发版 sha / Release 链接 / GF 同步状态」均为**时点快照**，不得当作可复跑的期望值（同 **FR-12** 的教训）。**③ GF 同步状态只能写「待验（≤ 1 天）」，不得声称已送达 v1.8.0**（D-004④）。**④ 报告不得声称「补跑验证了被发版的代码」**（D-004③）。**⑤ 收口产物不得夹带新的范围**（D-001③④）。 | current |

---

## 覆盖率自评

- 已确认条目：**5**（D-001…D-005 = current）｜revised：0｜stale：0｜deferred：0｜pending：0
- 本问覆盖：目标函数（A+C）· A 侧发版口径 · C 侧收口债口径 · 执行授权与验收面 · Glog 文案与收口形态 —— **均已定稿**
- 待决（frontier）：**已清空**（Q1–Q5 全部定稿）。**残留（非待决）**：① 补跑 `real-site-smoke` 的结果（条件触发，D-004②）；② 下一轮方向（FR-11 站点级语料 / B 侧能力面，D-001 已排除本轮）；③ 定稿后的执行与整理环节（待用户指令）

---

## 带日期更正注记（2026-09-18 · Cycle-9 窗口）

> 形式：**原文保留、不改**；本注记由编排 Agent 在 Q5 取证时发现并追加。

### 更正-1：D-002 的「4 条用户可见变更」应为 **5 条**

- **原记（保留）**：D-002 的规范化需求第 ④ 项写「Glog 双语新建 `## v1.8.0` 节，写 **4 条**用户可见变更」。
- **更正**：实测 `src/detect/index.ts` 的变更**不止 contenteditable** —— 还含 **`isOptOutElement()` + L0 闸门 `gate:optout`**（`data-1p-ignore` 属性存在 / `data-form-type === 'other'` ⇒ `score:0, tier:'none'`），即 **ADR-0012「退出协议实现」**。⇒ 用户可见变更实为 **5 条**（新增「尊重站点退出标记」）。
- **动因**：编排 Agent 在 Q2 取证时只按提交信息（`feat(cch-t12): contenteditable 扫描层扩展`）归类，**未逐行读 `src/detect/index.ts` 的 diff**；Q5 取证时逐行读 diff 才发现。
- **影响面**：仅影响 Glog 条目数（4→5）；**不影响 D-002 的实质决策**（版本号 / 收割范围 / 发布门口径 / 时序）。
- **D-002 状态**：**保持 `current`**（实质决策未变）；本条为**事实层更正**，非决策修订。
- **是否需标 `revised`**：本仓 `revised` 语义 = current 决策**被后续裁定推翻**；本条**不构成推翻**（决策未变，仅证据补全）。⇒ **不标 `revised`**；如你要标，我改。

### 附带取证（同期实测，均逐行读 diff）

| 项 | 实测 |
|---|---|
| `countries.ts` 条目数 | v1.7.0 = **223** → HEAD = **225**（+2：Kosovo/Vatican） |
| `i18n.ts` 文案 | v1.7.0 与 HEAD 均 **123 个字面量**，归一化 `\uXXXX` 后**零差异** ⇒ 零行为变更成立 |
| `types.ts` | `AnyEl = HTMLElement & Record<string, any>` → `HTMLElement & AnyElExtras`（显式接口）⇒ **纯类型，零运行时** |
| `diag/index.ts` | `console.warn('[cch] diag write failed')` → `if (traceFlag) console.warn('[cch][diag] write failed')` ⇒ 门控 + 前缀 |
| `detect/index.ts` | `OBSERVED_ATTRS` 新增 `contenteditable` / `data-1p-ignore` / `data-form-type`（指纹观测面扩展） |
| `config.ts` / `fill/` / `ui/` | 注释 + 非空断言 ⇒ **零行为变更** |

### 用户可见变更集（最终，5 条）

1. **contenteditable 区号字段检测**（新增能力）
2. **contenteditable 候选集收敛 + `contenteditable="false"` 排除**（优化，防误报）
3. **尊重站点退出标记**（`data-1p-ignore` / `data-form-type="other"` ⇒ 不注入）（**新增**）
4. **Kosovo（+383）/ Vatican（+379）数据补全**（223 → 225）
5. **诊断输出改可门控 + 脚本名前缀**（优化）
