# Handoff 22 — Dead Code Elimination

**Focus:** Delete `src/Find-Your-Country-Code.js` (985 lines, 0 imports) and remove all unreferenced exports from `src/`.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\22-dead-code-elimination.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\src\Find-Your-Country-Code.js`
- `D:\Aworker\mozilla\choose-your-country\src\config.ts`
- `D:\Aworker\mozilla\choose-your-country\src\store\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\rules\index.ts`
- `D:\Aworker\mozilla\choose-your-country\CONTRIBUTING.md`

**Delta (checkpoints):**
1. Delete `src/Find-Your-Country-Code.js` entirely.
2. Run `rg -rn "Find-Your-Country-Code" src/` — must return 0 (references in docs/.scratch/ acceptable).
3. Update CONTRIBUTING.md if it references the legacy file — point to git history instead.
4. Remove `L3_PLUS_LIKE_MIN_RATE` from config.ts after verifying zero references beyond definition.
5. Remove `_notifySubs` and `subscribe` from store/index.ts after verifying zero external callers.
6. Clean up `tierOf` references in rules/index.ts.
7. Verify CI build passes after all deletions.

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\22-dead-code-elimination-report.md` containing: (a) each deleted item with its line count and rg evidence of zero references, (b) CI build evidence (run ID + green), (c) CONTRIBUTING.md diff if modified.

**Suggested skills:** `but`, `implement`, `code-review`
