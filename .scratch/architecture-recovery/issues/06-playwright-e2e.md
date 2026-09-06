# 06 — Playwright E2E 测试基建 + fixture 扩容

**What to build:** 引入 Playwright E2E：本地静态服务器承载 test/ 页面，addInitScript 注入构建产物；把现有 3 个手工测试页（场景 A–E）固化为自动断言（图标出现/面板开合/填充终态与事件/收藏持久化）；新增误报回归 fixture（research/misdetection-root-causes.md §2 的 5 类样本 + shadow DOM + 动态注入样本），断言"不插图标"。为 02/03/04/05 提供统一验收环境。

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] 一条命令跑起全部 E2E（本地 fixture 服务器 + 注入 + 断言），CI 可复用
- [ ] 场景 A–E 自动断言通过（以 01 迁移后行为为基准）
- [ ] 误报 5 类样本 + shadow DOM + 动态注入 fixture 就绪，误报用例默认红（待 02 转绿）
- [ ] 报告含运行命令、环境要求（node 版本/浏览器）、如何在无头环境复跑
