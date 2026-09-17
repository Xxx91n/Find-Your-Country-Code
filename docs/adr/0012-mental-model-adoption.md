# 0012 — 心智模型采纳项落地：退出协议实现 / 规则语义登记 / 本地反哺闭环评估

状态：accepted | 日期：2026-09-17 | 来源：Cycle-7 票 15（D-016）

## 背景

Cycle-7 行业对标调研（`.scratch/cycle7-grill/research/q4-coverage-expansion-benchmark.md`，12 条来源）把「远程规则地图层／远程规则订阅／云黑名单」「`data-*` 退出协议尊重」「现场 ML 字段分类」「本地反哺闭环」等心智模型项列为候选扩张方向。用户裁定按 **D-016 五路分流**逐项处置：**采纳**项登记、**纳入**项实现、**可评估**项只评估、**驳回**项维持 ADR-0003 否决、**不做**项保持 ADR-0001 的 Out of Scope。

本 ADR 记录该分流的逐项裁定、实物证据与可评估结论。五路中只有 ② 改代码；①③④⑤ 均不改代码。

## 决策

| 分流 | 内容 | 本票动作 | 状态 |
|---|---|---|---|
| ① 采纳 | 规则失败**不回退**启发式 / 隐藏字段**不填** / 可见性与可聚焦性过滤的**例外** —— 与本仓既有语义一致 | **登记**（§依据①），不改代码 | 采纳（已存在，落文锁存） |
| ② 纳入 | `data-*` 退出协议尊重（`data-1p-ignore` / `data-form-type="other"`）—— 低成本、无网络面 | **实现**（`src/detect/index.ts`，见 §依据②） | 已落地 |
| ③ 可评估 | 成功填充即登记的**本地**反哺闭环 | **只做可行性评估**（§本地反哺闭环可行性评估），不实现 | 可行但本期不做 |
| ④ 驳回 | **远程**规则地图层 / 远程规则订阅 / 云黑名单 | **维持 ADR-0003 否决**，绝不实现 | 驳回 |
| ⑤ 不做 | 现场 ML 字段分类 | 不做（ADR-0001 已列 Out of Scope） | 不做 |

分流口径不变量：**本仓 `src/` 必须保持零网络面**。本 ADR 的任何条目都不得引入远端拉取（ADR-0003 被否决路线 + ADR-0008 第一层密封 E2E「零外网」）。

## 依据

### ① 登记：三项与本仓既有语义的逐条实物对应

**（1）规则失败不回退启发式**

- `src/rules/index.ts:31-34` `_safeMatches` 头注：「非法选择器静默不命中，不抛错污染检测主路径」—— 规则**失败 = 不命中**，而不是「命中并压制引擎」；控制流继续走评分瀑布。
- `src/detect/index.ts:873-874` `try { forced = Rules.forcedTier(el); } catch {}` / `try { pageTier = Rules.pageTierOverride(); } catch {}` —— 规则查询异常被吞掉，不阻断评分。
- `src/detect/index.ts:16` 文件头：「Rules 引擎，见 ../rules；**Rules 缺省时行为=无规则**」—— 规则层缺席/失效时引擎语义不变（不存在「有规则但不可用」的中间态）。
- `src/store/index.ts:273` `if (r.overrides.length >= RULES_MAX_OVERRIDES) return null;`（ADR-0011 写路径 fail-closed）—— 规则**写**失败返回 `null` 且不落盘，检测路径不受污染。

**（2）隐藏字段不填**

- `src/detect/index.ts:9-11` 文件头：可见性闸门「只降注入档位为 none 并保留登记召唤」。
- `src/detect/index.ts:946-953` `_process` 可见性闸门：`res.tier` 降为 `none`，`score` 与 `signals` **原样保留** + `gate:visibility-hidden` 0 分留痕 —— 不改检测登记。
- `src/detect/index.ts:991-992` none 分支：撤图标（不注入=不填）+ `res.score >= ITI_LOW_REGISTER_SCORE` 时 `_register(...)` 进召唤面 —— 隐藏字段**不填但可被用户显式召唤**。
- 可见性判定本身 fail-open：`src/detect/index.ts:675-676`「无法测量（无 getComputedStyle/无布局信息的 mock 宿主）一律视为可见 —— 宁可漏闸不可误杀」。

**（3）可见性/可聚焦性过滤的例外**

- `src/detect/index.ts:400-411` aria-hidden 硬排除**对原生 SELECT 例外**（`tag !== 'SELECT' && role !== 'combobox'`），原文理由：「硬排除会把 score 归零 ⇒ 连登记召唤面都进不去 ⇒ 违反票 13 检查点一『闸门只改注入档位、不改检测登记』」。
- `src/detect/index.ts:915-916` + `:951` `summonedWrap`（`.cch-btn[data-cch-summon="1"]`）：用户显式召唤图标不被可见性闸门回拆。
- `src/detect/index.ts:728-737` 页面豁免（`Rules.isPageExcluded()`）在 `scan()` 入口即返回：**完全跳过**（不评分/不注入/不登记召唤）—— ② 的元素级退出协议与本条同族，只是作用面从整页收敛到单元素。

**登记口径**：上述三项不是新提议，而是本仓已在实现中成立的语义；本 ADR 的作用是把它们**从代码注释提升为可追溯的裁定**，使其成为后续轮次不得静默反悔的约束。

### ② 纳入：`data-*` 退出协议尊重（本票唯一代码改动）

**实现位置**

- 判定函数：`src/detect/index.ts:319-323` `isOptOutElement(el)`，两个判定：
  - `el.getAttribute('data-1p-ignore') !== null` —— **属性存在即命中**（任意值，含裸属性空串；1Password 官方退出协议）；
  - `el.getAttribute('data-form-type') === 'other'` —— 值**精确等于** `other`（Bitwarden 官方退出协议；同属性的其他值如 `password` 不构成退出）。
- 短路点：`src/detect/index.ts:394-396` —— 在「评分核心」`scoreElement` 的瀑布入口（早于 aria-hidden / INPUT 类型闸门 / L0–L4）直接返回 `{ score: 0, tier: 'none', signals: [{ layer: 'L0', name: 'gate:optout', pts: 0 }] }`。

**为何「不评分」就等于「不注入 + 不登记召唤」**

- 不评分：瀑布入口短路，零信号、零分（仅一条 0 分留痕，供诊断面归因）。
- 不注入：`tier = 'none'` ⇒ `_process` 的 none 分支（`src/detect/index.ts:991`）拆除已挂 wrapper；若从未挂过则永不注入。
- 不登记召唤：`score = 0 < ITI_LOW_REGISTER_SCORE`（`src/config.ts:62` = 25）⇒ `:992` 的 `_register` 不触发。
- 观测面与指纹面同步：`data-1p-ignore` / `data-form-type` 同时进 `OBSERVED_ATTRS`（`:280-282`）与 `_fingerprint`（`:851`）—— 兑现票 04 契约「指纹读什么，observer 就监听什么」：站点动态挂/摘退出属性时指纹翻转即触发重评，**退出与恢复都生效**。

**语义裁定（写入代码注释与语料 note）**

退出协议是站点/用户的**显式否决**，压过一切启发式 —— 与「既有 `data-1p-ignore` 页面豁免」同族心智（`src/detect/index.ts:728-729` 注释原文：「豁免域名 = 完全跳过检测（[AM 结论5] 1Password data-1p-ignore 心智：用户显式干预压过一切启发式，不评分/不注入/不登记召唤）」），只是作用面从**整页**收敛到**单元素**。

边界（已知取舍，非遗漏）：退出协议压的是**启发式**；用户**自己的站点规则**（`forcedTier` / `pageTierOverride`，`:873-874`）仍在评分之前生效 —— 这是 ADR-0003「用户显式干预 > 引擎启发」的直接推论。

**语料（append-only，零删除）**

| id | polarity | expect | 退出属性 |
|---|---|---|---|
| `mm2-neg-optout-1p-ignore` | negative | none | `data-1p-ignore`（裸属性，空串值） |
| `mm2-neg-optout-form-type` | negative | none | `data-form-type="other"` |
| `mm2-pos-optout-control` | positive | inject | 无（同形态对照） |

三例形态完全相同（`input` + `autocomplete="tel-country-code"` + `placeholder="+86"` + `anchorHasTel`），只差退出属性。对照例实测验为 `inject/auto score=156`，退出例实测 `none score=0` —— 证明 opt-out 是**元素级精确否决**，而非「整体失效」。

**断言面（不新增 workflow 文件，折叠进既有脚本）**

- `tests/scripts/verify-ticket-29.mjs` §10（10.1–10.9）：静态（两个判定、观测面/指纹面同步）+ 语料三例在位 + 行为（退出短路 none/0、对照不短路）。
- `tests/scripts/verify-ticket-28.mjs` 6.1/6.2（非 residual mismatch = 0、precision = 1.0）与 `tests/scripts/14-calibration-harness.mjs` 回归门禁逐例覆盖三例。

### ③ 可评估：本地反哺闭环（只评估，不实现）

详见下节「本地反哺闭环可行性评估」。

### ④ 驳回：远程规则地图层 / 远程规则订阅 / 云黑名单

**本仓 `src/` 零网络面（实测）**：2026-09-17 以 `grep -rF` 逐项统计 `src/`：「`GM_xmlhttpRequest`」0 命中、「`XMLHttpRequest`」0、「`fetch(`」0、「`navigator.sendBeacon`」0、「`new WebSocket`」0、「`new EventSource`」0；`dist/find-your-country-code.user.js` 同样 0。（注：宽泛正则匹配到 `src/main.ts` 的 DOM 类型名 `MessageEventSource`，属假阳性，非网络面。）

**ADR-0003 被否决路线原文**（未改）：「**远程规则订阅/云黑名单**：油猴脚本无服务端，且站点规则本质是个人化误报记忆，共享价值低、隐私面大。」

**ADR-0003 于 2026-09-17 的带日期追加（D-016）**：「重申本 ADR 的『远程规则订阅／云黑名单』**被否决路线仍然有效**。本轮行业对标调研……把『远程规则地图层』列为最高优先级建议，用户裁定**维持本 ADR 否决（选项 (a)）**。理由强化：本仓 `src/` 当前**零网络面**……引入远端拉取属**架构级新增面**，并触及 ADR-0008 第一层密封 E2E 的『零外网』供给边界。」

**ADR-0008 决策 1 原文**：「第一层 密封 E2E + 确定性模式库（corpus + calibration，PR 阻断，**零外网**）」。

⇒ 远程规则层为**架构级新增面**，同时破坏零网络面与密封 E2E 的供给边界：**驳回，绝不实现**。本票未新增任何网络 API 调用。

### ⑤ 不做：现场 ML 字段分类

ADR-0001 被否决路线原文：「**ML/AI 字段识别**：需模型或服务端，不符合单文件油猴约束（spec Out of Scope）」。单文件油猴约束未变 ⇒ 维持不做，无重评触发条件。

## 本地反哺闭环可行性评估（③）

**评估落在本 ADR 内（不另开 docs/ 短文档）** —— 理由：③ 的裁定与 ①②④⑤ 共用同一套「既有语义实物证据 + 风险清单 + 反证条件」，拆成两份文件会让同一分流的证据面分裂；且在本轮「不新增 workflow / 不新增 CONTEXT.md 术语」约束下，ADR 内联是信息密度最高、单一真相源的形态。

### 设计草案（成功填充 → 写本地站点规则 → 后续同站点免召唤/直挂）

1. **触发**：`src/fill/index.ts:367-385` 的 `run()` 返回 `FillResult`，仅 `res.status === 'filled'`（真实写入成功，非 `copied` 降级）时触发反哺。
2. **写规则**：复用 `src/rules/index.ts:105` `upsertOverride` → `src/store/index.ts:253`（写路径唯一收口，fail-closed）写入 `overrides[]`，`action.tier = 'auto'`（或 `'lowkey'`），`note = 'auto-feedback'`。
3. **后续同站点**：`scan()` → `_process` → `src/detect/index.ts:873` `Rules.forcedTier(el)` 命中该选择器 → 评分前按声明档注入（**免召唤**）；跨标签页由既有 BC + `GM_addValueChangeListener` 同步，**无需新增通道**。

### 与既有模块的衔接点

| 衔接点 | 位置 | 作用 |
|---|---|---|
| 写收口 | `src/store/index.ts:253` `upsertOverride` | 唯一写路径（ADR-0011 强制点） |
| 规则原语 | `src/rules/index.ts:105` `upsertOverride` / `:112-133` `rememberNone` | 已有**负向孪生**（面板负反馈 → `'none'` 规则，`src/ui/index.ts:612` 已接线）：正向反哺只需把 tier 从 `none` 换成 `auto` 并复用同一选择器生成逻辑 |
| 消费点 | `src/detect/index.ts:873` `Rules.forcedTier(el)` | 无需改检测引擎 |
| 触发源 | `src/fill/index.ts:367-385` `FillResult.status === 'filled'` | 成功填充的可观测信号（票 31 已落地） |

### 风险

1. **误报固化**：一次成功填充被固化为永久 `auto` 规则，与 ADR-0003「站点规则本质是个人化误报记忆」相反 —— 需要**显式化 + 可撤销**（面板可见、可删），否则静默放大误报。
2. **规则上限**：`RULES_MAX_OVERRIDES`（`src/config.ts:94` = 500）是文档级不变量；自动写入持续消耗上限，达上限后 `src/store/index.ts:273` fail-closed 返回 `null`（ADR-0011）⇒ 自动反哺**静默失效**。引入淘汰策略会与 ADR-0011「无自动淘汰」的既有取舍直接冲突，须新一轮裁定。
3. **ADR-0011 强制点**：写路径 fail-closed ⇒ 自动反哺必须处理 `null` 返回，不得假定写入成功（否则面板状态与实际文档分歧）。
4. **选择器退化**：`rememberNone` 的选择器生成在无 `id`/`name` 时退化为裸 `tag`（`src/rules/index.ts:120-128`）。负向方向退化的后果是「该 tag 全不注入」（可容忍）；**正向方向退化会命中全页同类元素 → 误报面放大**，风险量级不同。
5. **语义边界**：成功填充 ≠ 该字段是区号字段（用户可能点错 / 站点在无关键上接受写入）；需要最小证据门槛（例如 `score >= SCORE_LOWKEY` 或信号含强层）。

### 可评估结论

**可行，但本期不实现。** 可行性来自既有原语齐备：写收口（`upsertOverride`）、消费点（`forcedTier`）、同构先例（`rememberNone` 负向反哺已接线）、跨标签页同步（BC/GM 监听）四项均已存在，闭环无需新增模块、无需网络面。不实现的主因是风险 1/2/4 未解：误报固化的撤销面、上限淘汰与 ADR-0011 的取舍冲突、弱选择器在正向方向的误报放大。这三项属**产品/架构裁定**而非实现难度，故以反证条件登记，不强行落地。

## 反证条件

- **③**：面板若提供「本地反哺开关 + 一键撤销 + 弱选择器拒写」三项，且有一手用户数据支持误报不放大，可落地 ③。
- **③ / ADR-0011**：出现真实需求要求「上限满时自动淘汰最旧规则」并与 ADR-0011 重新对齐后，风险 2 解除。
- **④**：仅在引入服务端（架构级变更）并重开 ADR-0003 / ADR-0008 第一层密封边界后，方可重评远程规则层。
- **②**：若出现第三族主流退出协议形态，按同族心智扩展 `isOptOutElement` 并 append 语料（不得删除既有条目，ADR-0008 决策 4）。
- **②**：若实测出现「退出协议压不过启发式」的反例（退出例仍被注入），本 ADR 的短路点位置（评分瀑布入口）须重审。

## 后果

- 正：`data-*` 退出协议成为**元素级真实保证**而非文档承诺：命中即短路（不评分/不注入/不登记召唤），并由语料 + 静态 + 行为三重断言锁定（`verify-ticket-29` §10 / `verify-ticket-28` 6.1–6.2 / `14-calibration-harness`）。
- 正：①②④⑤ 的裁定获得可追溯的实物证据与原文引用（行号级），后续轮次不必重新考古；④ 的零网络面实测可复现。
- 正：零回退 —— calibration precision/recall 保持 1.0，`32-real-site-corpus` gate PASS，21 张票级门不新增红（基线唯一红 = 票 39 预存红）。
- 负/已知取舍：退出协议**压不过用户自己的站点规则**（`forcedTier`/`pageTier` 在评分前生效）—— ADR-0003 的直接推论，非遗漏。
- 负/残余：③ 不实现，成功填充后的免召唤体验仍依赖用户手动登记规则（`rememberNone` 负向原语已可用）。
- 负：`OBSERVED_ATTRS` 与 `_fingerprint` 各增 2 项 —— 站点频繁改写这两个属性时会多触发重扫（350ms 防抖吸收；该属性面即退出协议，改写频率天然低）。

## 参考

- 分流裁定：D-016（Cycle-7）
- 调研：`.scratch/cycle7-grill/research/q4-coverage-expansion-benchmark.md`
- 被维持的否决：`docs/adr/0003-site-rules-engine.md`（远程规则订阅/云黑名单 + 2026-09-17 D-016 带日期追加）
- 密封边界：`docs/adr/0008-real-site-testing-layers.md` 决策 1
- 单文件约束：`docs/adr/0001-scoring-engine-replaces-boolean-detection.md`
- 上限强制点：`docs/adr/0011-rule-override-cap-enforcement-point.md`
- 实现：`src/detect/index.ts`（`isOptOutElement` + `scoreElement` 短路 + `OBSERVED_ATTRS`/`_fingerprint` 同步）
- 语料：`tests/corpus/manifest.json`（`mm2-neg-optout-1p-ignore` / `mm2-neg-optout-form-type` / `mm2-pos-optout-control`）
- 断言：`tests/scripts/verify-ticket-29.mjs` §10；`tests/scripts/verify-ticket-28.mjs` 6.1/6.2；`tests/scripts/14-calibration-harness.mjs`
