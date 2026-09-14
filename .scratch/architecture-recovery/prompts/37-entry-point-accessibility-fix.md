# 启动器 37-FIX — 入口可达性（返工轮次 R1）

身份：你是 Cycle-5 票 37 的**返工修复窗口**（R1）。本票覆盖 A-xxx: A-012, A-013。

**第一步（硬要求）：先复核主 Agent 的检查结果，再动手。** 不得跳过、不得先改代码再回头找依据。

主 Agent 已核实的失败事实（可直接复现）：

- CI run `34845561008`（E2E，push 事件，head `84b8ed7f`，分支 `cch/37-entry-point-accessibility`）= **failure**。

- 失败用例：`tests/pseudo-select.spec.ts:34:3`（票 18 验收2/3 可编辑型）。全量 88 passed / 1 failed。

- 失败点：`pseudo-select.spec.ts:46` 的 `openPanel(page, "#rs-input")` 点击超时 30000ms；Playwright 日志 57 次重试均为：`<div id="cch-sw">…</div> from <div id="cch-pop">…</div> subtree intercepts pointer events`。

- 主 Agent 推断（需你独立验证）：spec 在 :42 已锚 `#anchor-cc` 开过一次面板且未关闭；本票将 lowkey 图标从 wrapper 盒外（`top:-12px;right:-12px`）移入字段右缘盒内（`top:50%;right:6px`）后，面板几何随之变化，使 :46 待点击的 `#rs-input` 图标被已开面板遮挡。

- 旁证（降低“flaky”可能性）：同一 spec 在票 38 分支（E2E 34845596301）与票 44 分支（E2E 34845607981）均 **通过**（`✓ 43`）；失败仅出现在含本票改动的分支。

必读（绝对路径，开工前逐份读）:
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\handoffs\37-entry-point-accessibility.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\37-entry-point-accessibility.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\decision-ledger.md
- D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\37-entry-point-accessibility-report.md
- D:\Aworker\mozilla\choose-your-country\docs\adr\0007-site-rule-scope-explicitness.md

本票 delta（返工轮次专属）:
- 先复现：在本地跑 `npx playwright test tests/pseudo-select.spec.ts` 取得红证据（若本地仍绿，必须给出为何 CI 才红的归因，不得直接改代码）；
- 修复方向限定为**几何/遮挡**（图标定位、面板定位、或召唤后关闭上一面板）；不得削弱任何断言、不得删改用例、不得改票 18 的验收语义；
- 不得回退本票 A-012/A-013 的已验收行为（GM 全局入口、lowkey 可见性分层、needTarget 守卫）；
- 不得触碰 release.yml 与其它票的文件。

开工第一句：先复述阻塞项、必读清单与主 Agent 的检查结果，确认无误后再动手。

修复后重跑**同一套验收标准**（不得只跑失败用例）：`node tests/scripts/verify-ticket-37.mjs` + `npx playwright test` 全量 + `npm run typecheck`；并推送分支取 CI 证据。

收尾：报告**追加**写入 `research/window-reports/37-entry-point-accessibility-report.md`，新增节标题必须为 `## 返工轮次 R1`，**不得覆盖或删改原有内容**。
