# Decision Ledger — 架构恢复周期摩擦点台账（对账闸）

> 用途：立票前的对账闸。架构报告的每个摩擦点/候选在此登记，spec 与每张票/每份 handoff 逐条声明覆盖的 A-xxx；无去向记录清单非空即停下呈报，不许立票。
> 生成：大脑 Agent | Cycle-4 生成 2026-09-12（上游 `research/cycle4-investigation.md`）；**Cycle-5 续登 2026-09-14（上游 `research/cycle5-investigation.md` + `cycle4-closure/03-backlog-and-merge-state.md` B-1…B-10）**
> 状态取值：`current`（本周期处理）/ `deferred`（登记在案，非本周期）/ `done`（已闭环，随窗口报告勾销）/ `implemented`（历史周期已实现，保留审计链）
> **Cycle-5 结算（2026-09-14，审计 Agent）**：A-011…A-025 = **15/15 implemented**（其中 A-024 登记前提 stale）。决策摘要沉淀 `docs/architecture-recovery-cycle5-decisions.md`；本账本随 `.scratch` 一并归档。
> **ID 连续性**：A-001…A-010 为 Cycle-4 台账（终态 implemented，审计链保留）；Cycle-5 新登记**续 A-011 起**，不重启编号——重启会与既有 A-001…A-010 冲突，破坏「单台账 + 票级 A 声明」机制。

> **归档说明（票 41 / A-018，2026-09-14）**：本台账中引用 `research/cycle*-investigation.md`、`research/launcher-selfcheck.md`、`cycle4-closure/…` 等路径的**过程证据已归档出工作树**（仓库外 `D:\Aworker\mozilla\choose-your-country-evidence-archive\`；历史副本 commit `b7b1f0a2`），引用一律相对归档根解析。详见 `README.md` 「归档说明」节。

## 台账

| ID | 问题描述原文 | 规范化需求 | 显式约束 | 状态 |
|----|-------------|-----------|---------|------|
| A-001 | 纯关键字独立 input 达不到低置信线：`L1_STRONG_KW_SCORE=30` < `SCORE_LOWKEY=35`，`<input name="countryCode">` / placeholder="Country code" 等真实站点标准命名只落 `none`，仅手动召唤 | 让纯关键字/placeholder 弱信号且无锚的区号字段能跨过低置信线（≥35）被低调注入或至少登记可召唤 | 不降低 `SCORE_AUTO`；现有语料 precision 1.0 / recall 1.0 不得回退；改法须有语料标定依据（`tests/corpus/`） | implemented（R1 返修合入，main 0604af71 全门绿） |
| A-002 | ISO2 作 value 的下拉丢区号证据：`parenDial` 计分嵌套在 `if (st.plusDial > 0)` 内，`<option value="us">United States (+1)</option>` 的文本括号区号证据被丢弃 | 让 ISO2-value + 文本括号区号的下拉（libphonenumber 推荐「国家↔区号非单射→ISO2 作 value」形态）获得 L3 区号证据，且不被误判为国家选择器 | 保持「国家选择器≠区号字段」语义抑制；共享区号（+1 多国）消歧不回退；L3 常量单一口径（config.ts） | implemented（Cycle-4 收口 2026-09-12） |
| A-003 | 扫描候选集结构性缺口：`SCAN_SELECTORS` 仅 `select/.iti input/.intl-tel-input input/input[tel\|text\|无type\|number]/[role=combobox]`，无 ARIA 的纯自定义下拉（div+ul）与 contenteditable 完全不可见 | 扩展候选集以覆盖无 ARIA 自定义下拉与可编辑 contenteditable 区号面 | 不引入误报后门；性能（1000 节点 scan < 350ms）不回退；伪 select 档位仍遵守 ADR-0005（登记不注入） | implemented（Cycle-4 收口 2026-09-12） |
| A-004 | 站点规则分档覆盖语义泄漏：`pageTierOverride()` 遍历该 host 全部规则不看 selector，一条「选择器→auto」会把整页抬到 auto | 分档覆盖收敛到 selector 级：仅命中选择器的元素生效；页面级语义显式建模或移除 | 豁免域名（整站禁用）与负反馈（element→none）语义不变；既有规则引擎测试不回退 | implemented（Cycle-4 收口 2026-09-12） |
| A-005 | 填充失败静默、无反馈闭环：`Fill.run` 失败仅弹「已复制到剪贴板」，不报错不重试；`fillInput` 按 placeholder 猜格式（+86/0086/86） | 填充结果可观测：成功/失败/格式分歧可被用户与测试感知，错填不再静默 | 不改既有 iti/select/input 三策略正确路径；不新增依赖；反馈不可阻塞填充分发 | implemented（Cycle-4 收口 2026-09-12） |
| A-006 | 合成 fixture 测试盲区：`playwright` baseURL 127.0.0.1 + `tests/fixtures/*.html` 手工正例，0 真实站点，CI 绿不代表真实世界 coverage | 建真实站点抽样语料（模式库 + 少量真实站点冒烟 + CDP 断言），让 CI 能暴露真实世界识别/填充缺陷 | 密封 E2E 语义（CONTEXT.md）不破坏；真实站点低频抽样 + 可跳过白名单收敛 flaky；证据只认 CI run/artifact | implemented（Cycle-4 收口 2026-09-12） |
| A-007 | 版本不 bump：`package.json`/`vite.config.ts` 停在 1.4.0，tag 停在 v1.4.0，本周期安全/功能修复用户收不到 | 版本 bump 到新版本号（三处一致），使修复经 Tampermonkey `@version` 更新检查达用户 | 发布动作须用户确认；三处版本号一致（package.json / vite.config.ts / Glog 双语 changelog）；发布前 dry-run CI 先行 | implemented（Cycle-4 收口 2026-09-12） |
| A-008 | engine-gates 重复三跑：`verify-ticket-02.mjs` + `misdetect-repro-v2.mjs` 在 verify-13/16/18 三 workflow 各跑一遍，另有 calibration-baseline 第四遍，CI 分钟浪费 | 把公共 engine-gates 抽成一个 workflow，票级 verify-* 只保留专属断言 | 不丢失票级回归覆盖；PR 门控（pull_request 触发）语义不变；脚本仍在 `tests/scripts/` | implemented（Cycle-4 收口 2026-09-12） |
| A-009 | e2e.yml 缺 `push: main`：main 上的合入从不跑 E2E 全量，真正出产物的 main 最裸露 | 让 main push 触发 E2E（触发面统一 = pull_request + push(main, cch/**)），发版前 main 被测试覆盖 | 不改变 release.yml 的 release-event 触发语义；与 CONTEXT.md「CI 门禁」触发面定义一致 | implemented（Cycle-4 收口 2026-09-12） |
| A-010 | main 历史归零：main 是无父 root commit，历史被两次强推归零，票级开发过程在 git 里不存在 | 以非 squash 方式落地本周期提交，让票级工作真实存在于 `git log` | 版本控制遵循 WORKFLOW §4.2（GitButler `but land`，禁 force-push）；由收口票 35 承接：只读验证 + 教训写回 WORKFLOW §5；已归零旧历史不重写（不可逆） | implemented（Cycle-4 收口 2026-09-12） |
| A-011 | Greasyfork 分发渠道冻死在 v1.3.4：产物 `@updateURL`/`@downloadURL` 全部指向 `update.greasyfork.org`（`vite.config.ts:8`），线上 meta.js 实测 `@version 1.3.4`，而仓库已到 1.5.0；CI 全链路无任何 GF 同步步骤（17 个 workflow 搜 greasyfork 仅命中 `release.yml:63,73` 读 Glog）；`README.md:47` 与 `README_EN.md:50` 安装链接硬编码 `releases/download/v1.4.0/`。用户更新检查永远看到 1.3.4——v1.5.0 全部努力送达人数约为零 | 让任何渠道安装的用户都能收到新版本：GF 侧建立从 GitHub 的反向拉取（Sync from external URL），CI 增加 tag=package.json=产物 `@version` 的一致性闸门，README 安装链接改为 `releases/latest`（或随版本自动同步） | GF **无写入 API**（官方文档 + greasyfork#1288/#1499）——禁止设计任何 CI 主动 POST 到 GF 的步骤；不得违反 GF 三条硬规则（禁 minify / 单文件 ≤2MB / 更新检查 ≤1 次/天，主功能代码须托管 GF）；发布动作须用户确认；版本真源唯一（package.json） | implemented（票38：版本一致性闸门+releases/latest+同步手册已交；GF 侧 Sync 用户已于 2026-09-14 手动开通 → 送达链闭合） |
| A-012 | 入口自锁（entry-point trap）：`#cch-summon` 只在面板 `open()` 内创建（`src/ui/index.ts:317,326`），而 `open()` 仅两个调用点——`ui/index.ts:159`（图标点击）与 `main.ts:68`（子帧 postMessage 代开）——两者都以「已存在的图标」为前提；图标仅在置信度 ≥35 时注入（`detect/index.ts:542-544`）；GM 菜单只注册一条「已恢复本站检测」（`main.ts:88-90`），无「打开面板」。→ score<35 的页面无图标 → 无面板 → 无召唤入口，脚本在用户眼中等于「没注入」。score≥25 的字段虽被 `rememberLow` 登记进 `_lowFields`（`detect/index.ts:848`），但唯一召唤 UI 在面板里 | 提供与字段分数无关的全局入口：GM 菜单新增「打开面板」命令直达 `UI.open(null,null,null)`（复用既有 anchor=null 居中路径 `ui/index.ts:627-635`），使低置信页面也能开面板并召唤已登记字段 | 不改评分引擎与五层信号权重（L0-L4）；不降低 `SCORE_AUTO`/`SCORE_LOWKEY`；面板仅在顶层帧渲染（帧治理不变）；不改既有图标点击路径；入口不得与豁免/负反馈语义冲突 | implemented（票37：GM 「打开面板」全局入口；R1 修复后 CI 5 run 全 success） |
| A-013 | lowkey 图标近乎不可见：`.cch-btn-lowkey{opacity:.38;transform:scale(.78);filter:saturate(.4)}`（`ui/index.ts:82`），一颗 24px 半透明灰点；且 `.cch-btn` 定位 `position:absolute;top:-12px;right:-12px`（`ui/index.ts:37-38`）位于 wrapper 盒外，任何祖先 `overflow:hidden/clip` 即被裁掉，`z-index:2147483647` 仅在本层叠上下文内有效 | 按行业模板（NN/g 横幅盲区 + 渐进式披露）重做 lowkey 可见性：降低「广告特征」（去高饱和/阴影）、提高信息气味，并规避 overflow 裁剪 | 保持「低调注入」与「高置信图标」的视觉分层语义（CONTEXT.md）；不改注入档位判定；不改面板结构；悬停恢复行为保留；不得引入高饱和/动画等命中横幅盲区的视觉处理 | implemented（票37：lowkey 可见性重设计；R1 修复 _pos 盒内锚点→字段右缘+8px） |
| A-014 | 门禁完整性：`verify-ticket-09/13/15/18` 用裸 `new Function(源码)` 装载 TS 源，未加 `stripTypeScriptTypes`，实测 4/4 崩 `SyntaxError: Unexpected token ':'`（崩溃行 09:119 / 13:46 / 15:113 / 18:39）；`verify-13/15/18.yml` 另钉 `node-version: 20`（strip 需 ≥22.13）；三门仍挂 `on: pull_request`，下个 PR 迎面拦截；`verify-13.mjs` 硬编码语料规模断言 41 而 corpus 已增至 48。10 个票级门中 6 绿恰为已迁移装载器集——「十门全绿」是幸存者名单 | 四个门统一改用现成 TS 安全装载器（范式 `tests/scripts/14-lib-engine.mjs:11`），workflow node 升 22，verify-13 语料规模断言改动态读取，恢复 10/10 门可执行 | 不删除任何票级断言（只修装载与口径）；不降低断言强度；PR 门控语义不变（CONTEXT.md「PR 门控」）；证据只认 CI run/artifact；不改评分引擎与业务代码 | implemented（票36：四门 stripTypeScriptTypes + node 22 + 语料断言动态化） |
| A-015 | 门禁碎片：每票私有 E2E 作业（verify-27/29 内复刻 e2e 步骤）与 A-008「公共 engine-gates 抽成一个 workflow」方向相悖，Cycle-4 W2 已呈报待收口 | 把票级复刻的 E2E 步骤并回统一 `e2e.yml`，削减门禁碎片 | 不丢失票级回归覆盖；共享安装面口径一致；不改 release.yml 触发语义 | implemented（票36：票级私有 E2E 并回统一 e2e.yml；verify-16.yml 整文件收口删除） |
| A-016 | 测试塔塔尖为空：`tests/live/site-manifest.json` 两个 `kind:"live"` 目标（github/signup、twilio）`enabled:false` 且 `selector:null`，实际启用数 = 0；四个 mirror 目标全部本地镜像页；`corpus/manifest.json` 中 7 条 `family:"real-site"` 语料无一条含 URL（source 指向 decision-ledger/调研文档），经 mock DOM harness 复算——幽灵覆盖。`real-site-smoke.yml` 为 schedule 每周 + workflow_dispatch，`continue-on-error`，永不进 pull_request | 按 manifest 自带 `enablementRunbook` 启用至少 1 个真实站点 live 目标（优先收编 CodePen 编辑器页，含嵌套 preview iframe 断言，对应用户上报的 codepen 回归），冒烟只断言存在性（`.cch-wrapper` 出现 + 无未捕获异常） | 真实站点层保持 advisory（不进 pull_request 触发面，失败不阻断 PR）；弱断言、不登录、不深交互；跳过条目强制 reason+ticket；不得让 flaky 真实站点污染密封 E2E；证据只认 CI run/artifact | implemented（票39：live 启用数 0→2；嵌套帧/异常/有头 harness） |
| A-017 | 帧治理嵌套静默失败：`isEmbeddedFrame()`（`main.ts:44-53`）只扫顶层 `document.querySelectorAll('iframe, frame')`，不穿 shadowRoot、不递归孙帧；多层嵌套（codepen embed 再被嵌、动态 iframe、shadow 包裹）下子帧点击图标的消息在 `main.ts:67` 被静默 return——无面板、无 toast、无降级提示 | 帧枚举改为递归 + shadowRoot 穿透，覆盖孙帧；校验失败时降级为可见 toast，消除静默失败 | 保持「全帧自治 + 顶层中心化面板 + origin/source 双校验」既有架构（与业界共识一致，不重构）；票 24 入站 origin 校验语义不放松；targetOrigin 收紧方向不回退 | implemented（票40：isEmbeddedFrame 双相递归 + 校验失败降级 toast） |
| A-018 | 过程证据被 git 跟踪：`.scratch` 339 个文件 / 2.3MB 全部在 git 索引内（`git ls-files .scratch` = 339），膨胀每次 diff/检出的表面积，且与「冻结目录禁改」约定相互矛盾 | 把冻结的过程证据归档到仓库外或独立分支，工作区只保留现役流程文件；并把「先沉淀 fixture 再修脚本」的升塔纪律写入 WORKFLOW | 不删除历史证据（可归档，不可销毁）；不破坏现役流程文件（WORKFLOW/spec/decision-ledger/issues/handoffs/prompts 可解析）；不新增宽泛 .gitignore 通配；纯删除型改动优先 | implemented（票41：.scratch 397→210；WORKFLOW §4.5 升塔纪律） |
| A-019 | 语言切换功能真空：i18n 自始至终只有一行 `navigator.language` 自动判定中/英（`src/i18n.ts:1`），手动语言切换在脚本历史上从未存在；`export const LANG` 为死导出（无任何 import） | 若确需手动语言切换：改为面板可选 + GM 持久化；否则清理 `LANG` 死导出 | 不破坏既有 `t()` 契约与中/英文案键；GM 存储键与收藏/规则解耦（沿用 `UI_PREFS_KEY` 独立键模式）；不新增依赖 | implemented（票42：LOCALE_MODES 可切换 + LANG 死导出清除） |
| A-020 | 文档/元数据债：`typecheck.yml` 注释称 `npm ci` 实为 `npm install`（Cycle-4 票 33 D-33c 登记）；`package-lock.json` 根 version 字段未随 1.5.0 同步（D-33b 登记） | 修正 typecheck.yml 注释/命令口径一致；同步 lockfile 根 version 字段 | 不改依赖版本范围（依赖钉死策略，CONTEXT.md）；不改 release.yml 触发语义；lockfile 变更须 `npm ci` 可复现 | implemented（票36 声明、票43 承载：.npmrc 删 + lockfile 根 version 1.5.0 + 零 legacy-peer-deps） |
| A-021 | 依赖根因未修：`react@18` / `react-dom19` 双 peer 冲突靠 `--legacy-peer-deps` 残留维持安装（ADR-0008 登记为负后果） | 根修 peer 冲突，移除 `--legacy-peer-deps` 残留 | 依赖钉死（禁 `latest` 浮动）；不改测试语义；`npm ci` 必须可复现；不引入新依赖 | implemented（票43：workspaces 拆 React 19 独立安装根，裸 npm ci 可复现） |
| A-022 | 同证据档位不一致：P1/P8 在「6 选项 auto vs 5 选项 lowkey」下同证据得出不同档位，票 27 R1 §6 建议独立裁决 | 对「同证据不同档位」做独立产品语义裁决（统一，或把差异显式建模） | 禁借补分越线（floor 不抬 ceiling，ADR-0008）；须有语料标定依据；precision/recall 基线不回退；产品语义变更须用户裁决 | implemented（票 44：裁决 = 显式建模差异，零档位变更；ADR-0009 留档 + verify-ticket-02 G10 CI 锁定） |
| A-023 | 候选集剩余缺口：contenteditable 区号面无语料地基（Cycle-4 票 29 D-29d 弱化项），未扩 `SCAN_SELECTORS` | 先把 contenteditable 区号形态沉淀进校准语料，再据此立检测票 | 语料先行（无地基不立检测票）；不引入误报后门；性能红线（1000 节点 scan < 350ms）不回退 | implemented（票 44：语料 append 3 例 contenteditable 形态——1 正 2 负，precision/recall 不回退；检测扩展为后续 backlog） |
| A-024 | 远端残留：已合并的 `origin/cch/*` 11 支未清理（Cycle-4 land 副产物） | 批清已确认合并的远端分支并 prune | 只删已确认合并的分支；不触碰 main；远端写操作须用户授权 | implemented（票 45：实物核验清理集为空——远端 9 支 `origin/cch/*` 全未合并，Cycle-4 11 支残留逐名 ABSENT，零删除零授权需求；WORKFLOW §8 证据边界条款化承载 A-025） |
| A-025 | 边界未条款化：CI-only 政策与「审计型本地硬验收」的边界未写入流程（Cycle-4 收口逐次授权） | 在 WORKFLOW 中把 CI-only 政策与本地硬验收的边界条款化 | 不放松「证据只认 CI run/artifact」总原则；例外须显式登记与授权路径；不改既有 §5 教训条目格式 | implemented（票 45：WORKFLOW 新增 §8 证据边界——§8.1 CI-only 政策 + §8.2 本地硬验收边界，总原则不放松；atomcode 调研落盘 `research/atomcode-45-ci-evidence-boundary.md`） |

## 去向登记（spec 覆盖核对）

### Cycle-5（本周期，2026-09-14）

| A-ID | 去向票 | 说明 |
|------|--------|------|
| A-011 | 票 38 | 分发最后一公里（GF 反向同步 + 版本一致性闸门 + README 链接） |
| A-012 | 票 37 | 入口可达性：GM 全局入口 |
| A-013 | 票 37 | 入口可达性：lowkey 可见性重设计 |
| A-014 | 票 36 | 门禁完整性返修：四门装载器 + node 22 + 语料断言动态化 |
| A-015 | 票 36 | 门禁碎片：私有 E2E 作业并回统一 e2e.yml |
| A-016 | 票 39 | 真实站点层启用（含 CodePen 嵌套 preview 断言） |
| A-017 | 票 40 | 帧治理：递归 + shadowRoot 穿透 + 失败降级 toast |
| A-018 | 票 41 | 过程证据出仓 + 升塔纪律入 WORKFLOW |
| A-019 | 票 42 | 语言切换 + i18n 死导出收口 |
| A-020 | 票 36 | 文档/元数据债（typecheck 注释 + lockfile 根 version） |
| A-021 | 票 43 | 依赖根修：移除 --legacy-peer-deps |
| A-022 | 票 44 | 同证据档位独立裁决 |
| A-023 | 票 44 | contenteditable 语料先行 |
| A-024 | 票 45 | 远端已合并分支清理 |
| A-025 | 票 45 | CI-only 边界条款化 |

**Cycle-5 覆盖核对**：A-011…A-025 共 **15 条**，全部有票去向；无去向记录 **0 条**。

### Cycle-4（历史，2026-09-12，审计链保留）

- A-001 → 票 27（检测覆盖率下限补强）
- A-002 → 票 28（ISO2-value 下拉区号证据补全）
- A-003 → 票 29（扫描候选集扩展）
- A-004 → 票 30（规则分档覆盖收敛到 selector 级）
- A-005 → 票 31（填充结果可观测 + 失败反馈闭环）
- A-006 → 票 32（真实站点抽样语料 + 覆盖回归）
- A-007 → 票 33（版本 bump 交付闭环）
- A-008 → 票 34（门禁减肥：engine-gates 三合一）
- A-009 → 票 34（门禁减肥：e2e 补 push:main）
- A-010 → 票 35（history-landing-discipline，收口波：只读验证 + WORKFLOW §5 教训固化）
