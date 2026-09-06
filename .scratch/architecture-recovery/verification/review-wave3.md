# 大脑复核报告：第 3 波（04 / 05 / 09）

> 复核人：AutoCoder（大脑）| 日期：2026-09-04 | 对象：三份窗口报告（rescan-shadow-dom / site-rules-engine / framework-injection）
> 方法：7 道门独立复跑 + rg 级源码抽查（brain-rg-wave3.mjs）+ git/but 勘验 + 对照原始 issue 完成定义

## 〇、独立复跑汇总（7 道门，全部 exit 0）

| 门 | 内容 | 结果 |
|---|---|---|
| G1 | verify-ticket-04 引擎门 | 12/12 exit 0 |
| G2 | verify-ticket-05 单元门 | 79/79 exit 0 |
| G3 | verify-ticket-09 引擎门 | 36/36 exit 0 |
| G4 | 02 回归门 + harness v2 | 36/36 + 25/25 exit 0（03 修复与三票改动未破坏误报回归） |
| G5 | 03 iti-adapter-verify | 9/9 exit 0（09 的注入收敛未破坏 03 真实联动） |
| G6 | 全量 E2E | **33 passed (24.1s) exit 0**（20 基线 + 04 新 8 例 + 09 新 4 例 + 05 红绿 1 例口径） |
| G7 | build | exit 0（dist 标记：_deepRoots/pushState/cch_site_rules_v1/_inject 全部在产物中） |

## 一、声明 → 证据 → 结论对照表

### 票 04（可重评估扫描 + Shadow DOM 穿透）

| # | 报告声明 | 独立验证 | 结论 |
|---|---|---|---|
| 4-1 | open shadowRoot BFS 穿透 + per-root observer | 源码实读：`_deepRoots`/`_observeShadow`/`_pruneWatchers` 全在；E2E shadow 用例绿（含嵌套 shadow 与负例） | ✅ 属实 |
| 4-2 | WeakSet 终态 → 指纹快照双向重评 | `_done` 仅存于注释（L110/452），实现为 `_state` WeakMap + `_fingerprint`；rescan.e2e 三用例（误挂移除/漏挂补上/disabled 撤挂补回）全绿 | ✅ 属实 |
| 4-3 | 三种路由 API 触发重扫 | 源码含 pushState/popstate；E2E「引擎级归因」用例（无 DOM 变更仅调路由 API → 扫描计数增长）绿 | ✅ 属实 |
| 4-4 | 1000 节点 scan < 350ms 防抖窗口 | probe-perf-04.mjs 实测 49–62ms 峰值（两轮）；性能 fixture 与断言在 E2E 内常绿 | ✅ 属实 |
| 4-5 | 8×500ms 初始轮询移除 | main.ts 无 setInterval（rg 抽查 NO）；E2E 33 例全绿背书 | ✅ 属实（设计内偏离，已呈报） |
| 4-6 | Shadow 内样式采纳（克隆 #cch-style 进 shadowRoot） | ui/index.ts 含该逻辑；E2E shadow 用例含图标可见性语义 | ✅ 属实 |

### 票 05（站点规则引擎）

| # | 报告声明 | 独立验证 | 结论 |
|---|---|---|---|
| 5-1 | GM 独立键 `cch_site_rules_v1` + 三通道同步 | store/index.ts 实读含该键与 CRUD 六函数；单元门 S1（持久化/刷新/跨标签广播）全绿 | ✅ 属实 |
| 5-2 | 豁免=检测入口完全跳过；强制选择器评分前命中；页面级分档覆盖 | detect/index.ts 接线实读（scan 入口 isPageExcluded 短路、_process 强制命中、pageTierOverride 重映射）；单元门 S2/S3 全绿；dist 产物含两标记 | ✅ 属实 |
| 5-3 | 自身 UI 永不命中 | 单元门断言（含红基线真实抓到缺守卫缺陷后修复）全绿 | ✅ 属实 |
| 5-4 | 规则数据格式契约（07 票消费） | 报告 §1/§2 完整 schema + API 边界 + 防御规范化；S4 契约断言全绿 | ✅ 属实 |
| 5-5 | TDD 红基线 54/75 留档 | verification/05-red-baseline.txt 存在（我未逐行复读，留档在）；79/79 转绿 | ✅ 采信（有留档文件） |

### 票 09（框架注入加固）

| # | 报告声明 | 独立验证 | 结论 |
|---|---|---|---|
| 9-1 | 单一 `_inject`：原生 prototype setter + input→change→blur | 源码实读：`_inject` 存在、`HTMLSelectElement/HTMLTextAreaElement` 分支在、事件序列字面量在；旧 `_dispatch` 零残留；`fill .value=` 直写恰 1 处（mock 兜底）、adapter 0 处（与报告声明一致） | ✅ 属实 |
| 9-2 | React/Vue 受控三重断言（DOM/状态/提交回读） | framework-inject.spec.ts 4 例全绿（hermetic vendored React 18.3.1/Vue 3.5）；E2E 全量含之 | ✅ 属实 |
| 9-3 | composed/bubbles 证据 | dist 实测 composed 编译产物在（L2567）；报告对 blur 放宽的诚实声明（原生 blur composed:false → 统一 true） | ✅ 属实 |
| 9-4 | Angular 契约级验证（无 UMD 的替代路径） | 单测门 A 组 3 例绿；边界声明清晰（真实 Angular E2E 未做，风险已列） | ✅ 属实（边界如实） |
| 9-5 | package-lock 补录 intl-tel-input | 8b3acba 含 package-lock.json +271 行；lock/manifest 同步 | ✅ 属实（已在提交说明注明） |

## 二、过程违规检查（单独呈报，不替用户追认）

| 检查项 | 结果 |
|---|---|
| 开工复述/检查点确认 | ✅ 三票均记录 blockers 解除确认与必读清单 |
| 越权提交他人改动 | ✅ 无。04 触及 tests/fp-regression.spec.ts（shadow 红标摘除，06 §6-2 契约内）；05 触及 detect/i18n/main（规则接线是本票验收 2/3 的必要落点，声明过）；09 触及 iti-adapter（兜底收敛是 issue 09 验收 3"行为集中"的必要落点）+ package-lock（偏离点 4 已注明） |
| 分支堆叠纪律 | ✅ 线性栈：01→06→03→02→04→09→05；每票 `--above` 理由均记录（依赖驱动，无随意堆叠） |
| 验收设计盲区 | ✅ 未发现（第 2 波 03 的教训已吸收：04/05/09 的 E2E 断言均含行为级终态，无"初始态冒充"形态） |
| TDD 红绿留痕 | ✅ 05/09 均有红基线留档（05-red-baseline.txt / 09-unit-gate-red.txt），且 05 的红基线真实抓到 rememberNone 缺自身 UI 守卫的实现缺陷 |
| 杂项 | `e-branch-1` 空分支仍在（无风险，建议 Wave 5 收口时清理） |

## 三、结论

**04 / 05 / 09 三票复核全部通过（done）。** 无源码级缺陷，无需重发修复启动器。三票交叉依赖密集（05 基于 04 版 detect 接线、09 改 03 的 adapter）但全部门禁无一破坏——堆叠顺序与提交范围纪律发挥了作用。

## 四、frontier（重算）

- **Wave 4 解锁：07（面板 UI 升级）/ 08（文档与 ADR）——两窗并行**（blocked-by 02,05 均已闭环）。
  - prompts：`prompts/07-ui-upgrade.md`、`prompts/08-docs-adr.md`（07 需消费 05 报告 §1/§2 的规则格式契约；08 需回顾 review-wave2/03fix/本次复核的决策记录做 ADR 素材）。
- Wave 5（收口）：10（发布链路，blocked-by 01,09,07）——待 07 完成。
- 大脑侧建议随 07/08 顺带处理：`e-branch-1` 空分支清理、CRLF 卫生决策（04 报告偏离点 1）。
