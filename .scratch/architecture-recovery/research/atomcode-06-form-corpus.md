# atomcode 深度调研记录 — 票 06（形态语料三层架构）

> 载体：atomcode 无头模式 `-p`（串行护栏：同一时刻 1 个在途）
> 会话：首跑 `993d204d-b1e4-4ee2-bea4-0df4f67e489f`（配额受限中止）→ 配额恢复后重跑（新会话）
> 结果：ctx_batch_execute 索引 5 节 / 9.7KB ｜ 日期：2026-09-16 ｜ 覆盖：A-030
> 数据源纪律：本节结论来自 atomcode 调研 + 本仓库实物核对；外部事实按 observed / cited / reproduced / candidate 标注。

## 调研问题（verbatim，未附加角度提示）

见 `prompt-06-atomcode.md`（原文）。核心：如何把第三方公开网页的表单形态冻结为可入库的自有语料（镜像页 + 结构骨架 + 库外原始快照 + 指纹与来源清单），并设计站点改版的确定性退化检测回路（重捕 → 结构 diff → 分级版本 → 回放自检）。

## 执行备注（偏离点）

首跑即触发配额限流（`[rate-limited] 5h window exhausted — resets around 18:17`）。按 atomcode-research 的**额度耗尽例外**（唯一不续跑情形）不续跑、不重开等价调研；配额窗口恢复后以同一 verbatim 问题重跑，一次成功。**期间未并行发起第二个调研**（串行护栏照守），亦未杀任何进程。

## Sufficiency Gate（atomcode 自查）

三引擎（Exa / Tavily / AnySearch）5 角度（Official / Comparative / Criticism / Currency / Community）7+ 查询 + 定点深挖原文核验（web_fetch ≥6）；关键结论均 ≥2 独立信源。**总体 Confidence：高**（atomcode 自评）。

## 1 执行摘要（cited）

业界成熟做法可归纳为「**四层语料 + 一条退化回路**」：

- **库内入 git**：① 本地镜像页（去品牌 / 内容替换的可复现 HTML）② 结构骨架（ARIA / 字段拓扑）③ 指纹与来源 manifest（SHA-256 + `source_url` + `captured_at`）。
- **库外**：原始快照（SingleFile 单文件 HTML / WARC+WACZ 档案 / 截图）+ 哈希指针。
- **退化回路**：定期重捕 → 结构化 diff（ARIA 树 / CSS 骨架，**非像素**）→ 分级版本（patch / minor / breaking）→ 回放自检 → 低频 advisory 冒烟。

## 2 分点结论与本地裁决

### 2.1 库内 / 库外分层是共识性边界（cited → 本票已落地）

- 快照大宗二进制入库会导致 git 膨胀（Screenshotbot 量化：100 个全量变更 commit ≈ 5GB，超 GitHub 免费上限）；成熟解法是**库内只存 JSON 指纹映射（fixture → SHA-256），二进制本体出库**，哈希未变即通过。
- WACZ（WARC + 索引 + page list + metadata 打包）是「原始快照层」的档案金标准，可随机访问回放；但 JS 渲染页静态存档回放可能白屏，故镜像页须是 **capture settled HTML** 形态。
- **本地裁决**：本票库内层 = `mirrors/` + `skeletons/` + `manifest.json`；库外层 = 仓库外 archive（raw HTML + 渲染后 DOM + 截图 + `CAPTURE-MANIFEST.json`）；**未引入对象存储/S3**（D-008 硬约束），复用既有仓库外 archive 模式——与调研的「指纹 + 库外本体」结构同形，只是库外载体由 S3 降级为本地 archive（本仓库无基础设施）。

### 2.2 结构骨架的官方范式 = ARIA snapshot，而非像素 diff（cited → 本票部分采纳）

- Playwright 官方 `expect(page).toMatchAriaSnapshot()`：YAML 无障碍树，支持部分匹配 / 严格匹配 / regex 占位稳定动态文本；`--update-snapshots` 产出**可 review 的 patch 文件**，天然承载「分级版本」评审。官方明示分工：快照管结构 · `toHaveScreenshot` 管视觉 · 断言管单点。
- 批评侧（一手）：快照测试失效模式 = 「大快照无人 review + 环境不稳定输入导致假 churn」；解法是**只快照确定性已稳定的层**、regex 抽象动态文本、**按组件切片小范围快照**。
- **本地裁决（部分采纳 + 理由）**：本票**未直接采用** `toMatchAriaSnapshot`，改用自研内容无关结构树（`06-skeleton.mjs`），三条理由：① 本票骨架同时服务**站点改版 diff**（需跨两次独立捕获比对两份落盘文件），而 `toMatchAriaSnapshot` 是**断言式**（在当前运行内比对），两者形态不同；② 调研「按组件切片」纪律已采纳（骨架根 = form region selector，非整页）；③ 调研「regex 抽象动态文本」纪律已采纳（文本 → 形状令牌 `#`/`a`/`+`）。**登记为候选升级路线**：未来若要断言式结构门，可叠加 `toMatchAriaSnapshot`。

### 2.3 退化检测回路的分级与触发（cited → 本票已落地，分级口径对齐）

- 检测侧成熟工具：changedetection.io（自托管，Playwright fetcher + CSS/XPath/JSONPath 过滤 + 逐词 diff）与 urlwatch（CLI + YAML）。
- 版本分级：结构 diff 命中后按 **字段增删（breaking）→ 属性/层级变化（minor）→ 文本类变化（patch）** 分档；breaking 进修复队列，patch 走重捕静默更新。
- **本地裁决**：本票 `06-structural-diff.mjs` 的四档 `none / patch / minor / major` 与调研的 `patch / minor / breaking` **口径对齐**（`major` ≙ `breaking`；新增 `none` 表达「内容替换不触发」）。**重捕调度未引入第三方服务**（changedetection.io / urlwatch）：本仓库无常驻服务基础设施，重捕保持**显式命令**（`06-capture-forms.mjs`），调度留给后续周期（真实站点层已有周频 `schedule` 先例）。

### 2.4 版权与合规边界（cited → 本票已落地）

- 原始快照即便私有仓库也等同**分发第三方作品副本**；库内层必须内容替换/归零，manifest 记录来源 URL + 捕获日期 + license note。
- **本地裁决**：本票 `mirror` 层全量去品牌 / 去追踪 / 内容替换（可见正文零品牌 token，结构门 S3 钉住）；manifest 每条含 `source_url` / `captured_at` / `mirror_of` / `license_note`；原始快照出仓（结构门 S4 钉住）。

## 3 对比矩阵（语料捕获与改版检测工具）

| 项 | 捕获/检测形态 | 库内占用 | 适用环节 | 备注 |
|---|---|---|---|---|
| SingleFile (+CLI) | settled 单文件 HTML，全资源内联 | 0（库外） | 原始快照层主力 | 开源、无扩展依赖可离线打开 |
| Browsertrix + WACZ | 浏览器级 crawl → WARC/WACZ | 0（库外档案） | 定期重捕 + 合规档案 | 随机访问回放、自描述元数据 |
| changedetection.io | 自托管监控 + Playwright fetcher | 0（独立服务） | 退化检测触发器 | 34.3k★；2026 新增 AI diff 摘要 |
| urlwatch | CLI + YAML，条件请求 + 过滤 | 0 | 轻量重捕调度 | 2024-10 仍在维护（2.29） |
| Playwright `toMatchAriaSnapshot` | ARIA 树 YAML，patch 入库 | 极小 | 结构骨架 + 分级版本 | 官方方案；`-u` 生成可评审 patch |
| Screenshotbot 模式 | JSON 指纹映射 + 对象存储 | 仅 SHA-256 | 指纹清单 + 库外快照 | 证明 git/LFS 直存不可扩展 |

## 4 来源清单（atomcode 原始编号）

| # | 标题 | 角度 | 贡献 |
|---|---|---|---|
| S1 | Snapshot testing — Playwright 官方文档 | Official | `toMatchAriaSnapshot` 全 API、patch 更新机制（全文核验） |
| S2 | dgtlmoon/changedetection.io GitHub | Official | 过滤器 / Playwright fetcher / Browser Steps |
| S3 | urlwatch — thp.io | Official | CLI 监控、CSS/XPath 过滤 |
| S4 | Snapshot testing in 2026: when it helps, when it lies | Criticism | 快照失效模式与稳定化纪律 |
| S5 | SingleFile 官网 | Official | 单文件捕获 + CLI 批量捕获 |
| S6 | ReplayWeb.page — Webrecorder | Official | WACZ 按需回放 |
| S7 | WACZ spec（LC 格式条目） | Official | WACZ 规范定位与自描述性 |
| S8 | Can Git LFS scale for screenshot tests? — Screenshotbot | Criticism | SHA-256 指纹 + 对象存储（5GB 量化证据） |
| S9/S10 | 2026 网站变更检测工具横向对比（Visualping / PageCrawl / Context） | Comparative | 工具横向对比（Tavily 交叉） |
| S11 | Mozilla Fathom（GitHub） | Official | FathomFox 语料采集范式；已弃用 |
| S12 | 知识库召回：本主题历史调研 + 本仓库 corpus 管线 | 本地 | 目录布局模板、版权边界、三层测试塔 |

## 5 信息缺口（atomcode 自报）

- 未取得 **WACZ 实际生成工具**在 Windows 宿主上的可用性实测（Browsertrix 需 Docker）；本票因此**未产出 WARC/WACZ**，原始快照层用 raw HTML + 渲染后 DOM + 截图承载（登记为偏离点）。
- changedetection.io / urlwatch 的**调度集成**未实测（无常驻服务）；登记为后续周期候选。
