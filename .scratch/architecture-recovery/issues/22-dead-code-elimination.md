# 22 — Dead Code Elimination

**What to build:** Delete the 985-line legacy file `src/Find-Your-Country-Code.js` and remove all unreferenced exports from `src/`, eliminating the dual-maintenance surface and dead code paths.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Delete `src/Find-Your-Country-Code.js` entirely
- [x] Verify zero references after deletion: `rg -rn "Find-Your-Country-Code" src/` returns 0 (may return in docs/ or .scratch/ — that's acceptable)
- [x] Update `CONTRIBUTING.md` if it references the legacy file as "frozen baseline" — change to point to git history instead
- [x] Remove dead export `L3_PLUS_LIKE_MIN_RATE` from `src/config.ts` (verify: rg across repo shows only definition line)
- [x] Remove dead functions `_notifySubs`, `subscribe` from `src/store/index.ts` (verify: zero callers outside own definition after removal)
- [x] Clean up `tierOf` references in `src/rules/index.ts` (verify: only TODO comment remains, no functional code references)
- [x] Verify `npm run build` still passes on CI after all deletions
