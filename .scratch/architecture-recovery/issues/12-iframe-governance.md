# 12 — iframe 帧治理与平台元数据收尾

**What to build:** 脚本在子帧内同样检测区号字段(跨帧表单覆盖);面板仅顶层渲染、子帧不重复注入;收藏与站点规则跨帧读同一份存储;元数据显式声明帧策略并补齐菜单命令权限。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 元数据显式声明全帧启用,GM_registerMenuCommand 列入 grant
- [ ] 顶层/子帧分工: 每帧各自检测与填充;面板 UI 仅顶层渲染;子帧内不注入面板宿主
- [ ] 跨帧存储一致性: 收藏与站点规则在所有帧读同一份 GM 存储,变更经既有同步通道传播
- [ ] 新增 iframe fixture(同源与跨域各一),E2E 验证子帧字段检出与填充,证据走 CI
- [ ] 顶层无回归: 既有 E2E 全量在 CI 全绿
