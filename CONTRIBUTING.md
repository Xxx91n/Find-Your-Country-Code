# 贡献与发布指南

## 开发流程

```bash
npm install        # 安装依赖
npm run dev        # 本地开发（vite-plugin-monkey 热载）
npm run build      # 构建产物 dist/find-your-country-code.user.js
npm run e2e        # 构建 + Playwright 端到端测试
```

源码在 `src/`（TypeScript 模块），油猴脚本头部元数据统一在 `vite.config.ts` 的 `userscript` 字段维护，不手写 `// ==UserScript==` 头。`package.json` 的 `version` 是版本**唯一真源**，`vite.config.ts` 在构建时读取它并注入产物 `// @version`，无需也不应手写字面量；一致性由 `verify-38` 闸门强制，不一致即红（票 38 / A-011）。

## 版本号与变更日志（发版必读）

一次发版 = 三个文件同步更新，缺一不可：

1. **版本号**：`package.json` 的 `version`（**唯一真源**）——`vite.config.ts` 构建时读取它并写入产物 `// @version`。bump 版本只改 `package.json` 这一处。
2. **`greasyfork/Glog.md`**：中文更新日志，写清本次版本的用户可感知变化（修复/优化/新特性）。发布时该文件的**最新一节**（首个 `## vX.Y.Z`）会成为 GitHub Release 说明的中文部分，也是 GreasyFork 站内更新说明的素材；**历史版本仍保留在文件中，但不进发行说明**（由 `release.yml` 的 changelog 步骤提取最新一节）。
3. **`greasyfork/Glog_EN.md`**：英文更新日志，内容与 Glog.md 逐条对应。

流程：改完代码 → bump 版本（只改 `package.json`）→ 更新 Glog 双语 → 自测（`npm run e2e`）→ 合入 `main`。

> GreasyFork 侧版本同步是一次性人工配置（站内 Sync from external URL 拉取 GitHub 产物），CI 不会也不能向 GF 写入。步骤与验收见 `docs/greasyfork-sync-setup.md`。

## 发布链路（自动化）

推送到 `main` 且命中发布路径（`src/**`、`vite.config.ts`、`package.json`、`package-lock.json`）时，`.github/workflows/release.yml` 自动执行：

1. `npm ci && npm run build` 构建产物；
2. 从产物 `dist/find-your-country-code.user.js` 提取 `// @version`；
3. 检查远端 tag `v<版本>` 是否已存在——已存在则跳过（幂等，防重复发布）；
4. 不存在则以 Glog 双语为 Release 说明创建 GitHub Release，产物 `.user.js` 作为附件上传。

**版本跳跃策略**：`v1.3.4` 之后的模块化重构 + 评分引擎是行为级换代，建议发 `v2.0.0`（语义化版本主位跳跃）；若希望对 GreasyFork 用户保持低调连续，也可发 `v1.4.0`。取舍见 `.scratch/architecture-recovery/research/window-reports/10-release-pipeline-report.md`，发布前需人工确认版本号与 Glog 内容（发版是面向用户的外发动作）。

**beta 验证发布**：正式发版前，可将版本 bump 为 `2.0.0-beta.1` 走一次完整链路验证，随后删除该 tag/Release 并回滚版本号。该动作必须经用户确认后执行。

## 下载链接验证方法

发版后核对两条链路（均可程序化验证，见 `.scratch/architecture-recovery/research/scripts/verify-ticket-10.mjs`）：

| 链接 | 位置 | 验证方法 | 预期 |
|---|---|---|---|
| GreasyFork 安装链 `https://update.greasyfork.org/scripts/573755/...user.js` | 产物头部 `@downloadURL`（vite.config.ts 维护） | `curl -sI <url>` | HTTP 200，`content-type` 含 `text/javascript`；版本由 GreasyFork 站内同步机制提供，与 GitHub tag 无关 |
| GitHub Release 附件 `https://github.com/Xxx91n/Find-Your-Country-Code/releases/download/v<ver>/find-your-country-code.user.js` | Release 页面 | 发版后 `curl -sIL <url>` | HTTP 302 → 200（跳转到 release-assets 对象存储） |
| JsDelivr CDN | 仅用于 `greasyfork/GREADME*.md` 里的截图（`cdn.jsdelivr.net/gh/...@refs/heads/main/greasyfork/*.png`），脚本本体不走 CDN（`dist/` 不入 git） | `curl -sI <png-url>` | HTTP 200（GitHub 仓库直读，与发版无关） |

注意：GreasyFork 的脚本更新由站内抓取提交的源码/上传的文件驱动，GitHub Release 只是镜像分发渠道；两者版本号保持一致即可。

## 边界

- v1.3.4 冻结行为基准原为 `src/Find-Your-Country-Code.js`（票 22 已删除该文件），需要对照旧行为时走 git 历史：`git show v1.3.4:src/Find-Your-Country-Code.js`。
- 发布动作（tag、Release、GreasyFork 站内更新）面向真实用户，属外发动作：CI 自动化部分按上述 workflow 执行，beta/正式版本的最终发布需维护者确认。
