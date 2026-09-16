# 08: 阶段 B：失效驱动修复

**What to build:** 用票 01–07 跑出的失效清单驱动修复；本周期不预先修检测，而是先把新形态沉淀进语料。

**Blocked by:** 票 07（真实站点层与发布门）—— 实测已满足（票 07 状态 implemented，提交 `d5c6f415`）

**Status:** implemented（实施提交 `41ad7dcd`；CI 门追加 `70126c9c`；CI 证据见文末）

**覆盖 A-xxx:** A-031 · A-032

- [x] A-031：iti v29 内部搜索框 / ISO2 语言下拉 / 无括号区号文本三个形态先入语料再评估
  - 证据：`node tests/scripts/verify-ticket-08.mjs` → `PASS G1a`–`PASS G1i`；语料条目 `N31-iti-searchbox` / `N31-iso2-lang-select` / `P31-noparen-dial-select` / `P31-paren-dial-control`
  - 实测：形态① `0/none`（`gate:input-type:search`）与形态② `-70/none`（`exclude:latin`）**已由既有防线覆盖 ⇒ 零检测改动**；形态③ 票 08 前 `38/lowkey`（L3 无内容证据）→ 票 08 后 `70/auto`（新增 `opts:+NN-text`），与括号对照例**同档位**
- [x] A-032：视觉替换型隐藏 select 的两个子形态各建 fixture，并据实修正语料 N7 的机理假设
  - 证据：`tests/fixtures/visual-replacement-hidden-select.html`（子形态 A `width:1px+aria-hidden`（Select2 实测，非零尺寸）/ 子形态 B `display:none`（Chosen 实测））+ `tests/visual-replacement.spec.ts`（2 例）；`PASS G2a`–`PASS G2l`
  - N7 修正：`attrs.aria-hidden="true"` + `style.clip` + `rect.width=1`（非零尺寸），原文假设保留 `supersededAssumption` 供审计；新增 `N7b`（子形态 B）
  - 升塔硬序：修复前实跑 = `1 failed / 1 passed`（子形态 A 确定性红灯：召唤后 wrapper 数 = 0）；修复后 = `2 passed`
- [x] 阶段 B 跑出的其他失效逐条修复并回归到 owned 语料
  - 修复 1（视觉替换型隐藏承值 select 被 aria-hidden 硬闸门归零）：`score=0` → 既不注入也不登记 → 违反票 13 检查点一「仍可面板填充」。修后 `score` 保留、档位降 `none`、登记可达（`PASS G2j`/`PASS G2k`），E2E 召唤→填充转绿
  - 修复 2（L3 漏无括号区号文本）：新增 `opts:+NN-text`（`PASS G1f`）；三条护栏防重复计分/长号码误命中（`PASS G1h`/`PASS G1i`）
  - 回归：两修复均有语料条目锚定 + 密封 fixture/spec；全语料 56 例 `precision=1 recall=1`（`PASS G4a`）
  - 另：票 07 §5.4 呈报的 A-034 / A-035 由并行票 10 / 11 承接，不在本票 delta
- [x] 不得在无语料地基时直接改检测代码
  - 硬序自证：先落 fixture + 语料条目 → 确认确定性红灯 → 才改引擎（`PASS G1a`/`PASS G5c`）；时序与实跑输出见窗口报告 §4/§5
- [x] 声明本票覆盖的 A-xxx：A-031 · A-032
  - 证据：`PASS G5a`（issue 声明 A-031 · A-032）

## 门与回归（本地自证，行为面以 CI 为准）

- 本票门：`node tests/scripts/verify-ticket-08.mjs` → **`35 PASS, 0 FAIL`**
- 全部门（23）：**22 绿 / 1 红**；唯一红 = `verify-ticket-39` G4e（`cdpn.io` 跨票既有红，票 06 provenance 引入，锚票 07 报告 §4，**非本票引入**）
- 全量 E2E（合序栈）：`145 passed / 0 failed`（含本票 2 例；票 13 验收 2 仍绿）
- ADR-0009 G10 边界锁 `5/5`；`verify-ticket-02` `36/36`；`verify-ticket-13` `28 PASS`；typecheck 0 错

## CI 证据

| workflow | run ID | 结论 |
|---|---|---|
| Verify Ticket 08 (phase-B failure-driven fixes) | 35126203696 | success |
| Engine Gates | 35126203646 | success |
| Typecheck | 35126203523 | success |
| Lockfile Regen | 35126203500 | success |
| E2E | 35126203506 | failure（`1 failed / 144 passed`）——唯一红为 `tests/srcdoc-origin.spec.ts:64`（**票 10 / A-034** 跨帧用例，非本票）；归因证据见窗口报告 §8.1 |
| Verify-08 / Engine Gates / Typecheck / Lockfile（文档提交 `fca837a2`） | 35126630913 / 35126631004 / 35126630958 / 35126630900 | 全 success |
| E2E（文档提交 `fca837a2`） | 35126630880 | failure（同上，同测同断言；**CI 3/3 红**） |

窗口报告：`research/window-reports/08-phase-b-failure-fixes-report.md`
