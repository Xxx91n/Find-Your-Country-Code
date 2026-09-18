# Q3 行业对标存档 —— CI 证据闭环形态

> **调研问题（verbatim）**：浏览器用户脚本类单人维护的开源仓库，CI 证据闭环（何时 push、分支落地顺序、以 CI run 作为验收证据的口径）业界成熟做法是什么？全景调研，给出可照搬的形态与判据。
> **载体**：`atomcode -p`（Exa + Tavily + AnySearch + Patchright；只读联网）｜**日期**：2026-09-18｜**Cycle-8 grill**
> **Sufficiency Gate**：searches 7（Exa×2 / Tavily×3 / AnySearch×1 / ctx 召回×1）｜angles：Official + Comparative + Criticism + Currency + Community 全五类｜full reads 7｜**置信度：高**（单人维护场景三方交叉；userscript 特有部分置信度中）
> **归档纪律**：本文**只存调研输出**；编排侧对账见 `.scratch/cycle8-grill/decision-ledger.md`。

---

## 1. 执行摘要（Tl;dr）

业界成熟做法可一句话概括：**单人维护仓库也走 “Trunk-based + 短命分支 + PR 门禁 + squash merge” 的 GitHub Flow 形态——分支只是「交付单元」，CI 绿是唯一验收证据，合并落地顺序为 ticket 分支 → PR（CI 在 PR 上跑完）→ squash 进 main → main 上发版 workflow 出 tag/Release；main 上的绿 CI run 就是「何时 push、何时验收」的权威记录。**
不需要第二个人审批，也不需要 merge queue（那是 10+ 人并行合并的工具）。

---

## 2. 分点结论（每条标注来源）

**① 分支模型：单人 = Trunk-based + 短命分支，而非 Gitflow。**
gitflow.dev 的决策矩阵明确：Solo 行四列全部是 “TBD”（月度发版加 tags），理由是结构成本对单人只有负担没有收益；DORA 2018 研究显示高绩效团队分支寿命 <1 天（[gitflow.dev 已读]；Driessen 本人 2020 年也给 Gitflow 加了“持续交付请用更简单工作流”的注记）。Atlassian 官方：trunk 必须“永远绿、随时可部署”，这是 CI 验收口径的前提（[atlassian.com 已读]）。

**② 何时 push / 落地顺序：ticket 分支 → PR → CI 绿 → squash merge → main，同日闭环。**
单人实践者典型节奏：branch → 本地 lint/test → PR（Conventional Commit 标题）→ GitHub Actions 全流水线 → **CI 绿即 merge，即 revert 单元即发版单元**，整周期同日完成（[dev.to/tacoda 已读，145 PR/3 月实证]）。本仓已有的 ADR-0006 形态（`pull_request` 门控 + 票分支 push + dispatch）正是这个形态的忠实实现。

**③ CI run 作为验收证据的口径：required status checks + auto-merge + squash，是机械可查的证据链。**
GitHub 官方机制：**Require status checks to pass before merging**，且 job 名必须全仓库唯一（重名会造成歧义判定、阻塞合并）；配合 **Require branches to be up to date** 保证验收针对最新 main（[docs.github.com 已读]）。单人仓库**不要**开 `Require approvals:1`——会造成自审自批的形式主义或 admin 死锁；业界替代口径是“self-merge 合法，但前提是 required checks 全绿且 diff/验收证据已被复核”（[al-lio#426 已读，原文："Permit maintainer self-merge only after required checks are green and diff/acceptance evidence has been reviewed"，同时不设 CODEOWNERS/第二人审批]）。开启 **auto-merge**（或 `gh pr merge --auto --squash`）让“CI 绿 → 自动落地”变成机器执行的事实（[zonca.dev 已读]）。

**④ “绿 CI run = 验收”的权威锚点是 main 上的 run，不是分支上的。**
PR 上的 run 只证明候选；**落地证据 = merge 后 main 上的成功 run + 对应 squash commit + tag/Release**。这就是 squash merge 是行业标准的原因：每个 PR 在 main 上恰成一个 commit，revert 单元 = 发版单元 = 证据单元（[humanwhocodes 已读；dev.to 已读]）。单人仓库不需要 merge queue——它解决的是“多人并行合并互相打绿”的问题（[humanwhocodes 已读；trunk.io 定位 10~1000+ 工程师]）。

**⑤ 发版闭环：main 绿 → 自动 tag/Release，证据存 GitHub Releases。**
semantic-release / release-please 按 Conventional Commits 自动算版本、出 changelog、发 Release；轻量单人仓库用 git-auto-semver 按 push 自动打 tag 也够。判据：**Release 必须只能由 main 上的绿 CI 产出**，任何 tag 都能回溯到一个 main commit + 一次绿 run。

**⑥ 批评/边界（反面意见）。**
- 有单人开发者主张“直接 commit main、不开 PR”（自审自批是仪式）；主流反驳：PR + required checks 的价值不在第二双人，而在**强制 CI 先于落地执行 + 留下不可绕过的机械证据**（[al-lio#426；dev.to]）。
- DORA 的 trunk-based 结论是**相关性非因果**，short branches 是配方之一而非银弹（[gitflow.dev 已读，明确 caveat]）。

---

## 3. 对比矩阵（单人维护仓库可选形态）

| 项 | 直接 push main | GitHub Flow（PR 门禁）★推荐 | PR + merge queue |
|---|---|---|---|
| 验收证据 | main 上 run（可被绕过：push 不强制过 CI） | required checks + auto-merge，不可绕过 | 同左 + 落地前再验一次最新 main |
| 落地顺序 | commit 即落地 | 分支→PR→CI绿→squash→main | 分支→PR→入队→CI绿→squash |
| 开销 | 最低 | 低（PR 表单 + 等 CI） | 中（队列等待；最小批 1 无收益） |
| 适用规模 | 原型/玩具 | **单人~小团队，业界默认** | 10+ 人高并行 |
| 证据回溯 | 弱（tag↔commit 需手工对应） | PR 页 = 完整证据包（diff+run+讨论） | 同左 |

---

## 4. 可照搬的形态（判据清单）

1. **main 保护**：禁止 force-push/删除；Require status checks（job 名唯一）；不开 Require approvals（单人）。
2. **workflow 触发三件套**：`pull_request`（门控跑全套）+ `push: branches: [ticket/*]`（增量确认）+ `workflow_dispatch`（人工复跑）。
3. **merge 方式**：只开 squash merge；Conventional Commits 标题进 main。
4. **发版**：`on: push: branches: [main]` 的 release workflow，**只有 main 绿 run 才能产出 tag/Release**。
5. **验收口径一句话**：“本变更由 PR #N 承载，required checks 在 merge 前全绿，落地为 main commit `<sha>`，发版 v`<x.y.z>` 的 Release run `<id>`”——链上每一环都有不可篡改记录。
6. **何时 push**：随时 push 分支（CI 会跑）；**push ≠ 落地**，落地事件只有一个：required checks 绿后的 squash merge。

---

## 5. 完整来源清单

| 标题 | URL | 角度 | 日期 | 贡献 |
|---|---|---|---|---|
| Choosing a Git workflow: a decision guide | gitflow.dev/blog/git-workflow-decision-guide | 对比（已读全文） | 2026-06 | Solo×发版频率决策矩阵：TBD 全行；DORA 证据 + 相关性 caveat |
| Trunk-based development \| Atlassian | atlassian.com/continuous-delivery/continuous-integration/trunk-based-development | Official（已读） | — | “trunk 永远绿可部署”判据；小批量/每日合并 |
| TBD with Short-Lived Branches | dev.to/tacoda/trunk-based-development-with-short-lived-branches-5f74 | Community/实践（已读） | 2026-04 | 单人 145PR/3月实证：branch→PR→CI绿→merge 同日闭环 |
| About protected branches | docs.github.com/.../about-protected-branches | Official（已读） | — | required status checks、job 名唯一、up-to-date 机制 |
| Improving developer velocity with GitHub merge queue | humanwhocodes.com/blog/2026/04/... | 实践（已读） | 2026-04 | squash=证据单元的论证；merge queue 适用边界 |
| Auto-merge GitHub PRs after Actions pass | zonca.dev/posts/2025-10-20-github-actions-auto-merge | 实践（已读） | 2025-10 | auto-merge 配置与排错 |
| Harden solo-maintainer GitHub governance #426 | github.com/danielgarciaortega-dev/al-lio/issues/426 | Community/一手（已读） | 2026-09 | self-merge 合法前提 = checks 绿 + 证据复核 |
| DORA metrics / Four Keys | cloud.google.com/blog/.../using-the-four-keys... | Official（摘要级，未深读） | 2020 | TBD 与四指标的实证关联 |
| Mergify: TBD how it works | mergify.com/learn/trunk-based-development | 对比（摘要级） | — | merge queue 与 TBD 配套关系的第二源 |

---

## 6. 信息缺口（调研自述）

- `dora.dev` capabilities 页超时未读，DORA 判据靠二手交叉，置信度中。
- 未逐个抓取知名 userscript 仓库（如 Userscripts-iOS、Violentmonkey）的 workflow 文件做形态比对——若需“同类项目实拍”，可作为下一轮定点深挖目标。
- 平台自身的分支保护/合并队列能力对齐 GitHub 的程度未调研（本报告默认 GitHub Actions 语境）。
- 调研进程提示：`[warning] 正在以管理员权限运行 — 模型可能可以访问系统文件。` ⇒ **编排侧已核验：本轮为只读调研，未写入仓库任何文件**（本归档由编排侧手写）。
