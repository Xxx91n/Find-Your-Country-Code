# 43: 依赖根修

**What to build:** 安装不再依赖 --legacy-peer-deps。

**Blocked by:** None（可立即开工）

**Status:** ready-for-agent

**覆盖 A-xxx:** A-021

- [ ] react 18 / react-dom19 别名冲突根修，workflow 中 `--legacy-peer-deps` 残留清零
- [ ] `npm ci` 在干净环境可复现成功（附 CI run）
- [ ] 依赖范围仍为显式 semver（禁 latest 浮动）
