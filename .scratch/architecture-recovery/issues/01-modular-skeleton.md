# 01 — 模块化工程骨架迁移

**What to build:** 把脚本从单文件 IIFE 迁入模块化 TypeScript 工程（vite-plugin-monkey 心智：构建产物仍是单个 .user.js），模块边界 detect / fill / ui / store / data / rules；用户可见行为与 v1.3.4 完全一致（纯架构迁移，不改任何行为）。这是后续所有票的模块地基。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] 构建产物为单个 .user.js，头部元数据（name/version/@match/@grant/@run-at）与 v1.3.4 一致
- [ ] 本地静态测试页（test/ 三页）场景 A–E 行为与 v1.3.4 一致（图标、面板、收藏、填充）
- [ ] 发布链路影响评估完成：release.yml 的产物路径与版本提取是否需要适配，结论写入本票报告
- [ ] 模块职责清晰：每个模块目录只含本模块职责，跨模块只经入口接口，不引用他模块内部符号
