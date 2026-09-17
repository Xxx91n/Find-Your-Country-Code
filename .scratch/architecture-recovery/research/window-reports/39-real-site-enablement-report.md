# 窗口实施报告 — 票 39: 真实站点层启用（A-016）

> 实施子窗口 | 2026-09-14 | 分支 `cch/39-real-site-enablement`（commit `bb0e8f1d`，已推送）
> 版本控制遵循 WORKFLOW §4.2；验收证据锚定 commit sha + CI run（CI-only）。

## 0. 开工门槛复述

- **阻塞项**：issue 头部 `Blocked by: 票 40`（CodePen 嵌套 preview 断言依赖帧递归修复）。已核实解除：`cch/40-frame-governance-degradation` 分支已有实现 commit（`qwz`）+ 报告提交，`isEmbeddedFrame` 已改双相递归。
- **必读清单逐份读全**：`handoffs/39`、`issues/39`、`spec.md`（Cycle-5）、`WORKFLOW.md`（§4.2 版本控制 / §4.4 启动器规范）、`decision-ledger.md`（A-016 原文与去向）、`docs/adr/0008-real-site-testing-layers.md`；另补读 ADR-0004/0005（伪 select 档位）、`CONTEXT.md`（分级行动 / 帧治理 / 密封 E2E 词汇）、`tests/live/*`、`real-site-smoke.yml`、`e2e.yml`、`engine-gates.yml`、`verify-37.*`（门与约定范式）。
- **通用调研要求**：atomcode 深度调研已执行（串行护栏：本会话 1 在途，见 §2）；`docs/adr/0001–0009` + `CONTEXT.md` 既有心智模型已回顾。

## 1. 实现与根因

A-016 根因（decision-ledger 原文）：`tests/live/site-manifest.json` 两个 `kind:"live"` 目标 `enabled:false` 且 `selector:null`，**实际启用数 = 0**；冒烟 harness 只能在**顶层帧**断言，无法覆盖「编辑器页 + 嵌套 preview iframe」形态；工作流用 headless shell，无法渲染受反爬挑战的真实站点。

本票实现四件事：

1. **harness 增补嵌套帧断言**（`tests/live/live-smoke.mjs`）：目标可声明 `frame`（子串匹配子帧 URL），断言在匹配子帧内求值（`waitForChildFrame` + 帧内 `PROBE`），未声明则沿用顶层帧语义（既有 mirror 目标不回归）。
2. **harness 增补未捕获异常断言**：`expect="injected"` 目标要求 `pageerror` 计数为 0（与 `.cch-wrapper` 出现构成 issue 验收项 3 的两条断言）。
3. **harness 改有头启动**：`headless:false`（CI 走 `xvfb-run`；无 `DISPLAY` 自动回退 headless 并打印告警）。**不采用 UA 伪造与反自动化指纹开关**（依据见 §2）。
4. **挑战检测降为诊断**：不把挑战标题当控制流——实测发现挑战页会本地化（中文「请稍候…」），英文正则误判为「已化解」并静默降级为「未找到嵌套帧」；改为「成败只由目标帧内 `.cch-wrapper` 是否出现裁定」，挑战信号仅用于失败文案。

## 2. atomcode 深度调研（采纳记录）

调研问题：「对受 Cloudflare 等机器人防护的第三方真实网站做自动化冒烟测试，业界成熟做法与合规边界是什么？」（串行 1 在途；三引擎 8 次检索 / 5 类角度全覆盖 / 8 篇全文核验）

| 结论（来源） | 本票采纳 |
|---|---|
| Playwright 官方 Best Practices：「Only test what you control」——真实站点测试只能是**补充性**兼容性探测，不是回归主防线（来源 1） | 保留三层测试塔：密封 E2E 仍为 PR 阻断主防线；本层维持 advisory（`continue-on-error` + 不进 PR 触发面） |
| Bitwarden BIT live tests 三纪律：不登录 / 不深挖 / 低频（来源 5） | 本层维持：弱断言（只断言存在性）、不登录、周级 + 手动 |
| **反检测对抗是红线**：Cloudflare 官方明确 ML 打分基于 TLS 指纹/行为/全局信号，**UA 伪装对 bot score 无效**；且法律上接近「规避技术措施」、运营上会触发 IP 信誉升级（来源 4、6；来源 7 为反面对照，未采信） | **未采纳**任何 stealth 插件 / UA 伪造 / 反自动化指纹开关 / 代理轮换；改用「有头真实 Chrome + xvfb」——浏览器真实呈现自身 UA，零伪装 |
| 法律边界：公开网页在 CFAA 下无「未授权」概念（hiQ v. LinkedIn 原文），但 **ToS 合同可独立成立**；robots.txt 非访问授权（RFC 9309）（来源 2、3、8） | 仅访问公开页、不登录、低频浅层；不碰需认证区域 |
| Cloudflare 侧视角：「诚实、低频、浅层」的自动化处于可容忍噪音区间；伪装成人类反而落入恶意爬虫治理面（来源 4、6、9） | 本层定位与之一致 |

**调研与实测的交叉印证**：atomcode 独立复核本仓库 `real-site-smoke.yml` + `site-manifest.json` + `live-smoke.mjs`，结论为「与业界共识逐条对齐」。

## 3. 实测证据（本窗口 Playwright 探针，非自述）

### 3.1 反爬挑战变量隔离矩阵（CodePen 编辑器页）

| 组合 | 挑战未化解 | 首次出现 `.cch-wrapper` | preview 帧内 wrapper |
|---|---|---|---|
| headless shell + 默认 UA | ✗ 被拦 | — | — |
| headless shell + Chrome UA | ✗ 被拦 | — | — |
| headless shell + Chrome UA + 反自动化开关 | ✓ 通过 | 7.7s | 1 |
| 完整 Chromium + 默认 UA（含 HeadlessChrome） | ✗ 被拦 | — | — |
| 完整 Chromium + 默认 UA + 反自动化开关 | ✗ 被拦 | — | — |
| 完整 Chromium + Chrome UA | ✓ 通过 | 12.6s | 1 |
| **有头完整 Chromium + 默认 UA** | **✓ 通过** | **13.7s** | **1** |

**结论**：必要充分条件 = 真实 Chrome UA；而**有头浏览器天然满足**，无需任何伪装。故选有头 + xvfb。

### 3.2 挑战升级现象（IP 信誉敏感）

同一编辑器页在本窗口前 2 次导航均正常渲染（英文挑战面自动化解）；累计约 8 次自动化导航后，挑战升级为**中文「请稍候…」且 34s 未化解**。→ 坐实「低频」纪律的必要性，也说明挑战检测不能做控制流。

### 3.3 目标可达性与注入实测

| 候选 | 可达 | 挑战 | 引擎注入 |
|---|---|---|---|
| `codepen.io/pen/ExzVrPY`（编辑器页） | 本地：否（升级后）；CI：是 | Cloudflare | 本地失败 / **CI pass** |
| `cdpn.io/webdevpuneet/fullpage/ExzVrPY`（Pen 渲染域） | ✓ ~5s | 无 | ✓（`about:srcdoc` 嵌套帧内 `#mobile_code`，tier=auto score=90） |
| `countrycode.org` | ✓ | 无 | ✗（`#countrySelect` 是导航选择器，非区号字段——如实不选） |
| `mozilla.github.io/form-fill-examples/` | ✓ | 无 | 索引页无表单 |
| `selenium.dev/.../web-form.html` | ✓ | 无 | select 无国家项 |
| `github.com/signup` | ✗ goto 45s 超时 | — | 注册页无区号字段 |
| `twilio.com/try-twilio` | ✓ | 无 | 首屏无 select/tel/combobox |

**CodePen 回归背景**：Pen `ExzVrPY`（作者 `webdevpuneet`）为 intl-tel-input 形态，正是 `tests/manual/cch-test-page.html:207` 记录的用户上报回归页。

## 4. 变更清单

| 文件 | 变更 |
|---|---|
| `tests/live/site-manifest.json` | 8 目标：4 mirror + 2 CodePen live（启用）+ 2 外部候选（跳过，reason+ticket）；新增 `frame` 字段与 `frameRule`/`launchRule`/`challengeRule`；更新 `enablementRunbook` |
| `tests/live/live-smoke.mjs` | 嵌套帧求值断言；`pageerror` 计数断言；有头启动 + 无 DISPLAY 回退；挑战检测仅诊断 |
| `.github/workflows/real-site-smoke.yml` | `xvfb-run` 有头渲染；xvfb 防御性安装；`timeout-minutes: 20`；保持 schedule/workflow_dispatch + advisory |
| `tests/scripts/verify-ticket-39.mjs`（新） | 28 断言门（白名单契约 / CodePen 收编 / harness 能力 / 隔离 / advisory / xvfb），零外网 |
| `.github/workflows/verify-39.yml`（新） | 本票门 PR 门控 + 分支 push + 手动 |
| `.gitignore` | 补 `live-out/`（运行产物） |
| `research/scripts/39-*.mjs`（8 份，新） | 可复现探针（矩阵/有头/注入/候选/字段），本报告 §3 的证据锚 |

## 5. 验收清单逐条证据（commit `bb0e8f1d`）

| 验收项 | 证据 | 结果 |
|---|---|---|
| 至少 1 个 live 目标 `enabled:true` 且 selector/reason/ticket 齐备 | `live-codepen-editor`（selector `#mobile_code` / reason 含核对日期 2026-09-14 / ticket 39）；另 `live-codepen-pen-fullpage` | ✅ verify-ticket-39 G1e/G1f/G1g |
| CodePen 编辑器页被收编为 live 目标，含嵌套 preview iframe 断言 | `frame:"cdpn.io"`；断言在 preview 子帧内求值（`#mobile_code` 挂 `.cch-wrapper`） | ✅ run 34837633569 / 34838605363（`[pass] live-codepen-editor …（嵌套帧 cdpn.io 内）`） |
| 冒烟只断言存在性（`.cch-wrapper` 出现 + 无未捕获异常） | `expect=injected` → `wrappers>0` 且 `pageErrors===0`；不登录不深交互 | ✅ 同上（`errs=0`） |
| 连续两次 workflow_dispatch 绿（附 run ID） | run https://github.com/Xxx91n/Find-Your-Country-Code/actions/runs/34837633569 ✅ / run 34838605363 ✅ | ✅ 两次均 `completed/success`，`白名单契约 + harness 自证: PASS` |
| 真实站点层仍为 advisory（不进 pull_request 触发面） | `on:` 仅 `workflow_dispatch` + `schedule`；smoke 步 `continue-on-error: true` | ✅ verify-ticket-39 G4b/G4c/G5a |
| **delta** 跳过条目必须携带非空 reason + ticket | 2 个跳过目标均带 reason（含实测结论）+ ticket | ✅ verify-ticket-39 G1c/G1d；live-smoke `validate()` 硬校验 |
| **delta** 不得让 flaky 真实站点污染密封 E2E | live host（codepen.io/cdpn.io/github.com/twilio.com）不出现在任何密封 spec/fixture/corpus/helper/config；`playwright.config` baseURL 仍为 127.0.0.1 | ✅ verify-ticket-39 G4e/G4f |
| **delta** 不可达/改版如实登记降级，不伪造绿 | `live-github-signup`/`live-twilio-signup` 保持 `enabled:false` + 实测 reason；编辑器页本地被挑战时如实报「反爬挑战未化解」而非绿 | ✅ §3.2/§3.3 |

**推送门（head `bb0e8f1d`，`push cch/**` 触发）**：E2E `34837619917` ✓ ｜ Engine Gates `34837619940` ✓ ｜ Typecheck `34837619936` ✓ ｜ Verify Ticket 39 `34837619984` ✓ ｜ Lockfile Regen `34837619916` ✓

**本地验证**：`npm run build` ✓ ｜ `npx playwright test` → **94 passed** ｜ `tsc --noEmit` 0 错 ｜ verify-ticket-39 **28/28** ｜ verify-ticket-37 20/20 ｜ verify-ticket-02 36/36 + G10 5/5 ｜ misdetect-repro-v2 25/25 ｜ verify-ticket-42 42/42 ｜ 本地有头冒烟：Pen 渲染域 pass、编辑器页如实报挑战未化解（本地 IP 已升级）。

## 6. 偏离点（设计内决策申报）

1. **未采用「反自动化指纹开关」**：变量隔离矩阵显示该开关（配合 Chrome UA）可让 headless 过关，但 Cloudflare 官方称 UA 伪装对 bot score 无效、且法律/运营代价高（§2）。选择有头真实 Chrome，零伪装。
2. **新增 `live-codepen-pen-fullpage`（超出 issue 字面）**：issue 只点名编辑器页。但编辑器页的挑战化解具 IP 信誉敏感性（§3.2），单一目标不稳健；Pen 渲染域同属 CodePen 真实站点、同一回归 Pen、同样含嵌套帧（`about:srcdoc`），作为可持续断言目标共存。
3. **挑战检测降为诊断而非控制流**：初始实现按挑战标题提前判失败，实测被本地化标题（「请稍候…」）击穿（误判为已化解）；改为成败只由 `.cch-wrapper` 裁定。
4. **`countrycode.org` 未采纳**：可达且有 241 项国家下拉，但引擎不注入（导航选择器，非区号字段）——不为了凑数把不注入的站点写进断言面。
5. **`.gitignore` 补 `live-out/`**：harness 既有产物目录（票 32 起），此前未忽略。

6. **票面（issue）勾销留在工作区未提交**：`issues/39-real-site-enablement.md` 由 `cch/cycle5-ticketing`（rlp）创建；本票独立栈若直接提交该文件会触发 GitButler 跨栈依赖（需把本票栈 `but move` 到 cycle5-ticketing 之上）。为不改动本票独立栈基座与已锚定的实现提交 sha（`bb0e8f1d`，两次绿 run 均锚在此 sha），勾销内容留在工作区，由大脑收口阶段（WORKFLOW §4.3「子窗口报告落 research/window-reports/，大脑收口阶段逐份核对后勾销波次表」）统一处理——与票 37/40/42/43 同模式（其 issue 勾销同样未入各自分支）。

## 7. 风险与给大脑的提示

1. **CI 上编辑器页当前可过，但非永久保证**：本地实测已出现挑战升级（IP 信誉敏感）。建议：若某次周度冒烟变红且文案为「反爬挑战未化解」，按 `challengeRule` 将 `live-codepen-editor` 降为 `observe`（或 `enabled:false` + reason），**不得**为转绿引入伪装手段。
2. **Pen 渲染域依赖第三方 Pen 存活**：`ExzVrPY` 若被作者删除/改版，`frame:"srcdoc"` 将匹配不到——属设计内真实站点改版风险，按 runbook 如实登记。
3. **`about:srcdoc` 非跨域帧**：Pen 渲染域的嵌套帧是同源 srcdoc；跨域嵌套（编辑器页 `cdpn.io`）已在编辑器目标覆盖，两者互补。
4. **ticket 40 建议的顺带覆盖已完成**：票 40 报告 §6.4 建议「票 39 收编 CodePen 时顺带覆盖真机三层嵌套」——本票以真实站点（编辑器页跨域 preview 子帧）覆盖，密封层则由票 40 的 `iframe-nested.e2e.spec.ts` 保底。

## 8. 教训候选（WORKFLOW §5）

- **反爬挑战页会本地化**：以英文标题正则判定「挑战已化解」会把中文「请稍候…」误判为已通过，静默降级为「未找到嵌套帧」——真因被掩盖。教训：把不可控外部信号（挑战页）只当**诊断文案**，成败一律锚定在**自己控制的断言对象**（`.cch-wrapper`）上。
- **「可达」是有条件的**：同一 URL 在「headless shell」与「有头 Chrome」下是两个不同的可达性事实；自动化可达性必须连同**运行配置**一起记录（否则复现无门）。
- **共享工作区并行态**：`but status` 会列出其他窗口的 uncommitted 面（本票开工时 issues/36、42、43 在途，中途 issues/38 + 报告也在途）；提交必须按 ID 精确选择，绝不 `but commit`（无 ID）全量。

## 9. 触达面

新增：`tests/scripts/verify-ticket-39.mjs`、`.github/workflows/verify-39.yml`、`research/scripts/39-{codepen,matrix,matrix2,headed,candidates,inject,selector,viewport}-probe.mjs`（8 份）。
修改：`tests/live/site-manifest.json`、`tests/live/live-smoke.mjs`、`.github/workflows/real-site-smoke.yml`、`.gitignore`。
未触达（其他窗口所有物，已排除在提交外）：`.scratch/architecture-recovery/issues/36,38,42,43*.md`、`research/window-reports/38-*.md`。
