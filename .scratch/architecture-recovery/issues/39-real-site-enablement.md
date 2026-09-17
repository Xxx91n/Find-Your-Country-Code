# 39: 真实站点层启用

**What to build:** 让真实站点层从“启用数 0”变成“至少 1 个真实目标持续绿”。

**Blocked by:** 票 40（CodePen 嵌套 preview 断言依赖帧递归修复）— ✅ 已解除（`cch/40-frame-governance-degradation` 实现 + 报告已提交）

**Status:** done（commit `bb0e8f1d`；run 34837633569 / 34838605363）

**覆盖 A-xxx:** A-016

- [x] site-manifest.json 中至少 1 个 live 目标 `enabled:true` 且 selector/reason/ticket 齐备 — `live-codepen-editor`（selector `#mobile_code` / reason 含核对日期 2026-09-14 / ticket 39）；另 `live-codepen-pen-fullpage`
- [x] CodePen 编辑器页被收编为 live 目标，含嵌套 preview iframe 断言 — `frame:"cdpn.io"`，断言在 preview 子帧内求值（`#mobile_code` 挂 `.cch-wrapper`）
- [x] 冒烟只断言存在性（`.cch-wrapper` 出现 + 无未捕获异常） — `expect=injected` 要求 `wrappers>0` 且 `pageErrors===0`；不登录不深交互
- [x] 连续两次 workflow_dispatch 绿（附 run ID） — run 34837633569 ✅ / 34838605363 ✅（均 `白名单契约 + harness 自证: PASS`）
- [x] 真实站点层仍为 advisory（不进 pull_request 触发面） — `on:` 仅 schedule + workflow_dispatch；smoke 步 `continue-on-error: true`（verify-ticket-39 G4b/G4c/G5a 锁定）

**delta 落实：** 跳过条目强制非空 reason + ticket（2 个外部候选保留 `enabled:false` + 实测 reason）；live host 不出现在密封 spec/fixture/corpus/helper/config（verify-ticket-39 G4e/G4f）；编辑器页本地被 Cloudflare 挑战时如实报「反爬挑战未化解」不伪造绿。

**报告：** `research/window-reports/39-real-site-enablement-report.md`
