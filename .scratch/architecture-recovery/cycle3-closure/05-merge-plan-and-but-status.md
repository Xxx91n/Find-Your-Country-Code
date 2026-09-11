# Merge Plan + GitButler Status Snapshot

> PAUSED — push to remote REQUIRES explicit user instruction

## 5.1 but status snapshot

```
╭┄ zz [uncommitted]
┊   nx   M .github/workflows/e2e.yml
┊   mzvq M .github/workflows/release-dry-run.yml
┊   yt   M .github/workflows/release.yml
┊   puw  M .github/workflows/verify-13.yml
┊   up   M .github/workflows/verify-15.yml
┊   xr   M .github/workflows/verify-16.yml
┊   usz  M .github/workflows/verify-18.yml
┊   nt   M .scratch/architecture-recovery/README.md
┊   puo  A .scratch/architecture-recovery/handoffs/20-ci-script-relocation.md
┊   nw   A .scratch/architecture-recovery/handoffs/21-pr-triggers.md
┊   zo   A .scratch/architecture-recovery/handoffs/22-dead-code-elimination.md
┊   um   A .scratch/architecture-recovery/handoffs/23-ts-strict-typecheck.md
┊   xou  A .scratch/architecture-recovery/handoffs/24-security-hardening.md
┊   uy   A .scratch/architecture-recovery/handoffs/25-dependency-directory-hygiene.md
┊   wz   A .scratch/architecture-recovery/handoffs/26-adr-docs-closure.md
┊   ul   A .scratch/architecture-recovery/issues/20-ci-script-relocation.md
┊   sw   A .scratch/architecture-recovery/issues/25-dependency-directory-hygiene.md
┊   lks  A .scratch/architecture-recovery/prompts/20-ci-script-relocation.md
┊   xy   A .scratch/architecture-recovery/prompts/21-pr-triggers.md
┊   ur   A .scratch/architecture-recovery/prompts/22-dead-code-elimination.md
┊   kz   A .scratch/architecture-recovery/prompts/23-ts-strict-typecheck.md
┊   lo   A .scratch/architecture-recovery/prompts/24-fix-security-hardening.md
┊   qq   A .scratch/architecture-recovery/prompts/24-security-hardening.md
┊   xx   A .scratch/architecture-recovery/prompts/25-dependency-directory-hygiene.md
┊   nl   A .scratch/architecture-recovery/prompts/26-adr-docs-closure.md
┊   sy   A .scratch/architecture-recovery/research/cycle3-crosscheck-report.md
┊   yu   A .scratch/architecture-recovery/research/cycle3-investigation.md
┊   rnk  A .scratch/architecture-recovery/research/cycle3-selfcheck-report.md
┊   lw   A .scratch/architecture-recovery/research/scripts/cycle3-crosscheck.mjs
┊   prs  A .scratch/architecture-recovery/research/window-reports/25-dependency-directory-hygiene-report.md
┊   oy   A .scratch/architecture-recovery/spec-cycle2.md
┊   nv   M .scratch/architecture-recovery/spec.md
┊   mk   A .scratch/architecture-recovery/verification/review-wave1-cycle3.md
┊   xoz  A .scratch/architecture-recovery/verification/review-wave2-cycle3.md
┊   mn   A .scratch/architecture-recovery/verification/review-wave3-cycle3.md
┊
┊╭┄ ch [cch/26-adr-docs-closure]
┊●   lkn docs(cch-26): ADR + docs closure — 新增 ADR-0006 仓库工程卫生基线（accepted：CI 脚本入 tests/scripts + workflows 禁引 .scratch、非发版 workflow PR 门控、strict+typecheck CI 三件套、依赖禁 latest/lockfile 复现、单一 tests/ 目录；反证条件 4 条；遗留登记 F-1 verify-15 S4 预存红 / typecheck.yml legacy-peer-deps / lockfile 待 CI 实证）；CONTEXT.md 新增工程门禁与仓库卫生节 5 术语（CI 门禁/PR 门控/密封 E2E/类型门禁/依赖钉死，23 旧术语零回归程序化验证）；README 票 26 行收口 + issues/26 五项验收勾选；窗口报告落 research/window-reports/
├╯
┊
┊╭┄ pr [cch/21-pr-triggers]
┊●   pvo docs(cch-21): 窗口报告 + issue 六项验收勾选 — PR 触发实证 PR#2 六 run
```

## 5.2 Git branch list

```
  cch/20-ci-script-relocation
  cch/21-pr-triggers
  cch/22-dead-code-elimination
  cch/23-ts-strict-typecheck
  cch/24-security-hardening
  cch/26-adr-docs-closure
  e-branch-1
  gb/cch-25-dependency-hygiene
  gitbutler/target
* gitbutler/workspace
  main

```

## 5.3 Stacking order for merge

Cycle-3 stacking order (per WORKFLOW §4.2):

1. `cch/20-ci-script-relocation` (foundation: tests/scripts/ relocation)
2. `cch/22-dead-code-elimination` (depends on 20 for CI baseline)
3. `cch/23-ts-strict-typecheck` (depends on 22 for clean baseline)
4. `cch/25-dependency-directory-hygiene` (parallel to 24, can merge anytime)
5. `cch/24-security-hardening` (after rework, in commit b57a25d)
6. `cch/21-pr-triggers` (depends on 20 for workflow paths)
7. `cch/26-adr-docs-closure` (terminal, depends on all)

## 5.4 PAUSE — awaiting user instruction

**PUSH TO REMOTE IS HALTED.** Per user directive:
> "push 到远程前必须停下等我明确指令"

No `but push` or `but land` will be executed without explicit confirmation.
