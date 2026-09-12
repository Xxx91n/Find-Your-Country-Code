# Cycle-3 Spec — Repository Engineering Hygiene

> Brain Agent | 2026-09-11 | Input: 锐评1.txt forensic audit + atomcode testing-strategies survey
> Previous cycle: spec-cycle2.md (archived), tickets 11-19 + 3 fix tickets → v1.4.0

## Problem Statement

After two cycles of feature development (cycle-1: modular skeleton + scoring engine; cycle-2: mental model v2 with iframe governance, visibility gate, pseudo-select, React 19), the repository's engineering hygiene has not kept pace with its core engine quality. Specifically:

1. CI verification scripts live in `.scratch/` — a directory named "scratch" that new contributors would reasonably treat as disposable
2. No pull-request gating exists — all 8 workflows trigger only on `push` + `workflow_dispatch`, leaving `main` unprotected against unreviewed merges
3. TypeScript strict mode is disabled (`strict: false`) and no typecheck runs in CI
4. A 985-line legacy file (`src/Find-Your-Country-Code.js`) is committed with zero imports — a silent dual-maintenance surface
5. Multiple dead exports and unused code paths remain in the active codebase
6. Security anti-patterns (`postMessage('*')`, unvalidated BroadcastChannel) need hardening
7. Dependency versions float on `latest`, making CI non-reproducible
8. Two test directories (`test/` and `tests/`) cause onboarding confusion

These are not engine-level defects — the detection core remains production-quality (precision=1.0 on 41 corpus cases). They are repository-level hygiene debts that, left unaddressed, will compound with each future cycle.

## Solution

A focused hygiene cycle that addresses the eight deficiencies above in three waves, from highest ROI (CI reliability) to documentation closure. No detection engine behavior changes.

## User Stories

1. As a contributor, I can delete files from `.scratch/` without breaking CI, because verification scripts live in `tests/scripts/`.
2. As a reviewer, I can rely on CI to gate every pull request with typecheck + E2E + calibration baseline, so unreviewed changes cannot silently break the engine.
3. As a contributor, I can see a clean `src/` directory without the 985-line legacy file that shadows the active codebase.
4. As a developer, I get type errors at edit time and in CI, catching mismatched interfaces before they reach users.
5. As a security reviewer, I can confirm that cross-frame messages validate origin and BroadcastChannel messages validate source, matching the project's threat model depth.
6. As a maintainer running `npm ci`, I get reproducible dependency versions every time, regardless of when the install runs.
7. As a new contributor, I see a single `tests/` directory with clear subdirectories for manual pages and E2E specs.
8. As a future architect, I can trace why CI policies and hygiene decisions were made via an ADR, not by reading scratch artifacts.

## Implementation Decisions

- **CI script relocation**: Move all CI-referenced scripts from `.scratch/architecture-recovery/research/scripts/` into `tests/scripts/`. Update all workflow YAML `node` command paths to match. `.scratch/` content not referenced by CI remains as-is (this cycle does not touch scratch content beyond CI dependencies).
- **PR triggers**: Add `pull_request:` trigger alongside existing `push: branches:` in e2e.yml, calibration-baseline.yml, and all verify-*.yml workflows. release.yml keeps its current trigger set (release events only).
- **New typecheck workflow**: A new `typecheck.yml` running `tsc --noEmit` on PR and push to main. Uses the existing `tsconfig.json` (with `strict: true` enabled by ticket 23).
- **Dead code removal**: Delete `src/Find-Your-Country-Code.js` entirely. Remove dead exports (L3_PLUS_LIKE_MIN_RATE, tierOf, _notifySubs) after verifying zero callers via rg. Update `CONTRIBUTING.md` if it references the legacy file.
- **TypeScript strict**: Enable `"strict": true` in `tsconfig.json`, fix all resulting type errors, add `typecheck` npm script. No runtime behavior changes — types-only.
- **Security hardening**: postMessage: validate `e.origin` for incoming messages (top-frame→sub-frame uses origin from MessageEvent; sub-frame→top-frame uses `'*'` only when cross-origin unavoidable). SCAN_SELECTORS: add Set-based dedup before querySelectorAll. BroadcastChannel: add `e.origin` validation.
- **Dependency pinning**: Replace `latest` with specific major-version ranges (`^5.7` for TypeScript, `^6.x` for Vite). Re-run `npm install` to update lockfile. Remove `--legacy-peer-deps` from CI if possible after pinning.
- **Directory unification**: Move `test/` contents (manual HTML pages) into `tests/manual/`. Delete old `test/` directory.
- **ADR**: Write ADR-0006 documenting the CI policy (PR gating, typecheck gate, script location convention, dependency pinning policy). Update `CONTEXT.md` with new domain terms (CI gate, PR gating, hermetic E2E).

## Testing Decisions

- Good tests in this cycle verify external behavior: CI workflows run on PR events, typecheck fails on type errors, dead code is unreferenced.
- Verification method: programmatic self-check scripts (same pattern as cycle-2's mmv2-selfcheck.mjs / mmv2-crosscheck.mjs).
- After ticket 20: all CI workflow YAML files reference valid paths under `tests/scripts/` (not `.scratch/`).
- After ticket 21: every non-release workflow contains `pull_request:` in its trigger section.
- After ticket 22: `rg -rn "Find-Your-Country-Code" src/` returns zero results. Dead export removal verified by `rg -rn` export name across entire repo showing only the definition line removed.
- After ticket 23: `npx tsc --noEmit` exits 0 (CI evidence, not local).
- After ticket 24: postMessage calls in ui/index.ts each pass origin validation for incoming messages.
- After ticket 25: `grep latest package.json` returns zero. `test/` directory no longer exists.
- After ticket 26: adr/0006-ci-hygiene-policy.md exists with accepted status. CONTEXT.md updated.

## Out of Scope

- Changes to detection engine scoring (L0-L4 waterfall)
- Changes to fill strategies (React 19 probe, pseudo-select fill, iti adapter)
- Changes to iframe governance (BroadcastChannel protocol beyond origin validation)
- New E2E test cases or corpus expansion
- Real-site smoke tests (L3 in atomcode testing pyramid)
- Country data expansion (Kosovo +383, Vatican)
- GreasyFork publishing or release workflow changes
- Full-tree CRLF→LF rewrite (separate hygiene ticket)
- e-branch-1 cleanup (separate GitButler housekeeping)
- .scratch/ directory archival or deletion (only CI-referenced scripts move; rest stays)
- Replacement of string-tag authentication with structured tokens (out of scope for ticket 24; that is a protocol redesign)

## Further Notes

- This cycle's input came from an external code audit (锐评1.txt), not from user-reported bugs.
- The atomcode survey confirmed our E2E approach (Playwright + addScriptTag) is industry-appropriate; the gap is CI gating, not test methodology.
- Wave ordering follows the principle: fix CI reliability first (P0), then code quality (P1), then hardening (P2), then documentation (P3).
- Ticket Blocked-by graph is deliberately shallow — most tickets are independent to maximize parallelism.
- The `.scratch/` directory is not being deleted this cycle; only CI-referenced scripts move. A future cycle may address scratch archival.
