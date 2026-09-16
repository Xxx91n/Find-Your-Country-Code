# 11: 判定 ITI 形态下 L3 的正确可观测判据

**What to build:** 判定 ITI 接管字段在 L3（写后读回）层的**正确可观测判据**，并据实收敛断言。票 07 的 L3 判据（读宿主 `input.value` == 区号）对 `select` / 普通 `input` 成立，但对 ITI 形态不成立——ITI 走官方 `setNumber` / `setSelectedCountry` API，按 ITI 语义切换国家/号码，**不承诺**把区号写进宿主 `input.value`；同帧 L4 toast 却是「已填入: 🇨🇳 +86」（`Fill.run` 自认成功），**L3 与 L4 结论相悖**。

**Blocked by:** 票 07（真实站点层与发布门）—— 开工前实测已满足（分支存在 + 报告落盘 + 六条已勾销 + 远端 tip `55977c21`）

**Status:** implemented（实施提交 `0f195075`，11 文件 +975 / −20；CI 证据见文末）

**覆盖 A-xxx:** A-035

- [x] 判定 ITI 形态下 L3 的可观测判据（候选：ITI 选中态 `iti__selected-country` / `data-country-code` / 号码输入框值 / 官方 `getNumber()` 回读），给出 ITI 官方语义或工业界依据
  - 依据：atomcode 深度调研（会话 `06894dec-689c-4b38-ab6c-5aaec12b3bb9`，15 条来源三引擎交叉，Confidence 高）→ `research/atomcode-11-iti-l3-criterion.md`；本地确定性复现见窗口报告 §1.2
  - **判定结果**：ITI 官方**不承诺**把区号写进 `input.value`（`separateDialCode` 模式下由 `.iti__selected-dial-code` 承载），且**从不**派发原生 `input`/`change`（两模式实测均 0）；官方承诺的读取途径是实例方法 `getSelectedCountry()`（v24 前 `getSelectedCountryData()`），事件面是 `countrychange`
  - → **正确判据 = 选中国家状态**（官方读 API → DOM 选中态 + 官方 `countrychange` 事件），不是 `input.value`
- [x] 依据判定结果收敛 `tests/live/live-smoke.mjs` 的 L3 判据，并写明影响面（哪些目标/形态受影响）
  - 证据：`node tests/scripts/verify-ticket-11.mjs` → `PASS G2 …`（形态判定 + ITI 三判据 + 官方事件）；`62 PASS, 0 FAIL`
  - 实现：L3 按**写入口形态**分派（宿主侧自动判定，不靠 manifest 声明）；ITI 分支三条决定性检查 `iti-selected-country` / `iti-dom-marker` / `iti-country-event`
  - 影响面清单：窗口报告 §2（8 条，含 2 条「未修改仅呈报」：`ACCEPTANCE-SURFACE.md` 文本、`iti-v29.html` 镜像页保真度）
- [x] 说明为何该收敛**不是**放宽 L3「写后读回」语义（给出对照证据：`mirror-control` 与普通 `input` 路径仍按原判据）
  - 论证（窗口报告 §1.4）：① 语义未变（仍是写入后读回宿主侧提交状态）；② 新判据**精度更强**（国家身份 `iso2` vs 区号数字子串；+1 无法区分 US/CA）；③ 旧判据在 ITI 形态下**不可满足**（原生 `change` 恒为 0）且**不健全**（本仓库自己的 DOM 兜底写 value 即可满足它）；④ 普通字段路径逐字未改
  - 对照证据 A：`node tests/live/live-smoke.mjs --target mirror-control` → `L0+ L1+ L2+ L3+ L4+`，`EXIT=0`（普通 `<select>` → `field` 分支 → 原判据全绿）
  - 对照证据 B：`npx playwright test tests/iti-l3-criterion.spec.ts` → 对照组用例 `普通 select 仍按原判据` 通过（密封层，PR 阻断）
  - 只升不降：`PASS G3 …`（旧判据逐字保留 / 阶梯仍 L0–L4 / observe 与跳过路径保留）；`verify-ticket-05-harness` 59/0、`verify-ticket-07` 63/0 均无回归
- [x] 真实站点层 `live-codepen-editor` 的 L3 结论有据（转绿或明确保留为红并说明）
  - **结论：转绿**。`node tests/live/live-smoke.mjs --target live-codepen-editor` → `[pass] … L0+ L1+ L2+ L3+ L4+`
  - 取证（reproduced）：`cdpn.io` 帧写入前 `iti__flag iti__in`（title `India (भारत): +91`）→ 写入后 **`iti__flag iti__cn`**（title **`China (中国): +86`**），`input.value` 保持 `""`、原生事件序列 `[]`、`countrychange` 已广播 ⇒ 票 07 报的 L3 红项是**假红**
  - 邻目标 `live-codepen-pen-fullpage` **仍红**且归因准确：`L3:iti-selected-country` 写入前后均为 `in/91` ⇒ ITI 选中国家未变 = **A-034 填充从未执行**（邻票 10，P0），非判据口径
- [x] 声明本票覆盖的 A-xxx：A-035
  - 证据：`node tests/scripts/verify-ticket-11.mjs` → `PASS G7 …`（共享层 / live 层 / manifest / spec / 本门 / workflow 六处声明）

## 本票 delta 自检

| delta | 实测 |
|---|---|
| 判定前不得以「改判据」方式消除红项 | ✅ 先判定后收敛；结论是「旧判据在 ITI 形态下不可满足」，非为转绿而放宽 |
| 不得放宽 L3「写后读回」语义；不得删除任何既有断言（只升不降） | ✅ 旧判据在普通字段路径逐字保留（`G3` 字面匹配钉住）；ITI 分支 2 → 3 条决定性检查（增） |
| 判据变更必须给出影响面清单 + 证明 `mirror-control` 与普通 `input`/`select` 仍按原判据 | ✅ 窗口报告 §2 + §4.1/§4.2 |
| ITI 官方语义依据须留痕，不得凭记忆合成 | ✅ `research/atomcode-11-iti-l3-criterion.md`（含来源 URL 清单 + 自报缺口 + 与本地实测的辩证差异） |
| 真实站点层保持 advisory（不进 `pull_request`）；发布门判据不变 | ✅ 未改 `real-site-smoke.yml` / `release.yml` / `release-gate.mjs` / ack 文件；`verify-ticket-07` 63/0 |

## 本地验证（按 §8.1.2 一律标注为本地自证，不构成闭环证据）

| 检查 | 结果 |
|---|---|
| `npm run build` / `npm run typecheck` | EXIT=0 / EXIT=0（0 错） |
| `node tests/scripts/verify-ticket-11.mjs` | **62 PASS, 0 FAIL** |
| `node tests/scripts/verify-ticket-05-harness.mjs` | **59 PASS, 0 FAIL**（无回归） |
| `node tests/scripts/verify-ticket-07.mjs` | **63 PASS, 0 FAIL**（无回归） |
| `npx playwright test tests/iti-l3-criterion.spec.ts` | **3 passed** |
| `npm run e2e` ×2 | 144/1（邻票用例抖动）→ **145 passed, 0 failed** |

## CI 证据

> **待补**：已向用户请求推送授权，**裁定为「暂不推送」**（2026-09-17）⇒ 本票不产生远端写；行为面 CI 证据留作待补，本票以「本地自证」状态交接。若后续获授权，回填 `Verify Ticket 11` / `E2E` / `Engine Gates` / `Typecheck` 的 run ID。

窗口报告：`research/window-reports/11-iti-l3-criterion-report.md`
