你是「Find-Your-Country-Code 架构恢复」的修复窗口，负责票 07 的复核后修复（负反馈主路径真实页面失效）。你是fresh上下文，靠读文件工作，不靠记忆。

## 背景（大脑第 4 波复核结论，先自己验证再相信）

复核报告：D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave4.md
取证探针：D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\scripts\brain-probe-07-fb.mjs

双根因 **confirmed（复现+反事实）**：

1. **产品缺陷（主）**：`src/rules/index.ts` 的 `Rules._own(el)` 含 `el.closest('.' + WRAPPER_CLASS)` 检查。真实页面上目标字段一旦 attach 就被包进 `.cch-wrapper`，用户点面板「这不是区号字段」→ `_feedback → Rules.rememberNone(el)` → `_own` 必然命中 → 返回 null → toast「请先点击目标字段」，规则永不落盘，图标不拆。**负反馈主路径 100% 失效**。
2. **反事实已验证**：大脑临时 patch `rules._own`（去掉 wrapper 检查，对齐 04 票 `Detect._own` 已修正的语义——04 报告 §1.3 附带修复 1 移除该检查但 05 的 rules._own 未同步）→ rebuild → 同一探针：toast「已记住」、GM overrides=1、图标即时拆除 → patch 已还原。你的修复就是把 04 版 `_own` 语义同步到 rules 层（closest(#cch-root) + classList.contains('cch-btn') + id==='cch-search'||'cch-si'，**不再**按 wrapper 包裹判定）。
3. **门禁脚本两盲区（大脑已修正入位，你先核对再跑）**：`research/scripts/verify-ticket-07.mjs` 的 S4 场景隔离（改精确按 selector 删除+前置清理）与 S6 断言位置（`panel-negative-feedback` 权威生成点在 rules 层非 ui 层）。已修正为 67/67。**单元门 mock 的 closest 只查 ancestors 数组，与真实 DOM 不等价——你需要在门禁里补一个「mock 元素带 wrapper 祖先」的负反馈用例，防回归**。

## 必读文件（按序）

1. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\verification\review-wave4.md
2. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\scripts\brain-probe-07-fb.mjs（取证探针）
3. D:\Aworker\mozilla\choose-your-country\src\rules\index.ts（_own 修复点）
4. D:\Aworker\mozilla\choose-your-country\src\ui\index.ts（_feedback/attach/detach 交互链）
5. D:\Aworker\mozilla\choose-your-country\src\detect\index.ts（04 版 _own 语义模板，搜「票 04：移除 closest」）
6. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\07-ui-upgrade.md
7. D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md（§2/§4）

## 修复任务

1. **修 `Rules._own`**：按反事实验证过的语义重写（对齐 Detect._own 04 版）；注释注明「wrapper 是脚本自建的包裹层，字段本身不是 UI——按包裹判定会把全部已挂图标字段挡在负反馈之外（brain-probe-07-fb 取证 confirmed）」。
2. **补门禁 mock 盲区**：verify-ticket-07.mjs 增加一个 S3b 用例——mock 元素 ancestors 含 wrapper（与真实 DOM 等价），断言 rememberNone 仍成功；此用例在修复前应为红（你先在未修复基线跑红再修复转绿，TDD 留痕）。
3. **真实页面回归**：`npm run e2e` 全量——rules-ui 的 5 个失败用例必须全绿（负反馈写入/持久化/删除恢复/豁免/样式切换），总 42 passed exit 0。
4. **门禁全绿**：`node research/scripts/verify-ticket-07.mjs` → 68/68（67+新增 S3b）exit 0；`verify-ticket-02.mjs` 36/36；`misdetect-repro-v2.mjs` 25/25（不得破坏）。
5. **build** exit 0。
6. 版本控制遵循 WORKFLOW §4.2：在 `cch/07-ui-upgrade` 分支续提交返工（不新开分支），提交信息 `fix(cch-07): ...`。

## 质检自检（硬性，先质检再动手）

开工第一句：先复述大脑的双根因与反事实证据链，再复述必读清单。然后：
- **先质疑大脑结论**：自己跑一遍 brain-probe-07-fb.mjs（应复现「请先点击目标字段」+ 规则未写入）；再独立读 rules._own 与 Detect._own 的差异确认不一致真实存在。若你的复现与大脑结论矛盾，停下并把矛盾证据写入报告。
- 复现一致后写下修复方案自检：_own 新语义是否仍能拦截真正脚本 UI（#cch-root 内元素/cch-btn/cch-si/search）？是否影响 05 票 forcedTier 的自身 UI 守卫（S2 断言）？是否引入 02 评分路径变化（不应触及）？
- 自检通过后动手。修复后按上面 3-5 顺序全部门禁。

## 完成定义

遵循 issue 07 验收清单 + 本次修复新增（S3b 防回归用例落库）。报告落盘：
D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\07-ui-upgrade-fix-report.md
必须含：你的独立复现结果（与大脑一致/矛盾）、_own 新旧语义 diff、S3b 用例红→绿证据、E2E 42 passed 全量输出、四门禁退出码、偏离点、遗留风险。报告未落盘=票未完成。

收尾：通知大脑重算 frontier（07 闭环 → Wave 5：10 号票收口解锁）。
