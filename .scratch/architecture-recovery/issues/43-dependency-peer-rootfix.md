# 43: 依赖根修

**What to build:** 安装不再依赖 --legacy-peer-deps。

**Blocked by:** None（可立即开工）

**Status:** done（commit `898340d6`，窗口报告 `research/window-reports/43-dependency-peer-rootfix-report.md`）

**覆盖 A-xxx:** A-021

- [x] react 18 / react-dom19 别名冲突根修，workflow 中 `--legacy-peer-deps` 残留清零 —— 已清偿：别名移除 + React 19 迁往独立 install root（workspaces）；`grep -rn legacy-peer-deps .github/workflows/` 零命中（commit `898340d6`）
- [x] `npm ci` 在干净环境可复现成功（附 CI run） —— E2E run **34826911474**（head `898340d6`）：`npm ci`（无 flag）→ added 74 packages，found 0 vulnerabilities → E2E **80 passed (31.2s)**；Typecheck run **34826911801** 同基线绿
- [x] 依赖范围仍为显式 semver（禁 latest 浮动） —— 根 devDeps 保持 `^18.3.1`；vendor 根 `react`/`react-dom` 精确钉 `19.2.8`（非 `^`，保持测试版本与旧 lockfile 锁定值一致，避免未呈报行为漂移）；无 `latest`。
