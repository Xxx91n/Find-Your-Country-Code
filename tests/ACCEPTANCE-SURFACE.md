# 验收面与断言阶梯（Acceptance Surface and Assertion Ladder）

> 权威定义 | Cycle-6 票 01 | 覆盖 A-029 · A-030 | 生成 2026-09-16
> 状态：**定义生效**。本票只产出定义（成文于本文件与 `spec.md` S-03），**不建 harness、不改源码**。
> 下游：票 05（harness 交互原语）· 票 06（形态语料三层架构）· 票 07（真实站点层全阶梯 + 发布门）按本文件实现。
> 数据源纪律：结论仅来自 `spec.md` S-03 · `research/cycle6-investigation.md` §2 · `.scratch/cycle6-grill/decision-ledger.md`（D-002/D-003/D-004/D-005/D-006）· `decision-ledger.md`（A-029/A-030）+ 本票 atomcode 调研（§6）。

---

## 0 范围与边界

本文件定义两件事：

1. **验收面**：17 项用户可见工具 + 1 项诊断项（`__cchLastFill` 移出验收面），逐项给出「页面侧外部可观测」判据。
2. **断言阶梯**：L0–L4 五级定义、每级的层归属、环境真实性约束。

**本文件不定义**：harness 实现、fixture / 语料、CI workflow、检测算法——由票 05 / 06 / 07 承接。

**适用对象**：本仓库 userscript（`dist/find-your-country-code.user.js`）**注入后的页面侧行为**。

**与 spec 的关系**：`spec.md` S-03 是 spec 侧记录；本文件是测试侧权威定义，二者冲突时以本文件为准并回写 spec。

---

## 1 裁定原则（唯一裁定权）

1. **裁定权在页面侧外部可观测结果**：DOM 变化 / 目标字段 `value` + `input`·`change` 事件 / 面板可见性 / 未捕获异常计数。
2. **脚本自报不进断言**：`window.__cchLastFill`、toast 文案、评分 `signals[]`、`data-cch-score` 只进日志与诊断面板（票 03），**不得充当任一验收项的通过依据**（D-002 / D-006）。
3. **双轨不一致即缺陷**：页面侧可观测结果与脚本自报不一致，本身是一条**诊断判据**（进诊断面），但不改变第 1 条的裁定权归属。
4. **引擎单元层断言仍合法**：`signals` / 分数的引擎门（calibration / engine-gates）是合法证据，但**不得充当「页面级生效」的证据**。
5. **自证禁止**：不得以「storage 里已写入」「脚本内部状态已变」代替页面侧可观测断言。

---

## 2 验收面：17 项用户可见工具 + 1 项诊断

> 判据栏一律写**页面侧外部可观测**的可执行判据（选择器 / 属性 / 事件 / 计数），不写工具名了事。
> 「owned 页最低目标级」= 该项在自有可控页上**必须达到**的阶梯级别（级别定义见 §4）。

### 2.1 清单（17 项）

| # | 能力 | 页面侧外部可观测判据 | 有状态 | owned 页最低目标级 |
|---|---|---|---|---|
| 1 | 检测与分档 | 目标字段被 `.cch-wrapper` 包裹，其内 `.cch-btn` 的 `data-cch-tier` ∈ `{auto, lowkey}` 且 `data-cch-score` 为数值字符串；未达低置信线的字段**无** `.cch-wrapper`（仅进面板召唤面） | 否 | L2 |
| 2 | 图标注入（auto / lowkey） | 目标字段旁出现**可见**的 `.cch-wrapper > .cch-btn`；`auto` 档 `data-cch-tier="auto"` 且**无** `.cch-btn-lowkey` 类；`lowkey` 档 `data-cch-tier="lowkey"` 且**含** `.cch-btn-lowkey` 类 | 否 | L2 |
| 3 | 面板开 / 关 | 点击 `.cch-btn` 后 `#cch-pop` 存在于 DOM 且可见；点击面板外区域后 `#cch-pop` 被移除（`document.querySelector('#cch-pop')` 为 null） | 否 | L2 |
| 4 | 搜索 / 过滤 | 在 `#cch-si` 输入查询后，`.cch-sec-all .cch-list .cch-row` 可见行数收窄且每行文本含该查询；清空后恢复全量 | 否 | L2 |
| 5 | 收藏 增 / 移除 | 点击 `.cch-fav` 后该按钮 `class` 含 / 不含 `on`、`title` 在「加入收藏 / 移除收藏」间翻转，且 `.cch-sec-favs .cch-list` 内出现 / 移除对应 `.cch-row` | **是** | L3 |
| 6 | **选国 → 填充目标字段** | 点击国家行后，目标字段（`select` / `input` / iti 底层 input / 伪 select 触发器）的 `value` 变为该国家区号（按 kind 归一后的期望字符串），且该字段派发 `input` 与 `change` **各 ≥1 次**（监听计数） | 否 | L3 |
| 7 | 填充负反馈 + 失败反馈 | 填充结果触发 `#cch-toast` 出现且文本对应三态之一（成功 / 降级复制 / 失败）；点击 `#cch-fb` 后目标字段的 `.cch-wrapper` **立即消失**（none 规则即时拆图标） | **是** | L4 |
| 8 | 手动召唤 `#cch-summon` | 低置信字段初始无 `.cch-wrapper`；打开面板并点击 `#cch-summon` 后，该字段出现 `.cch-wrapper` 且其 `.cch-btn` 带 `data-cch-summon="1"`；`#cch-summon` 自身从面板移除 | 否 | L2 |
| 9 | 站点豁免开关 | 点击 `#cch-exempt-tg` 后页面内 `.cch-wrapper` 数量**归零**且 `#cch-toast` 出现豁免提示；再次点击关闭后经重扫 `.cch-wrapper` 重新出现 | **是** | L3 |
| 10 | 规则 / 覆盖列表 + ⚙ 入口 | 点击 `#cch-rules-tg` 后 `#cch-rules-view` 可见且列表分区隐藏；`.cch-rule-row` 逐行呈现 host / selector / tier；点击 `.cch-rule-del` 后该行消失且页面侧注入按新规则重评（重扫后 `.cch-wrapper` 变化） | **是** | L3 |
| 11 | 低调样式开关 | 点击 `#cch-lowkey-tg` 后 `dim ⇄ hidden` 迁移**即时**发生：`hidden` 时已挂 lowkey 字段的 `.cch-btn-lowkey` 消失并回到召唤面；`dim` 时按低调样式补挂；`auto` 档图标不受影响 | **是** | L3 |
| 12 | 语言切换 | 切换 `#cch-locale-tg` 后，面板内**全部**可见文案（`#cch-si` placeholder、分区标题、`#cch-summon` / `#cch-fb` 文本、规则视图标题）切换为目标语言，**无残留旧语言文案** | **是** | L3 |
| 13 | GM 菜单命令 | GM 替身记录 `{title, fn}` 且 `fn` **可调用**；调用「打开面板」后 `#cch-pop` 可见；调用「恢复本站检测」后 `.cch-wrapper` 数量归零（判据只锚定「记录 + 调用后页面侧效果」，不锚定条数 / 文案） | 否 | L2 |
| 14 | **跨隔离上下文链路**（独立验收项） | 见 §3.3——**必须断言链路两端的写入结果** | 否 | L3 |
| 15 | 变更重扫 | 动态插入符合区号形态的字段后（350ms 防抖窗口 + 观察窗内）该字段出现 `.cch-wrapper`；移除该字段后其 `.cch-wrapper` 一并消失（**不残留孤儿 wrapper**） | 否 | L2 |
| 16 | 伪 select / 无 ARIA 下拉 | 按 ADR-0005 档位约束：命中的伪 select 字段**不出现** `data-cch-tier="auto"` 的自动注入图标，仅进入面板召唤面；召唤后按用户交互填充，伪 select 展示文本与写入值同源 | 否 | L3 |
| 17 | intl-tel-input 适配 | `.iti` 容器内字段注入后选中某国时：iti 自身国家按钮的 `title` / `aria-label` 或 `.iti__flag` 类名反映新国家，且底层 `input` 的 `value` 为该区号；**iti 内部搜索框**（`input[role=combobox][type=search]`）**不被注入**（A-031 误报面负例） | 否 | L3 |

### 2.2 诊断项（移出验收面，1 项）

| # | 项 | 页面侧可观测（**仅诊断**） | 状态 |
|---|---|---|---|
| D1 | `__cchLastFill` 三态钩子 | 每次填充后 `window.__cchLastFill` = `{status: filled / copied / failed, kind, iso, code, fmtDiff}` | **诊断项**（D-002 / D-006 移出验收面） |

**约束**：不得再以 `__cchLastFill` 充当任一验收断言依据（现 `tests/scripts/verify-ticket-31.mjs` 以它为据，属待回写的既有实践）。其正确定位是诊断面（票 03）与「双轨不一致」检测的输入。

---

## 3 通用判据

### 3.1 通用判据 A：持久化（每项有状态工具的通用判据）

**适用 6 项**：收藏（#5）· 填充负反馈（#7）· 站点豁免（#9）· 规则 / 覆盖（#10）· 低调样式（#11）· 语言（#12）。

**闭环四步**（D-006 (b)；行业模板见 §6）：

1. 经**用户可见交互**写入设置（不得经脚本内部 API 直写）
2. 页面侧出现可观测反馈
3. **reload**（或关闭并重开面板）
4. 断言同一页面侧可观测结果**仍在**

**硬约束**：

- 持久化复验**不得只读 storage 自证**（D-002 / D-006）——必须经用户可见行为复验。
- 本地 harness 的 GM 存储以 `localStorage` 承载（`tests/helpers/userscript.ts`），故 reload 断言即为持久化断言。
- 「重开面板」与「reload」二者至少其一；有 storage 语义的 6 项一律以 **reload** 为准。
- 存储键归属（observed）：收藏 `cch_v33` · 站点规则 `cch_site_rules_v1` · UI 偏好 `cch_ui_prefs_v1`。

### 3.2 通用判据 B：静默健康（L0）

任一验收项在其**完整用例执行期间**必须 `pageerror` = 0、未捕获异常 = 0。**L0 永不单独算生效**。

### 3.3 独立验收项：跨隔离上下文链路（#14，双端断言）

**为什么单列**：单上下文枚举必漏——面板宿主只在**顶层**渲染，而字段检测与填充在**每帧各自**执行；只断一端会漏掉半边 bug。

**链路 A —— 子帧图标点击 → 顶层代开面板**

- 两端断言：**子帧侧**断言「已向顶层发出开面板请求」（子帧目标 / pending 已登记或消息已发出）；**顶层侧**断言 `#cch-pop` 在**顶层**文档可见。
- 时序前提：消息发给尚未注册 listener 的 iframe 会**静默丢弃**——必须先等子帧脚本就绪再触发。

**链路 B —— 顶层选国 → 子帧执行填充**

- 两端断言：**顶层侧**断言指令已发出；**子帧侧**断言目标字段 `value` 已写入且派发 `input` / `change`。
- **不得只断言「消息到了」而不验两端结果**（D-006 (c)）。

**共同约束**

- 覆盖至少一层嵌套（孙帧）与 shadowRoot 穿透路径（票 40 语义）。
- **origin 校验正 / 负向各一**：合法来源被处理；非法来源被拒绝且**降级为可见提示**（不静默，票 24 / 票 40 语义）。
- 断言必须与动作留在**同一 frame locator** 上；越界断言父页会得到假阴性空串。
- 结构化克隆边界：跨 `postMessage` 的载荷不得依赖函数 / DOM 节点 / 原型链。
- 协议标识（observed）：`__cch === 'cch-frame-v1'`，`type ∈ {open, fill, feedback}`。

---

## 4 断言阶梯 L0–L4

### 4.1 五级定义

| 级 | 名称 | 断言什么 | 强度 | 禁止 |
|---|---|---|---|---|
| **L0** | 静默健康 | 全程 `pageerror` = 0、未捕获异常 = 0 | 必要不充分 | **永不单独算生效** |
| **L1** | 元素已注入 | 目标字段被 `.cch-wrapper` 包裹，`.cch-btn` 存在且 `data-cch-tier` ∈ `{auto, lowkey}` | 存在性 | 不得把「注入存在」当「能用」 |
| **L2** | 交互可驱动 | 驱动后产生**可见状态迁移**（面板开 / 关、视图切换、列表收窄、档位迁移、图标拆挂） | 行为存在 | **禁止固定 sleep**；必须等可见状态迁移 |
| **L3** | 写入结果正确 + 持久化 | 目标字段 `value` 正确且派发 `input` / `change`；有状态设置经 reload 仍在 | **自动化验收的最强推荐位** | 不得以脚本自报代替 |
| **L4** | 用户反馈出现 | 用户可见反馈出现（`#cch-toast` 文本、图标档位 / 召唤标记、面板内摘要行） | 反馈可见 | **必须建立在外部可观测之上**，不得用脚本自报冒充反馈 |

### 4.2 层归属（每级）

| 级 | owned 可控页（镜像页 / 结构骨架） | 真实站点 |
|---|---|---|
| L0 | 必需，**PR 阻断** | 必需，advisory |
| L1 | 必需，**PR 阻断** | 必需，advisory |
| L2 | 必需，**PR 阻断** | 跑（可驱动处），advisory |
| L3 | 必需，**PR 阻断** | 跑（可驱动处），advisory；不可驱动时降级为「L0 + 最弱写入结果断言」并登记非空原因 |
| L4 | 必需，**PR 阻断**（用户裁决覆盖调研建议） | 跑，advisory |

**三条层归属规则**：

1. **两层都跑全阶梯 L0–L4**（D-004 (b)(c)(d)：L4 纳入自动化断言面；真实站点不得只停留在 L0–L1 弱断言）。
2. **差别只在阻断语义**：owned 页 = `pull_request` 阻断；真实站点 = 仅 `schedule`（周）+ `workflow_dispatch` 触发，**永不进 `pull_request`**，失败只告警不阻断合入。
3. **阻断只发生在发布门**：`release.yml` 的发布门要求真实站点层最近一次运行为绿，或失败已被**显式 ack 并立票**，否则不出包（D-005；ADR 由票 04 立）。已知不可达 / 被挑战条目以 `observe` 长期挂账，**强制携带非空 reason + ticket**。

**真实站点断言下限**（A-029 / D-004）：真实站点层的断言口径不得弱于其援引先例 Bitwarden BIT——该先例**断言填充结果**（「username/email was filled out properly」），故真实站点层可承受的最低口径是「L0 + 最弱写入结果断言」，而非「只看元素存在」。

### 4.3 环境真实性约束

1. **L2 以上必须在真实浏览器 runtime**——不得用 jsdom / mock DOM 充当 L2+ 证据（mock DOM 只服务塔基引擎 harness 与校准语料）。
2. **headless 必须 full Chromium**：`headless_shell` 加载不了扩展 / userscript 环境，**会静默空转仍全绿**。Playwright 侧对应 `channel: 'chromium'`（新版 headless）；旧 `--headless` 明确**不支持扩展**（§6）。
3. **已知失真面**（须以有头 / 人工补充，**不因此放宽断言**）：GPU / WebGL 降级使视觉类断言与有头不一致；Service Worker 生命周期在自动化下与真实使用有差异；Firefox 端传统 headless 扩展支持有限。
4. **固定标识符是持久化断言的前置**：存储归属与 origin 白名单挂在扩展 ID 上；本地 harness 以同源 + `localStorage` 承载。

---

## 5 与证据边界（WORKFLOW §8）的关系

- 行为面验收证据**只认 CI run / artifact**，锚点 = commit sha + run ID（§8.1.1）。
- 本文件定义的验收面与阶梯**就是**「可 CI 化验收」的边界：owned 页 L0–L4 与真实站点全阶梯都必须进 CI，不得留在本地执行（§8.1.4）。
- 本地执行结果降级为「开发期自证」，不构成闭环证据（§8.1.2）。
- 本地硬验收（§8.2）仅覆盖只读、无副作用的核查，不得用于行为面验收。

---

## 6 来源（observed / cited / reproduced / candidate）

**项目内（observed / reproduced）**

- `src/ui/index.ts` 可观测面：`#cch-pop` · `#cch-si` · `#cch-rules-tg` · `#cch-summon` · `#cch-fb` · `#cch-toast` · `#cch-rules-view` · `#cch-exempt-tg` · `#cch-lowkey-tg` · `#cch-locale-tg`；`.cch-wrapper` · `.cch-btn` · `.cch-btn-lowkey` · `.cch-fav` · `.cch-row` · `.cch-rule-row`；`data-cch-tier` · `data-cch-score` · `data-cch-summon`
- `src/config.ts`：`WRAPPER_CLASS` · `OWN_ROOT_ID` · `UI_PREFS_KEY='cch_ui_prefs_v1'` · `RULES_KEY='cch_site_rules_v1'` · `FRAME_TAG='cch-frame-v1'` · `FRAME_OPEN_MSG` / `FRAME_FILL_MSG` / `FRAME_FEEDBACK_MSG` · `LOWKEY_MODES` · `RULE_TIERS`
- `src/main.ts`：菜单命令注册（顶层 2 条）· 入站 origin 校验与降级 toast · 双相递归 `isEmbeddedFrame`
- `src/store/index.ts`：收藏键 `cch_v33`；`src/types.ts`：`FillResult.status ∈ {filled, copied, failed}`
- `tests/helpers/userscript.ts`：GM 替身（localStorage 承载）+ 菜单命令记录 `{title, fn}`（48 行 / 4 导出——票 05 的起点）
- `docs/adr/0005`（伪 select 档位约束）· `docs/adr/0006`（单一 `tests/` 根 / PR 门控 / 证据只认 CI）· `docs/adr/0008`（三层测试塔 / CDP Autofill NOT-ADOPTED）· `docs/adr/0009`（证据量档位边界）
- `CONTEXT.md`：分级行动 · 低调注入 · 手动召唤 · 可见性闸门 · 帧治理 · 密封 E2E
- `research/cycle6-investigation.md` §2（18 项 × 3 层覆盖矩阵——本清单的编号来源）

**外部（cited，本票 atomcode 调研，2026-09-16，串行护栏下 1 次，三引擎交叉）**

- Chrome 官方 *End-to-end testing for Chrome Extensions*：集成测试应**避免访问内部状态**、以**用户可见内容**为准；`--headless=new` 才能加载扩展
- Playwright 官方 *Best Practices* / *Chrome extensions*：Test user-visible behavior；扩展只能在 persistent context 加载；headless 需 `channel: 'chromium'`；`headless_shell` 不支持扩展
- Kent C. Dodds *Testing Implementation Details*：断言实现细节同时产生 false positive 与 false negative
- Firefox *Extension Workshop — Testing persistent and restart features*：临时加载每次新 ID 且卸载清空存储；**固定 ID 是持久化测试前置**
- extensionbooster *E2E Testing Complete Guide*：**写入 → 可观测反馈 → 重载 → 断言仍生效**四步持久化闭环模板
- Assrt *How to Test postMessage with Playwright*：**双端断言**（frameLocator 管 DOM、frame.evaluate 管上下文）；消息早于 listener 会被静默丢弃；origin 正 / 负向必测；结构化克隆边界
- Martin Fowler 测试金字塔：高层只测低层测不到的部分
- dev.to Rewardly 事故复盘：292 个 Node 单测全绿 vs 7 个用户可见 bug——多上下文 / 真实运行时问题只有真实环境 E2E 能发现
- Contentsquare Engineering：CRX + `--headless=new` + `externally_connectable` 自触发，覆盖 73.7%
- Bitwarden BIT（本仓库 `site-manifest.json` 援引的先例）：**断言填充结果**——真实站点层不得弱于其援引先例

---

## 7 变更纪律

1. 本文件是**测试约定的单一来源**；票 05 / 06 / 07 的实现不得与之冲突。
2. **只升不降**：清单与阶梯只增不减；不得为迁就实现而删 / 弱化判据（等同回退覆盖，WORKFLOW §4.5.2）。
3. 任何判据变更须**先有实测 / 语料依据**，并在 `research/window-reports/` 留痕，锚定 commit sha。
4. 新增能力 → 追加为第 18 项起（编号续排），不得插队重排既有编号。
5. `__cchLastFill` 保持**诊断项**身份，不得回流验收面。
