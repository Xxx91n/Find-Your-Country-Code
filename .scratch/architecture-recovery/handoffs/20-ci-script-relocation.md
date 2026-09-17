# Handoff 20 — CI Script Relocation: .scratch/ → tests/scripts/

**Focus:** Move all CI-referenced verification scripts from `.scratch/architecture-recovery/research/scripts/` into `tests/scripts/`, update workflow YAML paths, so `.scratch/` is no longer a CI single-point-of-failure.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\20-ci-script-relocation.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\calibration-baseline.yml`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\verify-*.yml` (all verify workflows)

**Delta (checkpoints):**
1. Scan all `.github/workflows/*.yml` for `node .*scratch` → produce a manifest of scripts that CI depends on.
2. Create `tests/scripts/`, copy each script byte-for-byte (no modifications).
3. Update every workflow YAML to point to `tests/scripts/` paths.
4. Verify: `rg '.scratch/' .github/workflows/` returns 0.
5. Verify: all copied scripts are byte-identical to originals via diff.
6. Dry-run CI: trigger calibration-baseline via workflow_dispatch.

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\20-ci-script-relocation-report.md` containing: (a) the manifest of migrated scripts with old→new paths, (b) diff proof of byte-identity, (c) CI dry-run evidence (run ID + green/red), (d) any scripts discovered in scratch that were NOT migrated (and why).

**Suggested skills:** `but`, `implement`
