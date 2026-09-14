# Cycle-4 Spec — 真实网站生效闭环

> Brain Agent | 2026-09-12 | Input: `research/cycle4-investigation.md`（锐评2 取证 + 两轮 atomcode 调研）
> Previous cycle: 第三周期 spec 已归档 `spec-cycle3.md`（票 20-26）
> 对账闸：`decision-ledger.md` 登记 A-001…A-010；本 spec 每条声明其覆盖的 A-xxx，无去向记录清单见文末。

## Problem Statement

经历三轮交付（模块化+评分引擎 / 心智模型 v2 / 仓库工程卫生），引擎在合成 fixture 上 CI 全绿，但真实世界验证缺失——你点出的「出厂都是幻觉、大多数网页不生效」源于：

1. 真实网页最常见的区号字段形态落 `none` 档（A-001、A-002），或根本不在扫描候选集内（A-003）——用户眼里「脚本没生效」。
2. 站点规则分档覆盖有语义泄漏，单条强制规则会放大到整页误报（A-004）。
3. 填充失败静默、无反馈闭环（A-005）。
4. CI 绿证据全部来自合成 fixture、0 真实站点，这是「出厂幻觉」的机制（A-006）。
5. 已交付的修复停在 1.4.0 不 bump，用户收不到（A-007）。
6. 门禁 engine-gates 重复三跑、main 不合入不测试（A-008、A-009）。
7. main 历史两次归零，票级开发过程在 git 里不可查（A-010）。

## Solution

一轮「真实网站生效闭环」周期：先建真实站点抽样语料作为测量地基（A-006），再据实补齐检测覆盖率（A-001/A-002/A-003）、修规则语义（A-004）与填充反馈（A-005），最后 bump 送达（A-007）并减肥门禁（A-008/A-009）。历史纪律（A-010）在收口以非 squash 落地执行。

## User Stories

1. As a maintainer, I can measure recall/precision against a real-site pattern corpus, so CI green represents real-world coverage.（A-006）
2. As a user on a site with `<input name="countryCode">`, the script recognizes and injects, so I don't have to hunt for a manual summon.（A-001）
3. As a user on a site with an ISO2-valued country dropdown showing `(+NN)`, the script treats it as a dial-code field, not a country selector.（A-002）
4. As a user on a site with a hand-rolled dropdown (no ARIA), the script still detects and offers the panel.（A-003）
5. As a user with one forced-selector rule, unrelated fields on the same host are not force-injected.（A-004）
6. As a user, when a fill fails I get a clear signal and it stays correct where possible, so wrong fills are not silent.（A-005）
7. As a user, I receive the fixes via a version bump, so the delivered work actually reaches me.（A-007）
8. As a maintainer, shared engine-gates run once per PR rather than three times.（A-008）
9. As a maintainer, a push to main triggers full E2E, so the branch that ships is tested.（A-009）
10. As a reviewer, I can trace each ticket's work in git history, so the process is auditable.（A-010）

## Implementation Decisions

- **测量地基·真实站点抽样语料（票 32，A-006）**：把真实站点区号字段抽象成标注模式库（对标 Bitwarden `test-the-web` / Mozilla `form-fill-examples`），加少量真实站点低频冒烟 + CDP `Autofill.trigger` 断言 + 可跳过白名单，挂接 CI；证据只认 CI run/artifact。覆盖 A-006。
- **检测覆盖率下限（票 27，A-001）**：让纯关键字/placeholder 弱信号、无锚的区号字段跨过低置信线（≥35），以 corpus 正负例标定，不改 `SCORE_AUTO`、不回退既有 precision/recall。覆盖 A-001。
- **ISO2-value 下拉证据（票 28，A-002）**：把文本括号区号 `parenDial` 计分移出 `plusDial > 0` 门，独立成 L3 证据；保持「国家选择器≠区号字段」抑制与共享区号消歧。覆盖 A-002。
- **候选集扩展（票 29，A-003）**：扩展 `SCAN_SELECTORS` 覆盖无 ARIA 自定义下拉（div+ul）与 contenteditable；遵守 ADR-0005 档位上限与 350ms 性能红线。覆盖 A-003。
- **规则分档覆盖收敛（票 30，A-004）**：修 `pageTierOverride` 语义泄漏，分档覆盖收敛到 selector 级，页面级语义显式建模或移除。覆盖 A-004。
- **填充反馈闭环（票 31，A-005）**：填充结果可观测（成功/失败/格式分歧），错填不再静默，不改三策略正确路径。覆盖 A-005。
- **版本 bump 交付（票 33，A-007）**：三处版本号一致 bump（package.json / vite.config.ts / Glog 双语 changelog），dry-run CI 先行，发行须用户确认。覆盖 A-007。
- **门禁减肥（票 34，A-008 / A-009）**：公共 engine-gates 抽成一个 workflow（verify-13/16/18 只保留专属断言）；e2e 触发面补 `push: main`。覆盖 A-008、A-009。
- **历史可查落地纪律（票 35，A-010）**：本周期落地不 squash、不改写历史；以只读 `git log` / `git merge-base` 验证 main 父链含票级提交，纪律条目连同验证证据写回 WORKFLOW §5。覆盖 A-010。

## Testing Decisions

- 好测试断言外部行为：真实语料上的 precision/recall、候选集各形态覆盖数、填充结果信号、workflow 触发面。
- 方法：程序化自检 + 现有 Playwright E2E + CDP `Autofill.trigger` 断言；证据只认 CI run/artifact，不认本地输出（CI-only 策略）。
- 每票验收锚定 commit sha + CI run ID，不以磁盘自述为准。

## Out of Scope

- 已归零的旧历史（前两轮 root commit）不做不可逆重写、不尝试恢复——本周期仅保证「此后历史可查」，由票 35（只读验证 + WORKFLOW §5 教训固化）承接。
- 评分引擎五层信号（L0-L4）权重/阈值的整体重构——仅针对性修 A-001/A-002 两处缺口，不重做引擎。
- 国家数据扩充（科索沃 +383、梵蒂冈）——跨周期遗留。
- GreasyFork 站内同步（凭证门控）——跨周期遗留。
- 伪 select 两形态填充分发的整体重做（不动 ADR-0005 已定档位上限）。
- `.gitattributes` CRLF 规范化——跨周期遗留。

## Further Notes

- 本周期输入来自「锐评2 取证 + 真实站点不生效痛点」两轮 atomcode 调研（测试侧四层组合拳 + 检测侧 libphonenumber 语义模型），非用户 bug 单。
- 两条工业硬结论指导本周期：① WPT 测不了 autofill 触发，必须自建宿主级测试或走 CDP；② 海量真实站点靠「模式抽象 + 低频抽样 + 弱断言 + 可跳过白名单」收敛成本。
- 波次由 issue 的 Blocked by 字段推导（不新造顺序）：W1 = 票 30/31/32/34；W2 = 票 27/28/29（被 32 阻塞）；W3 = 票 33（被 27-32 阻塞）；W4 = 票 35（被 33 阻塞，收口纪律波）。

## 无去向记录清单

核对 decision-ledger.md 的 A-001…A-010 去向登记：**A-001→27、A-002→28、A-003→29、A-004→30、A-005→31、A-006→32、A-007→33、A-008→34、A-009→34、A-010→35（收口纪律票，交叉核对轮补立）**。全部有去向，**无去向记录为空**，准予立票。