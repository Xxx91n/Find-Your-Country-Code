# Q6 行业对标存档 —— 第三方分发平台自动同步的发布确认责任与时点

> **调研问题（verbatim）**：浏览器用户脚本在第三方分发平台上的自动同步与发布确认，业界通常由谁在什么时点确认、如何留痕？全景调研，给出可照搬的责任与时点判据。
> **载体**：`atomcode -p`（Exa + Tavily + AnySearch + Patchright；只读联网）｜**日期**：2026-09-18｜**Cycle-8 grill**
> **Sufficiency Gate**：searches 7（Exa×2 / Tavily×2 / AnySearch×2）｜angles：Official、Comparative、Criticism、Community（4 类）｜full reads 8｜**置信度：高**（核心结论均有官方文档 + 独立信源双重支撑）
> **归档纪律**：本文**只存调研输出**；编排侧对账见 `.scratch/cycle8-grill/decision-ledger.md`。

---

## 1. 执行摘要（Tl;dr）

业界共识是：**分发平台不做发布前人工确认，确认责任 100% 落在脚本作者自己身上，且确认时点被前移到“源仓库的版本变更”处**——即通过 release 分支、GitHub Action 只在版本号变更时触发同步、或 release-please 的 Release PR 合并来充当确认门。留痕则靠三层叠加：平台端版本历史（每个 ScriptVersion 独立存档、记录同步时间与错误）+ Git 侧 tag/commit/PR review +（进阶）npm 式 provenance 不可变证明。

---

## 2. 分点结论

**① 平台侧：无人工审核门，同步即发布（官方文档 + 源码分析，双源）**
同步有三种模式：Manual（仅手动触发）、Automatic（每天自动检查一次）、Webhook（push 即触发）。同步过程自动下载、比对、创建新 `ScriptVersion` 并**立即发布**，平台不插入任何人工审批环节。

**② 平台留痕机制是内建的（源码级确认）**
每个脚本存有 `sync_identifier`、`sync_type`、`last_attempted_sync_date`、`last_successful_sync_date`、`sync_error` 字段；代码有变化才生成新版本，无变化只刷新同步日期。版本页保留每个版本的完整代码与 changelog —— 平台侧的天然审计日志。

**③ 谁确认：作者本人，确认门被社区惯例前移到“版本变更”时点（官方版主 + 社区双源）**
Greasy Fork 站长 JasonBarnabe 在官方讨论区的建议是典型答案：**“用一个 release 分支，让 Greasy Fork 只从 release 分支拉取”** —— 把“合入 release 分支”作为发布确认动作。等价方案：“用 GitHub Action，只在版本变化时才生成 push 到 Greasy Fork”。这是社区对“自动同步何时该有人确认”的事实标准答案。

**④ 通用 CI 发布流：确认者 = 有权合并 Release PR 的人 / environment 审批人（官方文档）**
GitHub environments 机制提供可照搬的审批原语：**Required reviewers（最多 6 人/组，任一人批准即可放行，可开 Prevent self-review 禁止自批）** + wait timer + 部署分支白名单。release-please 模式则把确认变成“合并一条 Release PR”——PR 本身自动汇总 changelog，作者审阅后合并即触发发布，"leaves a nice audit trail of your releases……Automatically"。

**⑤ 进阶留痕：npm Trusted Publishing = 授权绑定 + 不可变 provenance（官方文档）**
OIDC 可信发布把“谁被授权发布”写死为具体的 repo+workflow+environment 组合，每次发布自动生成 provenance 证明（绑定确切 commit 与构建流水线）；`npm stage approve` 这类审批动作**强制要求人工在场认证，不能用 OIDC 令牌代办** —— 平台层面强制“发布确认必须是人”。业界最强的“责任绑定+留痕”范式（OpenSSF 标准，PyPI/RubyGems 同构）。

**⑥ 对照组：Chrome Web Store 是“平台审核者作为第二确认人”的反例模型（官方文档）**
每个新版本都必须提交审核（通常 3 天内），审核通过后作者可选 "Defer publish" —— **审核通过 ≠ 发布，作者还有最长 30 天的手动发布窗口**。责任链：作者上传（第一确认）→ 平台审核（第二确认）→ 作者决定发布时机（第三确认）。用户脚本平台没有中间那道，因此前两道确认全部由作者承担。

**⑦ 反面案例：确认门缺失的代价 —— The Great Suspender（HN + 安全厂商 + arXiv 论文，多源）**
2021 年该项目维护权转移后，新维护者通过**自动更新通道**推送恶意代码，200 万用户中招。HN 讨论的核心教训：扩展/脚本开源可审计 ≠ 安全，因为 "git hash 会随新（后门）代码更新" —— 自动更新链上真正关键的是**谁拥有同步源、确认门设在哪个分支**。

---

## 3. 对比矩阵

| 项 | 确认人 | 确认时点 | 自动同步触发 | 留痕方式 |
|---|---|---|---|---|
| Greasy Fork（平台原生） | 作者（无平台审核） | 无强制门；惯例=版本变更 | Manual / 每日 Automatic / Webhook | 平台版本历史 + 同步日期/错误字段 |
| 社区最佳实践（release 分支 / Action 版本门控） | 维护者合并 PR 或跑手动 workflow | **仅在版本号变更时** | 同步源指向 release 分支/tag | Git tag + PR review + 平台版本历史 |
| GitHub Environment 审批 | Required reviewers（可禁自批） | 部署 job 运行前阻塞等待 | 需审批通过后才执行 | Deployment status 对象 + 审批记录（API/GraphQL 可查） |
| release-please 模式 | 有 Release PR 合并权的人 | 合并 Release PR 的那一刻 | 合并后自动打 tag 触发发布 | 自动 changelog + PR + tag |
| npm Trusted Publishing | workflow 配置授权 + stage approve 强制真人 | 发布时 OIDC 绑定 commit；审批需人在场 | CI 内自动 publish | Provenance 证明（不可变，绑定 commit+workflow） |
| Chrome Web Store（对照） | 作者 + 平台审核员 | 每版本上传时提交审核 | 无（每版必审） | 审核状态 + 通知邮件 + 30 天暂存窗口 |

---

## 4. 可照搬的责任与时点判据

1. **确认人判据**：能向源仓库 default/release 分支合并代码的人 = 发布确认人。个人项目是作者本人；团队项目把发布确认收敛到有 release 分支合并权的维护者。
2. **确认时点判据**：以 **版本号（`@version`）变更**为唯一发布门。自动同步只允许跟随 release 分支或 tag，**绝不跟随 main** —— 这同时是 JasonBarnabe 官方建议与社区 Action 通行做法。
3. **留痕判据（三层）**：① Git 层——tag + changelog；② CI 层——发布 workflow 的 run 日志 + 可选 environment required reviewers 审批记录；③ 平台层——版本历史天然存档每个 ScriptVersion 的代码、changelog、同步时间与错误，无需额外建设。
4. **风险红线**：绝不让自动同步跟随“维护权可能易手的上游”（The Great Suspender 教训）；多发布者时用 environment 防自批 + 白名单分支兜底。
5. **可选进阶**：若脚本同时发 npm/CDN，采用 trusted publishing + provenance，把“这次发布来自哪个 commit”变成不可变证据。

---

## 5. 完整来源清单

| 标题 | URL | 角度 | 日期 | 贡献 |
|---|---|---|---|---|
| Greasy Fork external scripts 政策 | greasyfork.org/en/help/external-scripts | Official | 持续更新 | 平台外部代码原则：用户必须能检查代码 |
| DeepWiki: Script Importing & Synchronization | deepwiki.com/greasyfork-org/greasyfork/2.4 | Official（源码分析） | 2025-05 | 同步机制、留痕字段、无审批门的证据 |
| Greasy Fork 讨论 #327493 | greasyfork.org/en/discussions/greasyfork/327493 | Community+Official | 2026-05 | 版主 JasonBarnabe 的 release 分支确认方案 |
| Greasy Fork 讨论 #57188 | greasyfork.org/en/discussions/greasyfork/57188 | Community | 2019-2021 | 三种同步模式、每日检查、"代码变才建新版本" |
| GitHub Docs: Managing environments | docs.github.com/en/actions/.../manage-environments | Official | 持续更新 | Required reviewers / 防自批 / 部署分支白名单 |
| npm Trusted Publishing | docs.npmjs.com/trusted-publishers/ | Official | 2026-09 | OIDC 授权绑定、provenance、审批需人在场 |
| Automating GitHub releases with Release Please | ferrishall.dev/automating-github-releases-with-release-please | Community | 2024-12 | Release PR 合并即确认 + 自动审计线索 |
| Chrome Web Store: Update your item | developer.chrome.com/docs/webstore/update | Official | 持续更新 | 每版必审 + defer publish 30 天窗口（对照组） |
| HN: The Great Suspender maintainer malicious | news.ycombinator.com/item?id=25622015 | Criticism | 2021-01 | 自动更新链确认门缺失的失效案例 |
| OpenUserJS Beginners HOWTO | openuserjs.org/about/Userscript-Beginners-HOWTO | Official | 持续更新 | 第二平台立场：源码可查即信任基础 |
| arXiv 2503.04292 恶意浏览器扩展研究 | arxiv.org/html/2503.04292v1 | Official（论文） | 2025-03 | Great Suspender 事件学术定性 |

---

## 6. 信息缺口（调研自述）

- OpenUserJS 的同步具体频率与是否支持 webhook，官方未细写（其开发近于停滞）。
- 企业环境下的 SLSA 三级+（hermetic build、double review）实践对个人脚本作者超配，未展开。
- 平台是否有计划内建“仅版本变更才同步”选项：版主只给了 workaround，官方 roadmap 无公开信息。
- 调研进程提示：`[warning] 正在以管理员权限运行` ⇒ **编排侧已核验：本轮为只读调研，未写入仓库任何文件**。
