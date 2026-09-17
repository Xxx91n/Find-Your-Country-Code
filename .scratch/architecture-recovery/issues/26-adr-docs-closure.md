# 26 — ADR + Docs Closure for Cycle-3 Hygiene

**What to build:** Write ADR-0006 documenting the CI hygiene policy decisions made in this cycle; update `CONTEXT.md` with new domain terms; update `README.md` status table with cycle-3 completion.

**Blocked by:** 20, 21, 22, 23, 24, 25 — documents all decisions after they are implemented.

**Status:** done（窗口实施完成，待大脑复核）

- [x] Write `docs/adr/0006-ci-hygiene-policy.md` recording: CI script location convention (`tests/scripts/`), PR gating policy (all non-release workflows require `pull_request` trigger), typecheck gate, dependency version pinning policy, directory structure convention
- [x] Update `CONTEXT.md` with new domain terms: CI gate, PR gating, hermetic E2E, typecheck gate, dependency pinning
- [x] Update `.scratch/architecture-recovery/README.md` status table with tickets 20-26 completion status
- [x] Verify ADR-0006 follows existing ADR format (reference `docs/adr/0005-*.md` for template)
- [x] Verify `CONTEXT.md` preserves existing domain terms without regressions
