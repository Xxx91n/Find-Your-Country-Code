# Handoff 21 — PR Triggers for All CI Workflows

**Focus:** Add `pull_request:` trigger to every non-release CI workflow so every pull request is gated before merge.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\21-pr-triggers.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\e2e.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\calibration-baseline.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-*.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\release.yml` (read to confirm it should NOT get PR trigger)

**Delta (checkpoints):**
1. Add `pull_request:` to `on:` section of e2e.yml, calibration-baseline.yml, and every verify-*.yml.
2. Confirm release.yml does NOT gain pull_request (it's manual-only).
3. Verify every non-release workflow YAML contains `pull_request:`.
4. Push a test branch, open a PR, confirm workflows trigger.

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\21-pr-triggers-report.md` containing: (a) list of every workflow modified with before/after trigger sections, (b) PR test evidence (run IDs), (c) confirmation that release.yml was NOT modified.

**Suggested skills:** `but`, `implement`
