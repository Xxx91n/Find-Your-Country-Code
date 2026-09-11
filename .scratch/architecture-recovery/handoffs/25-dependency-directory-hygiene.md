# Handoff 25 — Dependency Pinning + Directory Unification

**Focus:** Pin floating `latest` dependency versions; unify `test/` and `tests/` into single `tests/` directory.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\25-dependency-directory-hygiene.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\package.json`
- `D:\Aworker\mozilla\choose-your-country\.github\workflows\e2e.yml` (for --legacy-peer-deps removal attempt)
- `D:\Aworker\mozilla\choose-your-country\test\` (manual HTML pages to move)
- `D:\Aworker\mozilla\choose-your-country\tests\` (E2E specs directory)

**Delta (checkpoints):**
1. Replace `"typescript": "latest"` → `"typescript": "^5.7"`, `"vite": "latest"` → `"vite": "^6.0"`, `"vite-plugin-monkey": "latest"` → `"vite-plugin-monkey": "^5.0"`.
2. Run `npm install` (via CI) to regenerate lockfile with pinned versions.
3. Attempt removal of `--legacy-peer-deps` from CI workflows; document outcome.
4. Move `test/*.html` → `tests/manual/*.html`, delete old `test/` directory.
5. Update any path references in docs/scripts that pointed to `test/`.
6. Verify `grep "latest" package.json` returns 0 (excluding description strings).

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\25-dependency-directory-hygiene-report.md` containing: (a) before/after package.json diff for version pins, (b) --legacy-peer-deps attempt outcome with explanation, (c) directory structure before/after, (d) CI build evidence (run ID + green).

**Suggested skills:** `but`, `implement`
