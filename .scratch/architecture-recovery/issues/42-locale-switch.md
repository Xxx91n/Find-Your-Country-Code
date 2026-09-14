# 42: 语言切换收口

**What to build:** 语言不再由 navigator.language 单方面决定；模块无死导出。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-019

- [ ] 面板提供语言选择且经 GM 持久化（沿用 UI_PREFS_KEY 独立键模式）；或按裁决清理 LANG 死导出
- [ ] 中/英文案键与 t() 契约不破坏
- [ ] 新增断言覆盖语言选择持久化（或死导出已清除）
