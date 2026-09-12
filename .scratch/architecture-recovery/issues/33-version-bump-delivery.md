# 33 — 版本 bump 交付闭环

**What to build:** 三处版本号一致 bump（package.json / vite.config.ts / Glog + Glog_EN changelog 头条），dry-run CI 先行，使本周期安全/功能修复经 Tampermonkey `@version` 更新检查达用户。

**覆盖 A-xxx:** A-007

**Blocked by:** 27, 28, 29, 30, 31, 32 — 全部功能/测试票完成后才 bump（否则用户收到的是半成品）。

**Status:** done（待复核；发版动作待用户确认）

- [x] 版本号三处一致 bump（package.json / vite.config.ts / Glog + Glog_EN changelog 头条） — 目标 1.5.0（大脑给定）；commit `06fd225`；dry-run run `34705359110` 日志 `artifact=1.5.0 vite.config.ts=1.5.0 package.json=1.5.0`
- [x] dry-run CI 先行验证三处一致 + tag 状态（发布前） — run `34705359110` @ `e308765` **success**；`Tag v1.5.0 does not exist - a push-to-main run WOULD create release v1.5.0`（红→绿两次迭代，红灯均归因预存安装面，见报告 §4）
- [x] 发行动作须用户确认后执行 — 本窗口合规未执行：零 tag / 零 GitHub Release / 零 GreasyFork 同步；`git ls-remote --tags` 实证远端仅 v1.3.4 / v1.4.0。待用户确认后由大脑执行
- [x] 证据锚 commit sha + CI run ID — 版本 bump `06fd225`；安装口径修复 `e701f3a` / `e308765`；dry-run 绿 run `34705359110`