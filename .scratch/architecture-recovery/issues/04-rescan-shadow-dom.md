# 04 — 可重评估扫描 + Shadow DOM 穿透

**What to build:** 扫描机制升级：递归穿透 open shadowRoot（每个 shadow root 单独挂 MutationObserver）；元素判定从 WeakSet 终态改为属性指纹快照（指纹变化触发重评，双向纠正图标残留与漏挂）；SPA 路由 hook（pushState/replaceState/popstate）触发定向重扫。解决动态页面与 Shadow DOM 的漏检/误检。

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] 本地 fixture 中 open shadowRoot 内的区号字段被检出并可注入
- [ ] 模拟框架 DOM 复用（元素属性变更）后判定重评：误挂图标移除、漏挂图标补上
- [ ] History 路由切换触发重扫（fixture 验证三种路由 API）
- [ ] 重扫有防抖；1000 节点级 fixture 页面在防抖窗口内完成扫描（性能基线写入报告）
