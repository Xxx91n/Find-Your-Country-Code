# Handoff 36 — Cycle-5 架构大脑调查（目标 + message 步骤）

> Cycle-5 | 类型：**大脑调查票（只读）** | 覆盖：锐评 Round 3 全部条目 + 6 个深化机会
> 权威调查：`research/cycle5-investigation.md`（本文件只做索引 + 目标 + 步骤，细节不复制）
> 基线：origin/main = `e2a10d8e`（v1.5.0）

**必读清单（绝对路径）:**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\cycle5-investigation.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\report\architecture-review-cycle5.html`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md`
- `D:\Aworker\mozilla\choose-your-country\CONTEXT.md`
- 锐评原文：`C:\Windows\temp\锐评.txt`（Round 3）

**通用调研要求（Cycle-5 各票一致）:**
1. 动手前先做 atomcode 深度调研（串行护栏：同一时刻至多 1 个在途；中断/超时按 atomcode-research 续跑锚定，禁杀进程），对标行业成熟心智模型与轮子，不重复造。
2. 回顾 `docs/adr/`（0001–0008）与 `CONTEXT.md` 既有心智模型，不违背已定 ADR 决策。
3. 证据铁律：以 commit sha + CI run ID 锚定（只认 CI 证据），报告自述不算证据。
4. 外部事实必须标注 observed / cited / reproduced / candidate（WORKFLOW §2.5）—— 本轮锐评已有 1 条 REFUTED，教训在此。

---

## /goal（不设预算）

| 目标 | 内容 | 完成判据 |
|---|---|---|
| **G1 送达** | v1.5.0 修复堵在分发链路（GF 冻结 1.3.4） | GF 上线版本 = tag = 产物 @version |
| **G2 可见** | 低置信字段页面无任何全局入口 | `score<35` 的页面仍能打开面板 |
| **G3 真实** | “十门全绿”是幸存者名单；真实站点层启用数 0 | 10/10 门可执行；≥1 个 live 目标启用 |

- 推进单位：message 步骤（见下）；**不设时间/成本预算**。
- 硬边界：大脑不直接修改业务代码；只写 `.scratch/architecture-recovery/` 产物。

---

## message 步骤

| 步 | 动作 | 关联 | 验收 |
|---|---|---|---|
| M1 | 修四扇门 + node 升 22 | C3 | 10/10 门本地全绿；三门不再挂 pull_request |
| M2 | GM 菜单加“打开面板”全局入口 | C2 | score<35 页面仍能打开面板并召唤 |
| M3 | lowkey 图标可见性重设计 | C2 | 按 U2/U3：降广告特征、提信息气味、规避 overflow 裁剪 |
| M4 | 分发链路：GF 反向同步 + 版本闸门 | C1 | GF 上线版本 = tag = 产物 @version |
| M5 | 启用真实站点层（含 CodePen） | C4 | ≥1 个 live 目标连续两次绿 |
| M6 | 帧校验递归 + 失败降级 toast | C5 | 三层嵌套 fixture 下点图标有面板或明确提示 |
| M7 | 过程证据出仓 + 升塔纪律入 WORKFLOW | C6 | `git ls-files .scratch` 归零或仅剩现役流程 |
| M8 | （可选）语言切换 + i18n 死导出清理 | backlog | 面板可选 + GM 持久化；或删死导出 |

**建议序**：M2/M3（C2）+ M4（C1）先行 —— 唯一直接对应业主两条投诉（“网站没生效”/“修了没人收到”）；M1（C3）紧随（地基）；M6/M7 可并行。

---

## 本轮偏离点（呈报）

1. **指定 handoff 路径不存在**：`C:\Users\ADMINI~1\AppData\Local\Temp\handoff-cycle4-closure-2026-09-13.md` 不存在；Temp 下 round7/round8 两份 handoff 属另一项目（Env Manager/Tauri）。上下文改由 git + CONTEXT.md + ADR + 锐评重建。
2. **锐评 REFUTED 条**：“git 历史第三次归零 / tag 非 main 祖先”实测不成立（origin/main 有父、163 commits、三 tag 均为祖先）—— **不立票**。
3. **子代理建议被深度调研推翻**：子代理提出“在 release.yml 加 GF 发布步骤”，atomcode 调研证 GF 无写入 API（官方文档 + #1288/#1499），正确解是 GF 侧 Sync from external URL。**立票时须用后者。**
4. **环境回退**：本会话无 anysearch MCP（用 atomcode 内置三引擎代替，已注明）；无 `/goal` 工具（目标落盘本文件）。
5. **本轮零代码改动**：只新增 `research/cycle5-investigation.md` + `report/architecture-review-cycle5.html` + 本 handoff。

---

## 完成定义

本票为调查票：产物落盘 + 六项深化机会各带 file:line 证据 + message 步骤可执行，即视为完成。
下一票从 M1 开始（或用户指定优先级）；实施走 `to-spec` → `to-tickets` → `implement`；GitButler 分支建议 `cch/36-cycle5-*`，版本控制遵循 WORKFLOW §4.2。
