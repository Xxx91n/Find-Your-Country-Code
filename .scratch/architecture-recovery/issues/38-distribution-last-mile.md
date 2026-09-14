# 38: 分发最后一公里

**What to build:** 让任何渠道安装的用户都能收到新版本。

**Blocked by:** 票 36（版本闸门需门禁可执行）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-011

- [ ] GF 侧开启 Sync from external URL 指向 GitHub raw 产物（人工一次性设置，须用户执行/确认）
- [ ] CI 新增版本一致性闸门：tag = package.json = 产物 `version`，不一致即红（附 CI run）
- [ ] `README.md` / `README_EN.md` 安装链接改为 `releases/latest`（或随版本同步）
- [ ] 给出“GF 上线版本对齐”的只读校验方式（可人工/CI 校验）
