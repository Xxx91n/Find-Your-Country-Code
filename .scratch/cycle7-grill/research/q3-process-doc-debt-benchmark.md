# Q3 行业对标调研存档 —— 过程与文档类债

> 载体：atomcode CLI（headless，只读护栏）｜会话 id：277fa0dc-6aeb-42a5-bc4d-3c5178268acb
> 派发：2026-09-17｜问题 verbatim 见文末附录｜调研自报配额：searches 11 · full reads 4 · 信源域名 12+
> 用途：为 Q3（backlog `B-5…B-15` 处置）提供工业界心智模型对标。**本文件为调研存档，不是决策**。
> 辩证性声明：结论已由编排 Agent 逐条对撞 decision-ledger（D-001…D-005）/ docs/adr / CONTEXT.md；对撞结果见 `decision-ledger.md` §待拍板。

## 执行摘要（调研自评 Confidence：②③⑤⑥ 高 · ④ 中高 · ① 中）

六项债的共同病根是「**断言没有锚定在可机器校验的事实源上**」：文档引用已死选择器（①）、报告陈述与票据相反（⑤）、审计报告不随台账走（⑥）属同一类漂移；②③④则是「**把监控当门禁、把环境差异当不变量、把宿主资源当自家地盘**」。

## 对比矩阵

| # | 问题 | 业界主流机制 | 推荐强度 | 业界分歧 |
|---|------|------------|---------|--------------|
| ① | 文档与实现漂移 | 可执行文档 / 选择器契约（`data-testid`）+ CI lint / 从源生成 | 强 | 有：手写文档派 vs 生成派 |
| ② | 第三方实时监控入 gate | gate＝确定性、与 PR 相关；monitor＝非阻塞、可 fail | 强 | **无实质分歧** |
| ③ | 墙钟性能断言 | 统计基线 / 相对比较 / 分位数 / 隔离化或移出门 | 强 | 有：绝对阈值是否可为烟雾级底线 |
| ④ | 向宿主控制台输出 | 静默默认 / 命名空间可开关 / 前缀 / 独立通道 | 强 | 有：error 级是否可直接写 |
| ⑤ | 报告与票据相反 | 证据锚点强制（机器校验勾销数）、单一事实源 | 强 | **无** |
| ⑥ | 陈旧文档处置 | 归档标注（date-stamp / status: superseded/deprecated）> 删除 > 保留原样 | 强 | 有：delete 派 vs date-stamp 派（适用对象不同）|

## ① 验收文档与代码脱节

防治机制按**可靠性排序**（datadef.io 明确给出）：
- **可执行文档 / 从源生成**（最可靠）：文档无法漂移，只能构建失败。菜单命令数（4 vs 文档 2）正是「应从代码生成的计数」——lint 脚本 grep 源码比对文档数字，不一致即 CI 红。
- **选择器契约**：业界共识用 `data-testid` 等稳定契约属性作为文档/测试/Agent 共享契约（Augment Code 称其为 contract between the two roles；Playwright 官方建议 `testIdAttribute: data-testid`）。**文档引用已删选择器＝契约失效**，说明该选择器未成为代码与文档共同引用的常量。
- **文档 lint / 漂移 CI 规则**：被标记目录变更而配对文档未变时 PR 失败，作者写一行解释。
- **分歧如实呈现**：手写文档派（保留 why/guide/caveat 手写价值，事实部分机器校验）vs 生成派（机器可生成的绝不手写）。小项目折中＝手写文档 + 事实断言 CI 校验，成本最低。

## ② CI 门控范围

**推荐：移出 `pull_request` 门控**，作为 scheduled workflow 运行，结论以 issue/dashboard 发布，允许失败。

| 判据 | Gate（门禁）| Monitor（监控）|
|------|-------------|----------------|
| 结果是否随 PR 内容变化 | 是 | **否** |
| 信号源是否确定 | 确定性（编译/单测/lint）| **非确定（第三方站点/实时状态/时间）** |
| 失败的可行动性 | 作者可在 PR 内修复 | **作者无能为力** |
| 消费方式 | 阻塞合并 | **报警/趋势/开 issue** |

引文：dev.to 模型调用案例「Blocking a merge because the model is temporarily slow is usually wrong」；mill-build（Li Haoyi）核心论点「不可控的失败会摧毁 CI 信任，使开发者学会无脑重跑，真实回归反而被掩盖」。

## ③ 时序敏感断言

**推荐：从 gate 移除裸绝对阈值**；改为相对比较或移到非阻塞性能作业；若断言意图是「无数量级退化」，用宽松烟雾阈值（如 < 500ms）+ CI 专用基线。

- 本案例特殊性：**CI 反而通过、本机空载不通过** → 阈值是在某个特定环境标定的且对环境极敏感。
- Bencher 官方文档两模式：Statistical（历史基线 + t-test/百分比边界）与 Relative（同一 CI 环境内 main 与 feature 并排对比，**专为 noisy CI 环境设计**）。
- arXiv 2212.00908（同行评审多声部综述）将「Inconsistent assertion timing」列为独立 flaky 成因类。
- **研究明确定性**：本项目 50ms 阈值按实测裕度只有 ~30%，**远低于噪音波动，属标定失败**（两头不讨好的中间态）。
- **分歧**：一派认为任何墙钟断言都不该进阻塞门；另一派（含 Microsoft testfx issue #10899 讨论方向）保留**极宽松**绝对阈值作烟雾底线（如慢 10 倍才红）。

## ④ 向宿主控制台输出

**推荐：默认静默**；保留输出则改为可门控 + 脚本名前缀；正式诊断通道用 `GM_log`。

- 库规范两源一致（npm `debug` + LogTape）：**库不应替宿主决定日志行为**；`debug` 默认完全静默、由使用者经 `DEBUG` 命名空间开启，且**库必须用自身名字做前缀**；LogTape 明确库作者不得 `configure()`。
- userscript 专属惯例：Greasemonkey 生态提供 `GM_log` 独立通道，开发者指南直言 debug 日志 should be taken out before release。
- **分歧**：`console.error`（真错误、无法送达用户时）业界有宽容；`warn`/`info` 级共识是静默默认 + 显式开启。

## ⑤ 过程证据一致性

**推荐：消除人工誊抄层**——报告中的勾销数字由票据机器生成/校验并纳入 CI；无脚本则至少双人复核。

- 样板：foxBMS `trace-gen.py`（生成追溯矩阵 + `--check` 模式断链即退出码 1 进 CI）；其治理哲学是 generated matrix（**生成物不能说谎，只能过时**）。
- 铁律（sdlc-rstack Evidence Center）：**never derives a pass from missing browser data**——unknown 是一等状态，**绝不被静默合并为 pass**。
- 最小改造：一个 < 50 行的校验脚本（解析票据勾销标记 → 与报告自述数字比对 → 不一致即失败）。

## ⑥ 陈旧审计报告

**推荐：加时点标注 + 状态标注（`superseded-by`），保留原文。**

- 业界分歧的实质：处置取决于文档类型。datadef 四分桶——设计文档/决策记录/postmortem 属「**关于过去的真实陈述**」，加可见日期 + 一行横幅即可停止误导；delete 派针对的是「**声称描述现状**却过时」的指南/手册。
- WhyChose：「delete removes the evidence that the decision existed, which is precisely what the ADR practice is designed to preserve」。
- MADR 状态词汇（MADR + WhyChose + specscore lint 三源一致）：`Deprecated`（上下文消失）/ `Superseded`（被新决策替代，**需双向指针** `Superseded-by` / `Supersedes`），原文 Context/Decision 不动，变更经 Status 字段 + 带日期 Notes。
- 何时才删：文档无人读 **且** 描述对象已不存在 **且** 无历史价值——三者缺一不可。

## 完整来源清单（17 条）

| # | 标题 | URL | 角度 |
|---|---|---|---|
| 1 | Stale documentation playbook — Datadef | https://datadef.io/guides/en/stale-documentation | Official/方法论 |
| 2 | When to Retire an ADR — WhyChose | https://whychose.com/seo/when-to-retire-an-adr | Official/方法论 |
| 3 | About MADR — ADR GitHub org | https://adr.github.io/ | Official |
| 4 | Why AI Coding Agents Fail E2E Tests — Augment Code | https://www.augmentcode.com/guides/why-ai-coding-agents-fail-e2e-tests | Official |
| 5 | Writing Scene Specs — Scenetest | https://scenetest.msnook.xyz/guides/writing-scene-specs | Official |
| 6 | How To Manage Flaky Tests — Mill (Li Haoyi) | https://mill-build.org/blog/4-flaky-tests.html | Official/社区 |
| 7 | How to Quarantine Flaky Tests — FlakyGuard | https://flakyguard.com/blog/how-to-quarantine-flaky-tests | Community |
| 8 | CI Treats Free-Model Output Like a Flaky Dependency — dev.to | https://dev.to/gitlab_3188/ci-treats-free-model-output-like-an-integer-its-actually-a-flaky-dependency-58nb | Community |
| 9 | Track Benchmarks in CI — Bencher | https://bencher.dev/docs/how-to/track-benchmarks/ | Official |
| 10 | Bencher in GitLab CI/CD | https://bencher.dev/docs/how-to/gitlab-ci-cd/ | Official |
| 11 | Test flakiness multivocal review — arXiv 2212.00908 | https://arxiv.org/pdf/2212.00908 | 学术 |
| 12 | testfx issue #10899（硬编码时长断言）| https://github.com/microsoft/testfx/issues/10899 | Criticism |
| 13 | debug — npm 官方 README | https://www.npmjs.com/package/debug | Official |
| 14 | Using in libraries — LogTape | https://logtape.org/manual/library | Official |
| 15 | Logging with GM_log — Dive Into Greasemonkey | https://docs.huihoo.com/greasemonkey/dive-into-greasemonkey/debug/gm_log.html | Official |
| 16 | Traceability Guide — foxBMS trace-gen.py | https://sil.taktflow-systems.com/bms-docs/traceability-guide.html | Official |
| 17 | Evidence Center — sdlc-rstack | https://sdlc-rstack.mintlify.app/business-hub/evidence-center | Community/方法论 |

## 调研自报信息缺口

- **④ userscript 惯例**：一手资料主要是 Greasemonkey 时代经典文档（较老），现代 Tampermonkey/Violentmonkey 社区对 `console.warn` 的最新共识缺 2025+ 独立信源；但 debug/LogTape 的库规范与 GM_log 惯例方向一致。
- **③ 的分歧量化**：「烟雾级绝对阈值」一派缺少专门方法论文章，未找到「绝对阈值裕度应设多大」的定量规范。
- 本会话为**纯外部调研**，未读取项目内部文件；⑤⑥ 的判断基于题面描述的事实。

## 附录：派发问题 verbatim

```
某单文件油猴脚本项目（TypeScript 与 vite-plugin-monkey，产物单 userscript）正在做一轮工程债清账，其中「过程与文档类债」有六项需要行业对标。请以工业界成熟落地的心智模型为重点，给出对比矩阵与推荐，并附可引用来源。
① 权威验收文档与代码脱节：项目的验收面文档引用了一个已被删除的 DOM 选择器（另有一处称「菜单命令 2 条」而实物为 4 条）。业界对「验收约定与实现漂移」有哪些成熟防治机制（可执行文档、选择器契约、文档 lint、单一事实来源）？
② CI 门控范围：一个只读的「版本对齐监控」workflow（其结论取决于第三方站点的实时状态、与 PR 内容无关）是否应纳入 pull_request 门控？业界如何区分 gate 与 monitor，判据是什么？
③ 时序敏感断言：项目有一道门断言「某操作 100000 次小于 50ms」，在本机空载实测 63-71ms（红），CI 上通过。业界对基于墙钟时间的性能断言有哪些成熟治理（相对比较、统计化、分位数、CI 专用基线）？
④ 库或脚本向宿主环境输出日志：该 userscript 有一处 console.warn 会写入宿主页面控制台。业界对 userscript、浏览器扩展、库向宿主控制台输出有哪些规范（静默、可门控、前缀、独立通道）？
⑤ 过程证据一致性：项目的票据文件勾销状态（0/5）与对应报告的自我陈述（5/5 已勾销）相反。业界对「交付证据与报告陈述不一致」有哪些成熟治理（证据锚点强制、双人复核、机器校验）？
⑥ 历史文档的陈旧标注：一份审计报告停留在旧结论，未随台账更新。业界对过期文档是标注时点、归档还是删除？
要求：每条给推荐与理由；若业界存在明确分歧，如实呈现分歧而非强行统一。
```
