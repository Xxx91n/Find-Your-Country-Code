# 窗口实施报告 — 票 40: 帧治理降级反馈（A-017）

> 实施子窗口 | 2026-09-14 | 分支 `cch/40-frame-governance-degradation`（commit qwz / sha c70845c0，已推送；独立栈，不与他票堆叠）
> 版本控制遵循 WORKFLOW §4.2；验收证据锚定 commit sha + CI run（CI-only）。

## 0. 开工门槛复述

- 阻塞项：issue 头部 `Blocked by: None`——可立即开工（W1 并行组）。
- 必读清单逐份读全：handoffs/40、issues/40、spec.md（票 40 属「静默失败与卫生」组）、WORKFLOW.md（§4.2 版本控制）、decision-ledger.md（A-017 原文）、ADR-0008（三层测试塔）。
- 通用调研要求：atomcode 深度调研已执行（串行护栏：本窗口 1 在途，结果已索引 ctx FTS5，源标签 atomcode）；docs/adr 0001–0008 + CONTEXT.md 帧治理心智模型已回顾（全帧自治+顶层中心化面板+GM 同源存储）。

## 1. 根因与修复

A-017 根因（decision-ledger 行号锚定）：`isEmbeddedFrame()`（main.ts:44-53）只 `querySelectorAll('iframe, frame')` 顶层直接帧——不穿 shadowRoot、不进孙帧文档；嵌套/包裹场景下跨域子帧 `e.origin !== location.origin` 且来源锚点落空 → main.ts 校验行静默 return（无面板、无 toast）。

修复两点，均在 main.ts 顶层 message handler 链路，不改架构：

1. **`isEmbeddedFrame` 改双相递归枚举**：
   - 相 1 浏览上下文树：`window.length` + `w[i]` 索引访问在跨域 Window 白名单内（observed：本票 debug spec 实测跨域窗口 `w.length=1`、`w[0]` 返回子窗口），覆盖任意深度任意 origin 的孙帧——含「跨域中间帧下游」这类 DOM 递归不可达形态。
   - 相 2 DOM 遍历穿透 open shadowRoot：Chromium 实测 shadow 内 iframe **不进** `window.length` 枚举（observed：`window.length=2` 只含两个 DOM 帧，shadow 帧成员判定 NOT-member）——须 TreeWalker 逐元素查 `el.shadowRoot` + iframe/frame 比 `contentWindow === source`；同源帧 document 入栈继续递归。
   - 防御：双 visited Set + budget=512 枚举上限（自嵌套页面不死循环）；超限按校验失败处理。
   - 盲区即降级面：closed shadowRoot、跨域祖先下游的 shadow 帧枚举不到 → 校验失败 → toast（不放宽校验）。
2. **校验失败降级为用户可见 toast**：`e.origin !== location.origin && !isEmbeddedFrame(e.source)` 条件原文未动；拒绝时 `UI.toast`（既有设施，顶层渲染）弹「嵌套帧来源无法验证，已拦截打开 / Embedded frame could not be verified — panel not opened」，不再静默 return。

## 2. 调研依据（atomcode 串行调研 + 实测修正）

- 采纳（cited）：「引用相等比较 + 递归遍历浏览上下文树」为行业成熟做法（`contentWindow === e.source` 比较跨域合法）；校验失败分级降级——手动触发路径必须可见提示（Bitwarden 2023-03 修复：manual path 弹目标 URI 警告 + cancel/proceed；1Password 信用卡填充的「不可被覆盖确认弹窗」；KeePassXC 命名化错误文案 + 图标灰显）。反模式实录：1Password inline menu 在不可填帧内「显示了却静默失败」遭社区投诉——正是本票消灭的形态。
- **实测修正（observed，推翻调研一处细节）**：调研称「window.frames 枚举天然穿透 shadow DOM」——Chromium 实证不成立（shadow 内 iframe 不在 window.length/indexed 枚举内），故补相 2 DOM 穿透。修正已写回代码注释。

## 3. 变更清单

| 文件 | 变更 |
|---|---|
| src/main.ts | isEmbeddedFrame 双相递归重写；顶层 handler 校验失败分支 UI.toast（就地双语文案） |
| tests/fixtures/iframe-mid.html（新增） | 同源中间帧 → 跨域孙帧（端口+1），三层嵌套链路 |
| tests/fixtures/iframe-mid-x.html（新增） | 跨域中间帧变体：孙帧与自身同源（对顶层跨域），专测跨域 Window 索引枚举 |
| tests/fixtures/iframe-nested.html（新增） | 三层嵌套顶层 fixture：顶层字段 + f-mid（同源）+ f-mid-x（跨域）+ shadow 包裹跨域帧 |
| tests/iframe-nested.e2e.spec.ts（新增） | 5 例密封 E2E（见 §4），零外网依赖 |

## 4. 验收清单逐条证据

| 验收项 | 证据 | 结果 |
|---|---|---|
| 帧枚举递归穿透 shadowRoot 与孙帧 | main.ts 双相枚举；E2E 用例①孙帧（跨域·第三层）开面板、③shadow 包裹跨域帧开面板、④跨域中间帧下游孙帧开面板 | ✅ CI run 34826506374 |
| 校验失败时用户可见 toast 降级提示（不再静默 return） | 用例⑤：跨域弹窗伪造 FRAME_OPEN_MSG → #cch-toast 可见且非空、#cch-pop 不存在 | ✅ 同上 |
| 三层嵌套 fixture 下点图标→开面板或明确提示 | iframe-nested.html 三层 fixture；用例①（开面板）+ 用例⑤（明确提示）两分支均覆 | ✅ 同上 |
| 新增密封 E2E 覆盖嵌套帧场景 | tests/iframe-nested.e2e.spec.ts 5 例全绿（密封 fixture，无外网） | ✅ 同上 |
| delta：不重构既有帧架构 | 全帧自治 / 顶层中心化面板 / origin+source 双校验全部保留；改动仅枚举强化 + 拒绝可见化 | ✅ |
| delta：票 24 入站 origin 校验语义不放松 | 校验条件一字未动；e.source===window 忽略、同源 origin 强校验、来源锚点全保留 | ✅ |
| delta：降级=提示而非放宽 | 校验失败仍 return 不开面板，仅附加 toast | ✅ |

**CI 证据**（head c70845c0，push cch/** 触发）：
- E2E run https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34826506374 ✓（1m13s；全量含本票新 spec 5 例 + 票 12 回归组）
- Engine Gates run 34826506446 ✓ / Typecheck run 34826506381 ✓ / Lockfile Regen run 34826506332 ✓

本地复跑（构建后）：`npx playwright test tests/iframe-nested.e2e.spec.ts` → 5/5 绿；TDD 红基线：修复前产物跑同 spec 4/4 红（孙帧/shadow 静默失败 + 无 toast），红转绿对照成立。

## 5. 偏离点（设计内决策申报）

1. **toast 文案就地双语，未入 i18n MSG 表**：i18n.ts 是并行票 42 的重写面（LOCALE_MODES/手动切换当时在途未提交）；向其新增 key 会与别家未提交行同 hunk——产生跨票依赖或拖带别家改动。选择：main.ts 内联 zh/en 双择（沿用既有 navigator.language 判定语义）；收口时可一行收编进 MSG（建议键名 frameDenied）。
2. **双相而非单相 window.frames 枚举**：调研建议的纯浏览上下文树枚举经 Chromium 实测不覆盖 shadow 内 iframe（observed）；实现比 issue 字面「递归穿透 shadowRoot」多一层——window 树管深度与跨域，DOM 穿透管 shadow 封装。
3. **budget=512 枚举上限为新增防御**：iframe src 回指自身的自嵌套页面不死循环；超限归入「枚举不到即校验失败」语义，走降级提示。

## 6. 风险与给大脑的提示

1. **设计盲区如实登记**：closed shadowRoot、跨域祖先下游的 shadow 帧枚举不可达——点图标弹 toast（满足「要么开面板要么明确提示」）。属有意边界，与「不放宽校验」delta 一致。
2. **共享工作区并行态**：iframe.e2e.spec.ts:78 在本工作区现红——票 37 已改 spec 期望 2 条菜单命令但其 main.ts 侧未随盘；非本票回归面。本票分支快照（仅含本票改动）CI 全绿。
3. **frameDenied 收编**：票 42 落地后建议把内联文案迁入 MSG，跟随手动语言选择。
4. **真机未验证**：TM 宿主真实三层嵌套站点（codepen embed 再被嵌等）未实测；密封 E2E 覆盖同等结构。建议票 39 真实站点层收编 CodePen 时顺带覆盖（A-016 已有嵌套 preview 断言安排）。

## 7. 教训候选（WORKFLOW §5）

- **atomcode 调研结论须实证兜底**：「window.frames 穿透 shadow DOM」被 Chromium 实测证伪（shadow 内 iframe 不进 window.length 枚举）。调研定方向后，先用一次性 debug spec 断言平台行为再定实现形态——比按字面实现后返工便宜。
- **共享工作区的「半成品红」归因**：他票 spec 先行/代码未至会在本地全量跑制造红灯；归因前先 but status 盘点 uncommitted 面，红灯归属以「本票分支快照 CI」为准（本票分支 CI 全绿即本票无责）。

## 8. 触达面

新增：tests/fixtures/iframe-{mid,mid-x,nested}.html、tests/iframe-nested.e2e.spec.ts。
修改：src/main.ts（2 hunk，全部本票所有物）。
未触达（并行票所有物，已排除在提交外）：src/i18n.ts、src/ui/index.ts、tests/iframe.e2e.spec.ts、tests/helpers/userscript.ts、tests/server.mjs、.github/workflows/*。
