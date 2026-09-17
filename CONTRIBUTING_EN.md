# Contributing & Release Guide

## Development

```bash
npm install        # install dependencies
npm run dev        # local dev (vite-plugin-monkey hot reload)
npm run build      # build dist/find-your-country-code.user.js
npm run e2e        # build + Playwright e2e tests
```

Source lives in `src/` (TypeScript modules). The userscript metadata header is maintained solely in the `userscript` field of `vite.config.ts` — never hand-write the `// ==UserScript==` block. `package.json` `version` is the **single source of truth**: `vite.config.ts` reads it at build time and injects the artifact `// @version`, so no version literal belongs there. Consistency is enforced by the `verify-38` gate, which fails red on drift (ticket 38 / A-011).

## Version & changelog (required for a release)

One release = three files updated together:

1. **Version**: `version` in `package.json` (**single source of truth**) — `vite.config.ts` reads it at build time and bakes it into the artifact `// @version`. Bump only `package.json`.
2. **`greasyfork/Glog.md`**: Chinese changelog describing user-visible changes (fixes / improvements / features). At release time the file's **newest section only** (the first `## vX.Y.Z` heading) becomes the Chinese half of the GitHub Release notes and the material for the GreasyFork update note; **older versions stay in the file but are not included in release notes** (extracted by the changelog step in `release.yml`).
3. **`greasyfork/Glog_EN.md`**: English changelog, mirroring Glog.md item by item.

Flow: code change → bump version (`package.json` only) → update both Glog files → self-test (`npm run e2e`) → merge to `main`.

> GreasyFork version sync is a one-time manual setup (in-site "Sync from external URL" pulling the GitHub artifact); CI never writes to GreasyFork — it cannot. Steps and verification: `docs/greasyfork-sync-setup.md`.

## Release pipeline (automated)

A push to `main` touching release paths (`src/**`, `vite.config.ts`, `package.json`, `package-lock.json`) triggers `.github/workflows/release.yml`:

1. `npm ci && npm run build` to produce the artifact;
2. extract `// @version` from `dist/find-your-country-code.user.js`;
3. check whether remote tag `v<version>` already exists — skip if it does (idempotent, prevents duplicate releases);
4. otherwise create a GitHub Release with both Glog files as notes and upload the `.user.js` artifact.

**Version jump policy**: the modularization + scoring engine after `v1.3.4` is a generation-level behavior change; `v2.0.0` (semver major bump) is recommended. `v1.4.0` is a valid low-key alternative. Trade-offs: `.scratch/architecture-recovery/research/window-reports/10-release-pipeline-report.md`. The actual version number and Glog content require maintainer sign-off before publishing (releases are user-facing, outbound actions).

**Beta validation release**: before the real release you may bump to e.g. `2.0.0-beta.1`, run the full pipeline once, then delete that tag/Release and roll the version back. This action requires explicit user confirmation.

## Download link verification

After a release, verify both channels (scripted: `.scratch/architecture-recovery/research/scripts/verify-ticket-10.mjs`):

| Link | Where | How to verify | Expected |
|---|---|---|---|
| GreasyFork install `https://update.greasyfork.org/scripts/573755/...user.js` | artifact header `@downloadURL` (maintained in vite.config.ts) | `curl -sI <url>` | HTTP 200, `content-type` contains `text/javascript`; versioning is handled by GreasyFork itself, independent of GitHub tags |
| GitHub Release asset `https://github.com/Xxx91n/Find-Your-Country-Code/releases/download/v<ver>/find-your-country-code.user.js` | Release page | after release, `curl -sIL <url>` | HTTP 302 → 200 (redirect to release-assets storage) |
| JsDelivr CDN | only screenshots in `greasyfork/GREADME*.md` (`cdn.jsdelivr.net/gh/...@refs/heads/main/greasyfork/*.png`); the script itself is not served via CDN (`dist/` is gitignored) | `curl -sI <png-url>` | HTTP 200 (reads from the GitHub repo, release-independent) |

Note: GreasyFork updates are driven by its own ingestion of the submitted source/uploaded file; the GitHub Release is a mirror channel. Keep the version numbers aligned across both.

## Boundaries

- The frozen v1.3.4 behavior baseline was `src/Find-Your-Country-Code.js` (deleted by ticket 22); to compare against legacy behavior, consult git history: `git show v1.3.4:src/Find-Your-Country-Code.js`.
- Publishing actions (tags, Releases, GreasyFork updates) face real users and are outbound: CI automation runs per the workflows above, but beta/production releases require maintainer confirmation.
