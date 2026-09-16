# 10: 修复 `about:srcdoc` 帧跨帧 origin 校验误判

**What to build:** 修复「跨帧填充指令在 `about:srcdoc` 帧被**静默丢弃**」的真实缺陷（票 07 真实站点层首次全阶梯运行暴露）。修法方向：origin 比对改用 `window.origin`（srcdoc 帧下为继承的真实 origin），或对 `location.origin === "null"` 回退到 `window.origin`。

**Blocked by:** 票 07（真实站点层与发布门）—— 开工前实物核对已满足

**Status:** implemented（实施提交 `16485782`；文档 `e652e6be`/`7ff21863`；竞态修复 `d4011dbf`/`62f2292a`；终态文档 `7f9044e7`；远端 tip `7f9044e7`；CI 证据见文末）

**覆盖 A-xxx:** A-034（P0）

- [x] 修复 `src/main.ts:134`：`if (isTopFrameSameOrigin() && e.origin !== location.origin) return;` 在 srcdoc 帧判真并丢弃顶层 `FRAME_FILL_MSG`
  - 证据：`grep -n "SELF_ORIGIN" src/main.ts` → `139: if (isTopFrameSameOrigin() && e.origin !== SELF_ORIGIN) return;`（`16485782`）
  - 行为（同目标同阶梯）：`npx playwright test tests/srcdoc-origin.spec.ts --retries=0` → 修复前 **`1 failed / 4 passed`**（`L3 value 期望 "+86" / 实得 ""`，连跑 3 次逐次同因）→ 修复后 **`5 passed`**
- [x] 同面排查并修复 `src/main.ts:120` 与 `src/store/index.ts:67` / `:97`（BroadcastChannel 同源校验）
  - 证据：`node tests/scripts/verify-ticket-10.mjs` → `PASS G2d`（main:120）/ `G2e`（main:134）/ `G2f`（store 命中数 = 2）/ `G2g`（全 src 无以 `location.origin` 作比较操作数的残留）
  - 同面实测：探针在 srcdoc 帧内录到 BroadcastChannel 入站 `e.origin = "http://127.0.0.1:4273"`，而该帧 `location.origin = "null"` ⇒ 旧判据必误拦；修复后操作数取 `window.origin`（= 同一值）
- [x] 复现证据入报告：修复前后 srcdoc 帧 `location.origin` vs `window.origin` 的实测对照（探针脚本）
  - 证据：`node .scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs` → 修复前 `locationOrigin: "null" / windowOrigin: "http://127.0.0.1:4273"`、`fill.hostValue: ""`、`fieldEvents: []`、`feedback.present: false`、`lastFill: null`、`pageErrors: 0`；修复后同探针 `hostValue: "+86"`、`fieldEvents: ["input","change"]`、`feedback.present: true`、`lastFill.asserted: true`
  - 报告：`research/window-reports/10-srcdoc-origin-fix-report.md` §2 验收项 3（对照表）
- [x] 真实站点层 `live-codepen-pen-fullpage` 的 L3/L4 转绿（以 CI run 证据为准）
  - 证据（CI，advisory）：`real-site-smoke.yml` run **35154465918** @ `62f2292a` → `[pass] live-codepen-pen-fullpage expect=injected errs=0 L0+ L1+ L2+ L3+ L4+`（声明阶梯 L0/L1/L2/L3/L4 全部通过）
  - 反向对照（修复前）：票 07 CI run 35120058687 同目标 `L0+ L1+ L2+ L3! L4!` —— 同目标同阶梯的红→绿对照成立
  - 过程：首轮 run 35153907646 仍红，经归因为**读侧竞态**（非填充未落地；本地同目标全阶梯全通过）后以 `62f2292a` 修复读侧（判据逐字不变，不可能伪造绿）
- [x] 密封 E2E 135 例、`verify-37`、`verify-42`、`verify-39` 均不回归
  - E2E（CI）：run **35154458773** @ `62f2292a` → **`143 passed / 0 failed`**（135 既有 + 5 新增 + 并行票 11 3 例；门 G4a 静态锁住既有 spec 零删减）
  - E2E（本地自证）：`npx playwright test --retries=0` → `140 passed / 0 failed`
  - `verify-37`：`21 PASS, 0 FAIL`；`verify-42`：`42 PASS, 0 FAIL`
  - `verify-39`：`27 PASS, 1 FAIL` —— **既有非本票红**（`G4e` 命中 5 处全在 `tests/corpus/forms/**`，票 06 语料 provenance 引入；票 07 报告 §4 与 W4 复核已归因留痕；本票 diff 不含 `tests/corpus/**` 与 `site-manifest.json`）
- [x] 声明本票覆盖的 A-xxx：A-034
  - 证据：`PASS G7a`（fixture）/ `G7b`（密封 spec）/ `G7c`（探针）/ `G7d`（结构门 + issue）四处声明全部在位

## delta 检查点

| delta | 实测 |
|---|---|
| 不得放宽跨帧来源校验；不得以删除校验替代修复 | ✅ 四处拒绝语句 + 来源锚点 + 票 40 降级 toast 逐字保留（门 G3a–G3e）；无「`e.origin` 与 `null` 比较」类放行写法（G3f） |
| 票 12 跨域顶层 fixture 拒绝语义不回归 | ✅ fixture 与既有用例在位（G5a/G5b）；新增「非嵌入来源仍被拒绝」用例并实跑通过（G5c） |
| 修法优先 `window.origin`；回退分支须同时覆盖 store:67/:97 | ✅ `window.origin` 优先 + 回退分支；**四处**统一取用同一常量（非仅修 main） |
| 复现证据须含修复前红 + 修复后绿（同目标同阶梯） | ✅ 修复前 3/3 确定性红灯 → 修复后绿（§2 验收项 3） |
| 真实站点层保持 advisory；发布门判据不变 | ✅ 门 G6a/G6a2/G6b；本票新增 workflow 也不把真实站点拉进 PR 面 |

## CI 证据

锚点：代码锚 **`62f2292a`**（CI 证据所在 sha）；终态文档 tip **`7f9044e7`**（分支 `cch/10-srcdoc-origin-fix`）

| workflow | run ID | 结论 |
|---|---|---|
| Verify Ticket 10 | 35154458779 | success |
| E2E | 35154458773 | success（`143 passed`） |
| Engine Gates | 35154458960 | success |
| Typecheck | 35154458814 | success |
| Lockfile Regen | 35154458842 | success |
| Real-site smoke（advisory，第二轮） | **35154465918** | job success；`live-codepen-pen-fullpage` **L0–L4 全通过**；`live-codepen-editor` 同轮 flaky 红（帧发现阶段，已如实登记） |

推送授权：WORKFLOW §8.2.4 逐次授权（用户裁定「仅新建 cch/10，最小足迹」）；每次推送前后 `git ls-remote` 全量 diff 均仅 `cch/10` 一行变动（详见窗口报告 §7 E-10）。

窗口报告：`research/window-reports/10-srcdoc-origin-fix-report.md`
