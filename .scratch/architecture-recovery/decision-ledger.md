# Decision Ledger — 架构恢复周期摩擦点台账（对账闸）

> 用途：立票前的对账闸。架构报告（`research/cycle4-investigation.md`，锐评2 取证 + 两轮 atomcode 调研）的每个摩擦点/候选在此登记，spec 与每张票/每份 handoff 逐条声明覆盖的 A-xxx；无去向记录清单非空即停下呈报，不许立票。
> 生成：大脑 Agent，2026-09-12 | 上游：`.scratch/architecture-recovery/research/cycle4-investigation.md`
> 状态取值：`current`（本周期处理）/ `deferred`（登记在案，非本周期）/ `done`（已闭环，随窗口报告勾销）

## 台账

| ID | 问题描述原文 | 规范化需求 | 显式约束 | 状态 |
|----|-------------|-----------|---------|------|
| A-001 | 纯关键字独立 input 达不到低置信线：`L1_STRONG_KW_SCORE=30` < `SCORE_LOWKEY=35`，`<input name="countryCode">` / placeholder="Country code" 等真实站点标准命名只落 `none`，仅手动召唤 | 让纯关键字/placeholder 弱信号且无锚的区号字段能跨过低置信线（≥35）被低调注入或至少登记可召唤 | 不降低 `SCORE_AUTO`；现有语料 precision 1.0 / recall 1.0 不得回退；改法须有语料标定依据（`tests/corpus/`） | current（R1 返修在途：P8 跨线裁决，见 prompts/27-detection-coverage-floor-fix.md） |
| A-002 | ISO2 作 value 的下拉丢区号证据：`parenDial` 计分嵌套在 `if (st.plusDial > 0)` 内，`<option value="us">United States (+1)</option>` 的文本括号区号证据被丢弃 | 让 ISO2-value + 文本括号区号的下拉（libphonenumber 推荐「国家↔区号非单射→ISO2 作 value」形态）获得 L3 区号证据，且不被误判为国家选择器 | 保持「国家选择器≠区号字段」语义抑制；共享区号（+1 多国）消歧不回退；L3 常量单一口径（config.ts） | done（Cycle-4 收口 2026-09-12） |
| A-003 | 扫描候选集结构性缺口：`SCAN_SELECTORS` 仅 `select/.iti input/.intl-tel-input input/input[tel|text|无type|number]/[role=combobox]`，无 ARIA 的纯自定义下拉（div+ul）与 contenteditable 完全不可见 | 扩展候选集以覆盖无 ARIA 自定义下拉与可编辑 contenteditable 区号面 | 不引入误报后门；性能（1000 节点 scan < 350ms）不回退；伪 select 档位仍遵守 ADR-0005（登记不注入） | done（Cycle-4 收口 2026-09-12） |
| A-004 | 站点规则分档覆盖语义泄漏：`pageTierOverride()` 遍历该 host 全部规则不看 selector，一条「选择器→auto」会把整页抬到 auto | 分档覆盖收敛到 selector 级：仅命中选择器的元素生效；页面级语义显式建模或移除 | 豁免域名（整站禁用）与负反馈（element→none）语义不变；既有规则引擎测试不回退 | done（Cycle-4 收口 2026-09-12） |
| A-005 | 填充失败静默、无反馈闭环：`Fill.run` 失败仅弹「已复制到剪贴板」，不报错不重试；`fillInput` 按 placeholder 猜格式（+86/0086/86） | 填充结果可观测：成功/失败/格式分歧可被用户与测试感知，错填不再静默 | 不改既有 iti/select/input 三策略正确路径；不新增依赖；反馈不可阻塞填充分发 | done（Cycle-4 收口 2026-09-12） |
| A-006 | 合成 fixture 测试盲区：`playwright` baseURL 127.0.0.1 + `tests/fixtures/*.html` 手工正例，0 真实站点，CI 绿不代表真实世界 coverage | 建真实站点抽样语料（模式库 + 少量真实站点冒烟 + CDP 断言），让 CI 能暴露真实世界识别/填充缺陷 | 密封 E2E 语义（CONTEXT.md）不破坏；真实站点低频抽样 + 可跳过白名单收敛 flaky；证据只认 CI run/artifact | done（Cycle-4 收口 2026-09-12） |
| A-007 | 版本不 bump：`package.json`/`vite.config.ts` 停在 1.4.0，tag 停在 v1.4.0，本周期安全/功能修复用户收不到 | 版本 bump 到新版本号（三处一致），使修复经 Tampermonkey `@version` 更新检查达用户 | 发布动作须用户确认；三处版本号一致（package.json / vite.config.ts / Glog 双语 changelog）；发布前 dry-run CI 先行 | done（Cycle-4 收口 2026-09-12） |
| A-008 | engine-gates 重复三跑：`verify-ticket-02.mjs` + `misdetect-repro-v2.mjs` 在 verify-13/16/18 三 workflow 各跑一遍，另有 calibration-baseline 第四遍，CI 分钟浪费 | 把公共 engine-gates 抽成一个 workflow，票级 verify-* 只保留专属断言 | 不丢失票级回归覆盖；PR 门控（pull_request 触发）语义不变；脚本仍在 `tests/scripts/` | done（Cycle-4 收口 2026-09-12） |
| A-009 | e2e.yml 缺 `push: main`：main 上的合入从不跑 E2E 全量，真正出产物的 main 最裸露 | 让 main push 触发 E2E（触发面统一 = pull_request + push(main, cch/**)），发版前 main 被测试覆盖 | 不改变 release.yml 的 release-event 触发语义；与 CONTEXT.md「CI 门禁」触发面定义一致 | done（Cycle-4 收口 2026-09-12） |
| A-010 | main 历史归零：main 是无父 root commit，历史被两次强推归零，票级开发过程在 git 里不存在 | 以非 squash 方式落地本周期提交，让票级工作真实存在于 `git log` | 版本控制遵循 WORKFLOW §4.2（GitButler `but land`，禁 force-push）；由收口票 35 承接：只读验证 + 教训写回 WORKFLOW §5；已归零旧历史不重写（不可逆） | done（Cycle-4 收口 2026-09-12） |

## 去向登记（spec 覆盖核对）

- A-001 → 票 27（检测覆盖率下限补强）
- A-002 → 票 28（ISO2-value 下拉区号证据补全）
- A-003 → 票 29（扫描候选集扩展）
- A-004 → 票 30（规则分档覆盖收敛到 selector 级）
- A-005 → 票 31（填充结果可观测 + 失败反馈闭环）
- A-006 → 票 32（真实站点抽样语料 + 覆盖回归）
- A-007 → 票 33（版本 bump 交付闭环）
- A-008 → 票 34（门禁减肥：engine-gates 三合一）
- A-009 → 票 34（门禁减肥：e2e 补 push:main）
- A-010 → 票 35（history-landing-discipline，收口波：只读验证 + WORKFLOW §5 教训固化；交叉核对轮补立）