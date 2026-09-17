# Handoff 23 — TypeScript Strict Mode + CI Typecheck Gate

**Focus:** Enable `"strict": true` in tsconfig.json, fix all type errors, add typecheck CI workflow.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\23-ts-strict-typecheck.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\tsconfig.json`
- `D:\Aworker\mozilla\choose-your-country\package.json`
- `D:\Aworker\mozilla\choose-your-country\src\**/*.ts` (all source files subject to type checking)
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0001-*.md` through `0005-*.md` (existing ADRs for context)

**Delta (checkpoints):**
1. Change `"strict": false` → `"strict": true` in tsconfig.json.
2. Push to CI, capture the first `tsc --noEmit` output to get the full type error list.
3. Fix every type error in src/ — no `as any` workarounds unless documented.
4. Add `"typecheck": "tsc --noEmit"` to package.json scripts.
5. Create `.github/workflows/typecheck.yml` with `on: [pull_request, push]`.
6. Verify typecheck CI passes green.

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\23-ts-strict-typecheck-report.md` containing: (a) initial error count and error message summary, (b) per-file fix list with line counts changed, (c) final typecheck CI green evidence (run ID), (d) any `as any` usages introduced with justification.

**Suggested skills:** `but`, `implement`, `code-review`
