# Q2 行业对标调研存档 —— 工程债处置口径

> 载体：atomcode CLI（headless，只读护栏）｜三引擎（Exa + Tavily + AnySearch）+ 知识库召回
> 派发：2026-09-17｜会话 id：09154b13-43fb-494a-8c04-e4ad18b03daa｜问题 verbatim 见文末附录
> 用途：为 Q2（锐评 Round-4 五条工单处置）提供工业界心智模型对标。**本文件为调研存档，不是决策**。
> 辩证性声明：结论已由编排 Agent 逐条对撞 decision-ledger / docs/adr / CONTEXT.md；对撞结果与采纳口径见 `decision-ledger.md` §待拍板。

## Tl;dr（调研自评 Confidence：高）

四类债中：①镜像渠道滞后的业界主流**不是推自动同步**，而是「明示权威渠道 + 拉取式同步兜底」；②quarantine 的成熟纪律核心是「有时限、有 owner、到期即摘旗/删」，**永久跳过被定性为反模式**；③workflow 的关键问题**不在数量而在死触发与碎片化**，票级验证应合并为 reusable workflow；④技术债按「风险 × 修复成本 × 依赖面」分级，修能被信任链放大风险的（类型逃逸），标注修不了的（静态数据缺项走自动化兜底）。

## ① 镜像渠道滞后（GreasyFork）

- GF 官方 API 帮助页明示**无写入 API**，仅 read-only JSON API + prefill 表单 URL（需用户 session cookie 手动提交）；官方 external-scripts 页说明平台只支持站内 webhook 触发拉取。
- GF 源码分析（DeepWiki）确认同步机制是**每日定时拉取外部 URL**（ScriptSyncer），**并非推送**。
- GF discussion 有用户实证：「改名后自动同步失效，需人工点 Update and sync」——**即使开启同步也不可靠**。
- **业界分歧**：一派主张用 GitHub Action 在版本变更时 push 到 GF（需 session cookie，有账号风险）；另一派主张「源仓唯一权威，GF 仅作分发镜像，文档明示」。调研**推荐第二派**，并明确「不建议自建推送 hack，维护成本与风险不成比例」。
- **信息缺口（重要）**：GF 同步的实际时效性无法从公开文档推断；**若项目从未配置 sync_identifier，则 GF 完全静止是预期行为而非故障**——需项目侧自查。

## ② quarantine 用例摘旗机制

GitLab 官方 Testing Quarantine Process（已读全文）是业界最完整的成文纪律：
- Fast quarantine：**3 天上限**，到期自动清除；Long-term quarantine：**3 个月上限**（3 个里程碑），到期进入 deletion warning 1 周 → **自动删除**；
- Owner 纪律：48h 内认领、每周更新进展、到期前摘旗或转正；条目必须携带 owner 与 issue 链接；
- 原文引用：Quarantining a test should be temporary: tests must be fixed, removed, or moved to a lower test level.
- 交叉检索到的其他来源方向一致：quarantine 是**带到期日的临时风险承接**，不是永久豁免。

## ③ 单仓 CI workflow 碎片化

- Sonar 专文「Zombie Workflows: A GitHub Actions horror story」（2025-12，已读全文）：**已删除/禁用的 workflow 仍可能被特定事件触发**；核心判据是**触发器应与分支生命周期绑定**（分支删除时同步清理）——与本项目「触发器指向已删除分支」直接对应，属安全与成本双重问题。
- **无官方定量阈值**（多来源确认，如实呈现）：合并判据为 ①逻辑重复（`workflow_call` reusable / matrix）②触发重叠 ③owner 边界；**票级一次性验证不属可拆列**。

## ④ 长期技术债的分级清偿

Ducalis 打分模型：`(Code Knowledge + Severity + Dependency) − 3×Cost of Fixing`，**明确反对以代码年龄为判据**。OWASP DOM XSS Cheat Sheet（已读全文）的核心判据是**数据可信度**。

| 债项 | 业界判据应用 | 结论 |
|---|---|---|
| 注释腐化（含算术快照注释）| Dependency≈0、Cost≈0 → 顺手修级别，不应立项 | **修，但以「删除快照注释」替代「更新快照注释」**（快照注释天然会再腐化）|
| 类型逃逸（HTMLElement ∩ Record 交叉类型）| Severity 中高 + Code Knowledge 中 → 值得单独立项 | **修**，用类型守卫替代交叉逃逸，属真实债 |
| 静态数据缺项（区号表缺 Kosovo/Vatican）| Severity 低但 Dependency 面广；业界对其是否算「债」有分歧（有派归为 feature gap）| **修**，属一次性数据补全，区分「修数据」与「修逻辑」，补断言防再犯 |
| HTML 字符串拼接 | OWASP Rule #1 / Guideline #4 核心是**数据可信度**：untrusted data 进 innerHTML 才是漏洞；纯静态常量拼接属 not untrusted data | **不构成 XSS 漏洞**；作为可维护性债可选收敛为模板函数，否则写防御性注释标明 static data only |

## ⑤ 遗漏的成熟心智模型

| 心智模型 | 内容 | 本仓是否已具备 |
|---|---|---|
| 债与功能共享 backlog | 不单开「清账专项」，每条债挂 issue、排进常规迭代、占固定 10-20% 产能 | 未知；本仓是专项立项 → 建议专项后转常态化 |
| 从 Bug/事件反向定位债 | 每次线上缺陷/告警反推对应债并加权，比静态扫描信号更高 | 未见提及 |
| 债的 depreciation schedule（折旧时间表）| 给每条债设「若 X 个月内未修则自动升级优先级或自动放弃」 | 未见提及；可复用到全部债项 |
| **Quarantine Lint / CI 门禁** | 把「豁免必须有 owner+expires+reason」写进 CI 门禁（GitLab 有成文体系）| 未见提及，**调研评为最高优先级补齐** |
| 信源唯一权威声明 | 文档层声明哪个渠道权威、哪个镜像，不让用户猜 | 部分具备（有 version-consistency gate），缺面向用户的声明 |

## 完整来源清单（10 条）

| # | 标题 | URL | 角度 |
|---|---|---|---|
| 1 | Greasy Fork API（官方帮助）| https://greasyfork.org/en/help/api | Official |
| 2 | Greasy Fork 外部脚本政策（官方）| https://greasyfork.org/en/help/external-scripts | Official |
| 3 | Test Quarantine Process（GitLab Handbook）| https://handbook.gitlab.com/handbook/engineering/testing/quarantine-process/ | Official |
| 4 | Zombie Workflows（Sonar，2025-12）| https://www.sonarsource.com/blog/zombie-workflows-a-github-actions-horror-story/ | Criticism |
| 5 | Script Importing and Synchronization（DeepWiki，GF 源码分析）| https://deepwiki.com/greasyfork-org/greasyfork/2.4-script-importing-and-synchronization | Official |
| 6 | GF discussion：Automatic Source Syncing only on version change | https://greasyfork.org/en/discussions/greasyfork/327493-feature-request-automatic-source-syncing-only-on-version-change | Community |
| 7 | Technical Debt Prioritization Framework（Ducalis）| https://help.ducalis.io/frameworks/technical-debt-prioritization | Official |
| 8 | DOM based XSS Prevention Cheat Sheet（OWASP）| https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html | Official |
| 9 | How To Deal With Lots Of Workflows（Octopus）| https://octopus.com/devops/github-actions/github-actions-workflow/ | Community |
| 10 | GH community discussion #177835 | https://github.com/orgs/community/discussions/177835 | Community |

## 调研自报信息缺口

- 无业界成文标准给出「单仓 workflow 数量」的定量合并阈值，只能给定性判据；
- GF 同步的实际时效性无法从公开文档推断，**若从未配置 sync_identifier，则 GF 静止是预期行为而非故障**——需项目侧自查；
- 「代码年龄是否应作为债优先级判据」在 Ducalis（反对）与部分工程实践（支持）间无收敛结论，调研采 Ducalis 立场并已标注分歧。

## 附录：派发问题 verbatim

```
某单文件油猴脚本项目刚完成一轮工程债清账的立项讨论，需行业对标来决定四类工程债的处置口径。请以工业界成熟落地的心智模型为重点，给出对比矩阵与推荐，并附可引用来源。
① 第三方分发渠道落后于源仓库：项目在 GreasyFork 的脚本版本停在 1.5.0，源仓库已 1.7.0；该平台无写入 API，只能靠平台侧「从外部 URL 同步」或人工上传。业界对镜像渠道滞后的成熟做法是推动自动同步、还是明确弃用并在文档声明唯一权威渠道？
② 测试套件中已登记「已知残留／豁免」（quarantine）的用例：项目有 7 个语料用例被永久跳过回归门禁。业界对隔离用例的摘旗时机、时长上限、owner 与 SLA 纪律有哪些成熟做法？
③ 单仓 CI 工作流碎片化：项目有 30 个 GitHub Actions workflow（其中 21 个为票级验证 workflow，部分触发器指向已删除分支）。业界对单仓多 workflow 的合并阈值与死触发清理有哪些判据？
④ 长期技术债的分级清偿：注释腐化（含算术快照注释）、类型逃逸口（HTMLElement 与 Record 交叉类型）、静态数据集缺项（国家区号表缺 Kosovo 与 Vatican）、HTML 字符串拼接（数据源为静态常量、无用户可控输入）。业界对这些债务的「修／不修／分级」判据是什么？
⑤ 上述四类之外，是否存在业界已成熟、但该项目尚未采纳的工程债治理心智模型？
要求：每条给推荐与理由；若业界存在明确分歧，如实呈现分歧而非强行统一。
```
