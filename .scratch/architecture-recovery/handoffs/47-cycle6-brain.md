# Handoff 47 — Cycle-6 架构大脑调查（目标 + message 步骤）

> Cycle-6 | 类型：**大脑调查票（只读）** | 覆盖：用户两条投诉 + 5 个深化机会 + 3 次深度调研
> 权威调查：`research/cycle6-investigation.md`（本文件只做索引 + 目标 + 步骤，细节不复制）
> 基线：origin/main = `85990d2f`（v1.6.0）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle6-investigation.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\report\architecture-review-cycle6.html`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\46-cycle5-closure.md`
- `D:\Aworker\mozilla\choose-your-country\CONTEXT.md`

**通用调研要求（Cycle-6 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0009）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 对标工业级成熟方案后再动手；选型需给出来源，不凭记忆合成。
4. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据）；外部事实标注 observed / cited / reproduced / candidate。

---

## /goal（不设预算）

| 目标 | 内容 | 完成判据 |
|---|---|---|
| **G1 可配置** | 语言设置埋在第 3 层且无任何直达入口 | 冷启动 ≤2 次点击到达语言设置；GM 菜单含「设置」项 |
| **G2 可解释** | 零 console 输出、无自检面、评分证据链算完即丢 | 存在诊断面，逐层点亮并给出已验证根因 |
| **G3 可证明** | 真实站点层 18 项能力只验证 2 项；核心填充 0 覆盖 | owned 指定页覆盖全部工具面且全绿；真实站点层保留 L0–L2 |

- 推进单位：message 步骤（见下）；**不设时间/成本预算**。
- 硬边界：大脑不直接修改业务代码；只写 `.scratch/architecture-recovery/` 产物。

---

## message 步骤

| 步 | 动作 | 关联 | 验收 |
|---|---|---|---|
| M1 | 设置一级入口（含语言首位） | C1 / A-026 | 冷启动 ≤2 次点击到达语言设置；豁免数量不影响可达性 |
| M2 | i18n 全量重渲染 + 菜单原地更新 + 补齐文案 | C2 / A-027 | 切换后全 UI 无漏刷；菜单无需重载即跟随 |
| M3 | 自检面：trace + 逐层点亮面板 + debug 开关 | C3 / A-028 | 「无可信字段」页能说出具体哪道门挡住了 |
| M4 | 测试 harness 交互原语 + GM 替身可驱动 | C5 / A-029 | 原语可驱动 open/search/select/fill 并读到 value |
| M5 | owned 指定页面语料 + L0–L5 全断言 | C4 / A-030 | owned 语料上 18/18 能力均有断言且全绿 |
| M6 | 真实站点层口径对齐先例 | C4 / A-029 | ≥1 个 live 目标在 L0+最弱 L4 下连续两次绿 |
| M7 | 可观测性自身的测试补齐 | C3 / A-028 | 诊断面有密封断言 |
| M8 | （可选）文档卫生 + live 清单扩充 | backlog | 上轮 C5-5/C5-6 + enablementRunbook |

**建议序**：**M1 + M3 先行**（唯一直接对应两条投诉，且共享一个「设置/诊断」视图交付物）；M2 紧随（同一改动面）；M4→M5→M6 是「能被证明」的链条（没有交互原语就搭不起断言阶梯）。

---

## 本轮偏离点（呈报）

1. **本大脑代理自己的 1 条假设被证伪**：「GM 菜单文案在持久化语言应用之前求值」——子代理实物核验后 REFUTED（`main.ts:18` 先 createUI、`:135-137` 后注册菜单）。**不立票**，改立「运行时不可更新」这一真缺陷（A-027）。
2. **上游先例口径被修正**：本仓库 `_meta.assertionRule` 自称照 Bitwarden BIT，但 BIT 原文**断言填充结果**——本仓库比其援引先例更弱。已按 SUPERSEDED 登记，M6 按先例原口径立票。
3. **环境回退**：ponytail 路径已由 4.9.0 升为 **4.10.0**（`.codex/plugins/cache/ponytail/ponytail/4.10.0/skills/ponytail/SKILL.md`）；用户给定路径不存在，已定位替代。
4. **本轮零代码改动**：只新增 `research/cycle6-investigation.md` + `report/architecture-review-cycle6.html` + 本 handoff + 台账 A-026…A-030 登记。
5. **报告样式偏离**：improve-codebase-architecture 模板建议 Tailwind/Mermaid CDN，本报告改为**内联 CSS + 手绘 SVG**（零 CDN 依赖，避免离线/断网时“看起来坏掉”）；与前几轮保持一致。

---

## 完成定义

本票为调查票：产物落盘 + 5 项深化机会各带 file:line 证据 + message 步骤可执行，即视为完成。
下一票从 M1 开始（或用户指定优先级）；实施走 `to-spec` → `to-tickets` → `implement`；GitButler 分支建议 `cch/48-cycle6-*`，版本控制遵循 WORKFLOW §4.2。
