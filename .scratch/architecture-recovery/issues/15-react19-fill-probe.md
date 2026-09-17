# 15 — React 19 填充能力探测兜底

**What to build:** 填充层增加能力探测(实例级 value setter 补丁 + valueTracker 存在性),React 19 场景下走兜底强制 diff,保证受控组件填充后提交值真实同步。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 能力探测实现: 探测结果决定走标准路径或兜底路径,探测失败安全降级为现有路径
- [ ] 兜底路径: 强制 diff + 既有 input/change/blur 事件序列;textarea/select 各自原型路径不受影响
- [ ] React 19 hermetic fixture 的 E2E: 填充后组件状态与提交值正确
- [ ] React 16–18 既有 fixture 无回归
- [ ] 全部证据走 CI(CI-only 政策)
