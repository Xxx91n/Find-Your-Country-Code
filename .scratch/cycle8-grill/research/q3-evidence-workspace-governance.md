# Q3 行业对标调研存档 —— 证据与工作区治理

> 载体：atomcode CLI（headless，只读护栏）｜三引擎（Exa + Tavily + AnySearch）+ 知识库召回
> 派发：2026-09-18｜问题 verbatim 见文末附录｜自报配额：searches 11 · 五类角度全用（Official / Comparative / Criticism / Currency / Community）· full reads 9
> 用途：为 Q3（`.scratch/` 定位与「不可抛弃、须进 Git 跟踪」原则的作用域）提供工业界心智模型对标。**本文件为调研存档，不是决策**。
> 辩证性声明：结论已由编排 Agent 逐条对撞 decision-ledger（D-001…D-003）/ docs/adr / CONTEXT.md；**含 2 处对调研自身的修正**（见文末「编排 Agent 的辩证核验」）。

## 执行摘要（Tl;dr，调研自评 Confidence：高）

**业界一致共识是「可再生 ⇒ 忽略、不可再生且有裁决价值 ⇒ 入库」**；本仓库的 `.scratch` 因「同时是 CI 门禁数据源 + 含决策台账/第三方评审」双重身份，业界心智模型下它已经不是 scratch，而是**受管工件目录**——整体入库（现状）方向正确；真正缺的是把「外部输入」单独划出并用「入库 + 哈希留痕 + 远端异地副本」防不可恢复丢失，以及修掉「宽忽略 + 白名单」的静默误吞面。

## 对比矩阵：四种治理心智模型

| 心智模型 | 典型代表 | 版本控制态度 | 优势 | 代价/风险 |
|---|---|---|---|---|
| **可抛弃工作区**（scratch disposable） | 业界主流默认 | 不入库，靠 ignore | 仓库干净、历史小、无 diff 噪音 | **丢东西不可恢复** |
| **全量入库**（含草稿/台账） | ADR 实践、golden/snapshot、vendoring 派 | 全部入库 | 不可恢复丢失在结构上不可能；可追溯可 diff | 仓库膨胀、diff 噪音 |
| **双区制**（受管区 + 可抛弃区，显式边界） | 主流大型仓库惯例（`doc/adr`、`testdata/`、`fixtures/` 入库；`dist/`、报告目录忽略） | 按目录角色切分 | 兼顾整洁与可追溯 | 边界需纪律维护；边界未文档化时会出现误放 |
| **门禁即契约**（CI 依赖什么，什么就必须入库或可确定性重建） | GitLab CI artifacts、Go `vendor/`、lockfile 必提交共识 | CI 读的文件要么入库、要么由已提交工具确定性生成 | 消除「可抛弃区成为构建依赖」的张力 | 需一次重构把依赖显式化 |

## ① 工作区/草稿区 vs 受管工件：边界与「CI 依赖可抛弃区」的张力

**业界判据（两源以上一致）**：区分标准**不是「目录叫什么名字」**，而是两个问题——(a) 内容是**人写/裁决的产物**还是**工具可再生成的产物**？(b) 它是否被构建/验证链消费？

- Michael Ernst（UW，2024 更新）把「不提交生成文件」列为版本控制最佳实践——默认心智是 scratch 可抛弃 [S1]。
- 但 ADR 惯例恰恰相反：决策记录**必须**放在源码仓库里（`doc/adr`），且一经接受不可修改、只能被取代——因为它是**不可再生的裁决证据** [S6][S7]。
- Jest/Vitest 官方文档：snapshot/golden 文件「必须与代码一起提交，并在 code review 中作为变更评审」——虽由测试生成，但因是**比较基准（判据）**，不可再生 [S9]。

**分歧如实呈现**：vendoring 之争是「要不要把第三方原件搬进仓库」的直接战场。Go vendoring 保留派（“Not in your repo, not your code”、left-pad 事件）主张原件入库以保证可用性；lockfile 派（Nesbitt 2026：proxy/sumdb 时代 vendoring “almost entirely redundant”）主张入库**指针+哈希**而非原件。两派都存在，但**共同点是两者都能恢复**；本仓事故的根因是**既没存原件也没存指针** [S3][S4]。

**「CI 门禁数据源落在可抛弃区」的处置**：业界只有两条正路——
1. **显式化（推荐）**：门禁读的文件晋升为受管工件，入库。Go 生态对「门禁（构建）需要的代码」的答案就是 vendor 入库或 lockfile+proxy，**从不允许「构建悄悄依赖本地可再生不成的东西」** [S3][S4]。本仓 5 个 CI 验证脚本读 `.scratch`，业界心智下这些文件**自动升级为受管**，无需纠结名字。
2. **确定性重建**：若数据可由入库的生成器重造，则门禁 CI 内先跑生成器——但要求生成器与数据同版本，工程上比直接入库更贵。对 3.0 MB / 331 文件的体量，完全不值得。

**推荐**：维持 `.scratch` 整体入库（现状正确），但做**分区重命名/分层**：内部再分 `evidence/`（不可再生证据，永不清理）与 `draft/`（真正可抛弃的探针脚本与调研草稿，允许清理），边界写进目录 README。这同时回应事故：清理脚本以后**只允许触碰 `draft/`**。

## ② 可再生产物 vs 不可再生证据：判据与惯例

| 类别 | 可再生性 | 惯例 | 依据 |
|---|---|---|---|
| 构建产物（dist/build/.next） | 完全可再生 | **忽略**；入库被视为反模式（merge 冲突、陈旧产物、历史膨胀） | [S2] |
| 测试报告/覆盖率/浏览器报告 | 每次运行重生成 | **不进 git，进 CI artifacts**，带 `expire_in` | [S8] |
| 真实站点冒烟输出 | 大部分可再生，但含「当时站点快照」成分 | **分裂**：纯诊断输出忽略；若构成**判据**（回归基准）则入库，同 golden file | [S9] + 分歧点 |
| 运行日志 | 一次性诊断 | 忽略（例外：事故取证用的日志应另行归档） | 共识 |
| 第三方输入文件 | **不可再生**（来源不受你控制） | 入库原件或「哈希+异地指针」 | [S3][S4] |
| golden/snapshot/fixtures | 不可再生（是判据） | **必须入库**、随 PR 评审 | [S9] |

**CI 产物与仓库内产物的边界**：GitLab 官方范式是「报告作为 artifacts 上传、给 `expire_in`、供 MR 展示」，而非提交进仓库——**CI 平台就是业界的「产物归档层」**，带保留期与下载入口 [S8]。无平台级 artifacts 时，等价物是：入库**门禁所需的最小判据文件**，忽略纯诊断性大输出。

**推荐**：现有忽略规则对测试结果/构建产物/浏览器报告/冒烟输出的忽略**符合业界共识，保留**；唯一要复核的是冒烟输出里若含「站点行为基准」，按 golden file 规则晋升入库。

## ③ 「宽忽略 + 白名单例外」：隐患与替代

**官方文档定义了这种写法的三个结构性陷阱** [S10]：
1. **父目录排除导致白名单静默失效**：`It is not possible to re-include a file if a parent directory of that file is excluded`——Git 因性能不进入已排除目录，`!` 例外对被吞目录内的文件**完全无效且无告警**。
2. **多来源叠加**：`.gitignore` 优先级之下还有 `.git/info/exclude` 与全局 `core.excludesFile`，任何人任何机器都可能有一条你不知道的规则在吞文件 [S10]。
3. **顺序与锚定脆弱**：宽模式 `*` 依赖后续 `!` 精确抵消，`!*/`、目录锚点 `/`、嵌套 `.gitignore` 覆盖……每一条都是维护地雷 [S10][S11]。

**业界防误吞机制（替代方案）**：
- **显式忽略优于宽忽略**：`.gitignore` 的官方设计意图就是「列举项目生成的文件」，逐条显式列出而非 `*` + 例外；`git check-ignore -v <path>` 是官方调试命令，能打印「哪一行哪条规则吞了它」——把静态检查（`git check-ignore -v` 跑在 CI 里，对关键白名单路径断言**不被忽略**）做成门禁，是业界标准防误吞手法 [S10][S11]。
- **分层**：团队共享规则进 `.gitignore`，个人工作流规则进 `info/exclude`（官方明确的用途划分）。
- **分歧点**：**白名单式写法**（`/*` + `!`）在「整仓只收少数文件类型」场景**是合法且推荐的**（gitignore 官方文档自己给出了 `/* !/foo /foo/* !/foo/bar` 的范例），**不能一刀切说它错**——错的是把白名单写在**会被清理的目录上**且无 `check-ignore` 验证 [S10][S11]。

**推荐**：对文档目录的「宽忽略 + 三白名单」改为 (a) 逐条显式忽略真实存在的生成物，或 (b) 保留白名单但在 CI 加一步 `git check-ignore -v` 断言关键路径可追踪；(c) 立即跑一遍 `git check-ignore -v` 对全部 `.scratch/` 与文档路径做体检——**本报告里成本最低、见效最快的一条**。

## ④ 外部输入的归档心智模型：放哪、留痕、防丢失

业界成熟模型是三层，从轻到重：

1. **入库 + Git 历史即留痕（对齐 ADR 惯例，推荐为默认）**：Fowler：ADR 放在源码仓库 `doc/adr`，轻量 Markdown、可 diff、接受后只增不改（superseded 而非修改）——“决策与证据长在代码历史里”就是业界最广落地的可追溯模型 [S6][S7]。第三方评审原文同理：入库 `evidence/external/`，评审的采纳/否决写成一条 ADR 链接它。Git 提交哈希即哈希留痕，clone 即异地副本。
2. **不可变留痕（WORM/内容寻址，合规级）**：SEC 要求记录存于「非重写、非可擦除介质」；S3 Object Lock 是云端 WORM 事实标准；2026 年 SEC 的内容寻址证据存储提交示范了「SHA-256 + 哈希链 + 不可变操作日志」的取证标准 [S5][S12]。对单人项目，**轻量等价物**：入库时在台账里记录文件 SHA-256 + 来源 URL + 抓取日期——**哈希先行，哪怕原件再丢也能证明曾经存在并可对第三方索回**。
3. **异地冗余**：vendoring 保留派的核心论点 “Not in your repo, not your code” 反过来就是本事故的教训——证据只存在一份于本地可清理目录且从未 push，**等于没有** [S3]。最低要求：入库 + push 到远端（哪怕私有远端）；重要证据再加一处独立副本。

**推荐组合**（单文件油猴项目体量）：外部评审/审计报告 → `evidence/external/` 入库 + push；台账记录 SHA-256 + 来源 + 日期；不必上真 WORM，但把「**哈希留痕 + 双副本**」写进目录 README 作为硬规则。

## 行动清单（调研按性价比排序）

1. **立即**：`git check-ignore -v` 全量体检关键路径，CI 加防误吞断言（③）。
2. **本周**：`.scratch` 内部分区 `evidence/` vs `draft/`，清理脚本白名单化到 `draft/`（①）。
3. **本周**：补一份事故回溯 ADR（含丢失文件的内容摘要、哈希如可考、流程修正）——ADR 惯例本身就是为这类事设计的（④）。
4. **短期**：CI 依赖的票据文件从「隐式依赖」改为目录 README 显式声明 + 门禁失败信息指向来源（①③）。
5. **可选**：外部证据加 SHA-256 台账；测试/浏览器报告若 CI 平台支持则迁 artifacts（②④）。

## 完整来源清单（12 条）

| # | 标题 | URL | 角度 | 贡献 |
|---|---|---|---|---|
| S1 | Version control concepts and best practices (M. Ernst, UW) | https://homes.cs.washington.edu/~mernst/advice/version-control.html | Official | 「不提交生成文件」；scratch 可抛弃心智模型 |
| S2 | Should You Commit the dist/ Folder to Git? — VibeReference | https://www.vibereference.com/devops-and-tools/should-you-commit-dist-folder | Comparative | 构建产物入库的四大反模式 |
| S3 | Should I commit vendor directory with go mod? — Stack Overflow | https://stackoverflow.com/questions/60865004/should-i-commit-vendor-directory-with-go-mod | Community | vendoring 保留派（“Not in your repo, not your code”） |
| S4 | Lockfiles Killed Vendoring — A. Nesbitt, 2026-02-10 | https://nesbitt.io/2026/02/10/lockfiles-killed-vendoring.html | Currency | vendoring vs lockfile 产业史与分歧 |
| S5 | WORM (write once, read many) — TechTarget | https://www.techtarget.com/searchstorage/definition/WORM-write-once-read-many | Official | WORM；SEC 非可擦除要求 |
| S6 | Architecture Decision Record — M. Fowler, 2026-03-24 | https://martinfowler.com/bliki/ArchitectureDecisionRecord.html | Official | ADR 入库、accepted 后不可改只可 superseded |
| S7 | ADR 实践（Red Hat / endjin / adr.github.io） | https://www.redhat.com/en/blog/architecture-decision-records 等 | Official | ADR 与源码同仓、可追溯共识 |
| S8 | GitLab CI artifacts reports 官方文档 | https://docs.gitlab.com/ci/yaml/artifacts_reports | Official | 测试报告走 CI artifacts + expire_in |
| S9 | Snapshot Testing — Jest 官方（Vitest 同口径） | https://jestjs.io/docs/snapshot-testing | Official | golden/snapshot 必须入库并随 PR 评审 |
| S10 | gitignore — Git 官方文档 | https://git-scm.com/docs/gitignore | Official | 白名单例外三陷阱；分层用途划分 |
| S11 | git-check-ignore — Git 官方文档 | https://git-scm.com/docs/git-check-ignore | Official | `-v` 打印吞文件的具体规则行 |
| S12 | SEC: Content-Addressed Evidence Storage, 2026-02-17 | https://www.sec.gov/about/crypto-task-force/written-submission/ctf-written-fcck-pilot-evidence-02-16-2026 | Currency | SHA-256 + 哈希链 + 不可变日志 |

## 调研自报信息缺口

- 缺少大型 monorepo（Google/Meta）内部 scratch 目录处置的一手公开文档；
- ADR 之外「第三方评审原文归档」的直接业界规范较少，只能从 WORM/取证留痕 + ADR/vendoring 类比合成。

## 编排 Agent 的辩证核验（对调研自身的修正）

- **修正-1（调研把两个独立问题错误关联）**：调研 ③ 称其陷阱 1「与本仓库事故机制同构」。**实物反驳**：`test-results/`（锐评原文殒命处）是**整目录忽略**（`.gitignore:25`），**不是**「宽忽略 + 白名单」结构；白名单结构在 `docs/*` + `!docs/adr/` 等三行（行 12–15）。⇒ 锐评事故的病根属 **②/④（不可再生证据落在被忽略区且无留痕）**，**不是** ③ 的父目录排除陷阱。两问题独立，不应混谈。
- **修正-2（调研③的「错」定性过重）**：调研说白名单写法「不能一刀切说它错」——**本仓 `docs/*` 恰好落在合法形态内**（宽模式在行 12、`!` 例外在行 13–15，顺序正确），且 `docs/` **不是会被清理的目录**。⇒ 其风险等级**低于**编排 Agent 原先的判断（我原把它列为「独立隐患」）；真正要补的是 **`check-ignore` 门禁**，而非改写写法。
- **印证**：调研 ① 的「CI 门禁数据源自动升级为受管」直接印证 **D-003**（受管定性）；调研 ② 的判据表直接印证编排 Agent 对 **Q3 (A)** 的推荐（运行产物保持忽略符合业界共识）。

## 附录：派发问题 verbatim

```
某单文件浏览器油猴脚本项目（TypeScript + vite，产物为单个 userscript）正在做一轮「证据与工作区治理」的口径裁定，需要行业对标。请以工业界成熟落地的心智模型为重点，给出对比矩阵与推荐，并附可引用来源。

背景事实：该仓库有一个草稿/现场目录（331 文件 / 3.0 MB），内含票据文件、窗口报告、决策台账、调研草稿与探针脚本；其中 5 个被 CI 调用的验证脚本会真实读取该目录下的文件（缺文件即门禁失败）。该目录当前已全部纳入版本控制（0 忽略）。另外，仓库的忽略规则忽略了几类运行产物目录（测试结果、构建产物、浏览器报告、真实站点冒烟输出），并且对文档目录采用了「宽忽略 + 三条白名单例外」的写法。近日发生一起事故：一份放在被忽略目录里的第三方评审原文，因目录清理而永久丢失，且因从未入库、无任何版本控制痕迹而不可恢复。

请就以下四类问题给出工业界成熟做法与推荐：
① 仓库内「工作区 / 草稿区」（scratch、work、tmp、notes 类目录）与「受管工件」的边界：业界成熟仓库如何区分二者？把这类目录整体纳入版本控制、还是保持可抛弃？各自的心智模型与代价是什么？如果该目录同时是 CI 门禁的数据源，业界如何处置这种「可抛弃区成为构建依赖」的张力？
② 可再生产物 vs 不可再生证据：哪些应进版本控制、哪些应被忽略？业界对构建产物、测试报告、运行日志、第三方输入文件分别采用什么判据与惯例？CI 产物与仓库内产物的边界在哪里？
③ 「宽忽略 + 白名单例外」这种写法的隐患与替代方案：业界是否有更稳妥的忽略策略（显式忽略 vs 宽忽略、静默忽略的风险、防误吞机制）？
④ 外部输入（第三方评审、审计报告、外部工具产出）的归档心智模型：应放哪里、如何留痕、如何防止不可恢复的丢失？业界有哪些成熟实践（含可追溯性与不可变留痕）？

要求：每条给推荐与理由；若业界存在明确分歧，如实呈现分歧而非强行统一。
```
