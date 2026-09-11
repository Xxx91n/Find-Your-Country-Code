# 23 — TypeScript Strict Mode + CI Typecheck Gate

**What to build:** Enable `"strict": true` in `tsconfig.json`, fix all resulting type errors across `src/`, add `typecheck` npm script, and create a `typecheck.yml` CI workflow that runs `tsc --noEmit` on every push and PR.

**Blocked by:** None — can start immediately.

**Status:** done — typecheck/E2E 双绿 (run 34590080334/34590080352 @ 7b98132), 待大脑收口勾销波次表

- [x] Change `tsconfig.json`: `"strict": false` → `"strict": true`
- [x] Run `npx tsc --noEmit` (via CI, not local — follow CI-only policy) and capture all type errors
- [x] Fix every type error in `src/` — no `as any` workarounds unless justified in ADR
- [x] Add `"typecheck": "tsc --noEmit"` to `package.json` scripts
- [x] Create `.github/workflows/typecheck.yml` with `on: [pull_request, push: main]`, running `npm ci` → `npm run typecheck`
- [x] Verify typecheck CI passes green on the first run after fixes
- [x] Verify no runtime behavior change — types-only modification
