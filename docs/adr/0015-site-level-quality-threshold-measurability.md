# 0015 — 站点级质量门槛（< 1／千站点）的可测化口径与语料承载面

状态：accepted | 日期：2026-09-18 | 来源：Cycle-8 grill T-09 Q5（**D-009 采纳**）；行业对标：`.scratch/cycle8-grill/research/q5-site-level-threshold-measurability.md`（14 条来源）

## 背景

ADR-0005 的二次裁决门槛②要求「误报预算 < 1／千站点，且误报必须可**一键上报**」。T-13 实测结论是**不可直接测量**（本仓无站点级抽样语料），代理口径约 500/千站点，远超预算。T-09 Q5 把「可测化路径与抽样预算」提交行业对标调研，用户于 2026-09-18 拍板**采纳**。

## 决策

1. **抽样量由「CI 上界必须低于门槛」反推，不得由点估计反推。**
2. **k = 0 时取守口径**：`rule of three`（3/n）只作**快速口径**；**操作值取 Wilson 上界口径**。门槛 1‰、95% 置信 ⇒ **n ≥ 3838 个良性站点零误报**（rule of three 给 3000、精确 Clopper-Pearson k=0 给 2995，均偏乐观）。
3. **分层抽样**：站点按结构风险层分层（含区号字段站 / 含国家菜单站 / 无关联站），层内配额按 **Neyman 分配**（∝ 层权 × 层内标准差）；每层正例期望 ≥ 5 才用分层 Wilson，否则该层单独报 rule-of-three 上界再合并。
4. **判定用 OC 双点，而非单点比较**：AQL = 0.5‰（α = 5%）与 LTPD = 2‰（β = 10%）反解最小 (n, c)。**实算最小可行计划 = n 4636 / c 5**（实测 α = 0.0309、β = 0.0999）。**调研存档引用的 (n = 3000, c = 2) 经复算不满足 AQL 约束**（P(接受|AQL) = 0.8089 < 0.95）——**以本 ADR 的实算值为准**。
5. **运行期用燃烧率渐进处置，不逐次判 fail/pass**：`burn = CI 上界 / 门槛`；**> 3× 阻断发版**；**1×–3× 冻结规则变更 + 扩样 2×**；**≤ 0.5× 常态**；其间为观察带。**「阻断发版」落 ADR-0010 发布门**，**不进 PR 面**。
6. **门槛收窄至高置信档**：FPR 门槛设在 `tier ∈ {auto}` 的判定上；`lowkey` 层**只监控不阻断**。
7. **配套判据防 Goodhart**：FP/FN **双指标** + **一键上报（appeal）率** + 标注一致性（reviewer agreement ≥ 90%）；同时报**绝对量**（每千站点 FP 数）与比率。
8. **先行 pilot**：正式配额前先抽 ~500 站点跑 pilot，估层内方差后再定 Neyman 配额。
9. **语料承载面（张力 T-2 的裁定）**：站点级语料的**原始快照库外归档**（复用票 41 / A-018「过程证据归档出工作树」先例），仓库内只保留**指针 + SHA-256 + 来源 + 抓取日期**（落 `.scratch/evidence/external-inputs-ledger.md`）；**去品牌化镜像页**（CONTEXT「镜像页」）按形态语料既有口径进 `tests/corpus/`，但**只收被断言的形态**，**不收全量 3838 站点**。
10. **机器实现**：`tests/scripts/50-site-threshold-plan.mjs`（零依赖、纯计算、自带自检）—— rule-of-three / 精确 CP / Wilson 反推、OC 双点求解、燃烧率分级、Neyman 配额。

## 依据（全部 observed）

1. 稀有二项事件的零事件上界：rule of three `3/n`（Wikipedia 原文）；k = 0 时 Wilson 上界约 `z²/n`（数值实测：n = 3838 时恰 ≤ 1‰）。
2. 小样本区间选择：正态近似 CI 在 ~100,000 样本前覆盖度差；Jeffreys 在小样本 under-cover；**分层 Wilson 覆盖度 ≥ 名义值**（Google 数据科学博客蒙特卡洛）。
3. 质量工程抽样计划用 **AQL/LTPD 双点 + OC 曲线**定义（ISO 2859 / MIL-STD-1916 传统）。
4. SRE 多窗口多燃烧率压制波动性误报；但 Workbook 明确警告**低流量系统此法失灵**，应改用离散计数 + 置信区间（回到二项框架）。
5. 人工复核基准：高频规则 50–100 条/规则（反欺诈）；~100 FP/天/人（SOC）；分层 precision + agreement rate（T&S）。
6. SAST 业界 FPR 30–40%，头部 2–11% ⇒ **业界先分级再对高置信层设门禁**，不对原始规则集设「每千站点 1 误报」。
7. 复算证据：`node tests/scripts/50-site-threshold-plan.mjs`（rule-of-three 3000 / 精确 CP 2995 / Wilson **3838** / OC **n=4636, c=5** / 对照 (3000,2) 不满足）。

## 反证条件（满足任一即重开本 ADR 相应条款）

1. 若 pilot 实测层内方差使 Neyman 配额不可行（如某层方差远大于假设）→ 重评决策 3。
2. 若站点级语料的**采样成本**（爬取/去品牌化/维护）不可接受 → 重评决策 9（改回「门槛②维持不可直接测量」）。
3. 若 ADR-0008 的真实站点层需进 PR 门控 → 那属 ADR-0008 反证条件 2 的新一轮决策，本 ADR 不预设。
4. 若 `auto` 档样本量在可预见未来不足以支撑分层统计 → 重评决策 6。

## 后果

- **门槛②从「不可测」变为「有口径但未实施」**：口径、抽样量、判定规则、机器实现均已就位；**未实施部分 = 建站点级语料（~3838 站点 + ~500 pilot）**，属独立票，**须先经用户授权**（本轮不动）。
- ADR-0005 的门槛**数值未变**（仍是 precision ≥ 95% / 误报 < 1‰ / 内容证据裁决），变的是**测量口径**（新增本 ADR 作为其操作层）。
- 新增零依赖脚本 `tests/scripts/50-site-threshold-plan.mjs`，其自检挂接进 `engine-gates.yml`。
- **承载面代价已如实登记**：全量站点快照库外归档 ⇒ 其**可恢复性依赖库外归档的持久性**；仓库内只有指针 + SHA-256（若归档丢失，哈希不能恢复内容）。此属**有意接受的偏离**，已入 findings register。

## 参考

- 行业对标：`.scratch/cycle8-grill/research/q5-site-level-threshold-measurability.md`
- 上游：`docs/adr/0005-pseudo-select-recognition-implement.md`（门槛①②）· `docs/adr/0008-real-site-testing-layers.md`（决策 1）· `docs/adr/0009-evidence-quantity-tier-boundary.md` · `docs/adr/0010-release-gate.md`
- 账本：`.scratch/cycle8-grill/decision-ledger.md` D-009
