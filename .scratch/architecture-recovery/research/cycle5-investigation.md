# Cycle-5 架构大脑调查（Investigation）

> 生成：2026-09-14 | 大脑 Agent（主窗口）| 依据：WORKFLOW.md §1/§2/§3（S1–S3）
> 性质：**只读调查产物** —— 未修改任何业务代码；所有结论以命令实测输出为准，不以锐评文本为准。
> 基线：origin/main = `e2a10d8e`（v1.5.0）· 163 commits · 单一 root `76cf9896`

---

## §0 目标（/goal · 不设预算）

本轮目标不是“再修一个引擎 bug”，而是把系统从「在代码正确性上反复加杠杆」切换到「让修复真正送达并被用户看见」。

| 目标 | 内容 | 完成判据（stop condition） |
|---|---|---|
| **G1 送达** | v1.5.0 的安全修复、弱线索识别、三条用户上报 bug 修复全部堵在分发链路 | Greasyfork 上线版本 = tag = 产物 `@version` |
| **G2 可见** | 低置信字段页面无图标→无面板→无召唤入口，脚本在用户眼中等于“没注入” | `score<35` 的页面仍能打开面板 |
| **G3 真实** | “十门全绿”是幸存者名单；真实站点层启用数为 0 | 10/10 门可执行；真实站点层至少 1 个 live 目标启用 |

- **推进方式**：以 message 步骤（§6）为单位推进，每步一个可验收闭环；**不设时间/成本预算**。
- **硬边界**：大脑不直接修改业务代码；实施走 `to-spec` → `to-tickets` → `implement`；版本控制走 `but` 独立分支（WORKFLOW §4.2）。
- **防丢失**：本文件 + `handoffs/36-cycle5-brain.md` 为磁盘产物，不依赖对话记忆。

---

## §1 上下文恢复（handoff 缺失呈报）

用户指定路径 `C:\Users\ADMINI~1\AppData\Local\Temp\handoff-cycle4-closure-2026-09-13.md` **不存在**。该 Temp 目录下仅有 `handoff-round7-tri-wire-hardening-20260914.md` 与 `handoff-round8-2026-09-14.md`，内容属**另一项目**（Env Manager / Tauri / 签名密钥），与本仓库无对应关系。

→ 上下文改由 `git log` + `CONTEXT.md` + `docs/adr/0001–0008` + `C:\Windows\temp\锐评.txt`（Round 3）重建。此偏离已呈报。

---

## §2 辩证核验：锐评 Round 3 逐条裁定

| 锐评主张 | 裁定 | 实测证据 |
|---|---|---|
| 09/13/15/18 四门崩溃 | **CONFIRMED** | 4/4 实测 `SyntaxError: Unexpected token ':'`（`new Function` 吃到 TS 类型标注）；exit=1。崩溃行 09:119 / 13:46 / 15:113 / 18:39 |
| “十门全绿”是幸存者名单 | **CONFIRMED** | 6 绿（02/05/27/28/29/31）全部已用 `stripTypeScriptTypes`；4 红恰好是未迁移集 |
| Greasyfork 冻死在 v1.3.4 | **CONFIRMED** | 实时抓取 `update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js` → `@version 1.3.4`；产物为 1.5.0 |
| README 安装链接停在 v1.4.0 | **CONFIRMED** | `README.md:47` 与 `README_EN.md:50` 硬编码 `releases/download/v1.4.0/` |
| release.yml 无 Greasyfork 同步步骤 | **CONFIRMED** | 17 个 workflow 搜 `greasyfork` 仅命中 `release.yml:63,73`（读 Glog 当 release body） |
| 入口自锁（entry-point trap） | **CONFIRMED** | `ui/index.ts:317,326` 创建 `#cch-summon`；`open()` 仅 `ui/index.ts:159` + `main.ts:68` 两调用点；`main.ts:88-90` 菜单只有“已恢复本站检测” |
| lowkey 图标近乎不可见 | **CONFIRMED** | `ui/index.ts:82` `.cch-btn-lowkey{opacity:.38;transform:scale(.78);filter:saturate(.4)}` 逐字一致 |
| “语言切换功能消失” | **CONFIRMED（功能真空）** | i18n 自始只有 `navigator.language` 自动判定；非回归，是从未存在 |
| .scratch 涨到 339 文件 / 2.3MB | **CONFIRMED** | `find .scratch -type f | wc -l` = 339；`du -sh` = 2.3M；**且 339 个全部被 git 跟踪** |
| **git 历史第三次归零 / tag 非 main 祖先** | **REFUTED** | `origin/main=e2a10d8e` **有父提交** `e3dda808`；`git log \| wc -l`=163；`merge-base --is-ancestor` 对 v1.3.4/v1.4.0/v1.5.0 均为 YES；`ls-remote` 与本地同 sha。**该条不立票。** |
| “在 release.yml 加 GF 发布步骤即可修复” | **SUPERSEDED** | atomcode 深度调研（GF 官方 API 文档 + greasyfork#1288/#1499）证：GF **无写入 API**，CI 主动触发被 406 拒绝；正确解是 GF 侧 **Sync from external URL**（拉取模型） |

**方法论提醒**：REFUTED 条说明锐评本身也会产生幻觉。后续一切外部事实必须标注 observed / cited / reproduced / candidate（WORKFLOW §2.5）。

---

## §3 架构现状地图（codegraph 1.6.0）

`codegraph init` → 119 files / 1,693 nodes / 4,469 edges。`src/` 11 个模块 3,168 行。

| module | 行数 | 职责（CONTEXT.md 词汇） | seam / 依赖 |
|---|---|---|---|
| `detect/index.ts` | 868 | 置信度评分五层信号瀑布、可见性闸门、重评 | 最深 module；消费 rules，产出 tier |
| `ui/index.ts` | 713 | 图标注入、面板、手动召唤、负反馈、toast、定位 | 接口面最宽（CchUI 成员众多） |
| `fill/index.ts` | 345 | 原生事件序列、三态填充结果 | 依赖 iti-adapter |
| `store/index.ts` | 286 | GM 存储、订阅、站点规则文档权威契约 | 全模块共享底座 |
| `data/countries.ts` | 231 | 223 条国家数据 | 纯数据 |
| `types.ts` | 183 | 共享类型层（types-only，零运行时） | 编译期 seam |
| `iti-adapter/index.ts` | 173 | intl-tel-input v16–v29 能力探测 | adapter（唯一实现） |
| `rules/index.ts` | 137 | 站点规则匹配、分档覆盖（scope 语义） | 检测入口前生效 |
| `config.ts` | 112 | 阈值/常量 | 无逻辑（shallow） |
| `main.ts` | 92 | 装配 + 帧治理 + GM 菜单 | 唯一组装点 |
| `i18n.ts` | 28 | `t()` + `LANG` 自动判定 | `LANG` 为死导出（无 import） |

**删除测试**：真正“删除即集中复杂度”的深 module 是 `detect`（评分瀑布）与 `store`（规则契约）；`config.ts`/`types.ts`/`i18n.ts` 属结构性浅 module，**不应为它们造抽象**。

**关键 seam**：`detect → ui`（tier 驱动注入）与 `ui → fill`（选中国家驱动写入）。本轮全部 6 个深化机会**无一位于这两个 seam 内部** —— 它们在 seam 的两侧（入口可达性与真实世界验证）。

---

## §4 深化机会（6 项）

### C1 · 分发最后一公里：从“推”改“拉” — **Strong**
- **Files**：`.github/workflows/release.yml` · `vite.config.ts:8` · `README.md:47` · `greasyfork/`
- **Problem**：产物 `@updateURL`/`@downloadURL` 全指 Greasyfork；GF 冻结 1.3.4，CI 无任何 GF 步骤 → 用户更新检查永远看到 1.3.4。
- **Solution**：GF 侧一次性开启 **Sync from external URL** 指向 GitHub raw 产物；CI 收敛为**版本一致性闸门**（tag = package.json = 产物 @version）；README 改指 `releases/latest`。
- **Benefits**：leverage 极高（单点恢复全部渠道更新通路）；locality 好（版本一致性从三处收敛为单一闸门）。

### C2 · 入口自锁：让面板可达 — **Strong**
- **Files**：`src/main.ts:87-90` · `src/ui/index.ts:265,317,326,82` · `src/detect/index.ts:542-544,848`
- **Problem**：面板只能从图标开；图标需 ≥35 分；`#cch-summon` 在面板内。score<35 → tier=none → 无图标 → 死路。GM 菜单无“打开面板”。
- **Solution**：注册第二条 GM 菜单命令直达 `UI.open(null,null,null)`（`_pos` 对 anchor=null 已有居中路径 `ui/index.ts:627-635`；`#cch-summon` 按 `_lowFields` 显隐 `ui/index.ts:695`）；按 §5 U2/U3 重做 lowkey 可见性。
- **Benefits**：locality 极佳（一处注册破除陷阱，零改评分引擎）；leverage 高（直接对应“大多数网站没生效”）。

### C3 · 门禁完整性：四扇塌掉的门 — **Strong**
- **Files**：`tests/scripts/verify-ticket-09|13|15|18.mjs` · `.github/workflows/verify-13|15|18.yml` · 范式 `tests/scripts/14-lib-engine.mjs:11`
- **Problem**：裸 `new Function(源码)` 未加 `stripTypeScriptTypes` 直接崩；且三门钉 `node-version: 20`（strip 需 ≥22.13）；三门仍挂 `on: pull_request`。
- **Solution**：四门统一 import 现成装载器；node 升 22；`verify-13.mjs` 硬编码语料规模断言（41）改动态（corpus 已 48）。
- **Benefits**：locality 好（装载逻辑从 16 份收敛为单一 adapter）；leverage 高（恢复 10/10 门可执行）。

### C4 · 测试塔塔尖为空：真实站点层启用数为 0 — **Strong**
- **Files**：`tests/live/site-manifest.json` · `.github/workflows/real-site-smoke.yml` · `tests/*.spec.ts`(13) · `tests/fixtures|manual`(26)
- **Problem**：74 个密封 E2E 确实加载出厂产物、跑真 Chromium，**但页面全部是本地手写 fixture**（最大 117 行），13 个 spec 无一引用外网 URL。真实站点层设计正确（Bitwarden BIT 口径）但**内容为空**：4 个 mirror 目标全本地镜像，2 个 live 目标 `enabled:false` + `selector:null`。`corpus/manifest.json` 7 条 real-site 语料**无一条含 URL** —— 幽灵覆盖。
- **Solution**：按 manifest 自带 `enablementRunbook` 启用 ≥1 个 live 目标（推荐 CodePen 编辑器页，含嵌套 preview iframe 断言）；冒烟只断言**存在性**（`.cch-wrapper` 出现 + 无未捕获异常）。
- **Benefits**：locality 好（runner 与断言口径已就绪，只需填清单）；leverage 高（真实站点用例数成为可度量指标）。

### C5 · 帧治理：嵌套帧静默失败 — **Worth exploring**
- **Files**：`src/main.ts:44-53`(`isEmbeddedFrame`) · `:55-58` · `src/config.ts:105`
- **Problem**：`isEmbeddedFrame()` 只扫顶层 `querySelectorAll('iframe, frame')` —— **不穿 shadowRoot、不递归孙帧**。多层嵌套下子帧点击消息在 `main.ts:67` 被**静默 return**。
- **Solution**：帧枚举改递归 + shadowRoot 穿透；校验失败降级为可见 toast。**深度调研确认本仓库“全帧自治 + 顶层中心化面板 + origin/source 双校验”与业界共识一致 → 这是覆盖缺口，不是架构错误，只做局部加深。**
- **Benefits**：locality 好（局限一个校验函数）；leverage 中高（消除 codepen 类静默失败）。

### C6 · 过程证据被 git 跟踪（339 文件 / 2.3MB） — **Worth exploring**
- **Files**：`.scratch/**`（339 文件全部被跟踪）· `.codegraph/.gitignore`
- **Problem**：过程证据区全部在 git 索引里，膨胀 diff/检出表面积，与“冻结目录禁改”约定矛盾。
- **Solution**：冻结证据归档到仓库外或独立分支；工作区只保留现役流程文件（纯删除型改动，ponytail 阶梯第 1 级）。

---

## §5 行业心智模型模板库（15 个可直接复用的轮子）

来源：4 次 atomcode 全景调研（Exa + Tavily + AnySearch 三引擎、官方文档优先、多源交叉）。**原则：复用成熟轮子，不重复开发。**

### 测试塔（4）
- **T1 测试塔/金字塔**：塔基单测（mock GM_*/chrome.*）→ 塔身 fixture E2E → 塔尖真实站点冒烟（宽断言）→ 塔外合成监控（cron）。规则：真实站点用例只升不降——发现塔身未覆盖形态，**先沉淀为 fixture 再修脚本**。〔Playwright 官方 · Checkly 官方 · Katalon · bugbug.io〕
- **T2 注入语义三分法**：测“页面上发生了什么”→ `addScriptTag`（主世界）；测“扩展发布形态”→ MV3 包装 + `--load-extension`；测“GM_* 权限语义”→ 手动 + 单测层 stub。MV3 content script 跑 isolated world，拿不到页面全局。〔Playwright 官方 · Cypress #28107〕
- **T3 反爬阶梯与 2×2 实验**：被拦先做 2×2（headless/headed × direct/proxy）定位拦截变量；指纹问题 → Xvfb headful；自有服务 → 官方测试密钥。**不凭论坛直觉买代理。**〔Cloudflare Turnstile 官方 · dev.to〕
- **T4 站点清单驱动 + 存在性冒烟**：真实站点用例收敛为声明式清单（URL + 期望锚点）；**清单大小本身就是真实覆盖面的可度量指标**；断言 = 注入后 DOM 出现 + 无未捕获异常。〔Bitwarden BIT live tests · 本仓库 site-manifest 同构〕

### 分发管线（3）
- **D1 GitHub 主仓 + GF 反向同步**：GF **无写入 API**，模型是“拉”不是“推”。GF 侧开 Sync from external URL 指向 GitHub raw → push/webhook 触发 GF 拉取；CI 只管版本一致性闸门。〔GF 官方 API · greasyfork#1288/#1499〕
- **D2 版本同步三档**：① 手动 bump + tag 校验闸门 ② 构建期注入（vite-plugin-monkey 生成 @version）③ semantic-release 全自动。**起点 = ①+②**。〔vite-plugin-monkey · webpack-userscript-template〕
- **D3 GF 三条硬规则**：不得 minify；单文件 ≤2MB；更新检查 ≤1 次/天，主功能代码须托管 GF、不得引导改用替代下载源。〔GF code rules / external-scripts 官方〕

### 注入 UI 可发现性（5）
- **U1 Reduce the Gap**：入口离任务越近越易被发现；藏在工具栏弹窗里的功能，对从未点过图标的用户等于不存在。〔Plasmo 官方 · NN/g〕
- **U2 横幅盲区反转（反直觉）**：用户习得性忽略“位置像广告、视觉处理像广告”的元素，且是**扫描阶段自动过滤**。右下角“漂浮球 + 高饱和 + 阴影卡片”命中全部广告特征 → **更安静、更原生的注入物反而被阅读率更高**；杠杆在位置与相关性，不在视觉重量。〔NN/g 1997/2007/2018 眼动研究〕
- **U3 渐进式披露（2 层上限）**：切分要正确；通往二层的路必须显而易见；超过 2 层用户会迷路。模板：小图标/角标（L0）→ 展开面板（L1）→ 高级设置（L2 封顶）。〔NN/g〕
- **U4 油猴三层入口模板**：userscript 无法加工具栏图标/右键菜单，唯一标准全局入口是 `GM_registerMenuCommand`（可在检查页面后动态注册）。模板 = 菜单命令 + 页内情境触发 + 快捷键。〔Tampermonkey 官方文档 · HN 共识〕
- **U5 Grammarly 锚定模式**：浮动组件**锚定在被作用的文本框旁**（非页面角落）+ 可拖拽锚点 + 按站记忆位置 + 状态外显（“发现 N 个问题”）+ 最小足迹模式（只留下划线）。〔Grammarly 官方手册〕

### 跨帧架构（3）
- **F1 全帧自治 + 顶层中心化**：每帧独立检测与填充，**只有顶层帧**承担面板宿主。1Password / Bitwarden / 本仓库票 12 不约而同收敛于此。第一决策变量：**哪个帧拥有这个表单**。〔Chrome 官方 · MDN〕
- **F2 消息黄金三件套**：targetOrigin 尽量收紧 + `event.origin` 严格相等 + `event.source` 引用比对 + 信封 schema（type 命名空间 / eventId 去重 / version）。〔Chrome 官方模板 · ceaksan · spaceraccoon〕
- **F3 Shadow DOM 默认 / iframe 特例**：页面内 UI 默认 Shadow DOM（继承属性会穿透，需显式 reset）；iframe 仅对抗页面全局样式轰炸时启用。closed shadow root **不是安全边界**。〔wxt 三形态 API · rabbitholes 实测〕

---

## §6 message 步骤（不设预算）

| 步 | 动作 | 关联 | 验收 |
|---|---|---|---|
| **M1** | 修四扇门 + node 升 22 | C3 | 10/10 门本地全绿；三门不再挂 pull_request 拦截 |
| **M2** | GM 菜单加“打开面板”全局入口 | C2 | 构造 score<35 页面仍能打开面板并召唤 |
| **M3** | lowkey 图标可见性重设计 | C2 | 按 U2/U3：降广告特征、提信息气味、规避 overflow 裁剪 |
| **M4** | 分发链路：GF 反向同步 + 版本闸门 | C1 | GF 上线版本 = tag = 产物 @version |
| **M5** | 启用真实站点层（含 CodePen） | C4 | 至少 1 个 live 目标连续两次绿 |
| **M6** | 帧校验递归 + 失败降级 toast | C5 | 三层嵌套 fixture 下点图标有面板或明确提示 |
| **M7** | 过程证据出仓 + 升塔纪律入 WORKFLOW | C6 | `git ls-files .scratch` 数量归零或仅剩现役流程 |
| **M8** | （可选）语言切换 + i18n 死导出清理 | backlog | 面板可选 + GM 持久化；或删死导出 |

**顶层建议（先做哪一项）**：**M2/M3（C2 入口自锁）+ M4（C1 分发最后一公里）** —— 唯一直接对应业主两条投诉（“网站没生效”/“修了没人收到”）且 locality 极佳的改动。M1（C3）是“让绿重新可信”的地基，紧随其后。**先做能被人看见的，再做能被人信任的。**

---

## §7 证据索引

- **本机命令**：`node tests/scripts/verify-ticket-{02,09,13,15,18}.mjs` · `git rev-parse origin/main` · `git merge-base --is-ancestor v1.5.0 origin/main` · `git ls-remote origin main` · `gh release list` · `find .scratch -type f | wc -l`
- **联网实证**：`update.greasyfork.org/scripts/573755/Find-Your-Country-Code.meta.js` → `@version 1.3.4`
- **代码证据**：`src/ui/index.ts:82,265,317,326,627-635,695` · `src/main.ts:44-58,59-86,87-90` · `src/detect/index.ts:542-544,568-592,848` · `src/config.ts:53-54,97,105` · `vite.config.ts:8` · `README.md:47` · `release.yml:63,73` · `tests/scripts/14-lib-engine.mjs:11`
- **深度调研**：4 次 atomcode 全景调研（测试塔 / 分发管线 / 可发现性 / 跨帧架构）
- **子代理**：4 个并行只读审计（覆盖 / 分发链 / 门禁完整性 / UI 入口）
- **工具**：codegraph 1.6.0 · atomcode 5.0.9 · but 0.22.3
- **可视化报告**：`report/architecture-review-cycle5.html`
