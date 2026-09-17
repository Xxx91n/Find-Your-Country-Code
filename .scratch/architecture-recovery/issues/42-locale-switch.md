# 42: 语言切换收口

**What to build:** 语言不再由 navigator.language 单方面决定；模块无死导出。

**Blocked by:** None（可立即开工）

**Status:** done（窗口报告 research/window-reports/42-locale-switch-report.md）

**覆盖 A-xxx:** A-019

- [x] 面板提供语言选择且经 GM 持久化（沿用 UI_PREFS_KEY 独立键模式）；或按裁决清理 LANG 死导出 — 走功能实现：面板 auto⇄中文⇄English 写入 `cch_ui_prefs_v1`；`LANG` 死导出随之消失（86df9b14144bca508b55fca5c9d3534266f89f16，CI run 34826590699 / 34826590603）
- [x] 中/英文案键与 t() 契约不破坏 — zh/en 键集一致、`t()` 回落键名契约保留、既有文案未改（86df9b14144bca508b55fca5c9d3534266f89f16，CI run 34826590628）
- [x] 新增断言覆盖语言选择持久化（或死导出已清除） — verify-ticket-42.mjs 42 断言 + E2E 4 例（86df9b14144bca508b55fca5c9d3534266f89f16，CI run 34826590699 / 34826590603）
