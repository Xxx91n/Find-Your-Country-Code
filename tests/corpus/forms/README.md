# 形态语料（Form Corpus）— 三层架构

> Cycle-6 票 06 | 覆盖 **A-030** | 生成 2026-09-16
> 定位：形态语料的三层架构定义（镜像页 / 结构骨架 / 校准语料），供密封层与真实站点层共用。
> 下游：票 07（真实站点层全阶梯 + 发布门）· 票 08（阶段 B：失效驱动修复）

---

## 0 定位与命名

**形态语料** = 把「指定网页」落成可维护的自有语料，让「工具是否在指定页面上生效」可被 CI 证明。

**命名纪律（D-009）**：「形态语料」与既有**校准语料**在语义轴上**正交**，不得混用：

| | 形态语料（本目录） | 校准语料（`tests/corpus/manifest.json`） |
|---|---|---|
| 管什么 | **表单形态**（真实页冻结快照 → 自有断言面） | **阈值标定**（mock DOM 正/负例，precision/recall 基线） |
| 载体 | 镜像页 + 结构骨架 + 库外原始快照 | 声明式用例（`el`/`labels`/`ctx`） |
| 断言层 | 真 Chromium + 出厂产物（L0–L4） | mock DOM 引擎 harness |
| 改动纪律 | append-only；**绝不为修绿而盲目更新快照** | append-only（`appendOnlyRule`） |

---

## 1 三层架构（D-008）

| 层 | 入库 | 职责 | 位置 |
|---|---|---|---|
| ① **镜像页** | ✅ 入 git | **测试主力**：去品牌 / 去追踪 / 内容替换，断言确定性最高 | `mirrors/*.html` |
| ② **结构骨架** | ✅ 入 git | **长期结构断言基线**：内容无关的归一化结构树，供确定性结构 diff | `skeletons/*.json` |
| ③ **原始快照** | ❌ **库外** | 保真档案（raw HTML + 渲染后 DOM + 截图）；库内只留 **SHA-256 指纹与元数据** | 仓库外 archive（见 §4） |

**为什么原始快照不入库**：含品牌内容与版权暴露（冻结基准不入库）；截图 / 二进制不入 git 历史（D-008 负向需求）。

**不引入对象存储 / S3**：复用既有**仓库外 archive 模式**（`D:\Aworker\mozilla\choose-your-country-evidence-archive\`，票 41 建立）。

**单一 `tests/` 根**（仓库只允许一个 `tests/` 目录）：本目录位于 `tests/corpus/forms/`，**不新增顶层 `corpus/`**。

---

## 2 目录结构

```
tests/corpus/forms/
├── README.md           # 本文件：约定 + 合规 + 退化回路
├── sources.json        # 候选指定页输入清单（hand-maintained）
├── manifest.json       # 指纹与元数据清单（generated：06-manifest.mjs）
├── drift-degradations.json  # 漂移降级账本（非 ok 源的 reason + ticket 硬校验；票 T5）
├── mirrors/            # ① 镜像页（入 git，测试主力）
│   ├── iti-v29.html                    # iti v29（.iti + 内部搜索框，A-031 误报面）
│   ├── rpn-input.html                  # 原生 select，value 恰为 ISO2
│   ├── codepen-iti-v17.html            # 外层壳 + 嵌套预览帧
│   ├── codepen-iti-v17-child.html      #   └ 子帧（iti v17 系类名/属性名）
│   ├── mui-autocomplete.html           # 伪下拉（可编辑型：非 readonly INPUT 触发器）
│   ├── element-plus-select.html        # 伪下拉（select-only 型：readonly 触发器）
│   ├── antd-select.html                # 伪下拉（select-only 型，另一类名族）
│   ├── chosen-select.html              # 视觉替换型隐藏 select（display:none，A-032 子形态 B）
│   ├── heroku-signup.html              # 真实注册页原生 select（value = 国名）
│   └── twilio-iti-reconstructed.html   # 手工重构镜像（iti v17 系形态凭存档重建；不参与结构比对）
└── skeletons/          # ② 结构骨架（入 git）
    └── <id>.json
```

---

## 3 合规口径（D-008 / issue 验收项 6）

| 条款 | 落地方式 |
|---|---|
| **只采公开页** | 候选均为公开可访问页面；不登录、不提交表单、不抓取 PII（`06-capture-forms.mjs` 只做 GET + 渲染） |
| **剥离品牌内容** | 镜像页去产品名 / logo / 文案（如 iti 的 "International Telephone Input" 一律不出现） |
| **去追踪** | 镜像页零外链 / 零分析脚本，hermetic（E2E 零外部网络依赖） |
| **内容替换** | 页面正文替换为自拟文案；仅保留**公开表单形态**（DOM 结构 + 类名/属性 + 交互行为） |
| **标 `source_url` + `captured_at`** | `manifest.json` 每条 entry 均有；镜像页头注释同步标注 |
| **不含真实 PII** | 镜像页无任何真实用户数据；原始快照只采公开页首屏（未登录态） |
| **不可重现页面（票 T4 / issue #13）** | 页面已不可访问、无法再重现时允许**手工重构镜像**（GLOSSARY「手工重构镜像」；spec #9 Q9）：凭截图 / 存档 / 记忆重建，标 `adoption=reconstructed` + `source=reconstructed` + `provenance`（重构依据，即「附 reason」惯例）；**无 `captured_at`、无 capture 块**（不伪造捕获 provenance）；**永不参与结构比对**（无可信基线，diff 只会误报），重捕与结构比对均显式 SKIP 留记录 |

---

## 4 退化回路（issue 验收项 5；D-008）

站点改版必须被**探测**，而不是被用户发现。四步闭环：

```
① 定期重捕            ② 派生结构骨架           ③ 确定性结构 diff        ④ 回放自检
06-capture-forms.mjs → 06-skeleton.mjs   →   06-structural-diff.mjs →  npm run e2e
（→ 仓库外 archive）    （内容无关结构树）        （分级 bump 判定）        （owned 镜像页 L0–L4）
```

**分级判定**（`06-structural-diff.mjs`，**非像素 diff**）：

| tier | 触发 | bump 建议 |
|---|---|---|
| `none` | 无结构差异（内容替换不触发） | 不 bump |
| `patch` | 仅文本**形状类别**微变（如 `+86` ↔ `CN`） | patch |
| `minor` | 属性 / 重复计数变化（选项增减、role 增补） | minor |
| `major` | 标签 / class / 子节点数变化（结构改版） | major |

**纪律（硬约束）**：**绝不为修绿而盲目更新快照**。`tier ≠ none` 时，**先归因**——① 站点真实改版；② 抓取环境差异（UA / 地区 / A-B 实验）；③ 归一化缺陷——归因结论写进提交信息或 issue 后才决定 bump 与镜像页更新。把「更新基线」当作消除红灯的手段，等于把退化探测能力本身退化掉。

**reconstructed 排除（票 T4 / issue #13；spec #9 Q9）**：`source=reconstructed` 的条目（手工重构镜像）**一律跳过结构比对**——无可信基线，diff 只会误报。`06-structural-diff.mjs` 对其显式输出 `SKIP source=reconstructed` 行留记录（不静默、不产 tier 判定，退出码 0 = 未裁定）；`06-capture-forms.mjs` 对其不重捕（SKIP 行留记录，CAPTURE-MANIFEST 不塞空壳条目）。`06-manifest.mjs` 对「重构条目 + 抓取记录」互斥硬拒（页面不可重现与抓取成功互斥，属标记矛盾）。

**advisory 漂移 workflow（票 T5/T6 / issue #14、#15；spec #9 Q4/Q7）**：`.github/workflows/corpus-drift.yml` 把上面三步串成一次可审计运行，产出「可达性矩阵 + 漂移报告」artifact（live-out/corpus-drift，运行产物不入 git）。**正式模式**：每周一次 `schedule`（周一 04:00 UTC）+ 手动 `workflow_dispatch`，**永不进 `pull_request` 触发面**（原型票 T5 于 2026-10-26 连续两次绿后按 spec Q4 升为正式模式，收口见 issue #14）。编排器 `tests/scripts/06-corpus-drift.mjs` 零新引擎代码：采集 / 骨架 / diff 的归一化与分级判定仍唯一定义在既有三脚本。

- **漂移自动告警（票 T6 / issue #15）**：`tier=minor/major` 时编排器产出 `drift-issues.json` 载荷，`tests/scripts/06-drift-issue.mjs` 投递为 `needs-triage` issue——正文含报告指针（run URL + artifact 内报告 / 逐源证据）与结构 diff 输出；`none/patch` **不开**；`SKIP`（重构排除）/ `NOT_EVALUATED`（无可比对骨架）同样不开，`ERROR` 走契约红灯（另行如实红）。同一源按正文 marker + bot 作者（`author.is_bot`）去重：只认 bot 开的票，已有 open issue 时追加评论而不是每周重复开票，关闭后再次漂移才重新开票；公共仓库里他人伪造 marker 不会劫持告警。workflow 用 `concurrency: corpus-drift` 串行化周排期与手动触发，避免并发双开票。告警只是「红灯」，归因（真实改版 / 抓取环境差异 / 归一化缺陷）与 bump 永远人工。

- **可达性三态**：`ok`（浏览器导航成功且无拦截标记）/ `challenged`（命中反爬挑战标记，**无论 HTTP 状态**：Cloudflare / Imperva / PerimeterX / DataDome / 阿里云 WAF 等）/ `unreachable`（抓取失败或浏览器导航 HTTP ≥400）。判定以浏览器导航状态为准；裸 fetch 的 `http_status` 仅作证据（反爬站点常对裸 fetch 回 403/503、对浏览器正常渲染）。标记按页面部位分域匹配（标题 / 正文 block-page 标记 / 挑战帧），表单自带的 Turnstile 组件不算被拦。`challenged` 的 DOM 是拦截页，**不派生骨架**（否则污染基线）。
- **降级登记（reason + ticket 硬校验）**：非 ok 源必须在 drift-degradations.json 登记非空 `reason` + `ticket`，否则运行如实红（exit 1；**不伪造绿**；报告仍产出）。反向同样红：已恢复（`ok`）却仍登记 = `stale-degradation`——恢复是显式动作。登记不是删除：被拦源仍留在重捕与结构比对集中。
- **账本不是语料内容**：drift-degradations.json 只记录运行期可达性，不改变任何镜像页 / 结构骨架 / 指纹，因此**不需要重生成 manifest.json 或更新骨架基线**（例外口径；指纹完整性仍由 verify-ticket-06 守，账本字段与语料零副作用由 verify-ticket-44 守，周排期 / 自动告警面无写回由 verify-ticket-45 守）。
- **无写回红线**：新骨架一律 `--out` 到仓库外 archive；报告拒绝写入 `tests/corpus/**`；workflow 不调用 `06-manifest`，也没有任何 git 写动作。**唯一写动作是开 / 更新漂移 issue**（`issues: write`，仓库内容 `contents: read`）；清单与镜像页更新永远是人工归因后的显式动作。
- **有头浏览器**：CI 用 `xvfb-run` 提供虚拟显示（复用真实站点冒烟层已验证的启动口径）；`06-capture-forms.mjs` 默认有头，无 DISPLAY 时回退 headless 并告警，`CCH_CAPTURE_HEADLESS=1` 可强制。
- **采集国别固定（issue #34 / spec #32 Q7/Q10/Q16）**：演示页用 `initialCountryLookup` 按访问者 IP 定初始国家，同一份代码换个出口 IP 就报一次假漂移（基线在 JP 下采、CI 在 US 下重捕即此）。采集工具因此收 `--country`（默认 `us`），**路由拦截** `ipapi.co` 的 lookup 响应回指定国家；不伪造 UA、不伪造时区。固定的是**初始国家**，不是 locale——`browser_locale` 只记录浏览器现场自报值。两处同时留痕：CAPTURE-MANIFEST 逐条 `capture_country` + `browser_locale`（外加证据字段 `ipapi_stub_hits`：桩被这个页面请求过几次），骨架 meta 由 `--from archive` 抄同一份。国别**只在桩真的被请求之后**才写进台账：`ipapi_stub_hits=0`（该源压根不做 IP lookup，或站点换掉了端点）时 `capture_country` 如实记 `null`——把没生效的请求值写成 `us`，等于让下一次归因误信「这次是按 us 采的」。三态各有其义：值非 null = 已固定且有证据撑着（`ipapi_stub_hits>0`）；键在值为 null = 已记录「未固定」；键缺失 = 台账早于本旋钮，`--from archive` 的骨架派生硬拒（宁可让管线停下来重捕，也不产一个「条件未知」的骨架）。同一条「声称必须有证据」的判定也拦在 `06-manifest` 写 capture 块与 `--from-ledger` 重建之前——矛盾一旦进了仓内台账，`assertLedgerStable` 只会把它逐字节复现成既成事实，看不见它错。`--attach` 与 `--country` 互斥（附着模式不导航也不拦截，固定不了国别）。归因时对照漂移报告头的「采集国别（本次运行请求）」与矩阵**证据列**的 `country=`（骨架自带实况）：两者不一致即说明固定对该源没作用，属「采集条件变了」而非「站点改了」。**归一化层不动**：placeholder 与国旗 class 是 README §4 明列的要抓差异面，在归一化里抹平等于自废探测能力——环境噪声在采集侧固定，不在归一化侧掩盖。**入库面的时点**：已提交的 `skeletons/*.json` 与 `manifest.json` 是在本旋钮之前采的，条目自然不含这两个键（再生成时也不补 null）；它们要等下一次真实重捕才带上采集条件，而那次重捕 + 基线重定是 issue #35 的活，不在本票范围。**稳定性的边界**：国别固定本身是确定的（实测 8 次 `--country us` 重捕全部 `ipapi_stub_hits=1`、`capture_country=us`，7 次派生同一树哈希），但整页形状仍受既有「等 SPA 落定」口径（`networkidle` 上限 8s）影响——8 次里 1 次采在 utils 给 tel 输入写 `placeholder` 之前，与另一次差一条 `[minor] attrs`。这不是国别旋钮引入的（旋钮没生效会是 `capture_country=null`，而不是形状差一个属性），属本节开头列的「抓取环境差异」一类；要拿到逐次同哈希的保证得改等待口径，那是 #35 重捕与基线重定时要一起裁的事。

**命令**：

```bash
# ① 重捕（显式动作；不进 CI pull_request 门）
node tests/scripts/06-capture-forms.mjs                 # 全部候选（按 us 采）
node tests/scripts/06-capture-forms.mjs --id iti-v29    # 单个
node tests/scripts/06-capture-forms.mjs --country jp    # 指定国别（默认 us）
# ①-bis 登录态镜像采集（人工 CDP 附着旁路；runbook 见 LOGIN-CAPTURE.md；
#     CI/自动化永不登录，产物同构 + login-derived + 敏感字段形状占位）
node tests/scripts/06-capture-forms.mjs --attach --id <id> --cdp-port 9222
# ② 派生骨架
node tests/scripts/06-skeleton.mjs --id iti-v29 --from archive
# ②-bis 手工重构镜像骨架派生（票 T4：只服务 adoption=reconstructed 条目，
#     必附 provenance；产物 source=reconstructed，永不参与结构比对）
node tests/scripts/06-skeleton.mjs --id twilio-iti-reconstructed --from reconstructed
# ③ 结构 diff（退出码 1 = minor/major，供 cron / 人工升级；
#     reconstructed 条目显式 SKIP 留记录，不产判定）
node tests/scripts/06-structural-diff.mjs --id iti-v29
# ④ 回放自检（owned 镜像页 L0–L4）
npm run e2e -- tests/corpus-forms.spec.ts
# 清单重生成
node tests/scripts/06-manifest.mjs
# 清单再生成（本机无 archive 时从已提交台账确定性重建；旧条目漂移即拒绝写入）
node tests/scripts/06-manifest.mjs --from-ledger
# CI 结构门（离线；指纹 / 合规 / 目录纪律）
node tests/scripts/verify-ticket-06.mjs
# ⑤ 漂移探测（advisory 正式模式；corpus-drift.yml 的 schedule / dispatch 运行面）
node tests/scripts/06-corpus-drift.mjs                 # 重捕 → 新骨架 → 结构 diff → 可达性矩阵
                                                       # （采集按 --country 固定国别，默认 us）
node tests/scripts/06-corpus-drift.mjs --no-capture    # 复用已有 archive（离线）
# 漂移告警投递（消费 drift-issues.json；--dry-run 离线看投递计划，不调用 gh）
node tests/scripts/06-drift-issue.mjs --dry-run
# 漂移门（离线；触发面 / 无写回 / 降级纪律 / fixture 端到端）
node tests/scripts/verify-ticket-44.mjs
# 漂移正式模式门（离线；周排期 / 自动开 issue 决策与去重 / 无写回）
node tests/scripts/verify-ticket-45.mjs
```

---

## 5 结构骨架格式（`skeletons/<id>.json`）

```jsonc
{
  "id": "iti-v29",
  "skeleton_version": 1,
  "source": "archive",                 // archive（真实页基线）| mirror（离线自检）
                                       //   | reconstructed（手工重构镜像，票 T4：
                                       //     附 provenance，永不参与结构比对）
  "source_url": "https://intl-tel-input.com/",
  "capture_country": "us",                // 采集条件（issue #34）：--from archive 才有，
  "browser_locale": "en-US",              //   取自同 archive 的 CAPTURE-MANIFEST 条目
  "root_selector": ".iti",
  "node_count": 36,
  "sha256": "…",                       // 归一化树的规范序列化哈希（自校验）
  "tree": { "tag": "div", "class": ["iti", …], "attrs": {…}, "text": "+##", "children": […] }
}
```

**reconstructed 骨架**（票 T4 / issue #13）：由 `--from reconstructed` 从重构镜像页派生，额外随附 `provenance`（= sources.json 该条目的重构依据）；对应 manifest 条目**无 `captured_at`、无 `capture` 块**（页面不可重现，无捕获时点，不伪造捕获 provenance）。

**归一化规则**（`06-skeleton.mjs`，唯一定义处）：

- 保留：`tag` · `class`（排序 + 去 CSS-in-JS 哈希类）· `role`/`type`/`name`/`aria-*`/`data-*`/`placeholder`/`required`/`readonly` 等结构属性；
- 丢弃：`id`（易变）· `style`/`srcdoc`/`src`/`value`/`href`（内容）· `aria-expanded`/`aria-selected`（状态位）；
- `aria-controls`/`aria-owns`/`aria-labelledby`/`aria-describedby` → 只留存在性 `"ref"`（值含易变序号）；
- 文本 → **形状令牌**（`#` 数字 / `a` 字母 / `+` 加号 …，≤40 字符）：内容替换与文案改动**不触发** diff，而 `+86` ↔ `CN` 这类**值域形态变化会触发**；
- **重复兄弟折叠**：≥3 个同签名兄弟收敛为「1 代表 + `repeat: N`」——选项列表由 N 行噪声变为 1 行结构语义；列表条数变化仍触发 diff，单项文案替换不触发。

---

## 6 与既有约定的关系

- **单一 `tests/` 根**：本目录不新增顶层 `corpus/`（该口径不重开）。
- **真实站点层不进 PR**：真实站点层仍 advisory、不进 `pull_request`（不重开）；本目录的**镜像页是 owned 可控页**，跑 L0–L4 并进 PR 门（票 01 `tests/ACCEPTANCE-SURFACE.md` §4.2）。
- **升塔纪律**：真实站点暴露的、塔身未覆盖的形态，先沉淀为 fixture / 镜像页再修脚本。
- **GLOSSARY.md**：术语「形态语料」「结构骨架」「镜像页」以 `GLOSSARY.md` 为准（票 04 入库）。
