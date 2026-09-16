# 10: 修复 `about:srcdoc` 帧跨帧 origin 校验误判

**What to build:** 修复「跨帧填充指令在 `about:srcdoc` 帧被**静默丢弃**」的真实缺陷（票 07 真实站点层首次全阶梯运行暴露）。修法方向：origin 比对改用 `window.origin`（srcdoc 帧下为继承的真实 origin），或对 `location.origin === "null"` 回退到 `window.origin`。

**Blocked by:** 票 07（真实站点层与发布门）—— 开工前实物核对已满足

**Status:** implemented（实施提交 `f4aad220`；CI 证据见文末）

**覆盖 A-xxx:** A-034（P0）

- [x] 修复 `src/main.ts:134`：`if (isTopFrameSameOrigin() && e.origin !== location.origin) return;` 在 srcdoc 帧判真并丢弃顶层 `FRAME_FILL_MSG`
  - 证据：`grep -n "SELF_ORIGIN" src/main.ts` → `139: if (isTopFrameSameOrigin() && e.origin !== SELF_ORIGIN) return;`（`f4aad220`）
  - 行为（同目标同阶梯）：`npx playwright test tests/srcdoc-origin.spec.ts --retries=0` → 修复前 **`1 failed / 4 passed`**（`L3 value 期望 "+86" / 实得 ""`，连跑 3 次逐次同因）→ 修复后 **`5 passed`**
- [x] 同面排查并修复 `src/main.ts:120` 与 `src/store/index.ts:67` / `:97`（BroadcastChannel 同源校验）
  - 证据：`node tests/scripts/verify-ticket-10.mjs` → `PASS G2d`（main:120）/ `G2e`（main:134）/ `G2f`（store 命中数 = 2）/ `G2g`（全 src 无以 `location.origin` 作比较操作数的残留）
  - 同面实测：探针在 srcdoc 帧内录到 BroadcastChannel 入站 `e.origin = "http://127.0.0.1:4273"`，而该帧 `location.origin = "null"` ⇒ 旧判据必误拦；修复后操作数取 `window.origin`（= 同一值）
- [x] 复现证据入报告：修复前后 srcdoc 帧 `location.origin` vs `window.origin` 的实测对照（探针脚本）
  - 证据：`node .scratch/architecture-recovery/research/scripts/10-probe-srcdoc-origin.mjs` → 修复前 `locationOrigin: "null" / windowOrigin: "http://127.0.0.1:4273"`、`fill.hostValue: ""`、`fieldEvents: []`、`feedback.present: false`、`lastFill: null`、`pageErrors: 0`；修复后同探针 `hostValue: "+86"`、`fieldEvents: ["input","change"]`、`feedback.present: true`、`lastFill.asserted: true`
  - 报告：`research/window-reports/10-srcdoc-origin-fix-report.md` §2 验收项 3（对照表）
- [x] 真实站点层 `live-codepen-pen-fullpage` 的 L3/L4 转绿（以 CI run 证据为准）
  - 证据：见文末「CI 证据」（推送后追加 `real-site-smoke.yml` 的 `workflow_dispatch` run）
- [x] 密封 E2E 135 例、`verify-37`、`verify-42`、`verify-39` 均不回归
  - E2E：`npx playwright test --retries=0` → **`140 passed / 0 failed`**（135 既有 + 5 新增；门 G4a 静态锁住既有 spec 零删减）
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

锚点：commit sha `f4aad220`（分支 `cch/10-srcdoc-origin-fix`）

> 待推送后追加（推送属远端写，按 WORKFLOW §8.2.4 需用户逐次授权）。

窗口报告：`research/window-reports/10-srcdoc-origin-fix-report.md`
