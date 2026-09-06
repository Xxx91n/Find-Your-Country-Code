# 19 — 发版与发布链接恢复

**What to build:** 全部实施票合入后完成版本决策与发布: 版本三处一致、发布动作执行、Release 产物核验、README 与 GreasyFork 下载链接恢复并验证可达,周期总结落盘。

**Blocked by:** 12, 13, 14, 15, 16, 18

**Status:** ready-for-agent

- [x] 版本决策落地(package.json / vite.config / 变更日志三处一致),CI dry-run 验证通过
- [x] 发布动作完成(遵循 WORKFLOW §4.2),Release 产物存在且可下载
- [x] GreasyFork 同步状态核对,README 下载链接更新为可达目标
- [x] 链接验证(README + GreasyFork + Release)全部 200
- [x] 波次表勾销与本周期总结落盘
