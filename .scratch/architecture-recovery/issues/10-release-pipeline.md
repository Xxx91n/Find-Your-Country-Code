# 10 — 发布链路与版本策略适配

**What to build:** 模块化后的发布收口：确认 release.yml 从构建产物（而非 src 单文件）提取 @version 并发布；版本号策略与变更日志（greasyfork/Glog*.md）流程适配；GreasyFork/JsDelivr 下载链接有效性验证；发布一次 beta 验证全链路（需用户确认后执行）。

**Blocked by:** 01, 09, 07

**Status:** ready-for-agent

- [ ] release.yml 适配构建产物路径，tag/版本提取逻辑验证通过（dry-run 或 fork 验证）
- [ ] Glog/GREADME 更新流程写入贡献说明
- [ ] 下载链接（GreasyFork + JsDelivr）指向产物的验证方法文档化
- [ ] beta 发布为人工确认动作：本票只准备就绪，实际发布前须用户点头（WORKFLOW 边界：高风险外发动作不擅自执行）
