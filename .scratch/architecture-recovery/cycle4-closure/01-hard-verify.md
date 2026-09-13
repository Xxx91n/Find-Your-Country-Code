# Cycle-4 收口审计 — 01 硬验收重跑（审计 Agent，2026-09-13）

> 身份声明：本文件为审计 Agent **本地亲自重跑**的结果，不信报告自述。
> **政策偏离呈报**：本 goal（第 1/3 步）明确授权「亲自重跑硬验收：编译、打包、启动测活 + 终跑 verify-build」，构成为对 AGENTS.md「本机禁止构建/测试运行」CI-only 政策的**当场显式覆盖**；本地产物（dist/、playwright-report/）均为 gitignore 态，审计后留存不入库。

## 命令 + 输出摘要

| # | 验收 | 命令 | 结果 |
|---|------|------|------|
| 1 | 编译+打包 | `npm run build` | ✓ 10 modules，942ms，`dist/find-your-country-code.user.js` 121,726B |
| 2 | 产物头 | `head dist/*.user.js` | ✓ `@version 1.5.0` |
| 3 | 类型门禁 | `npm run typecheck` | ✓ tsc --noEmit 零输出（exit 0） |
| 4 | 启动测活 | `node tests/server.mjs` + curl | ✓ `/test/test-page.html`、`/fixtures/weak-signal.html`、`/fixtures/fill-feedback.html` 全 200（4273+4274 双口）；审计探针遗留进程已自清 |
| 5 | E2E 全量 | `npx playwright test` | ✓ **80 passed (50.2s)**（含票 27/30/31 新 spec、场景 A–E、跨帧） |
| 6 | 引擎门 | `node tests/scripts/verify-ticket-02.mjs` | ✓ 36/36 |
| 7 | 误检 harness | `misdetect-repro-v2.mjs` | ✓ F1–F8 不注入 YES |
| 8 | 票级门 | `verify-ticket-27 / -28 / -29 / -31 / -05.mjs` | ✓ 86/86、19/19、PASS、48/48、100/100 |
| 9 | 语料契约 | `32-real-site-corpus.mjs` | ✓ 契约+覆盖+复现基线 PASS |
| 10 | 校准 | `14-calibration-harness.mjs` | ✓ 回归门禁 PASS |

## 抽查关键声明（rg 实物）

- 票 27 R1 去重：`src/detect/index.ts:460-468`（`attrPhraseRedundant` + `dedup(opts-dial)` 0 分留痕）✓
- 票 28：`index.ts:438` parenDial 独立 + `:476` pseudo 同步 ✓
- 票 29：`:144-152` customDropdownStats + `:262` OBSERVED_ATTRS tabindex ✓
- 票 30：rules `:81,93` scope 过滤 ✓；三常量 `SCORE_AUTO=70/SCORE_LOWKEY=35/L1_ATTR_PHRASE_SCORE=8` ✓
- 票 34：`engine-gates.yml`（两脚本+node22+PR/push 触发面）、`e2e.yml:8` main ✓
- release：tag `v1.5.0`@019f228e、main 父链 `0604af71→a56f2da5→…`、GitHub Release 附件 user.js ✓

**结论：报告全部关键声明与仓库实物一致，零虚假。**
