# Handoff 24 — Security Hardening: postMessage Origin + SCAN_SELECTORS Dedup

**Focus:** Add origin validation to cross-frame postMessage and BroadcastChannel; deduplicate SCAN_SELECTORS.

**Read-list (absolute paths):**
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\issues\24-security-hardening.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\spec.md`
- `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\WORKFLOW.md`
- `D:\Aworker\mozilla\choose-your-country\src\ui\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\store\index.ts`
- `D:\Aworker\mozilla\choose-your-country\src\detect\index.ts`
- `D:\Aworker\mozilla\choose-your-country\docs\adr\0005-pseudo-select-recognition-implement.md` (relevant for SCAN_SELECTORS design context)

**Delta (checkpoints):**
1. In ui/index.ts: for incoming postMessage from sub-frames, validate `e.origin === location.origin` before processing. Document the '*' fallback for top→sub-frame replies (cross-origin unavoidable).
2. In store/index.ts: add `e.origin` validation to BroadcastChannel onmessage handler.
3. In detect/index.ts: wrap SCAN_SELECTORS with `new Set()` before iteration to deduplicate overlapping selectors.
4. Verify all existing E2E tests still pass on CI (no regression from origin validation).
5. Verify iframe cross-frame E2E spec still passes (top-frame↔sub-frame communication intact).

**Report requirement:** Generate `D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\window-reports\24-security-hardening-report.md` containing: (a) before/after code diffs for each of the 3 files, (b) E2E test results (run ID + pass/fail count), (c) iframe E2E spec results confirming cross-frame communication still works.

**Suggested skills:** `but`, `implement`, `code-review`
