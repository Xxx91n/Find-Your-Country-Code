# 架构恢复周期总结（2026-09-03 → 2026-09-05）

> 沉淀位置：docs/architecture-recovery-2026-09.md（本文件）| 归档：.scratch/architecture-recovery/
> 工作流依据：WORKFLOW.md（.scratch/architecture-recovery/）§3 S0–S8 | 复核链：verification/ 六份报告

## 1. 周期概要

单文件油猴脚本（布尔检测，v1.3.4，42KB）→ 模块化 TS 工程 + 五层加权评分引擎 + 站点规则引擎 + Shadow DOM/SPA 全覆盖 + iti v16–v29 适配 + React/Vue 注入加固 + 面板 UI（负反馈/规则管理/分档样式）+ Playwright hermetic E2E（42 例）+ 发布链路适配（v1.4.0 就绪）。

大脑/子窗口双轨多窗口协作：10 票 6 波次，全部经大脑独立复核（每票实测门禁/E2E/探针，不采信自述）；两票（03、07）复核发现源码级缺陷 → 修复启动器（含"子代理先质检大脑结论"硬条款）→ 修复 → 复审闭环。

## 2. 心智模型（最终形态，对齐行业工业级共识）

调研来源：atomcode 全景（23 搜索/28 源，chromium+bitwarden+keepassxc+iti 矩阵）+ 子代理双线。核心采纳：

1. **autocomplete token 优先**（Chromium 分类链直译）：`tel-country-code`/`country` 一票强命中。
2. **五层信号瀑布**：L0 标准信号 → L1 词表加权（歧义词降权组）→ L2 锚→目标关联 → L3 内容验证（值域整体分布）→ L4 负分排除（词边界）。
3. **分级行动**：auto/lowkey/none + 手动召唤（低置信不打扰但可发现）。
4. **密码管理器三段式**：词表→锚定→可见性闸门；站点级规则后门（exempt/强制/分档覆盖）对齐 1Password data-1p-ignore / Bitwarden linked field / KeePassXC sites.js 三源。
5. **iti 适配**：getInstance 稳锚（v16–v29 不断代）→ setNumber 优先 → 方法双名 → 双代 DOM 类名兜底。
6. **注入安全**：原生 prototype setter + input→change→blur（React/Vue/Angular 共识）。

## 3. 关键决策（ADR 索引，详见 docs/adr/）

- 0001 评分制取代布尔制（accepted，3 被否决路线）
- 0002 vite-plugin-monkey 模块化、单 .user.js 产物（accepted）
- 0003 站点规则引擎：检测+兜底（accepted）
- 0004 组件库伪-select 识别（deferred，证据不足）

## 4. 验证资产（全部可复跑）

- 门禁 9 道：verify-artifacts(258) / 02(36) / 04(12) / 05(79) / 07(73) / 08(ALL-PASS) / 09(36) / 10(25) / iti-verify(9)
- 回归：misdetect-repro-v2 25/25（含 8 误报样本全不注入）
- E2E：Playwright 42 passed（hermetic，本地 vendored iti/react/vue）
- 收口终跑：closing-2-finalgates.mjs ALL-GREEN（11 项，含 build 270ms）

## 5. 修复案例存档（教训载体）

- 03：mock 全绿掩盖真实 v18.2.1 断链（_global 错选 factory function + v18 DOM 选择器缺失）→ 探针取证 + 反事实 → 修复 → 终审探针 confirmed。
- 07：rules._own 的 wrapper 检查使负反馈 100% 失效（04 已修 detect 层、05 未同步 rules 层——跨票语义同步缺失）→ 反事实 patch 验证 → 修复 → 三重 verified。
- 共性教训：门禁 mock 与真实 DOM 不等价是漏网主因；"pending CI"不能当 done；跨票修改共享语义（_own 类）必须显式登记同步责任。

## 6. Backlog（遗留事项，等用户决定是否立票）

| # | 事项 | 来源 | 建议 |
|---|---|---|---|
| B1 | 组件库伪-select 识别（MUI/AntD/Element role=listbox） | ADR-0004 deferred | 先 atomcode 专项调研再立票 |
| B2 | L2 锚查询不穿透 shadow root（shadow 内锚分缺失） | 04 报告风险 4 | 与 B1 同票或独立小票 |
| B3 | .gitattributes/CRLF 全仓归一 | 01/04/07 报告共同遗留 | 卫生票，低优先 |
| B4 | React 19 _valueTracker 行为专项核验 | 09 报告风险 1 | 调研票（npm 形态 fixture） |
| B5 | 真实 Angular CLI 站点 E2E | 09 报告风险 2 | 随 B4 |
| B6 | 规则选择器写入时有效性预检（UI 提示非法选择器） | 05 报告风险 1 | 07 后续 UI 票 |
| B7 | release-dry-run push 触发器绑定 cch/10（分支删除后休眠，无害） | 10 报告风险 2 | 收尾清理时一并处理 |
| B8 | e-branch-1 空分支 + origin 9 个 cch/* 镜像清理 | 复核杂项 | push/合并后清理 |
| B9 | released 后 README 恢复下载链接（GreasyFork + Release 附件路径） | 08 报告 | 发版后小改动 |
| B10 | closed root 穿透（attachShadow monkey-patch 实验特性） | spec Out of Scope | 观望，社区成熟再议 |

## 7. 收口操作记录（2026-09-05）

- 步骤1 交叉核对：closing-1-crosscheck.mjs 33 项 0 矛盾。
- 步骤2 终跑：closing-2-finalgates.mjs 11 项 ALL-GREEN（build 79.55kB/270ms）。
- 步骤3 三层一致性：closing-3-docs.mjs 74 项 0 问题（CONTEXT 术语↔代码落点↔ADR 决策）。
- 步骤4 合并：but pull（up to date）→ cch/10 含整链验证（祖先检查 9/9）→ 本地 main 快进至 f8a4fab（9 票整链）→ cch/08 merge-tree 预演无冲突 → merge commit 3808ce6（纯对象操作，不动工作区）。**origin 未推送**（remote 临时停用后恢复，origin/main 仍 8c5e266，本地领先 29 commit）——push 等待用户明确指令。
- 步骤5 本文件 + 归档（见 §8）。

## 8. 归档说明

- 全部过程资产：.scratch/architecture-recovery/（WORKFLOW/spec/issues/handoffs/prompts/research/verification/report）。
- 复核链：verification/review-{wave2,03fix,wave3,wave4,07fix,10}.md。
- .scratch 为未跟踪目录，保留作过程档案；如需入库可在收口后单独决策（git add -f）。
