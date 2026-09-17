# 24 — Security Hardening: postMessage Origin + SCAN_SELECTORS Dedup

**What to build:** Add origin validation to cross-frame postMessage handlers and BroadcastChannel listeners; add Set-based deduplication to SCAN_SELECTORS to prevent double-querying overlapping selectors.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] In `src/ui/index.ts`: for incoming postMessage from sub-frames, validate `e.origin` matches expected origin (use `location.origin` for same-origin check; document the '*' fallback for cross-origin sub-frames)
- [x] In `src/store/index.ts`: add `e.origin` validation to BroadcastChannel `onmessage` handler (only trust messages from same origin)
- [x] In `src/detect/index.ts`: add `new Set(SCAN_SELECTORS)` before `querySelectorAll` call to deduplicate overlapping selectors (e.g., `.iti input` + `input[type="tel"]`)
- [x] Verify no functional regression: all existing E2E tests still pass on CI
- [x] Verify postMessage origin validation does not break iframe cross-frame communication (top-frame↔sub-frame flow tested in E2E)
- [ ] Out of scope: replacing string-tag authentication with structured tokens (that is a protocol redesign, not hardening)
