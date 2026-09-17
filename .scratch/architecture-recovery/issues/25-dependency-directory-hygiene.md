# 25 — Dependency Pinning + Directory Unification

**What to build:** Replace `latest` version specifiers with pinned major-version ranges in `package.json`, unify `test/` and `tests/` into a single `tests/` directory with clear subdirectory structure.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Replace `"typescript": "latest"` with `"typescript": "^5.7"`
- [ ] Replace `"vite": "latest"` with `"vite": "^6.0"`
- [ ] Replace `"vite-plugin-monkey": "latest"` with `"vite-plugin-monkey": "^5.0"`
- [ ] Run `npm install` (via CI) to regenerate lockfile with pinned versions
- [ ] Attempt removal of `--legacy-peer-deps` from CI workflows; if peer dependency conflicts persist, document why in a comment
- [ ] Move `test/*.html` → `tests/manual/*.html`
- [ ] Delete `test/` directory after move
- [ ] Update any path references in docs or scripts that pointed to `test/`
- [ ] Verify `grep "latest" package.json` returns 0 (excluding `"latest"` in description strings)
