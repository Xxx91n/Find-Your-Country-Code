# 36: 门禁完整性返修

**What to build:** 让十个票级门全部可执行、并在 CI 上真实拦红；把票级复刻的 E2E 步骤并回统一 E2E；顺带清文档/元数据债。

**Blocked by:** None（可立即开工）

**Status:** implemented

**覆盖 A-xxx:** A-014, A-015, A-020

- [x] 四个门（09/13/15/18）本地 `node tests/scripts/verify-ticket-NN.mjs` 全部 exit 0，且断言数不下降 — 干净室 36/28/28/35 全绿、check() 位点 16/29/29/36 不变（15636203）
- [x] `verify-13/15/18.yml` 的 node 版本升至 22（或与其它门一致），三门在 PR 触发下真实可跑 — 20→22 已钉、pull_request 原样保留、dispatch 实跑绿（15636203，CI run 34827692875 / 34827698027 / 34827703297）
- [x] `verify-13.mjs` 的语料规模断言改为从 corpus 动态读取，新增用例不再导致红 — `m.cases >= 41` 保底动态计数（15636203）
- [x] 10/10 票级门在 CI 上各有一次 success run（附 run ID） — 02:34827616449 05:34827728178 09+15:34827698027 13:34827692875 18:34827703297 27:34827709868 28:34827716763 29:34827722907 31:34827733219
- [x] 票级私有 E2E 步骤并回 `e2e.yml`，单次运行覆盖原票级断言 — verify-13/15/16/18/27/29/30 私有作业全删（verify-16 整文件收口），e2e.yml 全量套件 push run 34827616463 success（15636203）
- [x] `typecheck.yml` 注释与实际命令一致；`package-lock.json` 根 version 与 package.json 一致且 `npm ci` 可复现 — 由并行窗口 cch/43 提交 lxs 实作（npm ci + lockfile 1.5.0），本票分支栈于其上方故树内已满足；typecheck run 34827616474 实跑 `npm ci` success
