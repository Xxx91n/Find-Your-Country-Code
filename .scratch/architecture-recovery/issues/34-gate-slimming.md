# 34 — 门禁减肥

**What to build:** 把公共 engine-gates（`verify-ticket-02.mjs` + `misdetect-repro-v2.mjs`）从 verify-13/16/18 三处复制调用抽成一个 workflow，票级 verify 只保留专属断言；给 e2e.yml 补 `push: main` 触发面。

**覆盖 A-xxx:** A-008, A-009

**Blocked by:** None — can start immediately.

**Status:** done（2026-09-12）

- [x] 公共 engine-gates 抽成一个 workflow；verify-13/16/18 只保留各自专属断言
  - 证据: commit a21964055d2c6000183c36e454e468f9bf006b62（cch/34-gate-slimming）新建 engine-gates.yml 统一跑 61 例公共门; 三票级 workflow 删 engine-gates job, 仅留专属（13: acceptance 46 例 + e2e; 16: e2e; 18: acceptance 41 例 + e2e）; 三处原内嵌 job 逐字一致已程序化比对。CI: Engine Gates run 34682819555（触发面生效, 失败面为 main 预存红非本票引入, 归因见窗口报告）
- [x] 票级回归覆盖不丢失（verify-13/16/18 专属断言仍跑）
  - 证据: 同 commit a21964055d2c6000183c36e454e468f9bf006b62; 静态断言核对: verify-13.yml 仍含 `node tests/scripts/verify-ticket-13.mjs`(46 例), verify-18.yml 仍含 `node tests/scripts/verify-ticket-18.mjs`(41 例), 三票 e2e job 均保留; 61 例公共断言移交 engine-gates.yml 统一跑（无丢失, 前后例数对照见窗口报告 §清点实证）
- [x] e2e.yml 触发面补 `push: main`（统一 = pull_request + push(main, cch/**)）
  - 证据: 同 commit a21964055d2c6000183c36e454e468f9bf006b62; e2e.yml push branches 现含 `- main` + `- 'cch/**'`（静态断言过）; CI: E2E run 34682819538 由本次 push 触发（触发面生效实证; 失败为 main 预存红 ERESOLVE, 归因见窗口报告）
- [x] PR 门控语义不变；脚本仍在 tests/scripts/
  - 证据: 同 commit a21964055d2c6000183c36e454e468f9bf006b62; verify-13.yml/verify-18.yml 保留 pull_request 触发, e2e.yml/engine-gates.yml 均含 pull_request; 全部脚本引用路径在 tests/scripts/ 下, 零 .scratch 引用（静态自检过）; release.yml/release-dry-run.yml 零改动（sha256 对照）
- [x] 证据锚 commit sha + CI run ID
  - 证据: commit a21964055d2c6000183c36e454e468f9bf006b62（远端, but push cch/34-gate-slimming）; CI run: Engine Gates 34682819555 / Typecheck 34682819586 / E2E 34682819538（均 2026-09-12T08:15:47Z 同 headSha 触发）; 三红均为 main 基线预存红（Engine Gates: main 上 verify-13 内嵌同红 34618604428, 注解引入链 cch-23 188f9c1; Typecheck: main@7dbc6fc run 34618705605 EUSAGE 逐字一致; E2E: main run 34618602633 同红）—— 归因链与预存红登记见窗口报告 §三红归因；终局旁证: docs-only 提交 dfc99be44d3d8ab4b1157070ad73797d583302ad 同触发同三红（run 34684553572 / 34684553495 / 34684553632），不含本票改动的提交爆同一失败面，预存红判定闭合；返工轮 R1（2026-09-12）: 同红三联修复 commit 050d442→785406e62d9e4cbcce22b93de98037e4320dda67 —— Engine Gates 34693483749/34693757833 + E2E 34693483698/34693757840 + Lockfile Regen 34693757830 全 success（同红对照 reverse 转绿 + 无新增 FAIL 面；Typecheck 34693757831 预期红待 lockfile artifact 入库，版面对齐已验证）；verify-31/30 既有门最近 run 仍 success；R1 全记录见窗口报告 §返工轮次 R1
- **R2（lockfile 入库落地）**: artifact lockfile-regen-34693757830 版经他窗比对（无未提交在途改动；kp 46 hunk = nnr npmmirror → npmjs.org 纯 registry 域差异，version 125/125 零差异，未吸收）后经 but 栈式分支 cch/34-lockfile-land（锚定 cch/29，GitButler 依赖门）commit srn 推送 da8caa4 → **Typecheck run 34695478812 success（转绿）**，R1 预期红兑现消除；E2E run 34695478778 红 = 安装阶段 ERESOLVE 预存共因 D-29c/联③（修复在 cch/34-gate-slimming run 34694435571 已绿），非新引入；三红三 run ID 全锚定: Engine Gates 34694435559 / E2E 34694435571 / Typecheck 34695478812

- **R2 后续轮**: 栈重排后 typecheck.yml 以 commit omu（8dfe25a）进 cch/27 栈 → Typecheck run 34698250826 success + Verify 27 run 34698250830 success；e2e.yml 联③ hunks 属 ga 分支 xys 所有权（GitButler 无未提交 hunk 进 et），cch/27 共享 E2E 红为票 27 D-27a 呈报共因（自有 verify-27.yml run 34697124610 三门绿取证），非票 34 验收出口；cch/34-lockfile-land 头已成 cch/27 祖先（票 27 代解 srn，version 125/125 零差异继承）；最终证据链: Engine Gates 34694435559 / Lockfile Regen 34693757830 / Typecheck 34695478812 + 34698250826 / E2E 34694435571 全绿锚定
