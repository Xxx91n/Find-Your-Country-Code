# Cycle-4 决策沉淀（真实网站生效闭环，2026-09-12/13）

> 对应 decision-ledger.md A-001…A-010 全部 implemented。本文件是账本 implemented 决策的摘要沉淀（goal 第 5 步）；完整取证见各票窗口报告与 `docs/adr/0007`、`0008`。

| 决策 | 内容一句话 | 载体 | 证据 |
|---|---|---|---|
| 弱信号证据面（A-001） | `L1_ATTR_PHRASE_SCORE=8` 属性强短语组，弱信号字段 30(none)→38(lowkey)；同源时与 L3 内容证据去重（floor≠ceiling） | `src/config.ts:32` + `src/detect/index.ts:460` + ADR-0008 §3 | recall 0.87→1.0，36 例仅 P8 一例受控回归 |
| ISO2 括号区号证据（A-002） | `parenDial` 移出 `plusDial>0` 门独立计分，libphonenumber 推荐 ISO2-value 形态识别为区号字段 | `src/detect/index.ts:438` | 14→38(lowkey)，共享区号消歧不回退 |
| 候选集扩展（A-003） | 可聚焦非表单容器（tabindex）入候选集，内容证据只作门槛不作加分（守 ADR-0005） | `src/detect/index.ts:144,262` | 无 ARIA 下拉可见+可登记，scan 14-73ms≪350ms |
| 规则 scope 模型（A-004） | 分档覆盖收敛到 selector 级，页面级须显式 `scope:'page'`（ADR-0007） | `src/rules/index.ts:81,93` | 红 34687387189 → 绿 34687594979 |
| 填充三态反馈（A-005） | `Fill.run` 升 filled/copied/failed + `__cchLastFill` 钩子 + toast 四档 + 声明式格式分歧观测 | `src/fill/index.ts`、`src/i18n.ts` | 静默错填可测可感，48 断言门 |
| 真实站点测试塔（A-006） | 模式库(corpus)/密封 E2E/真实站点 advisory 三层 + CDP Autofill NOT-ADOPTED（ADR-0008） | `tests/corpus`、`tests/live/` | calibration 自 cch-23 起复活，三形态量化暴露 |
| 版本送达（A-007） | 1.5.0 三处一致 bump + dry-run 先行 + 用户确认后 land 即发版 | `package.json`、`vite.config.ts`、`greasyfork/Glog*` | Release v1.5.0（2026-09-12，user.js 附件） |
| 门禁减肥（A-008/009） | engine-gates 抽公共 workflow（61 例 ×3→×1）+ e2e 补 push:main；装载器 stripTypes 统一口径 | `.github/workflows/engine-gates.yml` | 三红转绿（34694435559 等） |
| 历史纪律（A-010） | 周期合入栈序 land 零 squash、版本 bump 殿后、合序全门重跑（WORKFLOW §5） | main 父链 `7dbc6fc→e3dda808` | 13 支零冲突，票级提交全可溯 |

未决路线（登记在案，不默认执行）：P1/P8 同证据档位不一致的独立裁决；GreasyFork 站内同步；私有 E2E 作业并回。
