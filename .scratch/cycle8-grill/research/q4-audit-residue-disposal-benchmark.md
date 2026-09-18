# Q4 行业对标调研存档 —— 审计遗留七项「过程与形式类」处置

> 载体：atomcode CLI（headless，只读护栏）｜三引擎（Exa + Tavily + AnySearch）+ 知识库召回
> 派发：2026-09-18｜问题 verbatim 见文末附录｜自报配额：searches 12+（web_search ×4 · Tavily ×4 · AnySearch ×4）· 五类角度全覆盖 · full reads 6
> 用途：为 Q4（审计遗留 7 项处置口径）提供工业界心智模型对标。**本文件为调研存档，不是决策**。
> 辩证性声明：结论已由编排 Agent 逐条对撞 decision-ledger（D-001…D-005）/ docs/adr / CONTEXT.md；**含 1 处对调研的实质修正**（① 与 A-010 冲突，见文末）。

## 执行摘要（Tl;dr，调研自评 Confidence：中-高）

**业界对这类「已交付、已验证、仅过程形式有瑕疵」的项，主流心智模型是登记为已归档偏差（documented deviation / accepted residue），而不是回退或重做**——前提是偏差本身被落盘、可追溯、有时效。七项中除 ⑥（建议一次性机械清账）与 ⑤（建议由授权人补录追认而非留空）外，其余五项推荐均为「登记 + 归档，不回退」。

## 总览对比矩阵

| # | 待处置项 | 业界主流处置 | 是否回退/重写 | 置信度 |
|---|---|---|---|:---:|
| ① | 已推送 + CI 通过的错误提交信息 | 有条件重写；**单人仓库倾向修正** | 视情况 | 高 |
| ② | ADR 追加内容的位置 | 无硬性位置规范；小幅澄清→带日期注记，改变决策→新 ADR | 不回退 | 中 |
| ③ | CI 触发面通配符替代枚举 | **通配符是官方推荐形态**；触发面变更应显式留痕 | 不回退 | 高 |
| ④ | 测试状态位↔豁免位联动 | 联动约束显式化（schema/校验机器人），防静默放宽 | 不回退 | 中 |
| ⑤ | 声称授权但无留痕 | 由**授权人本人**追认落盘，标注 retroactive | 不回退 | 中 |
| ⑥ | 仅工作区残留的 CRLF | **这是正常预期行为，不是缺陷**；一次性机械清账 | 一次性清理 | 高 |
| ⑦ | 缺失的处置心智模型 | 已知残留登记册 + 例外生命周期管理（审批人/到期日/证据） | — | 高 |

## ① 已推送且 CI 通过的错误提交信息：重写 or 登记？

- Git 官方：「一旦推送，就应视为最终，除非有充分理由才改写」（*pushed work as final unless you have good reason*）。
- GitHub Docs：改消息会生成新 commit ID，已推送则必须 `git push --force-with-lease`，并警告会干扰基于旧提交的协作者。
- Atlassian：amended commit 是全新提交，「与 reset 公共快照同后果」。

**分歧如实呈现**：
- **单人仓库 / 无他人基于该 sha 工作**：GitHub Docs 官方路径就是 amend + `--force-with-lease`，成本极低——调研**推荐重写**。
- **多人/共享分支**：改用**登记为已知残留**（记「该提交自称完成 N 票，实际 M」+ diff 证据），不重写。

**判据核心是「历史是否可安全重写」而非「错误是否严重」**。

## ② ADR 追加内容：新二级节 vs 带日期 Notes

MADR **没有对「追加内容放哪」的逐字规定**，但有明确生命周期规则：`status` 含 `superseded by ADR-NNNN`；`date` 定义为「**决策最后更新日期**」——即 MADR 框架本身**预期 ADR 会被更新**。

社区提炼的三档规则：
1. **小幅澄清/补充信息**：追加带日期的注记（dated amendment note），**不改正文**；
2. **改变决策本身**：新建 ADR，`superseded by ADR-NNNN`，**禁止静默编辑已接受决策的 Outcome**；
3. **纯补充证据/后续决定**：写入 `More Information` 节。

**推荐**：追加内容**不改变原决策** → 作为带日期的子节/注记（文末 Notes），并**更新 ADR 头部的 `date` 字段**；**不建议**新增「正文新二级节」混入原决策叙述——那会模糊「决策时点的判断」与「事后补充」的界线。

## ③ CI 触发面：通配符 vs 逐分支枚举

- GitHub 官方工作流语法原生支持 `branches: ["feature/**", "release/**"]`；官方表述：*Use the `branches` filter when you want to include branch name patterns* ⇒ **模式化触发是官方推荐形态**。
- 判据：分支集**开放演进** → 通配符；分支集**封闭且每个分支行为不同** → 枚举；需排除时用 `branches-ignore`（不可与 `branches` 同事件混用）。
- 补充：push 事件读取的是**被推分支上的 workflow 文件**，不是 main 上的 ⇒ 改触发面必须推到各受影响分支才生效。

**是否必须显式登记**：业界**无强制规范**，但成熟实践把「CI 触发面变更」视为**管道行为契约变更**（改变「什么代码会被自动验证」这一安全属性）。推荐：放进**同一条 ADR 或 workflow 的 PR 描述**即可（**不必单开 ADR**），关键是**变更可见、可追溯**。

## ④ 状态位与豁免位的联动治理

**业界镜像**：dotnet/arcade-services 的 Known Issues 机制（原始 issue #6139）：
- Known Issue JSON 是**单一数据源**，豁免行为（是否转绿/重试/允许合并）由同一 schema 的字段**派生**，**不存在两个独立位子可以打架**；
- 新增 `TrackingOnly` 模式——匹配已知问题但**保持红**，即「**跟踪但不豁免**」，为「豁免被滥用为放宽断言后门」提供更保守选项。

治理判据：① 联动约束**代码化**（schema 校验/CI 步骤强制）② 豁免位变更必须走 **diff 审查** ③ 豁免带**追踪 ID 与到期**。

**推荐**：不回退既有状态；补一条校验把联动约束从「约定」升级为「机器检查」。

## ⑤ 「声称授权但无留痕」

审计与合规场景的核心原则是 **“auditors care about the trail, not the intent”**。FDA 21 CFR Part 11 类体系要求每条记录变更都有不可篡改的 who/what/when 留痕。三档处置：

| 档位 | 做法 | 适用条件 |
|---|---|---|
| **追认落盘** | 由**授权人本人**（不是执行者）补写一条带日期的追认记录，明确标注 *retroactive/backdated acknowledgment* 与实际授权时间 | 工作已完成、验收全绿、授权人可联系且认可 |
| 登记偏差 | 授权无法追认 → 记为「未经充分授权的变更」，评估影响后决定是否回退 | 授权人否认或不可考 |
| 回退 | 仅当工作本身有害或授权被明确否认 | 罕见 |

**明确不推荐的**：由执行者单方面补录「我获过授权」——那等于**让利益相关方自证**，审计上无效。

## ⑥ 仅工作区残留的 CRLF（提交层已归一）

**业界明确答案：这是正常预期行为，不是缺陷**，多源一致：
- `* text=auto` 只归一 index/repo，「working tree 里看到 CRLF 是 *okay and is working as expected*」；
- GitHub Docs 提供 `git add --renormalize .` 及删文件重检出的标准清理命令；
- `git add --renormalize .` 提交层归一后，**工作区行尾不会自动变**，这是 Git 的已知非直观行为。

**推荐**：**一次性机械清账，不长期登记**（状态确定性、修复无信息量、长期登记只制造噪音）。配套加 **`.editorconfig`（`end_of_line = lf`）** 防止新文件再漂移。

## ⑦ 业界已成熟但项目未采纳的心智模型

**1. 「已知残留登记册 + 例外生命周期」**（全部七项的元问题）：成熟做法不是「逐项处置完即忘」，而是维护一个**显式的 findings register**：每条发现 → 编号、负责人、处置决定（fix / accept / defer）、证据链接、**到期复核日**。例外记录五要素：发现 ID、理由、补偿性控制、具名签核、**到期日（绝不自动续期，到期强制重审）**。

**2. 「豁免 ≠ 跟踪」的分级豁免模型**（④ 的深化）：工业界前沿已从二元「豁免/不豁免」演进为**分级**：豁免（转绿）vs **仅跟踪**（保持红但记录统计）。

## 完整来源清单（14 条）

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| 1 | GitHub Docs: Changing a commit message | docs.github.com/en/pull-requests/how-tos/commit-changes/changing-a-commit-message | Official（已读原文） | ① 重写流程与 force-with-lease 警告 |
| 2 | Pro Git: Rewriting History | git-scm.com/book/en/v2/Git-Tools-Rewriting-History.html | Official（已读原文） | ① pushed work as final 判据 |
| 3 | Atlassian: Git amend | atlassian.com/git/tutorials/rewriting-history | Official/教程（已读） | ① amend 公共快照同后果 |
| 4 | MADR 官方站 | adr.github.io/madr | Official（已读原文） | ② status/date 字段语义 |
| 5 | ZIO: MADR Template Primer | ozimmer.ch/practices/2022/11/22/MADRTemplatePrimer.html | Official（维护者，已读原文） | ② 追加规则、More Information 节 |
| 6 | GitHub Docs: Workflow syntax | docs.github.com/actions/reference/workflow-syntax-for-github-actions | Official（已核验） | ③ 通配符官方语法与 branches-ignore 约束 |
| 7 | GitHub Community Discussion #190350 | github.com/orgs/community/discussions/190350 | Community（已核验） | ③ workflow 文件按分支解析的行为 |
| 8 | dotnet/arcade-services issue #6139 | github.com/dotnet/arcade-services/issues/6139 | Official（已读原文） | ④ Known Issue schema、TrackingOnly 模式 |
| 9 | Secure.com: Risk Acceptance and Exception Workflows | secure.com/blog/cybersecurity/risk-acceptance-exception-workflows | Official/实践（2026-08，已读原文） | ④⑤⑦ 例外五要素、到期强制、care about the trail |
| 10 | Yaveon: Audit Trail | yaveon.com/en/insights/article-audit-trail | Official/综述（已核验） | ⑤ 留痕不可篡改原则 |
| 11 | Aleksandr Hovhannisyan: CRLF vs LF | aleksandrhovhannisyan.com/blog/crlf-vs-lf-normalizing-line-endings-in-git | Community/技术（已读原文） | ⑥ working as expected + .editorconfig |
| 12 | GitHub Docs: Dealing with line endings | docs.github.com/articles/dealing-with-line-endings | Official（已核验） | ⑥ renormalize 标准流程 |
| 13 | dev.to/kevinshu: Git and normalization | dev.to/kevinshu/git-and-normalization-of-line-endings-228j | Community（已核验） | ⑥ 精确清账命令 |
| 14 | ForensicSpot: Remediation Tracking | forensicspot.com/topics/…/remediation-tracking-and-management-action-plans | Official/综述（摘要级） | ⑦ owner/evidence/escalation |

## 调研自报信息缺口

- ⑤ 授权追认在**法规原文**层（如 21 CFR Part 11 §11.10）的逐字要求未读到一手法规文本，仅有合规厂商综述交叉；
- ② MADR 4.0 完整模板原文未逐字抓取，「Notes 子节」的具体形式是社区惯例而非成文条款；
- ③ 「触发面变更是否必须显式登记」在 GitHub 官方文档中**没有**规范要求，属**推断而非引用规范**。

## 编排 Agent 的辩证核验（对调研的修正）

- **修正（①，实质）**：调研推荐「单人仓库倾向重写」，但其**不知道本仓的上下文**：本仓 **A-010（implemented）** 的显式约束是「版本控制遵循 WORKFLOW §4.2（GitButler `but land`，**禁 force-push**）；**已归零旧历史不重写（不可逆）**」，且票 35 handoff 明写「**不重写历史「凑绿」**」。而 A-010 的**设立动机**恰恰是「main 历史曾被两次强推归零，票级开发过程在 git 里不存在」⇒ **为修一条提交信息的表述而重写历史，与 A-010 的动机直接相悖**（重写正是让历史不可信的那个动作）。⇒ **不采纳调研 ① 的重写推荐**，维持「登记为永久残留」。
- **印证（②③⑥）**：均与编排 Agent 原推荐同向，且各补一个增量（② 更新 ADR `date` 字段；③ 登记载体不必新开 ADR；⑥ 加 `.editorconfig`）。
- **加强（④）**：调研建议「把联动约束升级为机器检查」——**本仓已具备**（`tests/scripts/32-real-site-corpus.mjs` :193–201 即该联动校验；豁免三字段 + `corpus-exemption-lint` 亦已就位）⇒ **本仓领先于调研所述的业界基线**，剩余缺口仅「文档化」。
- **约束（⑤）**：调研的铁律「**明确不推荐由执行者单方面补录**」对编排 Agent 直接适用 ⇒ 追认**必须由授权人（用户）本人作出**，编排 Agent 仅可作为**代笔记录**，且须注明由用户追认、日期、范围。

## 附录：派发问题 verbatim

```
某单文件浏览器油猴脚本项目（TypeScript + vite，单仓库）刚经历一轮独立审计，遗留七项「过程与形式类」待处置项，需要行业对标。请以工业界成熟落地的心智模型为重点，给出对比矩阵与推荐，并附可引用来源。

背景：该仓库用 Git 版本控制（主干为 main、已推送至远端），采用 ADR（架构决策记录）与术语表维护领域语言，CI 用 GitHub Actions，票级验证门合并为一个可复用工作流。

七项：
① 已推送的历史提交信息有误（自称完成票数与实际不符），且该提交所在 sha 上 CI 已全部通过。业界对「已推送且已通过 CI 的历史提交信息有误」如何处置？重写历史 vs 登记为已知残留？判据是什么？
② ADR 文档的形式合规：一条后续追加的决策内容，应放在 ADR 正文的新二级节，还是作为「带日期 Notes」的子节？业界（尤其是 MADR 等成文规范）对 ADR 的追加式变更有无位置规范？
③ CI 触发面设计：用分支通配符（如某前缀下所有分支）替代逐分支精确枚举，业界成熟做法与判据是什么？这种触发面的变更是否必须显式登记？
④ 测试基线的状态位（如「修前漏检／已修复／负例已覆盖」）与豁免位（如「已知残留」标记）之间存在联动约束：改变状态位必然改变豁免位期望。业界如何治理这种联动，防止状态位变更成为静默放宽断言的后门？
⑤ 授权留痕：执行者自述「已获用户授权开工」，但仓库内无该授权的落盘记录（且工作已完成、验收全绿）。业界（尤其审计与合规场景）对「声称授权但无留痕」的成熟做法是什么？追溯追认、补录留痕，还是回退？
⑥ 工作区行尾漂移：提交层已通过属性文件归一为 LF（blob 全 LF、版本控制状态干净），但本地工作区仍有 121 个文本文件是 CRLF（历史检出残留）。业界对「仅工作区残留、提交层已归一」的行尾漂移如何处置？一次性清账还是长期登记？
⑦ 上述六项之外，是否存在业界已成熟、但该项目尚未采纳的「审计发现处置」心智模型？

要求：每条给推荐与理由；若业界存在明确分歧，如实呈现分歧而非强行统一。
```
