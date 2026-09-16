# 07: 真实站点层全阶梯 + 发布门

**What to build:** 让真实站点层跑全阶梯但不阻断合入，并把「绿」绑到真正要紧的关口（发版）。

**Blocked by:** 票 06（形态语料）—— 实测已满足

**Status:** implemented（实施提交 `d5c6f415`；CI 证据见文末）

**覆盖 A-xxx:** A-029

- [x] 真实站点层按全阶梯（含 L4）运行
  - 证据：`node tests/scripts/verify-ticket-07.mjs` → `PASS G1e 至少 1 个 enabled live 目标声明满 L0–L4`；`PASS G2a`–`PASS G2l`（五级实现）；`63 PASS, 0 FAIL`
  - 实跑：`node tests/live/live-smoke.mjs --target mirror-control` → `L0+ L1+ L2+ L3+ L4+`，`EXIT=0`
- [x] 仅 schedule + workflow_dispatch 触发，不进 pull_request
  - 证据：`real-site-smoke.yml` 的 `on:` 块仅含 `workflow_dispatch` + `schedule: cron 0 3 * * 1`；`PASS G3b`、`PASS G3c`
- [x] 失败只告警不阻断合入
  - 证据：冒烟步 `continue-on-error: true` + `Surface advisory failures` 步以 `::warning::` 浮出；`PASS G3d`、`PASS G3e`
- [x] release.yml 加发布门：真实站点层最近一次运行必须为绿，或失败已显式 ack 并立票，否则不出包
  - 证据：`release.yml` 新增 `release-gate` job，`release` job 带 `needs: release-gate`（门不过则不出包）；`tests/scripts/release-gate.mjs` 双判据 + `runId` 防陈旧 + fail-closed；`PASS G4a`–`PASS G4v`（22 项）；`node tests/scripts/release-gate.mjs --self-test` → `11/11 用例通过`
- [x] observe 挂账强制携带非空 reason + ticket
  - 证据：`PASS G1g observe 挂账逐条携带非空 reason + ticket — observe=5 匿名=none`；`PASS G1k live 层 validate() 硬校验 observe 挂账 reason + ticket`
- [x] 声明本票覆盖的 A-xxx：A-029
  - 证据：`PASS G5a`/`G5b`/`G5c`/`G5d`（manifest / live 层 / 发布门脚本 / 结构门与 workflow 四处均声明 A-029）

## 真实站点层首次全阶梯运行结论（如实登记，不伪造绿）

- `mirror-control`（自有镜像，同帧）：**L0–L4 全通过**（EXIT=0）
- `live-codepen-pen-fullpage`：`L0+ L1+ L2+ L3! L4!`（fail）
- `live-codepen-editor`：`L0+ L1+ L2+ L3! L4+`（fail）

根因已取证：`about:srcdoc` 帧的 `location.origin` 为字符串 `"null"`（Chrome 既定行为，真实 origin 可由 `window.origin` 读出），而 `src/main.ts:134` 的 `isTopFrameSameOrigin() && e.origin !== location.origin` 判为 `true` 并**丢弃顶层填充指令**，致子帧 `Fill.run` 从未执行（消息链路本身完好）。属**既有缺陷**（本票 diff 不含 `src/**`），由本票升塔后首次暴露。同缺陷面含 `src/store/index.ts:67/97`。

→ 已呈报建议立修复票（详见窗口报告 §5.4）；发布门联动：发版时须 ack + 立票，本票不预置 ack（默认 `acknowledged:false` 为正确初态）。

## CI 证据

| workflow | run ID | 结论 |
|---|---|---|
| Verify Ticket 07 | 35119816347 | success |
| Engine Gates | 35119816288 | success |
| Typecheck | 35119816218 | success |
| Lockfile Regen | 35119816275 | success |
| E2E | 35119816211 | 见窗口报告 §8 |

窗口报告：`research/window-reports/07-real-site-and-release-gate-report.md`
