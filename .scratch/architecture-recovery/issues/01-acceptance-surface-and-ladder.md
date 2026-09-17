# 01: 验收面与断言阶梯定义

**What to build:** 把「所有工具是否生效」从一个模糊说法变成可执行的定义：17 项用户可见工具 + 1 项诊断的验收面，以及 L0–L4 五级断言阶梯与层归属。本票只产出定义（成文于 spec 与测试约定），不建 harness。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-029 · A-030


- [x] 17 项验收 + 1 项诊断（`__cchLastFill` 移出验收面）逐项写明「页面侧外部可观测」的判据 — `tests/ACCEPTANCE-SURFACE.md` §2.1（17 行）/ §2.2（D1）；验证 `grep -c '^| [0-9]* |'` = 17、`grep -c '^| D1 |'` = 1
- [x] L0–L4 五级定义成文，且每级的层归属（owned 页 / 真实站点）明确 — §4.1 五级表 + §4.2 逐级层归属表（两层均跑全阶梯；差别只在阻断语义）
- [x] 持久化（reload / 重开面板后效果仍在）列为每项有状态工具的通用判据 — §3.1 四步闭环，适用 6 项（收藏 / 负反馈 / 豁免 / 规则 / 低调样式 / 语言）；禁止只读 storage 自证
- [x] 跨隔离上下文链路单列为独立验收项，并写明必须断言两端写入结果 — §2.1 第 14 项 + §3.3（链路 A / B 双端断言 + origin 正负向 + 时序前提）
- [x] 写明环境真实性约束：L2 以上必须真实浏览器 runtime；headless 必须 full Chromium — §4.3（4 条，含 `headless_shell` 静默空转陷阱）
- [x] 声明本票覆盖的 A-xxx：A-029 · A-030 — 定义文档头 + 本报告头

---

**验收证据**：逐项只读验证命令与输出摘要见 `.scratch/architecture-recovery/research/window-reports/01-acceptance-surface-and-ladder-report.md` §4.2。
**提交锚点**：`cch/01-acceptance-surface-and-ladder` @ `ecd38b13`（交付提交；锚点回写见分支 head）
**基线**：`cch/48-cycle6-ticketing` @ `6d0563d9`
**报告**：`.scratch/architecture-recovery/research/window-reports/01-acceptance-surface-and-ladder-report.md`
**状态**：子窗口自证完成，**待大脑复核**（WORKFLOW §4.3）。
