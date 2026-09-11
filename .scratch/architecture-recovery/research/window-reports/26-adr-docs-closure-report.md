# 窗口实施报告 — 票 26：ADR + Docs Closure for Cycle-3 Hygiene

> 窗口：本票实施 Agent | 日期：2026-09-11 | 分支：`cch/26-adr-docs-closure`（WORKFLOW §4.2）
> 性质：文档收口票 — 零代码改动、零构建（CI-only 政策下本票无 CI 采证需求）

## 0. 开工复述（票要求）

- **阻塞关系**：Blocked by 20, 21, 22, 23, 24, 25（所有实施票完成后才能写文档）。开工时点状态：W1 [20✅ 22✅ 23✅ 24✅(返工复核通过) 25✅]、W2 [21✅]，依据 `verification/review-wave1-cycle3.md` + `review-wave2-cycle3.md` 大脑复核，frontier 判定 26 可立即开工。
- **必读清单**：已全部完整阅读 — ① handoffs/26（5 检查点 + 报告要求 a/b/c）② issues/26（5 验收项）③ spec.md（Cycle-3 实施与测试决策）④ WORKFLOW.md（§4.2 版本控制唯一权威 = but；§4.3 波次；§7 收口）⑤ docs/adr/0005（ADR 格式模板）⑥ 票 20-25 六份窗口报告 + 两份大脑复核报告 + README.md + CONTEXT.md 全文。
- **调研级决断**：本票为文档收口，无新技术选型；决策内容全部取自票 20-25 已实证结论与 spec.md 既定实施决策，未引入新裁决（atomcode 串行护栏不涉及）。

## 1. 交付物清单

| 文件 | 动作 | 说明 |
|---|---|---|
| `docs/adr/0006-ci-hygiene-policy.md` | 新建 | 五项策略决策 + 依据 + 反证条件 + 后果（含三项遗留登记） |
| `CONTEXT.md` | 插入新节 | 「工程门禁与仓库卫生」5 术语，置于「行业心智模型对照」之前 |
| `.scratch/architecture-recovery/README.md` | 更新 | 第三周期状态表票 26 行 → done（待大脑复核）+ 复核结论摘要 |
| `.scratch/architecture-recovery/issues/26-adr-docs-closure.md` | 勾选 | 5/5 验收项 `[x]`，Status → done（窗口实施完成，待大脑复核） |
| 本报告 | 新建 | — |

## 2. handoff 检查点逐项核对（Delta 1-5）

| # | 检查点 | 结论 | 证据 |
|---|---|---|---|
| 1 | ADR-0006 记录五项：脚本位置 / PR 门控 / typecheck 门禁 / 依赖钉死 / 目录约定 | ✅ | 决策节 1-5 条逐一对应，各附票号与 CI run 锚点 |
| 2 | CONTEXT.md 新增 CI gate / PR gating / hermetic E2E / typecheck gate / dependency pinning | ✅ | 5 术语全部落位（中英对照标题），程序化验证见 §5 |
| 3 | README 状态表更新票 20-26 | ✅ | 票 20-25 行大脑复核时已置 done；本票补票 26 行 → 7/7 全 done（26 为窗口自证待复核） |
| 4 | ADR-0006 遵循现有格式（标题/状态 accepted/Context/Decision/Consequences） | ✅ | 结构镜像 0005：`# 0006 — 标题` + `状态：accepted | 日期 | 来源` + 背景/决策/依据/反证条件/后果；见 §5 程序化比对 |
| 5 | CONTEXT.md 现有术语零回归 | ✅ | 编辑前 23 术语快照 → 编辑后 28 术语，missing=[]；标题节全保留，仅新增 1 节；见 §5 |

## 3. (a) ADR-0006 关键决策摘要

全文见 `docs/adr/0006-ci-hygiene-policy.md`（7,323 B，UTF-8 无 BOM，LF）。五项决策：

1. **CI 脚本位置约定**：CI 引用脚本一律 `tests/scripts/`（上溯 2 级锚根）；workflows 禁引 `.scratch/`；scratch 降级为可抛弃调研现场。（票 20：9 脚本迁移、`.scratch/` 引用清零；calibration run 34569015933 + E2E run 34568992880）
2. **PR 门控策略**：非发版 workflow 必须 `pull_request:` 触发，main 合入前置 = typecheck + E2E + calibration + verify-*；发版系例外。（票 21：六 workflow 补齐 + typecheck.yml 原生，PR#2 六 run 实证；verify-15 预存红 → 后果节 F-1）
3. **类型门禁**：`strict: true` 常开；`npm run typecheck` 三事件执行；类型修复 types-only 以同提交 E2E 绿实证；类型层集中 `src/types.ts`，禁 `as any`。（票 23：240→0 四轮，run 34590080334 + 34590080352 @ 7b98132）
4. **依赖版本钉死**：显式 semver 范围禁 `latest`（^5.7/^6.0/^5.0）；lockfile + `npm ci` 复现；`--legacy-peer-deps` 为登记在案的临时例外。（票 25：latest 清零、七 workflow 移除 flag；typecheck.yml 残留 → 后果节 2）
5. **目录结构约定**：单一 `tests/` 根（manual/scripts/fixtures+corpus/spec）；冻结基准不入库（`git show v1.3.4` 对照）；死导出删除以 rg 零调用者为前提、存活调用保留。（票 22/25：E2E run 34569162088 行为不变）

另设**反证条件** 4 条（位置约定失守 / 门控阻塞不可修 / tsc 大版本合流冲突 / 钉死不足需精确 pin），满足任一即重开相应条款。票 24 安全加固属引擎威胁模型裁决，以 b57a25d + 窗口报告为记，本 ADR 不重复。

## 4. (b) CONTEXT.md diff（新增块）

插入位置：`## 用户干预` 之后、`## 行业心智模型对照` 之前。新增节全文：

```markdown
## 工程门禁与仓库卫生

**CI 门禁（CI gate）**：
CI 上可阻断合入的自动化检查集合：类型门禁、E2E、校准基线与票级 verify-* 回归。触发面 = pull_request + push(main, cch/**)；证据只认 CI run/artifact，不认本地输出。
_Avoid_: 持续集成（泛称，无阻断语义）、跑 CI（动作而非门禁实体）

**PR 门控（PR gating）**：
所有非发版 workflow 必须声明 pull_request 触发的仓库策略，使未经检查的变更无法静默进 main；发版系 workflow（release/release-dry-run）例外，只由发版事件与手动触发。
_Avoid_: 代码评审（那是人的行为，门控是机器前置）

**密封 E2E（hermetic E2E）**：
E2E 仅依赖仓库内 fixtures/corpus 与本地 server 供给、不触真实站点与外网的供给边界，保证任意 CI 环境结果可复现。
_Avoid_: 离线测试（只描述网络状态，无供给边界语义）

**类型门禁（typecheck gate）**：
tsconfig `strict: true` + `npm run typecheck`（tsc --noEmit）+ CI typecheck workflow 构成的三件套；类型修复必须 types-only，以同提交 E2E 双绿证明无运行时行为变更。
_Avoid_: 静态检查（泛称，不含 types-only 承诺与阻断语义）

**依赖钉死（dependency pinning）**：
依赖以显式 semver 范围写入 package.json（禁 `latest` 浮动）、经 package-lock.json + `npm ci` 复现安装的策略；`--legacy-peer-deps` 属登记在案的临时例外而非策略。
_Avoid_: 版本锁定（指 lockfile 机制本身；钉死含范围书写纪律）

（决策记录见 `docs/adr/0006-ci-hygiene-policy.md`。）
```

字节账：8,801 → 10,471 B（+1,670，纯插入）；23 术语 → 28 术语；行尾保持全文件统一 CRLF；无 BOM。

## 5. 程序化验证（不接受自述一致）

验证脚本口径（node 实跑，本窗口）：

| 检查 | 方法 | 结果 |
|---|---|---|
| ADR 格式 | 0006 标题行 `# 0006 —` + `状态：accepted` + 五节（背景/决策/依据/反证条件/后果）与 0005 模板逐节比对 | ✅ 6 headings 全中 |
| ADR 编码 | 字节检查 | ✅ 无 BOM / LF / 尾部换行 / 7,323 B |
| CONTEXT 回归 | 编辑前正则快照 23 术语 + 8 标题 → 编辑后比对 | ✅ missing=[]，仅新增 1 标题节 |
| 磁盘态对账（票 20-25 交付与 ADR 表述一致性） | fs/rg 扫描 | ✅ workflows `.scratch/` 引用 0；tests/scripts 9 文件；test/ 不存在；tests/manual 3 页；package.json 无 latest；tsconfig strict:true；非发版 7 workflow 全含 pull_request、发版 2 不含；typecheck.yml legacy flag 残留 1 处（ADR 后果节 2 如实登记） |
| issues/26 | 勾选计数 | ✅ 5 `[x]` / 0 `[ ]` |

## 6. (c) README 状态表（票 20-26 全 done）

| 票 | 状态 | 波次 |
|----|------|------|
| 20 CI 脚本迁移 | done（复核通过） | W1 |
| 21 PR 触发器 | done（复核通过） | W2 |
| 22 死代码清理 | done（复核通过） | W1 |
| 23 TS strict + typecheck | done（复核通过） | W1 |
| 24 安全加固 | done（复核通过，含返工轮） | W1 |
| 25 依赖/目录卫生 | done（复核通过） | W1 |
| 26 ADR + 文档收口 | done（窗口实施完成，待大脑复核） | W3 |

## 7. 证据锚点索引（全部 commit sha / CI run，遵票 24 教训不用磁盘态）

| 票 | 分支 | 实施提交 | CI 证据 |
|---|---|---|---|
| 20 | cch/20-ci-script-relocation | uur + tow | calibration 34569015933 / E2E 34568992880 |
| 21 | cch/21-pr-triggers | mqm + pvo(6855d79) | PR#2 六 run 34606285994/…6007/…6053/…6040(预存红)/…6037/…6054；main 对照 34606594163 |
| 22 | cch/22-dead-code-elimination | ylz + zwx | E2E 34569162088（远端 abe98e1） |
| 23 | cch/23-ts-strict-typecheck | rnp/oul/zxz/xkv + qry | 首轮 34584317580(240 err) → typecheck 34590080334 + E2E 34590080352 @ 7b98132 |
| 24 | cch/24-security-hardening（堆叠 23） | usx(b57a25d) + rqt(20ce5c3) | E2E 34594275953（59 passed，cross-origin 7/7）+ typecheck 34594275950 |
| 25 | gb/cch-25-dependency-hygiene | mzvl | lockfile 重生成待 CI（AC4 pending，见遗留） |

## 8. 偏离点（呈报大脑裁决）

- **D-26a README 文件粒度捆绑**：README.md 的未提交态含大脑第三周期波次/状态表整节（与票 26 行同 hunk 不可分），本票按文件提交时一并入库。属 §4.3「波次表落 README」职责的自然结果，呈报知悉。
- **D-26b 不推送 CI**：文档票无构建/测试需求；提交留本地 `cch/26-adr-docs-closure` 分支，push/PR/合入属收口人工动作（AGENTS：非请不推；forge 缺失先例见票 21 D-21c）。
- **D-26c 他窗在途改动零触碰**：工作区 uncommitted 桶含他窗 workflow hunks（e2e.yml `npm ci`→`npm install`、release.yml 缩进等，疑为票 25 lockfile 重生成在途）与大脑 scratch 产物（prompts/handoffs/spec/reviews），本票未提交、未修改。
- **票面措辞修正**：issue 26 写「PR gating policy (all non-release workflows require pull_request)」——实证口径为 6 个由票 21 补齐 + typecheck.yml（票 23）原生自带，共 7/7 非发版 workflow 达标；ADR 按实证表述，不沿用「六文件」旧数。

## 9. 收口呈报（登记给大脑的待办）

1. **F-1 返修票建议**：verify-15 S4 断言「dispatchEvent 恰 1 处」需限定口径（仅 input/change 值事件）或豁免登记；PR 门控合入 main 前必须修，否则挡所有 PR（run 34606286040 + main 34606594163 双红实证）。
2. **typecheck.yml `--legacy-peer-deps` 残留**：待双 react 依赖根治或 lockfile 实证后移除；移除前加注释锚定原因（票 25 §4 约定）。
3. **lockfile 重生成 CI 实证**（票 25 AC4）：他窗在途，收口时确认 `npm ci` 裸跑绿。
4. **归档动作**：prompts/handoffs/issues 20-26 与 spec/review 报告仍在大脑 uncommitted 桶，收口归档归大脑（先例：cch-19 归档提交）。
5. **合入序列**：cch/20-26 各分支 → main（PR 门控首跑须以含 F-1 修复的基线，票 21 教训「门控上线前先跑 main 全门基线」）。
6. **教训建议（WORKFLOW §5 候选）**：新建 workflow 须以基线最新口径起稿（V5：票 23 反向引入本周期正消除的 flag）。

## 10. 版本控制记录（WORKFLOW §4.2）

- 独立分支：`but commit -b cch/26-adr-docs-closure`（不存在即建，未堆叠——纯文档与票 20-25 代码无依赖）。
- 提交内容：§1 交付物清单 5 文件；提交信息 `docs(cch-26): …`。
- 未推送（D-26b）；未触碰他窗改动。
