# Review: Fail Paths

Read this when a diff adds or moves a rejection, error, or failure path. Three questions per new fail path:

1. **What already mutated?** Trace the caller's sequence up to the rejection. A check after a write guards nothing — the write stands, unless an explicit rollback or atomicity guarantee restores or contains it. Absent one, move the check ahead of the first mutation.
2. **What does the user see?** One message per cause. Collapsing distinguishable causes (invalid input vs. capacity limit) into one message sends the user to fix the wrong thing.
3. **Which test locks it?** A negative case in the originating ticket's own E2E family, asserting persisted state and not just the message. Gates that strip the DOM (`tests/scripts/verify-ticket-*.mjs` run in Node) cannot observe selector or layout semantics; those cases belong in Playwright.

The cost of missing these rises with distance from the write: a rejected save that already deleted the user's rule looks identical to one that wrote nothing, which is why question 1 comes first.
