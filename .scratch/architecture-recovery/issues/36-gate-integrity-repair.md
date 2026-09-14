# 36: 门禁完整性返修

**What to build:** 让十个票级门全部可执行、并在 CI 上真实拦红；把票级复刻的 E2E 步骤并回统一 E2E；顺带清文档/元数据债。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-014, A-015, A-020

- [ ] 四个门（09/13/15/18）本地 `node tests/scripts/verify-ticket-NN.mjs` 全部 exit 0，且断言数不下降
- [ ] `verify-13/15/18.yml` 的 node 版本升至 22（或与其它门一致），三门在 PR 触发下真实可跑
- [ ] `verify-13.mjs` 的语料规模断言改为从 corpus 动态读取，新增用例不再导致红
- [ ] 10/10 票级门在 CI 上各有一次 success run（附 run ID）
- [ ] 票级私有 E2E 步骤并回 `e2e.yml`，单次运行覆盖原票级断言
- [ ] `typecheck.yml` 注释与实际命令一致；`package-lock.json` 根 version 与 package.json 一致且 `npm ci` 可复现
