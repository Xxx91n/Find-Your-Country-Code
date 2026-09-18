# Q5 行业对标存档 —— 站点级质量门槛的可测化与抽样预算

> **调研问题（verbatim）**：业界如何为「每千站点误报率」这类站点级质量门槛做可测化标定与抽样预算设计？全景调研，给出可照搬的抽样方案与判据。
> **载体**：`atomcode -p`（Exa + Tavily + AnySearch + Patchright；只读联网）｜**日期**：2026-09-18｜**Cycle-8 grill**
> **Sufficiency Gate**：searches 12（Exa×4 / Tavily×3 / AnySearch×5）｜angles 全五类（Official：SRE Workbook / Wikipedia / arXiv / Chrome 文档；Comparative：CodeQL vs Semgrep、SAST 40-60% FP；Criticism：alert fatigue / Clopper-Pearson 过保守 / Goodhart；Currency：2025-2026；Community：unofficialgoogledatascience / GitHub / StackExchange）｜full reads 10｜**置信度：高**
> **归档纪律**：本文**只存调研输出**；编排侧对账见 `.scratch/cycle8-grill/decision-ledger.md`。

---

## 1. 执行摘要（Tl;dr）

业界没有叫“每千站点误报率”的标准指标，但它本质是**稀有二项事件的站点级 FPR**，标定与抽样设计在四个成熟领域（SRE SLO 门禁、反欺诈/AML 人工复核、T&S 内容审核、SAST 静态扫描门禁）各有一套可直接照搬的做法，统计学底座完全一致：**rule of three 定零事件上界 → Wilson/stratified Wilson 区间替代正态近似 → 抽样量由“CI 上界必须低于门槛”反推，而非由点估计反推**。

---

## 2. 分点结论

### 结论 1：抽样量的第一性判据——「零事件上界」而非「点估计」

核心公式（rule of three，[Wikipedia](https://en.wikipedia.org/wiki/Rule_of_three_(statistics))，已读原文核验）：若 n 个样本中 0 次误报，则真实误报率 p 的 95% CI 上界为 **3/n**。

**直接可照搬的判据**：要证明“每千站点误报率 < 1‰”，零误报要求 n ≥ 3/0.001 = **3000 个站点**；要有余量地证明 < 0.5‰，则需 6000。若观察到 k 次误报，上界用 Wilson/Clopper-Pearson 而非 3/n。这条判据在疫苗临床试验、SLO 错误率门禁、SAST 验收中同构使用。

### 结论 2：小样本下必须用 Wilson 族区间，正态近似在 ~10 万样本前不可靠

Google 数据科学博客（[unofficialgoogledatascience.com](https://www.unofficialgoogledatascience.com/2019/08/estimating-prevalence-of-rare-events.html)，已读原文）的蒙特卡洛结论：

- **正态近似 CI 在样本量 ~100,000 之前覆盖度差**——对 1e-3 量级门槛是致命的；
- **Jeffreys CI 在小样本时 under-cover**；
- **分层 Wilson（stratified Wilson）CI 覆盖度 ≥ 名义值、略保守**，约 25,000 样本时失配最均衡；
- 低风险层出现 0 个正例时，样本标准误比理论值小 ~40%，覆盖崩坏 ⇒ **分层抽样时每一层都要保证足够“正例期望数”**。

**照搬方案**：站点按风险/流量分层（high/medium/low），层内配额按 Neyman 分配（与层内方差×层权成正比），CI 用分层 Wilson 合并。

### 结论 3：门槛两侧用“接受概率/OC 曲线”定义，而不是单点比较

质量工程界标准做法（[MetricGate OC curve 文档](https://metricgate.com/docs/operating-characteristic-curve-qc/)，ISO 2859 / MIL-STD-1916 传统）：抽样计划 (n, c) 定义两条风险线——

- **AQL**（可接受质量水平）：好站点总体以 ≥95% 概率放行（producer's risk α ≤ 5%）；
- **LTPD/RQL**（拒收质量水平）：坏到某程度的总体以 ≤10% 概率漏放（consumer's risk β ≤ 10%）。

**照搬判据**：把门槛改写成 AQL=0.5‰ / LTPD=2‰ 的双点 OC 约束，用二项 CDF 反解最小 n 与接受数 c。比“实测率 > 门槛即 fail”更稳健。

### 结论 4：门禁告警采用 SRE 的多窗口多燃烧率（multiwindow, multi-burn-rate）

Google SRE Workbook Ch5（[sre.google/workbook/alerting-on-slos](https://sre.google/workbook/alerting-on-slos)，已读原文）：单窗口阈值在低流量/小样本下误报爆炸（SLOconf 实例：10 样本 1 错 = 10% 假告警）。标准解法：

- **burn rate = 实际错误率 / 预算错误率**，长窗+短窗双确认，典型 14.4×/5m + 6×/30m（快烧）与 6×/1h + 3×/6h（慢烧）；
- Workbook 明确警告：**低流量系统此法失灵**——站点级度量正处于这一处境，Workbook 建议改用离散事件计数 + 置信区间告警（回到结论 1/2 的二项框架）。

**照搬判据**：站点级 FPR 门禁不应逐日判 fail/pass，而应设“燃烧率”式渐进处置：CI 上界 > 3× 门槛 → 阻断发版；> 1× → 冻结规则变更 + 加大抽样；< 0.5× → 恢复常态。

### 结论 5：真实值标注的抽样预算——业界经验数字

- **反欺诈**（[Sardine](https://www.sardine.ai/blog/how-to-measure-false-positives-in-fraud-systems-that-hide-them)，已读原文）：对高频触发规则人工复核 **50–100 条拦截事件**即可给出可靠 FP 分桶起点；五种方法补齐被系统隐藏的 FP（规则仿真、拦截人工复核、申诉回流、打标回流、对照实验）。
- **T&S 审核**（[GetStream](https://getstream.io/blog/moderation-performance-metrics/)，已读原文）：precision 由“抽样已标记内容→人工标注”测得；必须**按内容类别×语言×地区分层报告**；配 reviewer agreement rate 与 appeal rate。
- **SOC/检测工程**（[Magonia](https://www.magonia.io/research/determining-an-acceptable-false-positive-rate-for-your-soc)，已读原文）：可接受 FPR 由两个天花板取小——**信任天花板**（Axelsson Bayes 反解，示例 ~1/100,000/事件）与**产能天花板**（分析师日处理上限 ÷ 良性事件总量）。单人工复核基准：**~100 FP/天/人**。

### 结论 6：SAST/静态工具的业界 FP 天花板参考值

行业平均 SAST FPR **30–40%**，头部工具宣称 2–11%（Semgrep 默认规则 ~28% vs CodeQL ~11%，精选规则集可压到 <15%）——**业界从不对原始规则集设“每千站点 1 误报”这种门槛，而是先调规则/分级（confidence tier）再对高置信层设门禁**。启示：门槛应设在 `tier ∈ {auto}` 的高置信判定上，`lowkey` 层只做监控不做阻断。

### 结论 7：反面教训（Criticism 角度）

- **Clopper-Pearson 精确区间过保守**：覆盖严格高于名义值 ⇒ 白白多花样本；区间选 Wilson 而非 CP 可省 10–20% 样本。
- **Goodhart 风险**：把 FP 率设为团队 KPI 会诱导把判定悄悄收紧/加白名单；T&S 对策是 **FP/FN 双指标 + appeal rate + 定期 policy alignment 审计**。
- **基率谬误**：Magonia 核心算术——FPR 0.1%（“听起来体面”）× 100 万良性事件/天 = 每天 1000 条误报。**站点级门槛必须同时报告绝对量（每千站点 FP 数）和比率**。

---

## 3. 对比矩阵：四个可照搬领域的标定方法

| 领域 | 分母/单位 | 门槛典型值 | 抽样方案 | 区间/判据 |
|---|---|---|---|---|
| SRE SLO 门禁 | 请求/窗口 | 0.1%–1% 错误预算 | 全量计数 + 多窗口燃烧率 | Wilson CI；低流量时改离散计数 + CI 告警 |
| 反欺诈/AML | 拦截事件 | FPR 0.3%–3.5%（调优后） | 高频规则人工复核 50–100 条/规则 + 申诉回流 | FP 分桶 + 双天花板（信任/产能） |
| T&S 内容审核 | 已标记内容 | 按类别/语言分层设目标 | 分层抽样已标记集 → 双人标注 → agreement rate | 分层 precision/recall；category×language 切片 |
| SAST 门禁 | 扫描发现 | 高置信层 <15% FP | confidence tier 分级 + 人工 triage 回流训练 | 工具间基准（CodeQL 11% vs Semgrep 28%） |
| **站点级（本问）** | **站点/千** | **1‰ 量级** | **分层站点语料（Neyman 分配）+ 零事件上界标定** | **分层 Wilson；OC 双点（AQL/LTPD）；燃烧率渐进处置** |

---

## 4. 可直接照搬的完整抽样方案（综合模板）

1. **定义与分母**：FPR_site = 被误注入/误报的站点数 ÷ 评估的良性站点数。良性站点语料按「结构风险层」（含区号字段站/含国家菜单站/无关联站）分层，层权 = 层内在真实互联网中的占比。
2. **抽样量（零事件判据）**：门槛 1‰ 且要求 95% CI 上界 < 门槛 → 至少 **3000 良性站点零误报**；若只想证“显著低于 2‰”，n ≥ 1500。分层时每层正例期望 ≥ 5 才用分层 Wilson，否则该层单独报 rule-of-three 上界再合并。
3. **判定规则（OC 双点）**：AQL = 0.5‰（α=5%）、LTPD = 2‰（β=10%），二项反解 (n, c)。例：n=3000 时 c=2（观察 ≤2 个误报即放行）近似满足双点约束。
4. **运行期处置（燃烧率）**：以门槛为预算率，CI 上界换算成 burn rate；>3× 阻断规则发版，>1× 冻结变更并扩样 2×，连续两周 <0.5× 降回常态。
5. **标定回流**：每次误报样本进入人工标注 → 归因分桶（选择器漂移/站点改版/启发式混淆）→ 只对桶修规则，修完重跑全语料确认 Δprecision ≥ 0（本仓库 calibration harness 的 gate 语义即此模式）。
6. **配套判据**：reviewer agreement（双人标注 ≥90%）、绝对误报量并行上报（每千站点 FP 数）、FP/FN 双门防 Goodhart。

---

## 5. 完整来源清单

| # | 标题 | URL | 角度 | 日期 | 贡献 |
|---|---|---|---|---|---|
| 1 | Rule of three (statistics) — Wikipedia | en.wikipedia.org/wiki/Rule_of_three_(statistics) | Official/百科 | — | 3/n 上界推导，已读原文 |
| 2 | Estimating prevalence of rare events — Unofficial Google Data Science | unofficialgoogledatascience.com/2019/08/... | Community | 2019-08 | 分层 Wilson vs 正态/Jeffreys 覆盖度模拟，已读原文 |
| 3 | Alerting on SLOs — Google SRE Workbook Ch5 | sre.google/workbook/alerting-on-slos | Official | — | 多窗口燃烧率 + 低流量局限，已读原文 |
| 4 | How to measure false positives in fraud systems — Sardine | sardine.ai/blog/how-to-measure-false-positives... | 实践/Currency | 2026-02 | 50–100 条人工复核基准、5 种测量法，已读原文 |
| 5 | Determining an Acceptable FPR for Your SOC — Magonia | magonia.io/research/determining-an-acceptable... | 批评/方法 | 2026-04-28 | Axelsson 双天花板、基率谬误算术，已读原文 |
| 6 | Moderation Metrics Every T&S Team Should Track — GetStream | getstream.io/blog/moderation-performance-metrics | 实践/Currency | 2025-12-19 | 分层 precision、agreement rate、appeal rate，已读原文 |
| 7 | OC Curve for Acceptance Sampling — MetricGate | metricgate.com/docs/operating-characteristic-curve-qc | Official(QC) | 2026-05 | AQL/LTPD/OC 双点判据、find.plan，已读原文 |
| 8 | The costs of exact (Clopper-Pearson) intervals | web_search 原文(artifact 9d17) | 批评/学术 | — | CP 过保守 → 用 Wilson 省样本 |
| 9 | CodeQL vs Semgrep 2026 基准 — Safeguard | safeguard.sh/resources/blog/codeql-vs-semgrep... | Comparative | 2026 | FPR 28% vs 11%，规则调优 <15% |
| 10 | SAST Tools Compared 40–60% FP — Autonoma | getautonoma.com/blog/sast-tools | Comparative | 2026 | 行业 FPR 天花板 30–40% |
| 11 | PACT: Reducing Alert Fatigue in Low-Prevalence SOC — arXiv | arxiv.org/html/2605.22324v1 | 学术/Currency | 2026 | 0.1% FPR × 1M 事件 = 1000 假告警 |
| 12 | Reducing FPs in Static Bug Detection with LLMs — arXiv | arxiv.org/html/2601.18844v1 | 学术 | 2026 | 工业级 FP 分桶归因流程 |
| 13 | SLOconf 2021: Binomial CIs to reduce false positives — YouTube | youtube.com/watch?v=R4nCsgt1qEU | Community | 2021 | 小样本百分比门禁失真实例 |
| 14 | Determining acceptable FPR — Magonia(摘要) / OpenLayer FPR guide | openlayer.com/blog/false-positive-rate... | 实践 | — | FPR 监控频率、生产漂移 |

> 1–7 为本轮真实打开的原文；8–14 部分为搜索摘要级，论断处已尽量用 1–7 交叉验证。

---

## 6. 信息缺口（调研自述）

- **“每千站点”量级的直接先例**：没有任何被检索到的业界文档以“每千站点”为分母设 FPR 门槛——最接近的是 SOC 的 per-event 1/100,000 与 T&S 的 per-content 分层精度。站点级是否等同于“每事件”框架，取决于站点被注入的机会次数（每站点可多次判定 → 更接近事件框架）。
- **分层配额的 Neyman 精确公式在站点风险层上的方差先验**需用自己语料的 pilot 数据估计（先抽 ~500 站点跑 pilot，再定正式配额）。
- Magonia 的 per-rule 分母计算在其后续文章中（尚未发布/未读）；事件数/入侵数等默认值对站点域的类比映射需自行定标。
- 调研进程提示：`[warning] 正在以管理员权限运行` ⇒ **编排侧已核验：本轮为只读调研，未写入仓库任何文件**。
