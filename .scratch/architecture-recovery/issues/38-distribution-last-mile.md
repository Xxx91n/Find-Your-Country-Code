# 38: 分发最后一公里

**What to build:** 让任何渠道安装的用户都能收到新版本。

**Blocked by:** 票 36（版本闸门需门禁可执行）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-011

- [ ] GF 侧开启 Sync from external URL 指向 GitHub raw 产物（人工一次性设置，须用户执行/确认） —— **待用户执行**（外发动作，须确认）：步骤与验收见 `docs/greasyfork-sync-setup.md`（5fd6ef3d）
- [x] CI 新增版本一致性闸门：tag = package.json = 产物 `version`，不一致即红（附 CI run） —— `tests/scripts/38-version-consistency.mjs` + `.github/workflows/verify-38.yml`（5fd6ef3d）；反向用例 `--tag v9.9.9` exit 1
- [x] `README.md` / `README_EN.md` 安装链接改为 `releases/latest`（或随版本同步） —— 双语均已改为 releases/latest，G5a/G5b 断言守护（5fd6ef3d）
- [x] 给出“GF 上线版本对齐”的只读校验方式（可人工/CI 校验） —— `tests/scripts/38-gf-alignment-check.mjs` + `gf-alignment-check.yml`；实测评出 DRIFT 1.3.4→1.5.0（5fd6ef3d）
