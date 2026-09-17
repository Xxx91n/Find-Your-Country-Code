# Cycle-6 W5 首脑复核（票 08 · 10 · 11）— 2026-09-17

> 复核人：大脑 Agent | 方法：**不信自述** —— 逐条回仓库实物验证（门实跑 / 守卫脚本 / 分支落位 / rg 代码抽查 / CI 实物查询）+ **派子代理并行取证**，关键点由我二次抽查确证

## 一、结论摘要

| 票 | 实现 | 判定 | 返工 |
|---|---|---|---|
| **10**（A-034，P0） | 门 **34/0** · 真实站点层 `live-codepen-pen-fullpage` **CI 上 L0–L4 全绿**（修复前 L3!/L4!） | ✅ **复核通过** | **不需要** |
| **08**（A-031 · A-032） | 门 **35/0** · 回归矩阵 12 道门逐项吻合 · 语料/夹具实物齐 | ✅ 实现属实（**3 处报告表述偏差**，非源码） | **不需要** |
| **11**（A-035，P1） | 门 **62/0** · 判据变更**合规**（有据 / 未放宽 / 非消红） | ✅ 实现属实（**2 处未呈报影响面**，非源码） | **不需要** |

**无源码层面返工**。另：票 10 §6.2 挖出的**门保真度缺口**（BC 替身别名旁路致 `verify-05` 的 S4 绿为假绿 + `RULES_MAX_OVERRIDES` 强制点未定）属**源码层面新问题** ⇒ 已登记 **A-036** 并立 **票 12**。

## 二、「声明 → 证据 → 结论」对照表（逐票）

### 票 10（P0）

| 声明 | 我的实物证据 | 结论 |
|---|---|---|
| 实施提交 `16485782` = 9 文件 / +516 −9 | `git show --stat` **逐字命中**（9 files, 516 insertions, 9 deletions） | ✅ |
| `SELF_ORIGIN` 全仓唯一定义，四处操作数改用它 | `src/config.ts:120` 定义；`src/main.ts:122/139` · `src/store/index.ts:70/103` 共 **4 处** | ✅ |
| `location.origin` 无比较操作数残留 | `grep -rn` 仅命中 `config.ts` 注释 + **回退分支** `try { return location.origin; } catch { return 'null'; }` | ✅ |
| 回退分支不放宽（仅宿主不支持 `window.origin` 时退回既有语义） | 读定义体：`window.origin` 为非空字符串即用，否则回退 ⇒ 不引入新行为 | ✅ |
| 票级门 34 断言 | 我实跑 `verify-ticket-10.mjs` → **34 PASS / 0 FAIL** | ✅ |
| 跨票改动 `verify-ticket-05.mjs`「断言面零改动」 | `git show 16485782 -- tests/scripts/verify-ticket-05.mjs` → **仅替身 1 行**（`fn({ data: msg, origin: DOC_ORIGIN })`）+ 注释；无断言改动 | ✅ |
| 回归：`verify-05` 100/100 · `05-harness` 59/0 · `37` 21/0 · `42` 42/0 · `39` 27/1 | 我逐道实跑，**逐项吻合** | ✅ |
| CI 5 run 全 success @ `62f2292a` | `gh run list` 按 sha 过滤 → **6 run 全 success**（含真实站点层 35154465918）；报告的 5 个 run id 逐一命中 | ✅ |
| **验收项 4：真实站点层 L3/L4 转绿** | `gh run view 35154465918 --log` → **`[pass] live-codepen-pen-fullpage expect=injected errs=0 L0+ L1+ L2+ L3+ L4+`**；反向对照票 07 的 35120058687 同目标为 `L3! L4!` | ✅ **核心达成** |
| 同轮 `live-codepen-editor` 红（如实登记，归因 flaky） | 日志：`[fail] … 未找到嵌套帧（匹配 "cdpn.io"）` —— 失败在**帧发现阶段**（L0–L4 全红），与本票改动无因果 | ✅ 登记属实 |
| E2E `143 passed` | `gh run view 35154458773 --log` → **143 passed (50.7s)** | ✅ |

### 票 08（A-031 · A-032）

| 声明 | 我的/子代理的实物证据 | 结论 |
|---|---|---|
| 实施提交 `41ad7dcd` | `git show --stat` → **13 files, +736 / −10**；报告未声明文件数与行数 ⇒ 无逐字比对对象 | ✅（口径未声明） |
| 票级门 35 断言 | 我实跑 `verify-ticket-08.mjs` → **35 PASS / 0 FAIL**，exit 0 | ✅ |
| 回归矩阵 12 道门 | 逐道实跑：02 `36/36`+G10 `5/5` · 02-settings `33` · 03 `58` · 05 `100/100` · 05-harness `59` · 06 `209` · 07 `63` · 09 `36/36` · 13 `28` · 37 `21` · 42 `42` · 39 `27/1`(G4e) —— **逐项吻合** | ✅ |
| 三形态先入语料 | manifest **56 例**含 `N31-iti-searchbox` / `N31-iso2-lang-select` / `P31-noparen-dial-select` / `P31-paren-dial-control`；自算 16/16 `sha256` 与文件内容一致 | ✅ |
| 两子形态各建 fixture | 命中 `vrs-a-native`+`aria-hidden`+`clip-path` 与 `vrs-b-native`+`display:none` —— **同一文件内两子形态** | ⚠️ A-032 字面要求「各建至少一个 fixture」，实为一份文件两元素 |
| 改 `src/**` 无后门 | `git show 41ad7dcd -- src/`：仅 `textDial` 三条护栏 + `ariaHidden && tag !== 'SELECT'` 例外 + `_hiddenByStyle` 的 SELECT+aria-hidden `return true`（**scoped**）；无无条件放行 | ✅ |
| 不删弱既有断言 | 未触碰任何既有 `verify-*.mjs` / spec；manifest 仅 3 行改写 = N7 的 `note`/`el`（原文存入 `supersededAssumption`） | ✅（但 §7「零删零改」**字面不成立**） |
| CI run 表 | 按 sha 过滤：`41ad7dcd`→4 run、`70126c9c`/`fca837a2`→各 5 run，ID 与结论逐条相符；抽验 3 个 headBranch/conclusion 一致 | ✅ |

### 票 11（A-035，P1）

| 声明 | 我的/子代理的实物证据 | 结论 |
|---|---|---|
| 实施提交 `0f195075` = 11 文件 / +975 −20 | `git show --stat` **逐字命中**（11 files, 975 insertions, 20 deletions） | ✅ |
| 票级门 62 断言 | 我实跑 `verify-ticket-11.mjs` → **62 PASS / 0 FAIL** | ✅ |
| 普通字段判据逐字保留 | 读 diff：原 `host-value`/`field-events` 判据**整段移入 `else`（field）分支，predicate 逐字未改** | ✅ |
| ITI 判据 fail-closed | ITI 分支 `itiMatch` 空值返回 `false` | ✅ |
| **判据变更合规（最关键裁定点）** | 钉版库源码 `node_modules/intl-tel-input/build/js/intlTelInput.js` **全文仅 1 处 `dispatchEvent`**（`:788`，只发自定义事件）⇒ 旧「原生 input/change 各 ≥1」对 ITI 目标**确定性不可满足**（假红，非时序红）⇒ 收敛有据、非消红；且若动机是消红，`live-codepen-pen-fullpage` 会被一并转绿，而它在新判据下**仍红且归因他票** | ✅ **合规** |
| ITI 官方语义依据 | 现场取官方 docs：`getSelectedCountry`（原 `getSelectedCountryData`）/ `setNumber`（update the selected country accordingly）/ `setSelectedCountry`（input value reformatted…）⇒ **支持「不承诺写 value」**；「仅值以 + 开头才替换」由钉版源码 `_updateDialCode` 实证 | ✅ |
| 回归 | 实跑：05-harness 59/0 · 05 100/100 · 06 209/0 · 07 63/0 · 10 34/0 · 37 21/0 · 42 42/0 · 39 27/1（G4e 5 条全为票 06 语料，零票 11 命中）；新 spec `iti-l3-criterion.spec.ts` → **3 passed** | ✅ |

## 三、账本维度（A-031 / A-032 / A-034 / A-035 逐条）

| A-ID | 需求 | 实现证据 | 判定 |
|---|---|---|---|
| **A-031** | 三形态先入语料再评估；iti v29 搜索框至少登记为负例 | manifest 56 例含 N31×2 + P31×2；引擎侧只加护栏（无后门） | ✅ |
| **A-032** | 两子形态**各建 fixture** + 据实修正语料 N7 机理假设 | 两子形态**同文件两元素**（⚠️ 字面偏差）；N7 假设已修正且原文存 `supersededAssumption` | ✅（1 处字面偏差） |
| **A-034** | 修 origin 比对；不得放宽；不得删校验替代；票 12 拒绝语义不回归 | `SELF_ORIGIN` 四处 + 回退不放宽；门 G3a–G3e 锁「拒绝语句与来源锚点逐字保留」+ G3f 锁「不得出现 `e.origin` 与 `null` 比较类放行」；票 12 fixture 与新增「非嵌入来源仍被拒」用例实跑通过 | ✅ **达成**（P0 已闭环：真实站点 L3/L4 转绿） |
| **A-035** | 判定先行（不得改判据消红）；不得放宽「写后读回」；不得删断言；依据留痕；影响面清单 | 判定先行 ✅（新判据下 fullpage 仍红=A-034）· 未放宽 ✅ · 未删断言 ✅（field 逐字；ITI 2→3，旧读数入明细）· 依据留痕 ✅ · 影响面 **有 2 处缺口**（见 §五） | ✅（2 处影响面缺口） |

**缺失 / 弱化 / 跑偏清单**：① A-032 的「各建 fixture」字面未满足（同文件两元素）；② A-035 的影响面清单缺 `verify-ticket-07` G2e/G2f 对 ITI 目标的运行时覆盖缩减；③ 票 11 未披露 `iti-country-event` 的 `|| preAlready` 旁路。**均非实现缺陷**（无放宽、无删断言、无消红），属**呈报完整性**问题。

## 四、过程违规（单独呈报，**不替你追认**）

| # | 事项 | 实物证据 | 待裁定 |
|---|---|---|---|
| **P-19（新）** | 票 11 报告 §8 声明「本票**不产生远端写** / CI 待补」——**与实物不符**：远端存在 `cch/11-iti-l3-criterion`（`8a27ad34`）且该 sha 上 **5 个 workflow 全 success**（含 Verify-11 `35126031083`） | `git ls-remote` + `gh run list` | 是否要求补正该表述 |
| **P-20（新）** | **本地 tip ≠ 远端 tip**（P-13 类复现）：`cch/08` local `d0430821` vs remote `747763fd`；`cch/11` local `f9d60760` vs remote `8a27ad34`。票 11 的 amend 自纠**未传播到远端**（远端 `2c6e0af0` 的 fixture 仍带 `cdpn.io`，G4e 会多 1 命中） | `git rev-parse` vs `git ls-remote` | 是否授权推送同步 |
| **P-21（新）** | 跨票改动（均已自曝）：票 08 改 `tests/scripts/14-lib-engine.mjs`（E-9）；票 11 改 `tests/live/live-smoke.mjs` + `tests/live/site-manifest.json`（票 07 交付物，但 issue 明文授权收敛）+ `WORKFLOW.md` 1 行 | 各票 diff | 是否追认 |
| **P-22** | 票 08 E-4 自曝：非快进推送改写 6 个祖先远端 ref；票 10 E-10 逐次取得授权后改用**单 ref `git push`**（非 `but push`，因 `but push` 会连带强推 7 支祖先），并给出「每次推送前后 `git ls-remote` 全量快照 diff 仅一行变动」的隔离证据 | 报告 §7 + `git ls-remote` | 是否追认 |
| **正面** | 票 10 **自曝并修复两处竞态**（§4.1 CI-only 红归因①自身改动、§6.3 读侧竞态）；**挖出门保真度缺口**（§6.1 BC 替身缺 `origin` ⇒ 守卫从未被行使；§6.2 别名旁路致 S4 假绿）并给出**决定性 A/B 对照实验**；票 11 用**钉版库源码**证伪旧判据（1 处 `dispatchEvent`）——三项均属本周期最高质量的取证 | 报告 §4.1/§6 | — |

## 五、两处未呈报影响面（已核，非缺陷）

1. **`iti-country-event` 的 `|| preAlready` 旁路**（`live-smoke.mjs:291/297/307/309`）：代码内有注释（「写入前已为目标国家，库按官方语义不广播（状态判定为主判据）」），**报告披露表未登记**。机制本身合理（状态未变则不应期待事件），但需在报告写明触发条件与不可伪造性论证。
2. **`verify-ticket-07.mjs` G2e/G2f 对 ITI 目标的运行时覆盖缩减**：两条是**文本存在性断言**（我实测仍匹配、仍通过），故**门未损坏**；但判据分支化后，ITI 目标不再走 `host-value`/`field-events` 路径 —— 属判据变更的**应有影响面**，需登记。

## 六、完成定义对照

| 票 | issue 勾销 + 各附 sha | 报告落位 | 版本控制 | 结论 |
|---|---|---|---|---|
| 10 | ✅ 六条逐条锚实施提交与 CI run | ✅ | ✅（唯一例外：经授权单 ref push，已声明 §8.2.4） | ✅ |
| 08 | ✅ | ✅ | ✅ | ✅（表述偏差见 §二） |
| 11 | ✅ | ✅ | ⚠️ 报告称「无远端写」与实物不符（P-19） | ⚠️ |

## 七、返工判定

**三票均无源码层面返工。** 所有偏差集中在**呈报完整性**（票 08 三处、票 11 两处 + P-19）与**本地/远端同步**（P-20）。
**唯一源码层面新问题**来自票 10 §6.2 的附带发现（门保真度缺口）⇒ 已立 **票 12 / A-036**。

## 八、frontier（重算）+ 下一波

| 项 | 状态 |
|---|---|
| **W5 = 票 08 · 10 · 11** | ✅ **全部复核通过**（无源码返工） |
| **新票 12（A-036）** | `RULES_MAX_OVERRIDES` 强制点未定 + BC 替身缺结构化克隆保真度（致 `verify-05` S4 绿为**假绿**）—— **可开工**（源码层面） |
| **W6 = 票 09**（Cycle-6 收口） | 被 08 阻塞（已解）⇒ 与票 12 并行可开工 |

**下一波可开工票号：`09`（W6，收口）· `12`（A-036，源码修复）。**
