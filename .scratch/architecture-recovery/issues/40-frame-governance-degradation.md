# 40: 帧治理降级反馈

**What to build:** 嵌套帧下点图标不再静默失败。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-017

- [ ] 帧枚举递归穿透 shadowRoot 与孙帧
- [ ] 校验失败时用户可见 toast 降级提示（不再静默 return）
- [ ] 三层嵌套 fixture 下：点图标要么开面板，要么出现明确提示
- [ ] 新增密封 E2E 覆盖嵌套帧场景
