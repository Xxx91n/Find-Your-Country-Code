# 12: 规则上限强制点裁定 + BC 替身克隆保真度修复

**What to build:** 处置票 10 §6.1/§6.2 挖出的**门保真度缺口**（源码层面）：(a) 裁定 `RULES_MAX_OVERRIDES`（500）的**强制点**属**写路径**还是**读路径**并据此实现；(b) 补齐 `tests/scripts/verify-ticket-05.mjs` 的 BroadcastChannel 替身**结构化克隆保真度**，使 S4「上限生效」断言反映**真实保证**而非替身别名旁路。

**Blocked by:** 票 10（srcdoc origin 修复）

**Status:** implemented（本地验收全绿；**CI 证据未取得** —— 推送授权事项已移交大脑 Agent，见报告 §9.3/§9.4）

**覆盖 A-xxx:** A-036

- [x] 裁定「上限强制点」：**写路径**（`upsertOverride` 新增前 fail-closed 拒绝）
  - 依据：`docs/adr/0011-rule-override-cap-enforcement-point.md`（本仓既有语义 3 条 + atomcode 调研 15 来源 + 工程判据 2 条）；报告 §5
  - 只读验证：`grep -n "上限强制点" src/store/index.ts` → `// ── 上限强制点（票 12 [A-036] 裁定）──` · `//   RULES_MAX_OVERRIDES（config.ts，500）是文档级不变量，强制点在写路径：`
  - sha：`fe0a5df3`
- [x] 按裁定实现强制点：`upsertOverride` 新增前 `if (r.overrides.length >= RULES_MAX_OVERRIDES) return null;`（不落盘、不广播）；既有 id 的更新与删除不受限；`_normRulesDoc` 摄取截断保留为第二层
  - 只读验证：`grep -n "RULES_MAX_OVERRIDES" src/store/index.ts` → `:212`（摄取修复，保留）· `:268`（写路径强制点，新增）
  - sha：`fe0a5df3`
- [x] 补齐 BC 替身克隆保真度：`postMessage` 改为**每个接收方各得一份独立结构化克隆**（真实平台按值投递；发送方自身不接收）；同时 `origin` 改由 bundle 导出的 `SELF_ORIGIN` 唯一来源取得（同源定义，非第二套取值）
  - 只读验证：`grep -n "structuredClone\|DOC_ORIGIN = SELF_ORIGIN" tests/scripts/verify-ticket-05.mjs` → `const data = structuredClone(msg);` · `const DOC_ORIGIN = SELF_ORIGIN;`
  - sha：`fe0a5df3`
- [x] 复现证据入报告：改前 A/B（仅补 `origin` = 100/100；再补克隆 = 99/100 `got=513`；逐行差异 1）+ 改后自包含 2×2（`.scratch/.../scripts/12-ab-cap-fidelity.mjs`）—— 关键对照 B vs C 只差投递保真度：无写路径强制时克隆⇒红（got=513）、按引用⇒绿（假绿复现）
  - 报告：`research/window-reports/12-rules-limit-fidelity-report.md` §6
  - sha：`fe0a5df3`（脚本）· `1e5866d2`（报告）
- [x] 未保留假绿、未放宽未删除断言：`verify-ticket-05.mjs` 断言面**零改动**（仅替身与 bundle 装配顺序）；断言调用点数 `ok(42)+eq(58)=100` = 基线；门 G3a–G3e 逐字锁 + 点数下限
  - 只读验证：`node tests/scripts/verify-ticket-12.mjs` → `31 PASS, 0 FAIL`
  - sha：`fe0a5df3`
- [x] 不回归：`verify-05` = `100/100 pass | ALL GREEN`（exit 0）· `verify-05-harness` = 59 PASS/0 FAIL（exit 0）· 全量 E2E = **145 passed / 0 failed**（1.5m）· `tsc --noEmit` exit 0 · 21 道公共门逐项与改前基线吻合（`verify-39` G4e 为改前预存红）
  - 报告：§4；CI 证据见 §9
  - sha：`fe0a5df3`（本地自证）；**CI run：（未取得 —— 移交大脑 Agent，见报告 §9.3/§9.4）**
- [x] 声明本票覆盖的 A-xxx：**A-036**（门 G7a–G7d 锁：本门 / workflow / issue / ADR 四处声明）
  - sha：`fe0a5df3`

---

## 本票证据汇总（只读验证命令 + 输出摘要）

| 面 | 命令 | 输出摘要 |
|---|---|---|
| 写路径强制点 | `grep -n "RULES_MAX_OVERRIDES" src/store/index.ts` | `:212` 摄取修复 · `:268` 写路径强制点 |
| 替身保真度 | `grep -n "structuredClone" tests/scripts/verify-ticket-05.mjs` | `const data = structuredClone(msg);` |
| origin 同源 | `grep -n "DOC_ORIGIN" tests/scripts/verify-ticket-05.mjs` | `const DOC_ORIGIN = SELF_ORIGIN;` |
| 票级门 | `node tests/scripts/verify-ticket-12.mjs` | `31 PASS, 0 FAIL`（exit 0） |
| 05 单元门 | `node tests/scripts/verify-ticket-05.mjs` | `100/100 pass | ALL GREEN`（exit 0） |
| 05 harness | `node tests/scripts/verify-ticket-05-harness.mjs` | `59 PASS, 0 FAIL`（exit 0） |
| 2×2 对照 | `node .scratch/architecture-recovery/research/scripts/12-ab-cap-fidelity.mjs` | A 绿 / B 红 `got=513` / C 绿（假绿复现）/ D 绿 |
| 全量 E2E | `npm run e2e` | `145 passed`（1.5m），0 failed |

实施提交 sha：`fe0a5df3`（`fe0a5df3cf637c6b74557577ee84a2e2bb5d1141`）；文档提交 sha：`1e5866d2`（`1e5866d27f3ec08042285903beae84ec3bc49474`）；**CI run：（未取得 —— 推送授权事项移交大脑 Agent）**。

---

## 未决事项（移交大脑 Agent，2026-09-17）

**事项**：推送 `cch/12-rules-limit-fidelity` 至 `origin`（**新建单 ref**，不改写任何既有远端 ref；**提交数当场复跑** `but push --dry-run cch/12-rules-limit-fidelity` 为准）以取得 CI run 证据。

**缘由**：WORKFLOW §8.2 第 4 条（授权路径）要求「涉及**远端写**（push / 删除 ref / 改 tag）…一律**逐次取得用户授权**，并在报告中留授权记录」。已向用户呈报；用户裁定「**交给大脑 agent**」⇒ 本窗口**未执行任何远端写**（未 push、未开 PR）。

**移交内容（无需回读本窗口对话）**：见报告 §9.4 —— 含 `but push --dry-run` 实测原文、远端写性质与副作用披露（新建单 ref / 祖先链 P-20 类分歧 / 将触发的 5 个 workflow）、推送后回填清单。

**对本票状态的影响**：验收项 6「不回归」的**行为面（CI）部分在本事项完成前不成立**；本地自证（`verify-ticket-12` 31/0 · `verify-05` 100/100 · `verify-05-harness` 59/0 · E2E 145 passed / 0 failed · `tsc` exit 0 · 21 道公共门与改前基线逐项吻合）**不替代**行为面 CI 证据（WORKFLOW §8.2 第 2 条）。

**证据只认 CI run**：在 CI run 到位前，本票**不得**被收口勾销（WORKFLOW §3 S8 属大脑职责）。
