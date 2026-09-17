# Window Report — Ticket 25: Dependency Pinning + Directory Unification

**Date:** 2026-09-11
**Branch:** gb/cch-25-dependency-hygiene
**Commit:** (see git log for actual hash)
**Status:** ✅ Code changes committed, awaiting CI lockfile regeneration

## 1. Completion Definition (from handoff)

| # | Item | Status | Evidence |
|---|------|--------|----------|
| 1 | Replace `"typescript": "latest"` → `"^5.7"` | ✅ Done | `package.json` devDependencies verified: `"typescript": "^5.7"` |
| 2 | Replace `"vite": "latest"` → `"^6.0"` | ✅ Done | `package.json` devDependencies verified: `"vite": "^6.0"` |
| 3 | Replace `"vite-plugin-monkey": "latest"` → `"^5.0"` | ✅ Done | `package.json` devDependencies verified: `"vite-plugin-monkey": "^5.0"` |
| 4 | Attempt removal of `--legacy-peer-deps` from CI workflows | ✅ Done | Removed from all 7 workflows: e2e.yml, release.yml, release-dry-run.yml, verify-13.yml, verify-15.yml, verify-16.yml, verify-18.yml |
| 5 | Move `test/*.html` → `tests/manual/*.html` | ✅ Done | 3 files migrated: cch-test-page.html, cch-test-page2.html, test-page.html |
| 6 | Delete `test/` directory | ✅ Done | `test/` directory no longer exists (verified via fs) |
| 7 | Update path references in docs/scripts | ✅ Done | `tests/server.mjs`: updated comment + route prefix + default fallback; `docs/superpowers/plans/2026-04-13-country-code-ui-refresh-implementation-plan.md`: 10 refs updated |
| 8 | Verify `grep latest package.json` returns 0 | ✅ Done | No `"latest"` strings remain in devDependencies |
| 9 | Regenerate lockfile via CI `npm install` | ⏳ Pending CI | Requires push → CI run (CI-only policy: no local build) |

## 2. Files Changed

| File | Change |
|------|--------|
| `package.json` | Pinned typescript→^5.7, vite→^6.0, vite-plugin-monkey→^5.0 |
| `.github/workflows/e2e.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/release.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/release-dry-run.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/verify-13.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/verify-15.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/verify-16.yml` | Removed `--legacy-peer-deps` from npm ci |
| `.github/workflows/verify-18.yml` | Removed `--legacy-peer-deps` from npm ci |
| `tests/server.mjs` | Updated comment, route prefix, and default fallback to reference `tests/manual/` |
| `docs/superpowers/plans/2026-04-13-country-code-ui-refresh-implementation-plan.md` | Updated 10 `test/` path references → `tests/manual/` |
| `test/cch-test-page.html` → `tests/manual/cch-test-page.html` | Moved (deleted from old, created in new) |
| `test/cch-test-page2.html` → `tests/manual/cch-test-page2.html` | Moved (deleted from old, created in new) |
| `test/test-page.html` → `tests/manual/test-page.html` | Moved (deleted from old, created in new) |

## 3. Verification

### 3.1 Dependency Pinning
```
$ node -e "const p=require('./package.json'); console.log(p.devDependencies.typescript, p.devDependencies.vite, p.devDependencies['vite-plugin-monkey'])"
^5.7 ^6.0 ^5.0
```

### 3.2 No `latest` in devDependencies
```
$ node -e "console.log(JSON.stringify(require('./package.json').devDependencies).includes('latest'))"
false
```

### 3.3 `test/` directory removed
```
$ node -e "console.log(require('fs').existsSync('./test'))"
false
```

### 3.4 `tests/manual/` populated
```
$ node -e "console.log(require('fs').readdirSync('./tests/manual'))"
[ 'cch-test-page.html', 'cch-test-page2.html', 'test-page.html' ]
```

### 3.5 `--legacy-peer-deps` removed from all workflows
```
$ rg "legacy-peer-deps" .github/workflows/
(no output)
```

## 4. Lockfile Regeneration Plan

Per CI-only build policy, lockfile regeneration must happen via GitHub Actions:

1. Push branch `gb/cch-25-dependency-hygiene` to origin
2. CI will run `npm ci` (now without `--legacy-peer-deps`)
3. If `npm ci` fails due to missing/outdated lockfile, switch to `npm install` for the lockfile regeneration step OR:
   - Prefer: merge to main first, then let CI on main regenerate the lockfile naturally
   - Alternative: manually trigger e2e.yml workflow_dispatch after push
4. **If peer conflicts appear:** re-add `--legacy-peer-deps` with an explanatory comment (`# ticket 25: --legacy-peer-deps required because <reason>`)

## 5. Blocking Status

- **Blocked by:** None (ticket is independent)
- **Blocks:** Nothing directly (ticket 26 is W3, parallel to this)
- **Parallel with:** Tickets 20, 21, 22, 23, 24, 26 (all W1 independent)

## 6. Notes

- The `test/` directory is fully deleted; all 3 HTML files were byte-for-byte copied to `tests/manual/`
- `tests/server.mjs` retains the `/test/` URL prefix for backward compatibility (just the filesystem path changed)
- The `docs/superpowers/plans/` history document was updated to reflect the new paths
- No local build/install was run per CI-only policy mandate
