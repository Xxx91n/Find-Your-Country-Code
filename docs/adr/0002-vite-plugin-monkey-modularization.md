# 0002 — 工程迁入 vite-plugin-monkey 模块化，产物保持单 userscript

状态：accepted | 日期：2026-09-04 | 来源：架构恢复 C2（report/architecture-review.md）

## 决策

源码迁入 TypeScript + vite-plugin-monkey，模块化为 `src/{main,detect,fill,iti-adapter,ui,store,rules,data}`；构建产物仍为单个 `dist/find-your-country-code.user.js`，GreasyFork 发布与手动安装链路不变。userscript 头部元数据由 vite.config.ts 维护。

## 被否决路线与理由

- **维持单文件 IIFE**（v1.3.4 现状）：无导出、无测试缝，检测/填充逻辑不可单测；多窗口并行修复每次都碰同一个 42KB 文件，必然冲突。
- **多产物拆分（core + locales 等分文件发布）**：破坏 GreasyFork 单脚本发布与 `@updateURL` 更新链，用户安装面复杂化。
- **手写构建脚本（esbuild/rollup 裸配）**：GM_* grant 注入、@meta 头生成等 userscript 专用处理需自行维护，vite-plugin-monkey 已收敛该职责。

## 后果

模块边界即票据边界，多窗口并行分支互不冲突；`src/Find-Your-Country-Code.js` 冻结为 v1.3.4 行为基准（只读对照，不再演进）。发布 workflow（.github/workflows/release.yml）的触发路径/版本提取/附件路径仍指向旧单文件，需在发布票（cch-10）适配——模块化分支合入后该 workflow 存在静默失效风险（票 01 报告风险提示）。
