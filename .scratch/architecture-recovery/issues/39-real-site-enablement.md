# 39: 真实站点层启用

**What to build:** 让真实站点层从“启用数 0”变成“至少 1 个真实目标持续绿”。

**Blocked by:** 票 40（CodePen 嵌套 preview 断言依赖帧递归修复）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-016

- [ ] site-manifest.json 中至少 1 个 live 目标 `enabled:true` 且 selector/reason/ticket 齐备
- [ ] CodePen 编辑器页被收编为 live 目标，含嵌套 preview iframe 断言
- [ ] 冒烟只断言存在性（`.cch-wrapper` 出现 + 无未捕获异常）
- [ ] 连续两次 workflow_dispatch 绿（附 run ID）
- [ ] 真实站点层仍为 advisory（不进 pull_request 触发面）
