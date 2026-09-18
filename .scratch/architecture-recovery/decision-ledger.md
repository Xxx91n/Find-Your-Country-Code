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

| A-026 | 设置无一级入口：所有设置（语言/低调样式/豁免/规则）共用 `#cch-rules-view`，而该视图语义标签是「站点规则」；语言控件 `#cch-locale-tg`（`src/ui/index.ts:532-545`）排在豁免/规则/低调样式**之后**，容器 `overflow-y:auto`（`ui:101`）——豁免域名越多语言控件越靠下；无独立设置入口，GM 菜单仅 2 项（`src/main.ts:136-137`）无语言项；`openPanel` 开的是列表视图（`ui:296`）而非规则视图。用户实测反馈：「依旧没有能设置 i18n 选择脚本语言的地方」 | 给设置一个**一级地址**：面板头部 ⚙ + GM 菜单新增「设置」项；设置视图独立于「站点规则」语义；语言控件置于视图前部而非滚动底 | 不改评分引擎与任何设置语义；不降低既有档位阈值；面板仍只在顶层帧渲染（帧治理不变）；入口不得与豁免/负反馈语义冲突；保持「低调注入」与「高置信」的视觉分层 | implemented（票 02；D-010 仅保留「GM 菜单设置项」一条，另两条取消；CI cch/02 tip a80756ad · Verify Ticket 02 success） |
| A-027 | i18n 不完整（四重）：（a）切换语言走 `_applyLocaleText()`（`src/ui/index.ts:750-760`）**手工逐项重写 6 处**，已漏刷收藏行 `.cch-fav` 的 `title`（`ui:711`）与空态文案（`ui:699`）；（b）图标 `title`/`aria-label` 硬编码 `'Country Code Helper'`（`ui:155-156`）**从未本地化**；（c）已注册的 GM 菜单标签**只求值一次**，运行时切换语言后不更新（需重载）；（d）`src/main.ts:107` 的帧校验提示是**就地双语三元表达式**，未走 i18n 表（注释自认「收口时可收编进 MSG」） | 本地化改为**字典化全量重渲染**（`[data-i18n]`）而非手工逐项补；菜单命令改用 `GM_registerMenuCommand(name, fn, { id })` **id 原地更新**（Tampermonkey 官方文档）使切换后无需重载即跟随；补齐未本地化文案并把 `main.ts:107` 就地双语收编进 MSG | 不破坏 `t()` 契约与中/英文案键；GM 存储键与收藏/规则解耦（沿用 `UI_PREFS_KEY` 独立键模式）；不新增依赖（i18next 类库运行时 205–422KB 不可接受）；保持 `显式 > 浏览器 > 默认` 三级解析语义 | implemented（票 02；字典化全量重渲染 + 菜单 id 原地更新 + 未本地化文案补齐；CI a80756ad） |
| A-028 | 零可观测性 / 零自检面：`src/` 全目录 `console.` 调用点为 **0**；无 debug/trace/verbose 开关（`ui:239-241` 仅持久化 `lowkeyMode`/`locale`）；无 doctor/self-test 入口；评分证据链 `signals[]`（`detect/index.ts:328,554`）算完后只写入私有 `WeakMap`（`:841-842`）与 `_lowFields`（`ui:260`）——**算完即不可达**；三种静默失败均无解释：（a）无可信字段→无图标（理由存在于 `gate:input-type`/`gate:aria-hidden`/`country-semantic:suppress`/`gate:visibility-hidden` 或分数不足，但从不外显）；（b）子帧点图标无响应（`ui:456-460` fire-and-forget，无 ack 无超时）；（c）选国未填充（能报「失败」但不报「为何失败」，`FillResult` 无 reason 字段，`types.ts:22-28`） | 建自检/诊断面：各判定点 append `{step,verdict,msg,ts}` 形成**决策链 trace 作单一事实来源**（面板与 CI JSON 从同一份 trace 渲染）；面板**逐层点亮**并给出已验证根因（第一处熄灭即答案）；trace 由 debug 开关门控（未开启零开销） | 不重写评分引擎（`signals[]` 已存在，只需一条读出管道）；诊断面必须与运行热路径解耦（未开启零 CPU/内存）；根因提示必须是**验证过的**根因，未知错误诚实报「未知 + 请开 debug」；不得因开启诊断而改变检测/填充行为 | implemented（票 03；单采集源双 serializer + 四层判定 + 独立诊断视图 + 分级门控 + 环形缓冲；CI 29baf181） |
| A-029 | 真实站点层能力覆盖 2/18：`tests/live/live-smoke.mjs` 全文**无任何交互原语**（grep `.click(` / `.fill(` / `locator(` = NONE），唯一读面是数 `.cch-wrapper` 节点（`:95`）；`.cch-btn` 计数被记录但**不断言**（`:104` 的 `injectedOk` 不读档位、不读 value）；GM 替身为空函数（`:50-51` `GM_registerMenuCommand = () => 0`）致菜单命令在 L3 不可驱动（而密封层 `tests/helpers/userscript.ts` **已实现可调用菜单记录**——同一能力在两 harness 不对等）；核心「选国→填充」在真实站点**从未被验证过一次**；另：`site-manifest.json:8` 的 `assertionRule` 自称照 Bitwarden BIT，但 BIT 原文为「typically only testing that the username/email **was filled out properly**」——先例**断言填充结果**，本仓库比其援引先例更弱 | 建测试 harness 交互原语（open→search→row-click→读 value）并让 GM 替身可驱动；断言改 web-first + `expect.soft` 一次收全量；真实站点层断言口径从「仅 wrapper 存在」提升到**其援引先例的口径**（L0 + 最弱 L4 填充断言） | 不删除任何既有断言；密封 E2E 语义（零外网、PR 阻断）不变；真实站点层保持 advisory（仅 schedule + workflow_dispatch，永不进 pull_request）；skip 必须带非空 reason + ticket；不采 UA 伪造/反自动化指纹开关；证据只认 CI run/artifact | implemented（票 01 定义层 + 票 05 原语层 + 票 07 真实站点全阶梯 L0-L4 + 发布门；CI fd02901f · 实施 d5c6f415） |
| A-030 | 无 owned 指定页面语料与断言阶梯：「指定网页」两类都不适合全工具验证——mirror 目标仅 4 个本地小页（不覆盖真实站点形态），live 目标仅 2 个且受 Cloudflare 拦截、且 manifest 规则明文禁止深交互；行业铁律「Only test what you control」（Playwright 官方）与 Contentsquare「用自有 QA 域做全交互 E2E」均指向：深交互验证必须跑在**自有可控页面**上；本仓库 WORKFLOW §4.5「升塔纪律」已规定「先沉淀 fixture 再修脚本」但未定义断言阶梯 | 把「指定页面」拆为两类职责：（1）**owned 指定页面语料**——真实站点形态**冻结快照**为自有页面，在其上跑 **L0–L5 全断言**（L0 注入 / L1 无副作用 / L2 面板可开 / L3 交互原语 / L4 写入生效 / L5 反馈提示）并进 PR 门；（2）真实站点层只保留 L0–L2。语料清单大小成为「真实覆盖面」的可度量指标 | 语料先行（无地基不立检测改动）；不得让 flaky 真实站点污染密封 E2E；不登录、不深交互于第三方页；CDP Autofill 域不得用作脚本填充断言（`cdpNote` 已登记）；性能红线（1000 节点 scan < 350ms）不回退 | implemented（票 01 阶梯归属 + 票 06 形态语料三层架构；CI 8d787e5d） |
## 修订记录（D-xxx 冲突回写）

> 机制：grill 调研结论与台账 `current` 记录冲突时，**禁止静默改向**——原记录标 `revised` 并保留原文，冲突在新账本立 D-xxx 记录待用户拍板。

| 时间 | A-ID | 原状态 | 新状态 | 冲突来源 | 冲突要点 |
|------|------|--------|--------|---------|---------|
| 2026-09-15 | A-029 | current | revised | grill Q2 atomcode 调研（D-003） | 原需求要求把真实站点层断言口径提升到「L0 + 最弱 L4 填充断言」；调研结论为真实站点层应止于 **L0–L1（+观察 L2）**，写入结果正确（L3）属可控页层职责 |
| 2026-09-15 | A-030 | current | revised | grill Q2 atomcode 调研（D-003） | 原需求要求 owned 页跑 **L0–L5 全断言**（含 L5 反馈提示）并进 PR 门；调研结论为自动化应止于 **L3（写入结果正确）**，「用户反馈出现」（L4）超出自动化可控范围，由发布前人工 checklist + 生产遥测兜底 |

| 2026-09-16 | A-029 | revised | **current** | 用户拍板（D-004） | 用户裁定「还得真实站点测」——原口径（真实站点断言口径提升）**恢复生效**，不采纳调研的 L0–L1 限制 |
| 2026-09-16 | A-030 | revised | **current** | 用户拍板（D-004） | 用户裁定「自动化吧还是」——owned 页全阶梯含反馈层**恢复自动化**，不采纳调研的「L4 不自动化」 |
| 2026-09-16 | A-026 | current | **revised** | 用户拍板（D-010，选项 ③） | 原需求含三条：「GM 菜单新增设置项」**保留**；「设置视图独立于站点规则语义」与「语言控件置于视图前部」**两条被取消**——用户选择不新建视图、不前置 |
> 保留说明：A-029 / A-030 的【问题描述原文 / 规范化需求 / 显式约束】单元格**逐字未改**，仅状态列变更；原决策全文可从上表行内读取。

| A-031 | 检测误报面缺口（三个新形态）：调研实测发现——(1) iti v29 的**内部搜索框** `INPUT[role=combobox][type=search][aria-autocomplete=list][aria-controls=iti-0__country-listbox]` 就在 `.iti` 容器内（`intl-tel-input.com` 实测），是真实误报面；(2) **值恰为 ISO2 的语言/locale 下拉**（如 `#opt_uiTranslations` 值域 52 个 ISO2 形值 `sq|Albanian (sq)`），构成伪区号陷阱；(3) **无括号区号文本** `AC|Ascension Island +247`——现有 `parenDial` 只认括号形式，L3 下拉选项内容验证漏此形态 | 把这三个形态先沉淀进校准语料（正/负例），再据此评估是否需扩检测信号或加抑制规则；iti v29 内部搜索框至少登记为负例（不得注入） | 语料先行（无地基不立检测改动，沿用 A-023）；不引入误报后门；性能红线（1000 节点 scan < 350ms）不回退；**不得据此直接改检测代码**——按 D-001 阶段 B 由验证清单驱动 | implemented（票 08；三形态入语料 + 引擎只加护栏；CI 747763fd · 门 35/0） |
| A-032 | 视觉替换型隐藏 select 的**机理与语料假设不符**：Select2 实测 `select.select2-hidden-accessible` 为 `width:1px` + `aria-hidden="true"`（**非零尺寸**，`_hiddenByStyle` 不触发），而语料 N7 假设的是零尺寸/display:none；且 `tests/fixtures/` 内 `grep select2|chosen` **零命中**（仅 corpus N7 合成）。另 `harvesthq.github.io/chosen` 实测 `select.chosen-select` 为 `display:none`（与 N7 一致）——**同一类形态有两种不同机理** | 为视觉替换型隐藏 select 的两个子形态（`width:1px+aria-hidden` 与 `display:none`）各建至少一个 fixture；据实修正语料 N7 的机理假设 | 不得改变可见性闸门对「隐藏但承载值的原生 select（视觉替换型）」的既有豁免语义；语料先行；不引入误报后门 | implemented（票 08；两子形态各建 fixture + N7 机理据实修正；CI 747763fd） |
| A-033 | 域建模债：本轮新增机制/概念未入域模型——(1) **「发布门」无 ADR**（PR 不阻断、发布门阻断的取舍），未来读者会问「为何发布要绑在一个 flaky 的第三方层上」；(2) CONTEXT.md 现有 29 条术语，**缺本轮确立的 7 条**：「验收阶梯」「发布门」「形态语料」「结构骨架」「镜像页」「诊断面」「判定记录」 | 为「发布门」立一条 ADR（PR 不阻断 / 发布门阻断的取舍与替代方案）；CONTEXT.md 补入上述 7 条术语，与既有 29 条逐条比对无冲突 | ADR 不得改写 ADR-0008 第二层（D-005 已定不重开）；术语不得含实现细节（CONTEXT.md 是词汇表）；不得为可逆/无取舍的小事立 ADR；7 条为上限 | implemented（票 04；ADR-0010 + CONTEXT.md 7 术语 28→35；纯文档未推送 ⇒ 无 CI，本地硬验收 §8.2 例外登记） |
| A-034 | 跨帧填充指令在 `about:srcdoc` 帧被**静默丢弃**（真实缺陷；票 07 首次暴露）：`src/main.ts:134` 的 `if (isTopFrameSameOrigin() && e.origin !== location.origin) return;` —— srcdoc 帧内 `isTopFrameSameOrigin()` 为 true（顶层同源、`window.top.location.href` 可读），而 `location.origin` 被 Chrome 序列化为字符串 `"null"`（真实 origin 仍为继承值，可由 `window.origin` 读出）⇒ 判据判真且不等 ⇒ 直接 `return`，顶层 `FRAME_FILL_MSG` 被丢弃；子帧 `UI._target` 已正确登记但处理器提前返回，`Fill.run` 从未执行 ⇒ 无写入 / 无 input·change 事件 / 无 toast / **且无异常**（故 L0 `errs=0` 仍为绿，缺陷被弱断言掩盖）。同缺陷面：`src/store/index.ts:67` 与 `:97` 亦以 `location.origin` 作 BroadcastChannel 同源校验 | origin 比对改用 `window.origin`（srcdoc 帧下为继承的真实 origin），或对 `location.origin === "null"` 回退到 `window.origin`；覆盖面含 `src/main.ts:134`、`src/main.ts:120`、`src/store/index.ts:67` 与 `:97` | **不得放宽跨帧来源校验**（票 24 语义不变）；**不得**以删除校验替代修复；跨域顶层场景（票 12 fixture）既有拒绝语义不得回归；密封 E2E 135 例不得回归；证据只认 CI run | implemented（票 10；P0 闭环，真实站点层 L0-L4 转绿；CI 6a95417b · E2E success） |
| A-035 | ITI 接管字段的 L3 判据口径未判定：票 07 的 L3 判据（写后读回宿主 `input.value` == 区号）对 `select`/普通 `input` 成立（`mirror-control` 绿），但 ITI 形态下 `Fill` 走 `createItiAdapter().fill()` 的 `setNumber`/`setSelectedCountry` 官方 API（`src/iti-adapter/index.ts:76-102`），该路径按 ITI 语义切换国家/号码，**不承诺**把区号写进宿主 `input.value` ⇒ `live-codepen-editor` 的 L3 报红，而同帧 L4 toast 为「已填入: 🇨🇳 +86」（`Fill.run` 自认成功）——**L3 与 L4 结论相悖**，需先判定正确可观测判据 | 判定 ITI 形态下 L3 的正确可观测判据（候选：ITI 选中态 `iti__selected-country` / `data-country-code` / 号码输入框值 / 官方 `getNumber()` 回读），据实收敛断言并给出依据与影响面 | **判定前不得以「改判据」方式消除红项**；不得放宽 L3 的「写后读回」语义；不得删除既有断言；判据需有 ITI 官方语义或工业界依据（调研留痕） | implemented（票 11；L3 判据按写入口形态分派，普通字段判据逐字保留；CI 8a27ad34） |

| A-036 | 门保真度缺口（票 10 §6.1/§6.2 发现，**源码层面**）：(1) `tests/scripts/verify-ticket-05.mjs` 的 BroadcastChannel 替身旧形态 `fn({ data: msg })` **不含 `origin`**，而真实 BC 的 message 事件**恒携带 `origin`** ⇒ 被测的 origin 守卫在门内退化为 `undefined !== undefined` **恒放行**，守卫从未被真实行使（票 10 修复使其显形）；(2) 该替身同时**未做结构化克隆**，而接收方 `_normRulesDoc` 会**就地改写** `msg.rules.overrides`（`slice(0, RULES_MAX_OVERRIDES)`）⇒ 替身按**引用**投递，被截断的是**发送方**的 `_rulesCache` ⇒ S4「上限生效」断言当前的绿是**别名旁路截断**的产物，而非实现保证（票 10 的决定性 A/B 对照：补克隆后 S4 `got=513` 复红）；(3) 实现事实：`RULES_MAX_OVERRIDES` **只在 `_normRulesDoc`（外来输入路径）内截断**，本地写路径（`upsertOverride` → `_writeRules`）**不截断**，内存文档可超 500（下次载入时才被截断） | (a) 裁定「上限强制点」属**写路径**还是**读路径**并据此实现；(b) 补齐 `verify-ticket-05.mjs` 的替身**克隆保真度**，使 S4 断言反映真实保证；(c) 若裁定为「读路径强制」，须在 CONTEXT/文档层显式说明 | **不得以「保留假绿」方式回避**（不得靠替身别名旁路维持 S4 绿）；不得放宽或删除任何既有断言；裁定需有据（工业界语义或本仓既有语义）；证据只认 CI run | implemented（票 12；**写路径**强制点 `store:273` + ADR-0011 成文 + BC 替身克隆保真度修复；**S4 不再是假绿**（三条独立证据）；E2E 145 passed；无远端写 ⇒ 无 CI，如实） |

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

### Cycle-6（本周期，2026-09-16 重建）

| A-ID | 去向票 | 说明 |
|------|--------|------|
| A-026 | T2 | 设置面收口（仅保留 GM 菜单「设置」项；另两条被 D-010 取消） |
| A-027 | T2 | 设置面收口（i18n 全量重渲染 + 菜单 {id} 原地更新 + 补齐文案） |
| A-028 | T3 | 诊断面（结构化事件流双出口 + 四层判定 + 独立视图 + 分级门控） |
| A-029 | T1 · T5 · T7 | 验收面与阶梯定义 / harness 交互原语 / 真实站点层全阶梯 |
| A-030 | T1 · T6 | 阶梯归属定义 / 形态语料三层架构 |
| A-031 | T8 | 阶段 B：三个新误报面先入语料再评估（本周期不预先修） |
| A-032 | T8 | 阶段 B：视觉替换型隐藏 select 两子形态各建 fixture + 修正 N7 假设 |
| A-033 | T4 | 域建模：发布门 ADR + CONTEXT.md 补 7 术语 |
| A-034 | T10 | 修复 `about:srcdoc` 帧跨帧 origin 校验误判（**P0**；真实站点层 L3/L4 转绿的前置，进而影响 ADR-0010 发布门「必须绿」判据） |
| A-035 | T11 | 判定 ITI 形态 L3 的正确可观测判据（**P1**；判定前不得以改判据方式消红） |
| A-036 | T12 | 规则上限强制点裁定 + BC 替身克隆保真度修复（**源码层面**；`verify-05` 的 S4 现为**假绿**） |

**Cycle-6 覆盖核对**：A-026…A-036 共 **11 条**（A-026 = revised，仅保留「GM 菜单设置项」一条；A-027…A-036 = **implemented**），**全部有票去向**；无去向记录 **0 条**。

**D-xxx 决策账本**（grill 产物）：`.scratch/cycle6-grill/decision-ledger.md`（D-001…D-016；**16/16 implemented**，2026-09-17 收口结算；`| current |` 计数 = 0）。
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


## Cycle-6 结算（2026-09-17，收口票 09）

> 结算依据：逐票实物核验（issue 勾销状态 + 窗口报告存在性 + 实施提交 sha + 远端分支 CI run）；行为面证据只认 CI run（WORKFLOW §8.1），本地只读复核限 §8.2 闭集。
> 结算结果（票 09 收口 + **审计 Agent 整轮结算 2026-09-17**）：**A-026…A-036 = 11/11 implemented**（A-026 按 D-010 修订后口径）。A-036 由票 12 闭环（**写路径**强制点 `store:273` + ADR-0011 + BC 替身克隆保真度，**S4 不再是假绿**）。**deferred = 0 · stale = 0。**
> **整轮审计结论（审计 Agent，2026-09-17）**：硬验收重跑 —— typecheck `exit 0` · build `exit 0`（167.96 kB / 11 modules）· 版本一致性门 **15 passed / 0 failed** · 全量 E2E **145 passed**；三层文档一致性 —— CONTEXT.md 7 条新术语实体**全部真实存在**，ADR-0008/0010/0011 与代码**逐条吻合**；**遗留 2 处真实脱节**（`tests/ACCEPTANCE-SURFACE.md` 仍引用已删的 `#cch-locale-tg`；`gf-alignment-check.yml` 未声明 `pull_request`，违反 ADR-0006 条款 2 且未登记例外）⇒ 入 backlog。
> 对账闸：A-026…A-036 共 **11 条**，去向登记见 §去向登记 · Cycle-6；无去向记录 **0 条**。
> 终端 CI 锚点（各票分支 tip）：01 ca6403a7 · 02 a80756ad · 03 29baf181 · 05 129d78c3 · 06 8d787e5d · 07 fd02901f · 08 747763fd · 10 6a95417b · 11 8a27ad34；**04 未推送 ⇒ 无 CI**（纯文档，§8.2 本地硬验收例外登记）。
> 已知红与归因（§8.1.3 三选一留痕）：**cch/08 tip E2E = failure**，归因②（非本票改动）——同栈票 10 的密封用例 tests/srcdoc-origin.spec.ts 在票 08 快照中为修复前版本（读侧竞态），已在 cch/10 修复并转绿（run 35155127289 @ 6a95417b）；**land 前须把 cch/08 重挂到 cch/10 终态之上**，否则该红随快照带走。
> 过程违规未追认（详见收口报告 §偏离点）：P-2/P-13/P-20 本地 tip ≠ 远端 tip · P-4 票 04 issue 未勾销 · P-17 强推改写已发布历史。

---

## 修订注记 — A-010 的「禁 force-push」约束（2026-09-18 · Cycle-8 窗口）

> 形式：**带日期修订注记**（MADR：变更只经 Status 字段 + 带日期 Notes；**原文保留、不删改**）。
> 依据：Cycle-8 grill **D-006**（A6 项）；**用户显式拍板**。

- **原文（保留）**：A-010 的显式约束列为「版本控制遵循 WORKFLOW §4.2（GitButler `but land`，**禁 force-push**）；已归零旧历史不重写（不可逆）」。
- **修订**：用户于 **2026-09-18** 显式拍板 —— **授权对本仓 `main` 执行一次 force-push**，用于修正已落地提交 `e63e8253` 的提交信息（票数口径 13 → 15/15）。
- **适用范围（严格限定）**：**仅此一次、仅此一个提交信息**。A-010 的**其余约束继续有效**：
  - 「已归零旧历史不重写」**不变**；
  - 「版本控制以 `but` 为唯一权威」**不变**（本次为该规则的**显式例外**，见 WORKFLOW §4.2 修订注记）；
  - **不得**以本条为先例推导出「提交信息可随意重写」。
- **留痕**：备份 ref `refs/backup/main-pre-rewrite` → `b1fcf96d`；旧 sha 记录于 `.scratch/cycle8-grill/decision-ledger.md`（D-006 执行证据）。
