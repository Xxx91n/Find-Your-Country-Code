# Review: Fail Paths

Read this when a diff adds or moves a rejection, error, or failure path. Five questions per new fail path:

1. **What already mutated?** Trace the caller's sequence up to the rejection. A check after a write guards nothing — the write stands, unless an explicit rollback or atomicity guarantee restores or contains it. Absent one, move the check ahead of the first mutation.
2. **What does the user see?** One message per cause. Collapsing distinguishable causes (invalid input vs. capacity limit) into one message sends the user to fix the wrong thing.
3. **Which test locks it?** A negative case in the originating ticket's own E2E family, asserting persisted state and not just the message. Gates that strip the DOM (`tests/scripts/verify-ticket-*.mjs` run in Node) cannot observe selector or layout semantics; those cases belong in Playwright.
4. **What can be absent or inverted?** A guard written for the happy direction covers half the contract: deletions (an entity missing from the regenerated set), paired flags (`--from X` accepted on one entity kind but not rejected on another), one-sided comparisons (skip on `base` but not `new`). Name the reverse case and the empty case for each guard.
5. **Can this check fail?** A check that cannot fail is a no-op. For ordering assertions, pass the call-site text (with its trailing punctuation) and require both operands to be found: `indexOf` returns -1 for a missing token, and `-1 < n` passes silently. For fixture-driven negative cases, assert the exact fragment you injected (tag, URL, line) — not a substring a malformed version also contains — before asserting the outcome. Run the check once with the guard removed or the order inverted; if it stays green, the check is the bug. Use the shared helpers in `tests/scripts/gate-assert.mjs` (`before`, `containsToken`, `startsWithToken`).

**Name the authority.** When control flow chooses between two measurements of the same thing, the field names must say which one is authoritative and which is evidence. A field named like "the status" but produced by a different probe (a plain fetch rather than the browser navigation) will be used as the status. Put the source in the name (`browser_status` vs `http_status`) and let only the authoritative field drive the decision.

The cost of missing these rises with distance from the write: a rejected save that already deleted the user's rule looks identical to one that wrote nothing, which is why question 1 comes first.
