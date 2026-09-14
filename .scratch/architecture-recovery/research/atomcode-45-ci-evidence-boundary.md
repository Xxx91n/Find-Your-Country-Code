# atomcode 深度调研 — CI-only 证据政策 vs 本地人工审计型硬验收的边界

> Cycle-5 | 票 45（A-025）| 2026-09-14 | 载体：`ctx_batch_execute`（label `atomcode`，`concurrency: 1`，`timeout: 600000`）| 串行护栏：全程 1 个在途 | 成功信号：`Indexed 8 sections` + stdout 非空
> 问题（verbatim，未附角度/键名/域名提示）：「工程团队如何划定「CI 作为验收证据唯一来源」与「本地人工审计型硬验收」之间的边界？业界成熟心智模型与可落地条款要点。」
> 证据分级：本文件结论均标 **cited**（来自下述已读原文来源）或 **candidate**（搜索摘要级旁证，未全文阅读）。

## 1. 执行摘要

业界共识把「CI」与「本地检查」定位为**不同信任层级**，而非同一件事的两种实现：CI 是**服务端、不可绕过、可复现**的强制层，本地检查是**客户端、机制上可绕过、仅降低 CI churn** 的前置反馈层。因此「验收证据」只能取自 CI；人工审计型硬验收的合法生存空间收窄为「机器无法判定的判断力事项」，且其证据必须以与 CI 同等的形态（谁/何时/依据/run_id）落库。

## 2. 分点结论（6 条，cited）

**结论一：本地检查在机制上不可强制，因此永远不能作为验收证据来源。**
Git 客户端 hook 不随 clone 分发（git-scm.com 官方 Git Hooks 章节）；`git commit --no-verify` 是一等逃生口（adamj.eu 全表）。社区表述：「git hooks are client-side validation; CI is server-side validation, **the only validation you can trust**」（HN 46398906）；「CI should be the ultimate arbiter of truth in all scenarios」（Lobsters s/7ovnze）。Xygeni 给出四条绕过路径：`--no-verify`、漏装 hook、手改 `.git/hooks`、未跟踪文件。→ **任何写进验收条款的检查，执行环境必须是 CI runner。**

**结论二：本地检查的正确定位是「前置反馈回路」，业界明确接受这一分工。**
pre-commit 官方文档自定位为「在 code review 之前指出琐碎问题，让评审者聚焦架构」；HN 共识「pre-commit hooks are just there to lower CI churn, not to guarantee anything」。唯一被公认的本地强制例外是**秘密防泄露**（一旦 push 到远端即视为已泄露，故 pre-push 扫描值得强制）。→ **本地条款写「推荐/赋能」，CI 条款写「强制」。**

**结论三：CI 作为唯一证据来源的机制化形态 = 分支保护 ruleset + 必需状态检查 + 单一聚合门禁。**
GitHub 官方文档（About protected branches）给出全套强制原语：required status checks、strict/loose（是否要求与 base 同步）、required reviews、**dismiss stale approvals**（新 push 自动作废旧批准，堵住「批准后偷改」）。microsoft/apm 仓库的 `merge-gate.yml` 展示成熟形态：**单一聚合器**把全部必需检查聚合成一个 `gate` verdict，ruleset 只引用这一个检查名——解决「每个检查都要登记、改名即漂移」的维护问题。→ **必需检查清单本身要作为代码管理。**

**结论四：人工审计型硬验收的合法空间 = 机器无法判定的判断力事项，但其证据必须落库。**
分层：功能性验收标准（acceptance criteria）越来越自动化（AltexSoft，AC vs DoD）；DoD 层保留人工项（code review、手动测试、发版说明）。受监管环境实操（how2.sh）：**Auditors do not accept we run tests as evidence** — 需要 timestamped logs、signed artifacts、documented approval chains；标准做法是把人工批准放进 GitHub Environments required reviewers，批准元数据（谁/何时/run_id）自动落成审计工件。→ **人工门禁不是免检，而是「人作为流水线内的检查器」；未落流程内的人工批准等于没批准。**

**结论五：CI-as-evidence 模型自身有已知失效模式，边界条款须含韧性设计。**
① flaky 侵蚀信任（flaky 可占 CI 失败约 16%，Edge Delta；Harness：unreliable tests erode trust in the pipeline）；② CI 平台侧会静默出错（2026-04 GitHub Merge Queue 曾静默回滚已合并代码，HN 47881672 + Reddit r/github 交叉印证）；③ 本地与 CI 漂移 → 开发者养成 `--no-verify` 习惯，hook 形同虚设。→ **需要 flaky 隔离、平台事故应急流程、本地-CI 同源化（同一份 config 两侧执行）。**

**结论六：本仓库已是该心智模型的活样本（candidate，由调研侧知识库召回）。**
`CONTRIBUTING.md` 明确：外发动作（tag / Release / GreasyFork）的自动化部分走 workflow（verify-* / engine-gates / release-dry-run），**最终发布需维护者确认**——即 CI 产出全部验收证据，人类只在证据齐备后做**外发授权决策**（不是重新验收）。这正是业界推荐边界：人工不与 CI 竞争证据权，人工裁决的是 CI 无法回答的「要不要发」。

## 3. 对比矩阵（cited）

| 维度 | CI 作为证据唯一来源 | 本地人工审计型硬验收 |
|---|---|---|
| 本质 | 机器可判定 + 平台强制 | 人作为检查器 + 流程强制 |
| 可绕过性 | 不可绕过（ruleset 挡合并） | 机制上可绕过，靠证据落库约束 |
| 证据形态 | 时间戳日志、签名工件、run_id | 批准链记录（谁/何时/依据） |
| 适用事项 | 构建、测试、lint、类型、安全扫描、密钥检测、provenance | 探索性测试、无障碍/UX 判断、法务合规签发、外发授权 |
| 复现性 | 完全可复现（同 SHA 同结果） | 不可复现（依赖人的判断与当时上下文） |
| 失效模式 | flaky test、CI 平台事故、与本地漂移 | 仓促批准、橡皮图章、事后补签 |
| 典型机制 | branch protection ruleset、required checks、merge queue、聚合 gate | required reviewers（environment）、approve/dismiss、签发清单 |
| 业界定位 | the only validation you can trust | human as a check inside the pipeline, not outside it |

## 4. 完整来源清单

**已读原文（8 篇，cited）：**

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | About protected branches（GitHub 官方） | docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches | Official | required checks、strict/loose、dismiss stale approvals |
| 2 | merge-gate.yml（microsoft/apm） | github.com/microsoft/apm/blob/main/.github/workflows/merge-gate.yml | Official/实践 | 单一聚合门禁形态、ruleset 只引一个 check 名 |
| 3 | pre-commit 官方文档 | pre-commit.com | Official | 本地 hook 的自我定位（review 前置便利）、SKIP/--no-verify 机制 |
| 4 | Pre-commit hooks are broken（HN 46398906） | news.ycombinator.com/item?id=46398906 | Community/批评 | CI 是唯一可信验证层；秘密扫描例外；--no-verify 习惯化案例 |
| 5 | Discussion of the Benefits and Drawbacks of the Git Pre-Commit Hook（Lobsters s/7ovnze） | lobste.rs/s/7ovnze | Community/批评 | CI 应为终极裁决者；本地检查延迟权衡 |
| 6 | Why Pre-Commit Hooks Fail at Stopping Secrets（Xygeni） | xygeni.io/blog/why-pre-commit-hooks-fail-at-stopping-secrets | Criticism/安全 | 四种绕过路径；同源化处方 |
| 7 | Acceptance Criteria vs Definition of Done（AltexSoft） | altexsoft.com/blog/acceptance-criteria-definition-of-done/ | Comparative | AC（可自动化）vs DoD（含人工项）两层划分 |
| 8 | Deployment Safety Gates in Regulated Deployments（how2.sh） | how2.sh/posts/how-to-set-up-deployment-safety-gates-in-regulated-deployments/ | Official/合规实操 | 审计师不认「我们跑了测试」；人工批准的证据落库形态 |

**搜索摘要级佐证（未全文阅读，candidate）：** SLSA v1.2 FAQ（provenance 作为 release gate）、git-scm.com Git Hooks 章节、adamj.eu（--no-verify 全表）、Edge Delta（flaky 占 CI 失败约 16%）、Trunk.io（flaky 破坏 merge queue 吞吐）、HN 47881672 + Reddit r/github（Merge Queue 静默回滚事故）、GitHub community discussion 151100（merge queue 漏强制必需检查）。

## 5. 信息缺口（调研自陈，诚实标注）

- 其他平台等价机制未独立取证：GitLab（protected branches + approval rules）、Gitea/AtomGit 对应原语未逐一读官方文档；机制化条款以 GitHub 语系为准绳。
- 合规标准原文未读：SOC 2 CC8.1、PCI-DSS 6.5、ISO 42001 仅从实操文二手转述；若用于正式审计条款起草须回读标准原文。
- 量化数据薄：「人工门禁 vs 纯 CI 门禁」的缺陷逃逸率/吞吐对比缺乏公开实证。
- 开放问题：AI 代理提交代码的场景下，人工审计型验收的复核者应审代码还是审代理行为日志，2025–2026 文献未收敛；SLSA provenance 思路（验「怎么产生的」而非「长什么样」）是目前最有力候选模型。

## 6. 本票采纳映射

见窗口报告 `research/window-reports/45-repo-process-closeout-report.md` §5（6 条结论 → WORKFLOW §8 条款逐条映射）。
