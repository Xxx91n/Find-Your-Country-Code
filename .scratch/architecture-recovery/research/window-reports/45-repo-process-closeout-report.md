# 票 45 窗口报告 — 仓库与流程收口

> Cycle-5 | 票: `issues/45-repo-process-closeout.md` | 覆盖 A-xxx: **A-024, A-025**
> 分支：`cch/45-repo-process-closeout`（按 WORKFLOW §4.2 GitButler）| common base：`e2a10d8e`（Cycle-4 收口头）
> 提交：`{{IMPL_SHA}}`（实现提交；本报告与其同批落盘）

## 0. 开工复述（阻塞项与必读清单）

- **阻塞项**：`Blocked by: 票 41`。开工前核对：票 41 报告 `research/window-reports/41-process-evidence-archive-report.md` 在磁盘，README 第五周期票务表 41 = done（复核通过）。→ **无未决阻塞**。
- **必读清单（6 份，已逐份读全）**：`handoffs/45-repo-process-closeout.md`、`issues/45-repo-process-closeout.md`、`spec.md`（Cycle-5）、`WORKFLOW.md`（含 §4.2）、`decision-ledger.md`、`docs/adr/0006-ci-hygiene-policy.md`。
- **路径校正**：启动器写「报告落 `research/window-reports/…`」，仓库根无 `research/` 目录；WORKFLOW §3 表、README 票务表及既有各票报告均落 `.scratch/architecture-recovery/research/window-reports/`。按「本仓库既有约定路径」取后者（同偏离点 D-C5-2 / 本报告 D-45a）。

## 1. AC1 勾销 — A-024 远端 ref 清理（清理集为空，零删除）

### 1.1 只读验证命令与输出摘要

```bash
cd D:/Aworker/mozilla/choose-your-country
git ls-remote origin                              # 全量 ref
git ls-remote --heads origin 'refs/heads/cch/*'    # 仅远端 cch 分支
git ls-remote --tags origin                        # tag
```

**清理前 = 清理后（本次零删除）远端全量 ref：**

| ref | sha | 是否 `origin/main` 祖先 |
|---|---|---|
| `refs/heads/main` / `HEAD` | `e2a10d8e` | —（基线自身） |
| `refs/heads/cch/36-gate-integrity-repair` | `0eb7d560` | NOT-MERGED |
| `refs/heads/cch/37-entry-point-accessibility` | `19d0b83b` | NOT-MERGED |
| `refs/heads/cch/38-distribution-last-mile` | `4336142c` | NOT-MERGED |
| `refs/heads/cch/39-real-site-enablement` | `e82ab743` | NOT-MERGED |
| `refs/heads/cch/40-frame-governance-degradation` | `50b149c3` | NOT-MERGED |
| `refs/heads/cch/42-locale-switch` | `b828952f` | NOT-MERGED |
| `refs/heads/cch/43-dependency-peer-rootfix` | `b813ddbf` | NOT-MERGED |
| `refs/heads/cch/44-detection-semantics-adjudication` | `9929b8a7` | NOT-MERGED |
| `refs/heads/cch/cycle5-ticketing` | `e658b849` | NOT-MERGED |
| `refs/pull/1/head`、`refs/pull/2/head` | `eb3e8266`、`8313b925` | 平台侧 PR ref（不可删、不属本票） |
| `refs/tags/v1.3.4` / `v1.4.0` / `v1.5.0` | `d725f5e9` / `6340757` / `019f228e` | tag（不属本票） |

**逐支合并判定**（`git merge-base --is-ancestor <sha> origin/main`）：**9/9 全部 NOT-MERGED**。

**新鲜度核验**：本地 `origin/main` = `e2a10d8e370c4f43bd9d69217b0b23d1cc7a87bf`，与 live `git ls-remote origin` 同 sha；`git for-each-ref refs/remotes/origin` 与 live 逐支同 sha → 判定不基于 stale remote-tracking ref。

### 1.2 结论：清理集 = ∅

「已确认合并的 `origin/cch/*` 分支」在本票开工时**为空集**。远端现存 9 支 `cch/*` 全部是 **Cycle-5 在途支**（票 36–44 + `cycle5-ticketing`）；`origin/main` 仍停在 Cycle-4 收口头 `e2a10d8e`——**Cycle-5 尚未 land**，这些分支是在途交付的唯一远端副本，且本窗口与其它窗口并行实施（用户明示「与其他分支并行修复」）。

依本票 Delta「**只删已确认合并的分支**；不触碰 main」，**本窗口执行零删除**；因无远端写操作发生，**不触发「远端写须用户授权」**。

### 1.3 台账 A-024 前提校正（实物证伪其登记数字）

A-024 原文：「远端残留：已合并的 `origin/cch/*` **11 支**未清理（Cycle-4 land 副产物）」。逐名实测：

```bash
for b in 27-detection-coverage-floor 27-detection-coverage-floor-fix 28-iso2-dial-evidence \
         29-scan-candidates-expansion 30-rules-tier-scope-fix 31-fill-feedback-loop \
         32-real-site-corpus 33-version-bump-delivery 34-gate-slimming \
         35-history-landing-discipline brain-docs; do
  git ls-remote --heads origin "refs/heads/cch/$b"
done
```

输出：**11/11 全部 ABSENT**（空输出）。即 Cycle-4 land 副产物 11 支**早已不在远端**——与 `but land` 自动清理已落地分支的既有行为一致（旁证：票 19 报告「land 自动删除已落地 `origin/cch/*`（15+3 个）……远端现仅剩 main」）。

→ **A-024 的登记数字已失效**；若按该数字直接批删，会误删在途交付。本票以「清理集为空 + 逐名实物核验」勾销，并写回 WORKFLOW §5 教训（防再犯：收口类票开工前重跑实物核对，禁止沿用登记数字）。

### 1.4 本地侧（不属 AC，附呈）

- 本地 11 支 `cch/*` 逐支 `merge-base --is-ancestor origin/main` **全部 NOT-MERGED**（与远端一致）；`gitbutler/target` 为 MERGED，但属 GitButler 托管 ref，非删除对象。
- 本地 remote-tracking refs 与 live 远端**逐支同 sha**，无 stale ref → `fetch --prune` 无对象可清。
- `but status` / `but branch list`：11 支 applied，**无 `(merged upstream)` 标记**（无 GitButler 侧待清支）。

## 2. AC2 勾销 — A-025 CI-only 政策与本地硬验收边界条款化

**落点**：`WORKFLOW.md` 新增 **§8 证据边界（CI-only 政策与本地硬验收）**。

- **§8.1 CI-only 政策（5 条）**：① 可 CI 复现的验收项证据必须来自 CI（run ID + commit sha 锚定）；② 本地自证必须显式标注、不得作勾销依据；③ CI 红即红（红门归因三选一留痕：自身改动 / 基线预存红 / 平台故障）；④ 禁止以本地结果替代可 CI 化验收；⑤ 韧性条款（flaky 隔离 / 平台事故应急 / 本地-CI 同源化）。
- **§8.2 本地硬验收（审计型）边界（5 条）**：定义 + 允许面（只读闭集）+ 禁止面（不得替代行为面验收、不得放松 CI 门、不得勾销行为面 AC）+ 例外登记四要素（为什么不可 CI 化 / 命令原文 / 输出摘要 / 复核窗口）+ 授权路径（默认不自动扩权；远端写、凭证门控、不可逆动作逐次授权）。
- **总原则显式标注「不可放松」**：行为面验收证据**只认 CI run / artifact**。

**Delta 合规自检**：

| Delta 条款 | 合规 | 证据 |
|---|---|---|
| 条款不得放松「证据只认 CI run/artifact」总原则 | ✅ | §8 引言标注「不可放松」；§8.1.1/§8.2.2 双重加固；本地硬验收被限定为「只读、无副作用、不可 CI 化」的窄例外 |
| 只删已确认合并的分支；不触碰 main | ✅ | 9/9 NOT-MERGED → 清理集 ∅；零 `git push`/`but push`；零 main/tag 接触（§1） |
| 远端写操作须用户授权 | ✅ | 本票无远端写操作；该授权要求已制度化（§8.2.4）（§2） |

## 3. AC3 勾销 — §5 教训条目格式不变

§5 仅 **1 行新增**（票 45 行），列结构沿用既有四列 `日期 | 阶段 | 教训 | 防再犯`；既有 11 行零改动，§5 表现共 12 行。新增行内容：台账登记的外部状态会失效（A-024 登记数字与远端实物不符）→ 收口类票开工前必须重跑实物核对，「清理集为空」也是合法闭环。

## 4. 本票 Delta 检查点

见 §2 Delta 合规自检表（三项全 ✅）。

## 5. atomcode 深度调研采纳记录

- **载体**：`ctx_batch_execute`（label `atomcode`，`concurrency: 1`，`timeout: 600000`）——串行护栏遵守，全程仅 1 个调研在途；成功信号双满足（`Indexed 8 sections` + stdout 非空）。
- **问题（verbatim）**：「工程团队如何划定「CI 作为验收证据唯一来源」与「本地人工审计型硬验收」之间的边界？业界成熟心智模型与可落地条款要点。」（未附角度/键名/域名提示，符合 skill 约束）
- **落盘**：`research/atomcode-45-ci-evidence-boundary.md`（含 6 条结论 + 对比矩阵 + 8 篇已读原文来源清单 + 信息缺口）。
- **采纳（结论 → 条款映射）**：

| 调研结论 | 采纳落点 |
|---|---|
| 本地检查机制上不可强制（hook 不随 clone 分发、`--no-verify` 逃生口）→ 永不能作验收证据源 | §8.1.1 |
| 本地检查定位 = 前置反馈回路（降 CI churn）；本地写「推荐/赋能」，CI 写「强制」 | §8.1.2 |
| CI-as-truth 的机制化形态 = 分支保护 ruleset + 必需状态检查 + 单一聚合门禁（防名称漂移） | §8.1.1（run ID 锚定）；平台侧配置部分未采纳，见 §9 |
| 人工审计型硬验收合法空间 = 机器无法判定的判断力事项，但证据必须落库（「人不是免检，是流水线内的检查器」） | §8.2.3（例外登记四要素）+ §8.2.5 |
| CI-as-evidence 有已知失效模式（flaky 约 16% CI 失败 / 平台静默回滚 / 本地-CI 漂移诱发绕过） | §8.1.5 韧性条款 |
| 本仓库已是该心智模型活样本（CONTRIBUTING：CI 产出全部验收证据，人工只做外发授权决策） | §8 引言 + §8.2.4 授权路径 |

- **未采纳 / 信息缺口（诚实标注）**：调研建议的「分支保护 ruleset + 单一聚合门禁」属 GitHub **平台侧配置**，不在本票授权面（本票为流程条款化），仅登记为 §9 建议；调研自陈缺口——非 GitHub 平台（GitLab/Gitea）等价原语未独立取证、合规标准（SOC 2 / PCI-DSS / ISO 42001）原文未读（二手转述）。

## 6. 证据矩阵（只读验证命令 + 输出摘要）

| # | 命令 | 输出摘要 |
|---|---|---|
| 1 | `git ls-remote origin` | 16 行：1 HEAD + 10 heads（main + 9 cch）+ 2 PR ref + 3 tag |
| 2 | `git ls-remote --heads origin 'refs/heads/cch/*'` | 9 行，逐支 sha 见 §1.1 |
| 3 | `git merge-base --is-ancestor <sha> origin/main`（9 支逐支） | 9/9 NOT-MERGED |
| 4 | `git ls-remote --heads origin refs/heads/cch/<cycle4-name>`（11 名逐名） | 11/11 ABSENT |
| 5 | `git rev-parse origin/main` vs live ls-remote | 两侧同 sha `e2a10d8e…`（无 stale） |
| 6 | `git for-each-ref refs/remotes/origin` | 与 live 逐支同 sha |
| 7 | `git ls-files --error-unmatch <5 个目标文件>` + `git check-ignore -v` | 全部 TRACKED；check-ignore 无命中 |
| 8 | `but status` / `but branch list` | 11 支 applied；无 `(merged upstream)` |
| 9 | 文件完整性：字节 / CRLF / BOM 校验 | WORKFLOW/issues/ledger/report/research 全部 LF、无 BOM |

**证据性质声明（依 §8 新条款）**：本报告全部结论属**本地硬验收（只读）**范畴——对象为「远端 ref 列表 / 合并关系 / 可提交性」，正属 §8.2「无法或不值得在 CI 复现」的产物。本票**零业务代码改动**（仅 `.scratch` 流程文档），**无行为面 AC**，故不适用 CI 门证据；此声明不构成对 §8.1 的放松。

## 7. 偏离点申报（待首脑/用户确认）

| # | 偏离 | 理由 |
|---|---|---|
| D-45a | 报告路径取 `.scratch/architecture-recovery/research/window-reports/`，非启动器字面 `research/window-reports/` | 仓库根无 `research/`；与 WORKFLOW §3 表、README 票务表及既有各票报告一致（同 D-C5-2） |
| D-45b | A-024 以「清理集为空」闭环（零删除），未执行任何 `git push origin --delete` | 实物核验无「已确认合并」分支；按 Delta 只删已合并分支 → 无可删对象（§1.2/§1.3） |
| D-45c | 台账 A-024 描述「11 支未清理」判定为**已失效**（11/11 ABSENT），已在报告与 §5 教训中如实登记 | 不篡改台账原文，以实物证据校正（§1.3） |
| D-45d | 未更新 README 第五周期票务表状态行（仍 `ready-for-agent`） | 票务表勾销属 WORKFLOW §7.3 收口动作（大脑 S8）；窗口只勾销 issue 验收项 |
| D-45e | 本票无 CI run 证据 | 纯 `.scratch` 流程文档改动，未触碰 `src/`/`tests/`/workflow；按 §8.2 属本地只读硬验收范畴，已在 §6 声明性质 |

## 8. 教训候选（供 WORKFLOW §5 取舍）

1. **台账登记的外部状态会失效**（已采纳入 §5）：收口类票开工前必须重跑实物核对，禁止沿用登记数字；「清理集为空」也是合法闭环。
2. **「清理类 AC」应写为集合语义**：AC 写「已确认合并的分支清理完成」在集合为空时语义模糊——建议后续票面写「清理集 = {…}（核验命令 + 前后对比）」，空集同样可勾销，避免执行者误以为必须产生删除。

## 9. 剩余风险 / 待办

- **Cycle-5 land 后的远端支清理**：Cycle-5 各支（36–44）land 进 main 后，`but land` 按既往行为会自动清理远端已落地支；若未自动清理，可在 S8 收口时以 `git push origin --delete` 批清（**须用户授权**）。本票不预做。
- **平台侧机制化（建议后续票，非本票授权面）**：调研建议的「分支保护 ruleset + 必需状态检查 + 单一聚合门禁」（防 ruleset 与 workflow 名称漂移）尚未落地；本仓库 PR 门控目前依赖 workflow 自带 `pull_request:` 触发（ADR-0006 决策 2），未启用平台 required checks。
- **§8.2.3 例外登记的既有回溯**：Cycle-4 审计（`cycle4-closure/01-hard-verify.md`：本地硬验收经 goal 授权覆盖 CI-only）发生在 §8 生效之前；§8 生效后此类授权须逐次留痕，既往记录不追改。
- **issue 勾销已落，README 票务表状态待大脑 S8 复核后更新**（D-45d）。
