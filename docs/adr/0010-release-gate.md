# ADR-0010: 发布门绑定真实站点层（PR 不阻断 / 发布阻断）

日期：2026-09-16 ｜ 状态：accepted ｜ 来源：Cycle-6 票 04（A-033；用户裁决 D-004 / D-005）

## 背景

ADR-0008 立三层测试塔，其中第二层「真实站点低频冒烟」定为 advisory：仅 schedule（周）+ workflow_dispatch 触发、**永不进 pull_request**、失败不阻断。该层存在的理由是 A-006：密封 fixture 无法代表真实形态，「CI 绿不代表真实世界 coverage」。

Cycle-6 用户裁定（D-004）覆盖了两条调研建议：①「真实站点必须纳入测试面」（不得只停留在 L0–L1 弱断言）；② L4（用户反馈出现）纳入自动化断言面。据此 S-06 把真实站点层升到**全阶梯（含 L4）**。

于是出现一个新问题：真实站点层的**深度**提升后，它的 **flakiness** 是否应随之获得阻断合入的权力？

- 若真实站点层进 PR 触发面：第三方页面（Cloudflare 挑战、站点改版、外网抖动）的 flaky 会拖住日常合入，且 ADR-0008 第二层已定不重开。
- 若真实站点层只保留 advisory 而**不新增任何发布侧条款**：它跑得再深也不在「要发版」这一刻起作用——「绿」在唯一重要的时刻失去意义；发版可带着长期红/从未验证的真实站点层出门。

本 ADR 只记录**这一条取舍**：深度与阻断分离——**PR 不阻断 / 发布门阻断**。

## 决策

1. **PR 不阻断**：真实站点层保持 advisory 触发面（仅 schedule 周 + workflow_dispatch），失败只告警不阻断合入。**本 ADR 不重开 ADR-0008 第二层**，只承接其触发面结论。
2. **发布门阻断**：release.yml 增加发布门——真实站点层**最近一次运行必须为绿**，或该失败已被**显式 ack 并立票**，否则不出包。二者必居其一，不得静默绕过。
3. **深度与阻断是两个独立维度**：断言深度可到 L4（D-004），阻断位置只在发布门。不得因深度提升而把阻断前移到 PR，也不得因阻断在发布而压低深度。
4. **observe 挂账**：已知不可达 / 被挑战的站点条目以 observe 长期挂账（只记录不裁定），强制携带**非空 reason + ticket**，不得匿名挂账。

## 替代方案与被否路线

| 方案 | 结论 | 理由 |
|---|---|---|
| (a) 真实站点层进 pull_request 门控（阻断合入） | **否决** | 第三方 flaky 摧毁 CI 信任：业界一致把「依赖外部服务的集成测试」归入 advisory；1% flaky 的测试子集即足以阻断全部进展（Mill / Dropbox-Databricks 一手）。且外网供给与 flaky 预算未解决（ADR-0008 第二层反证条件明文要求先解决）。 |
| (b) 仅 advisory，不设发布门 | **否决** | 门禁的失效模式是「例外堆积 → 疲劳 → 绕过文化」；一个永不在关键时刻生效的检查等于没有检查。「绿」必须在发版这一刻有含义。 |
| (c) 以人工 checklist 替代发布门 | **降级为发布门内的一环** | 未落流程内的人工批准等于没批准（WORKFLOW §8.2）。人工只承担「ack 该失败」这一决策，机器承担「必须绿或已 ack」的前置条件。 |
| (d) 用密封层（fixtures/corpus）替代真实站点层做发布门 | **否决** | 密封层的存在意义是确定性，真实站点层的存在意义是形态代表性（A-006 的根因）。用前者替代后者即回到「出厂都是幻觉」。 |
| (e) 真实站点层用「N-of-M 通过」判定而非单次结果 | **候选（未采纳，登记备选）** | 业界有该模式，但量化阈值无公开统一标准，属 candidate 级建议；本仓库暂无数据支撑选 M。 |

## 业界对标（cited，见参考）

业界成熟做法不是「阻断 / 不阻断」二选一，而是把检查按**确定性 × 归属权 × 阶段**分层：

- **PR 层（阻断）只放高精度确定性检查**（单元测试、构建、secrets 扫描）；「依赖外部服务的集成测试」被明确归入 advisory 类（Webstack Builders）。分层后误报降 90%，阻断门重新赢得信任。
- **发布门由环境级保护规则承载**（GitHub Environments required reviewers / Azure Deployment Gates），失败以**显式 ack + 留痕**治理，绕过动作写入 audit trail 且需必填 comment（GitHub 官方）。
- **第三方 flaky 的治理是「重试 → 隔离（quarantine）→ 挂账」**，且隔离必须带 reason + ticket + owner + SLA，独立管道继续跑；不得用「静默跳过」消灭（Mill / Autonoma / minware）。
- **过度精确的门反而诱发绕过**：Google/Waze canary 的经验是「用户对复杂自动化的不信任」会让团队无视失败直接推版本。

本 ADR 的条款 2 与上述「必须绿，或失败已被显式 ack 并立票」一一对应；observe 挂账对应 quarantine + reason/ticket。

## 反证条件

1. **发布门长期不可过**：真实站点层 flaky 使发布门持续红且无法以「ack + 立票」治理（ack 沦为橡皮图章）→ 重开条款 2，降级为「发布门只认 L0–L1 + 人工 checklist 承担 L2–L4」。
2. **外网供给与 flaky 预算被解决**：若真实站点层达到可稳定复现（确定性与密封层可比），可考虑把它提升进 PR 门控——但须**重开 ADR-0008 第二层**，不在本 ADR 单方面扩展。
3. **发布门被静默绕过**：出现「既非绿、也无 ack/立票」仍出包 → 重开条款 2/4，并核查 ack 留痕与 ticket 强制是否为机器可验。
4. **ack 退化为常态化**：ack 成为每次发版的默认路径（即发布门事实上不生效）→ 重开条款 2，重新评估真实站点层的稳定性或改判定口径。

## 后果

- **正**：CI 绿在**发布时刻**具备真实含义；日常 PR 不被第三方 flaky 阻断；断言深度（L4）与阻断位置（发布）解耦，两者可独立演进。
- **负**：发布链路新增对「外部层最近一次运行状态」的依赖；ack 路径若无纪律会退化为橡皮图章（已由反证条件 4 登记）。
- **与 ADR-0008 的关系**：本 ADR **不改写 ADR-0008 第二层**（真实站点层仍 advisory、不进 pull_request），只在其上新增发布侧条款；ADR-0008 的四条决策与反证条件保持有效。
- **与 ADR-0006 的关系**：发布门属发版系 workflow（release.yml）的例外路径，不改变 ADR-0006 条款 2 的 PR 门控语义。

## 参考

- 决策账本：.scratch/cycle6-grill/decision-ledger.md D-004 / D-005；.scratch/architecture-recovery/decision-ledger.md A-029 · A-030 · A-033。
- 规格：.scratch/architecture-recovery/spec.md S-06（真实站点层全阶梯 + 发布门）。
- 上游 ADR：docs/adr/0008-real-site-testing-layers.md（第二层触发面，不重开）；docs/adr/0006-ci-hygiene-policy.md（PR 门控条款 2）。
- 业界对标：atomcode 深度调研落盘 .scratch/architecture-recovery/research/atomcode-04-release-gate.md（12 来源，cited/candidate 分级；载体：atomcode CLI headless，串行护栏 1 个在途）。
- 证据边界：WORKFLOW.md §8（CI-only 政策与本地硬验收边界）。
