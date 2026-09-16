# Cycle-6 第 2 波首脑复核报告（票 05 harness 交互原语）

> 复核人：大脑 Agent | 2026-09-16 | 方法：**不信报告自述，逐条回仓库实物验证**（子代理只读验证 + 主 Agent 实跑 live runtime / 门 / 全量 E2E + 分支落位 + 跨票影响取证）

## §1 分支落位

| 项 | 实物 | 结论 |
|----|------|------|
| cch/05-harness-primitives | tip = **bd7bf6c2**；3 提交（refactor + 2 docs） | ✅ 落位 |
| 栈位 | **堆叠于 cch/01 之上**（← 票 01） | ✅ **属合法堆叠**（符合 issue 声明的 Blocked by，与 W1 的 P-3 不同） |
| 远端 | 不在远端 | ⚠️ 无 CI 证据（P-2） |

## §2 声明 → 证据 → 结论对照表

| 声明 | 实物证据 | 结论 |
|------|---------|------|
| 单一共享原语层 `tests/helpers/primitives.mjs`（309 行 / **43 导出** / 零 expect / 零 playwright-test / 零 sleep） | `wc -l` = **309**；`grep -cE '^export '` = **43**；`expect` 命中仅在注释与变量名（`expectPanelClose`）；`waitForTimeout(` = **0**；仅 import `node:fs/path/url` | ✅ 属实 |
| 两 harness **零转换加载同一文件** | 密封层 `userscript.ts:14,16` `import … from './primitives.mjs'` + `export *`；live 层 `live-smoke.mjs:32-35` import 同一文件（无包装转换） | ✅ 属实 |
| live-smoke **删除**内联第二套 GM 替身与 PROBE | `GM_registerMenuCommand` = **0**、`new Array` = **0**、`const GM_STUB` = **0**；`PROBE` 仅存注释（`:18,31`） | ✅ 属实 |
| `userscript.ts` 薄门面 + **4 导出名不变** + 19 spec | `:16` `export *` + 6 adapter（`:22-58`）；4 名均在 43 导出内；基线 `36455b7b` 同为 4 名；导入该 helper 的 spec = **19** | ✅ 属实 |
| GM 替身 `{id,title,fn}` 可调用 + **id 原地更新** + `invokeMenuCommand` | `primitives.mjs:82-92`；同 id 路径 `:85-86` `const hit=window.__cchMenu.find((c)=>c.id===id); if(hit){hit.title=title;hit.fn=fn;return 0;}`（提前 return，**不**执行 `:92` 计数赋值）；`invokeMenuCommand :292-302` 真实执行 `cmd.fn()`；`:296`+`:298` 拒因 | ✅ 属实 |
| 断言改 web-first + `expect.soft`：`expect.soft` 0→36；门面裸 `expect(`=0；**spec `waitForTimeout(`=0、直写选择器=0** | 全仓 `expect.soft(` = **36**（门面 7 + spec 29）、基线 = **0**；门面裸 `expect(` = **0**；**但全仓 spec `waitForTimeout(` = 5**（`pseudo-select:60`、`rescan:79,82,86,90`）、**直写选择器 = 90**（均为**非本票** spec） | ❌ **REFUTED（全仓口径）**；本票 spec 口径下为 0（门 `verify-ticket-05-harness.mjs:46` 只查本票 spec）→ **口径未标注，非数字造假** |
| `rxx` = 8 files / 872+/83− / 零 src | `git show --stat f27458ce` 实测完全一致，8 文件全在 `.github/` 与 `tests/`，**零 src** | ✅ 属实 |
| issue 5 项勾销 | `- [x]` = **5**，`- [ ]` = **0** | ✅ 属实 |
| **live runtime 自证**（报告称本票最强证据） | 我实跑 `CCH_LIVE_HEADLESS=1 node tests/live/live-smoke.mjs --target mirror-control` → `deep 6/6 通过`、`白名单契约 + harness 自证: PASS`、**exit 0**（无测试运行器的 runtime 里真实驱动 open→search→select→读回宿主 value） | ✅ 属实（主 Agent 独立复现） |
| **门实跑** | `node tests/scripts/verify-ticket-05-harness.mjs` → **59 PASS / 0 FAIL**，exit 0 | ✅ 属实 |
| **全量 E2E** | `npx playwright test` → **117 passed**（W1 为 110，新增本票 spec 用例），**无回归** | ✅ 属实 |

## §3 账本维度（A-029）

A-029 台账去向 = **T1 · T5 · T7**（见 `decision-ledger.md` §去向登记）。

| A-ID | 票 | 实现证据 | 判定 |
|------|----|---------|------|
| A-029 | 05（T5） | `primitives.mjs` 43 导出 + 两 harness 收敛为同一份 + GM 替身可调用 + live runtime 自证 | ⚠️ **部分（2/3）** — 定义层（T1 票 01）✅ + 原语层（T5 票 05）✅；**真实站点层全阶梯（T7 票 07）未开始** |
| A-030 | — | 本波未动（去向 T1 · T6） | ⏸ T6 在 W3 |

**缺失/弱化/跑偏单独列出**：A-029 **部分覆盖**（剩 T7）；无「弱化」、无「跑偏」。

## §4 过程违规（单独呈报，**不替你追认**）

| # | 违规 | 实物证据 | 待裁定 |
|----|------|---------|--------|
| **P-2（重复）** | 远端仍零 `cch/*` → 票 05 亦无 CI 证据 | `git ls-remote --heads origin 'refs/heads/cch/*'` → 空 | 票 05 为 **harness 重构**（行为面改动），按 WORKFLOW §8.1 属合规缺口。是否授权 push？ |
| **P-6（新）** | 报告 §4.1 称分支 tip 为 `f27458ce` | 实测 `refs/heads/cch/05-harness-primitives` = **bd7bf6c2**（`f27458ce` 是 refactor 提交，其后还有 2 个 docs 提交） | 锚点失真，补正 |
| **P-7（新）** | `f27458ce` 提交信息称「57 断言」，而现门输出 **59** | 提交信息为 amend 前陈旧值 | 提交信息与门不同步，补正 |
| **P-8（新）** | 报告 §1 第 4 条：首句明写「**全仓** `expect.soft`」，后续子句「spec `waitForTimeout(` 0 处、直写选择器 0 处」**未标注口径**；读者会顺读为全仓 | 全仓实测：`waitForTimeout(` = **5**、直写选择器 = **90**（均非本票 spec）；本票 spec 口径下为 0 | **口径未标注**（非数字造假），措辞需收窄为「本票 spec」 |

**P-1 未复现（重要）**：票 05 的三个提交**只碰自己的工件**（`git show --name-only` 三个提交合并后 grep 其他票工件 → **(none)**）——**未修改任何其他票**。与票 03 的跨票改动形成对照，说明边界可守。

**未发现**：编码损坏 / 闸门或 live 自证造假（两者均由主 Agent 独立复现）/ 全量 E2E 回归。

## §5 返工判定

**无源码层面问题需返工。** 8 项声明中 **7 项属实**；claim 6 为**口径未标注**（本票口径成立，全仓口径不成立），属报告措辞而非实现缺陷；live runtime 自证与门均独立复现；全量 E2E **117 passed** 无回归。

→ **不重发修复版启动器**；待处置项为 P-2（需 push 授权）与 P-6/P-7/P-8（记账/措辞补正）。

## §6 下一波开工指引

- **W3 = 票 06 形态语料三层架构（A-030）** ← 票 05（已复核通过）→ **可开工**
- 启动器：`prompts/06-form-corpus.md`
- 后置链：07 ← 06、08 ← 07、09 ← 01–08。
