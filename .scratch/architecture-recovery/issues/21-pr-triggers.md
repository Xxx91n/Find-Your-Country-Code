# 21 — PR Triggers for All CI Workflows

**What to build:** Add `pull_request:` trigger to every non-release CI workflow so every pull request is gated by typecheck + E2E + calibration before merge.

**Blocked by:** 20 (CI scripts must be at correct paths before triggers fire on PR).

**Status:** ready-for-agent

- [x] Add `pull_request:` trigger to e2e.yml
- [x] Add `pull_request:` trigger to calibration-baseline.yml
- [x] Add `pull_request:` trigger to all verify-*.yml workflows (verify-13, verify-15, verify-16, verify-18, ~~verify-19~~ — verify-19.yml 不存在于任何 git ref，票19为发版链接票无 verify workflow，issue 枚举笔误，见窗口报告偏离点 D-21a)
- [x] Verify every non-release workflow YAML contains `pull_request:` in its `on:` section（js-yaml 解析 9/9 文件，6 文件本票新增 + typecheck.yml cch-23 已带）
- [x] Verify release.yml does NOT gain pull_request trigger (release is manual-only)（cch-21 提交仅 6 文件，release.yml/release-dry-run.yml 零接触）
- [x] Dry-run: push a test branch and confirm workflows trigger on the PR event（PR #2 六 workflow 全触发：5 success + verify-15 预存 S4 门漂移 failure，main 对照 run 34606594163 同红归因排除，见窗口报告）
