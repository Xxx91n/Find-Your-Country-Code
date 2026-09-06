# 大脑复核报告：第 4 波（07 / 08）

> 复核人：AutoCoder（大脑）| 日期：2026-09-04 | 对象：07-ui-upgrade-report.md / 08-docs-adr-report.md
> 方法：门禁独立复跑 + E2E 独立复跑 + 真实浏览器取证探针（brain-probe-07-fb.mjs）+ 反事实 patch 验证 + git/but 勘验

## 一、声明 → 证据 → 结论对照表

### 票 08（文档与 ADR）

| # | 报告声明 | 独立验证 | 结论 |
|---|---|---|---|
| 8-1 | verify-ticket-08 ALL-PASS exit 0 | 复跑 exit 0，ALL-PASS（10 文件 BOM/片段/围栏校验） | ✅ 属实 |
| 8-2 | 4 条 ADR 落 docs/adr/（含被否决路线） | 实物：0001–0004 四文件在库（1446/1465/1564/1042B）；but 分支 cch/08 两 commit；.gitignore 修正放行 docs/adr/ | ✅ 属实 |
| 8-3 | CONTEXT.md 16 术语与 spec 对齐 | CONTEXT.md 4062B 实物在库；门禁含术语簇断言 | ✅ 属实 |
| 8-4 | 用户文档过时表述清零（2 处）+ 教训补记 §5 | 门禁断言通过；教训已入 WORKFLOW §5；不超前表述票 07 功能（probe-ticket08-src2 核实声明合理） | ✅ 属实 |
| 8-5 | 提交未触碰并行窗口未提交 src 改动 | git show 08 两 commit 文件清单：纯文档 + .gitignore + scripts | ✅ 属实 |

**票 08：复核通过（done）。**

### 票 07（面板 UI 升级）⚠️ 发现源码级缺陷

| # | 报告声明 | 独立验证 | 结论 |
|---|---|---|---|
| 7-1 | 单元门/CI 证据 pending（CI-only 令） | 大脑代跑单元门：初跑 **67 例中 2 类失败**（S4 场景隔离缺陷 + S6 断言位置错——均为门禁脚本自身缺陷，非产品代码）；修正门禁后 **67/67 exit 0** | ✅ 产品单元逻辑本身通过（详见三） |
| 7-2 | E2E rules-ui 8 用例 + 全量回归 | 大脑代跑 `npm run e2e` → **37 passed / 5 failed exit 1**：rules-ui 的验收 1/2/3 五个交互用例全挂 | ❌ **源码级缺陷 confirmed** |
| 7-3 | 负反馈一键写入 none 规则并即时抑制（验收 2） | 真实浏览器取证探针：点击面板「这不是区号字段」→ toast「请先点击目标字段」、GM 无规则写入、图标未拆——**负反馈在真实页面 100% 失效**；取证显示 popup 存活、fb click 正常触发 _feedback、pageerror 为空 | ❌ **confirmed（双根因，见二）** |
| 7-4 | 低调样式 dim/hidden 切换、规则视图、豁免即时拆图标 | 因 7-3 同根因（_own 拦截）连锁失败：5 用例全与 rememberNone/_own 或规则写入相关 | ❌ 同根因 |
| 7-5 | 发现并补齐 05 遗留的规则变更→重扫接线（main.ts） | main.ts 实读含快照比对 + scheduleScan + detachAll | ✅ 属实（如实申报的越权必要接线，判定合规） |
| 7-6 | 分支 cch/07-ui-upgrade 锚定创建（--anchor cch/05） | but status 实证：cch/07 两 commit（rol feat / opu docs）在 cch/05 之上 | ✅ 属实 |

## 二、根因（confirmed：复现 + 反事实）

**`Rules._own` 的 wrapper 检查使负反馈永久失效**（src/rules/index.ts）：

1. **复现**：真实页面字段一旦被 attach 即包进 `.cch-wrapper`；用户点「这不是区号字段」时 `_feedback → Rules.rememberNone(el)`，而 `rules._own(el)` 含 `el.closest('.' + WRAPPER_CLASS)` → 已挂图标的目标字段**必然**命中 → 返回 null → remembered=false → toast「请先点击目标字段」，规则不落盘。取证探针全程 popup 存活、无 pageerror，排除时序/双实例假说。
2. **反事实**：临时 patch `rules._own` 去掉 wrapper 检查（与 04 票 `Detect._own` 已修正的语义对齐——04 报告 §1.3 附带修复 1 明确移除该检查，但 05 的 rules._own 未同步）→ rebuild → 同一探针复跑：**toast「已记住」、GM overrides=1、图标即时拆除**（全部符合验收 2）→ patch 还原。
3. **次生缺陷**：门禁脚本两个盲区掩盖了该缺陷——(a) S4 场景未隔离 S3 遗留规则导致断言删错规则（已修：精确按 selector 删除+场景预清理）；(b) S6 要求 `panel-negative-feedback` 字面量出现在 ui 层，实际权威生成点在 rules 层（已修：断言移位）。修正后 67/67。单元门 mock 的 `closest` 只查 ancestors 数组，真实 DOM 行为不等价——mock 盲区使缺陷漏网。

## 三、过程违规检查

- **无违规**：07 的 main.ts 接线补齐属验收 2/3 必要落点且报告偏离点 1 如实申报；CI-only 令遵守（本机零构建零测试，报告如实标注 pending，执行由大脑复核完成）；分支锚定创建合规；08 提交范围干净。
- **呈报事项**：07 报告称"e2e 仅入库待 CI"——但大脑代跑发现 5 用例全挂，说明**该票在无 CI 证据的情况下按完成态提交**；流程上符合 CI-only 令，但证明"pending CI"状态不能作为 done 依据，已在本复核中代为闭环。

## 四、结论与处置

- **08：复核通过（done）**。
- **07：复核不通过（源码级缺陷）**——负反馈主路径在真实页面 100% 失效（confirmed+反事实）。重发修复启动器：`prompts/07-ui-upgrade-fix.md`（含先质检大脑结论再修复的硬条款 + 门禁脚本修正已由大脑完成入位）。

## 五、frontier（重算）

- 修复中：07（cch/07-ui-upgrade 续提交返工）
- 08 done 保持；07 修复闭环后 → **Wave 5 收口：10（发布链路）解锁**（blocked-by 01,09,07）。
