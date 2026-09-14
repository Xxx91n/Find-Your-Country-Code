# Cycle-5 Spec — 从“代码正确”到“用户可见”

> Brain Agent | 2026-09-14 | Input: `research/cycle5-investigation.md`（Cycle-5 架构大脑调查 + 锐评 Round 3 辩证核验）+ `cycle4-closure/03-backlog-and-merge-state.md`（B-1…B-10）
> Previous cycle: Cycle-4 spec 已归档 `spec-cycle4.md`（票 27–35）
> 对账闸：`decision-ledger.md` 登记 A-011…A-025（15 条）；本 spec 每条声明其覆盖的 A-xxx，无去向记录清单见文末。

## Problem Statement

经历四轮交付，引擎在合成 fixture 上 CI 全绿，但四个系统性盲区在 Cycle-5 调查中被**实测**坐实（每条附证据行号，不以自述为准）：

1. **送达断了（A-011）**：v1.5.0 的安全修复、弱线索识别、三条用户上报 bug 修复全部堵在分发链路上。产物 `updateURL` 全部指向 Greasyfork（`vite.config.ts:8`），而 GF 线上实测仍服务 `version 1.3.4`（仓库已到 1.5.0），CI 里没有任何 GF 同步步骤（17 个 workflow 搜 greasyfork 仅命中 `release.yml:63,73` 读 Glog）。用户更新检查永远看到 1.3.4。
2. **可见性断了（A-012 / A-013）**：面板只能从 🌐 图标打开，图标仅在置信度 ≥35 时注入（`detect/index.ts:542-544`）；`#cch-summon` 只在面板 `open()` 内创建（`ui/index.ts:317,326`），而 `open()` 仅两个调用点且均以「已存在图标」为前提；GM 菜单只有「已恢复本站检测」（`main.ts:88-90`）。→ 低置信页面无图标 → 无面板 → 无召唤入口，脚本在用户眼中等于「没注入」。且 lowkey 图标 `opacity:.38;scale(.78)`（`ui/index.ts:82`）近乎不可见，定位在 wrapper 盒外（`top:-12px;right:-12px`）易被 `overflow` 裁剪。
3. **绿不可信（A-014 / A-016）**：10 个票级门中 4 个当场崩（`verify-ticket-09/13/15/18` 裸 `new Function` 未 strip TS，实测 4/4 `SyntaxError`），而 6 个绿门恰好是已迁移装载器集——「十门全绿」是幸存者名单；真实站点层两个 live 目标 `enabled:false` 且 `selector:null`，实际启用数 0，`real-site` 语料无一条含 URL（幽灵覆盖）。
4. **静默失败与仓库卫生（A-017…A-025）**：帧校验只扫顶层 iframe，嵌套帧下子帧消息被静默 return（无面板、无 toast）；`.scratch` 339 文件全部被 git 跟踪；语言切换是从未存在的功能真空；另有依赖/元数据/流程债（peer 冲突靠 `--legacy-peer-deps` 残留、typecheck 注释与 lockfile 根 version、同证据档位不一致、contenteditable 无语料地基、远端已合并支残留、CI-only 边界未条款化）。

## Solution

一轮「**送达 + 可见 + 可信**」周期，按 issue 的 Blocked by 字段推导四波推进（不新造顺序）：

- **W1 可并行（无阻塞）**：门禁完整性返修（票 36）、入口可达性（票 37）、帧治理降级反馈（票 40）、过程证据出仓（票 41）、语言切换收口（票 42）、依赖根修（票 43）、检测语义裁决与语料先行（票 44）。
- **W2**：分发最后一公里（票 38，blocked by 36）、真实站点层启用（票 39，blocked by 40）。
- **W3**：过程证据出仓收口（票 41 归位 W3，blocked by 36–40/42–44 报告落盘）。
- **W4**：仓库与流程收口（票 45，blocked by 41）。

核心取径：**先做能被人看见的（票 37/38），再做能被人信任的（票 36/39）**，最后收口（票 41/45）。

## User Stories

### 送达（A-011）
1. As a user who installed the script from Greasyfork, I want the version I run to be the latest one, so that I actually receive the security and detection fixes.（A-011）
2. As a maintainer, I want a CI gate that fails when tag, `package.json` and the built artifact `version` disagree, so that a half-released version cannot happen silently.（A-011）
3. As a user reading the README, I want the install link to point at the current release, so that I do not install a stale version.（A-011）
4. As a maintainer, I want the Greasyfork channel to pull from GitHub automatically, so that I do not hand-sync versions.（A-011）

### 可见（A-012 / A-013）
5. As a user on a page whose best field scores below the lowkey line, I want a global way to open the panel, so that the script is not invisible to me.（A-012）
6. As a user, I want the panel to be reachable from the userscript manager menu, so that I am not dependent on finding a small icon.（A-012）
7. As a user, I want fields that were registered but not injected to be summonable from that panel, so that manual summon works without an icon.（A-012）
8. As a user, I want the lowkey icon to be perceptible when I look for it, so that I can find the feature.（A-013）
9. As a user, I want the icon not to be clipped by an ancestor overflow container, so that it does not vanish inside real forms.（A-013）
10. As a user, I want the lowkey icon to stay visually distinct from the high-confidence icon, so that the two tiers keep their meaning.（A-013）

### 可信（A-014 / A-015 / A-016）
11. As a maintainer, I want all ten ticket gates to execute, so that a green CI means ten gates green, not six.（A-014）
12. As a maintainer, I want the gate workflows to run on a Node version that supports TypeScript stripping, so that the gates do not crash on load.（A-014）
13. As a maintainer, I want the corpus-size assertion to be derived from the corpus, so that adding corpus cases does not redden a gate.（A-014）
14. As a maintainer, I want per-ticket E2E jobs folded back into the shared E2E workflow, so that gate fragments do not multiply.（A-015）
15. As a maintainer, I want at least one real-site target actually enabled, so that real-site coverage is a measurable number, not zero.（A-016）
16. As a maintainer, I want the CodePen editor page covered as a real-site target including its nested preview iframe, so that the reported CodePen regression is caught before release.（A-016）
17. As a maintainer, I want real-site smoke to assert only existence, so that site churn does not produce false alarms.（A-016）

### 静默失败与卫生（A-017…A-025）
18. As a user on a page that nests the form several frames deep, I want the panel to open or a clear message to appear, so that clicking is never a silent no-op.（A-017）
19. As a user, I want frame discovery to recurse through nested and shadow-wrapped frames, so that deep embeddings work.（A-017）
20. As a maintainer, I want frozen process evidence out of the working tree index, so that diffs show code changes, not archive churn.（A-018）
21. As a maintainer, I want the “sink a fixture before fixing the script” discipline written into the workflow, so that real-site findings become permanent coverage.（A-018）
22. As a user, I want to be able to choose the panel language and have it persisted, so that language is not decided for me by `navigator.language`.（A-019）
23. As a maintainer, I want the dead `LANG` export either consumed or removed, so that the module has no dead surface.（A-019）
24. As a maintainer, I want the typecheck workflow comment to match its command, so that the file does not lie.（A-020）
25. As a maintainer, I want the lockfile root version field in sync, so that metadata is consistent.（A-020）
26. As a maintainer, I want the react peer conflict fixed at the root, so that `--legacy-peer-deps` is no longer a standing exception.（A-021）
27. As a maintainer, I want the “same evidence, different tier” case adjudicated once, so that the tier rule is intentional rather than accidental.（A-022）
28. As a maintainer, I want the contenteditable field shape in the corpus before any detection change, so that the change has a measurement basis.（A-023）
29. As a maintainer, I want merged remote branches cleaned up, so that the remote ref list is readable.（A-024）
30. As a maintainer, I want the CI-only policy and local-hard-verification boundary written down, so that each closure does not need a fresh authorisation.（A-025）

## Implementation Decisions

### 送达
- **分发最后一公里（票 38，A-011）**：GF 侧一次性开启 Sync from external URL 指向 GitHub raw 产物（**拉取模型**，因 GF 无写入 API）；CI 只新增版本一致性闸门（tag = package.json = 产物 `version`）；README 安装链接改为 `releases/latest`。禁止任何 CI 主动 POST 到 GF 的步骤。

### 可见
- **入口可达性（票 37，A-012 + A-013）**：新增第二条 `GM_registerMenuCommand` 直达 `UI.open(null,null,null)`（复用既有 anchor=null 居中路径）；lowkey 图标按「降广告特征 + 提信息气味 + 规避 overflow 裁剪」重设计。不改评分引擎与注入档位判定。

### 可信
- **门禁完整性返修（票 36，A-014 + A-015 + A-020）**：四门统一改用现成 TS 安全装载器（范式 `tests/scripts/14-lib-engine.mjs:11`）；workflow node 升 22；`verify-13` 语料规模断言改动态读取；票级复刻的 E2E 步骤并回统一 `e2e.yml`；顺带清 typecheck 注释与 lockfile 根 version。
- **真实站点层启用（票 39，A-016）**：按 manifest 自带 `enablementRunbook` 启用 ≥1 个 live 目标（优先 CodePen 编辑器页 + 嵌套 preview iframe 断言）；冒烟只断言存在性。保持 advisory（不进 pull_request）。

### 静默失败与卫生
- **帧治理降级反馈（票 40，A-017）**：帧枚举改递归 + shadowRoot 穿透；校验失败降级为可见 toast。**不重构**「全帧自治 + 顶层中心化面板 + origin/source 双校验」架构（与业界共识一致，仅为覆盖缺口）。
- **过程证据出仓（票 41，A-018）**：冻结证据归档出工作树索引；升塔纪律写入 WORKFLOW。纯删除型改动优先。
- **语言切换收口（票 42，A-019）**：面板可选 + GM 持久化（沿用 `UI_PREFS_KEY` 独立键模式）；否则清理 `LANG` 死导出。
- **依赖根修（票 43，A-021）**：根修 peer 冲突，移除 `--legacy-peer-deps` 残留。
- **检测语义裁决与语料先行（票 44，A-022 + A-023）**：同证据档位不一致做独立裁决（须用户裁决，禁借补分越线）；contenteditable 先入 corpus 再议检测。
- **仓库与流程收口（票 45，A-024 + A-025）**：批清已合并远端支（需用户授权）；CI-only 边界条款化入 WORKFLOW。

## Testing Decisions

- 好测试只断言**外部行为**：注入后 DOM 状态、面板可达性、门可执行性、workflow 触发面、版本一致性，不断言实现细节。
- 分层（行业测试塔，T1）：塔基引擎 harness / 校准语料（mock DOM）；塔身密封 fixture E2E（真 Chromium + 出厂产物）；塔尖真实站点冒烟（存在性弱断言，advisory）；塔外 cron 合成监控。
- **升塔纪律**：发现塔身未覆盖的真实形态，先沉淀为 fixture 再修脚本（真实站点用例只升不降）。
- 先例（prior art）：`tests/scripts/14-lib-engine.mjs` 装载器、`tests/live/site-manifest.json` 站点清单、`tests/*.spec.ts` 密封 E2E、`.github/workflows/engine-gates.yml` 公共引擎门。
- 证据铁律：每票验收锚定 commit sha + CI run ID；报告自述不算证据（CI-only）。

## Out of Scope

- 评分引擎五层信号（L0–L4）权重/阈值的整体重构——本周期只做票 44 的语义裁决与语料先行，不重做引擎。
- 伪 select 两形态填充分发的整体重做（不动 ADR-0005 已定档位上限）。
- 国家数据扩充（科索沃 +383 / 梵蒂冈）——跨周期遗留，未登记为 A。
- `.gitattributes` CRLF 规范化——跨周期遗留，未登记为 A。
- 已归零的历史不重写（不可逆，A-010 已 implemented）。

## Further Notes

- 本周期输入来自 Cycle-5 架构大脑调查（4 次 atomcode 全景调研 + 4 个子代理并行只读审计 + codegraph 结构图）与用户点名的 Cycle-4 backlog（B-1…B-10）。
- **辩证校正已入档**：锐评 Round 3 的「git 历史第三次归零 / tag 非 main 祖先」经实测**证伪**（origin/main 有父提交、163 commits、三 tag 均为祖先），**未登记为 A、不立票**；「在 release.yml 加 GF 发布步骤」经深度调研**推翻**（GF 无写入 API），已改写为拉取模型。
- 波次由 issue 的 Blocked by 字段推导（不新造顺序），波次表写入 `README.md`。

## 无去向记录清单

核对 `decision-ledger.md` 的 Cycle-5 去向登记：A-011→38、A-012→37、A-013→37、A-014→36、A-015→36、A-016→39、A-017→40、A-018→41、A-019→42、A-020→36、A-021→43、A-022→44、A-023→44、A-024→45、A-025→45。

**15/15 全部有去向，无去向记录为空，准予立票。**