# 20 — CI Script Relocation: .scratch/ → tests/scripts/

**What to build:** Move all CI-referenced verification scripts from `.scratch/architecture-recovery/research/scripts/` into `tests/scripts/`, update all workflow YAML files to reference new paths, so `.scratch/` is no longer a CI single-point-of-failure.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Identify all CI-referenced scripts by scanning `.github/workflows/*.yml` for `node .*scratch` patterns
- [ ] Create `tests/scripts/` directory, copy identified scripts (preserve subdirectory structure if any)
- [ ] Update every workflow YAML `node` command path from `.scratch/architecture-recovery/research/scripts/` to `tests/scripts/`
- [ ] Verify no workflow YAML still references `.scratch/` paths (rg `.scratch/` across `.github/workflows/` returns 0)
- [ ] Verify all copied scripts are byte-identical to originals (diff check)
- [ ] Dry-run: trigger calibration-baseline workflow via workflow_dispatch to confirm paths resolve
