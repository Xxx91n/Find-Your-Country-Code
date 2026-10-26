# Find-Your-Country-Code

Userscript: finds phone country-code fields on any page, injects a 🌐 icon and a quick-pick panel.

## Install / run / test

- `npm ci`; build with `npm run build` (output in `dist/`); dev with `npm run dev`
- Type gate: `npm run typecheck`; E2E: `npm run e2e` (run `npx playwright install chromium` once first)
- Ticket gates: `node tests/scripts/verify-ticket-runner.mjs --run-all` (runs ticket scripts only, without the plan's install, build, and typecheck steps; `--audit` for wiring only)

## Don't touch

- `tests/corpus/`, `tests/fixtures/`: corpus content (mirror / skeleton / fingerprint) — changes update the manifest and baselines; runtime ledgers under `tests/corpus/forms/` are exempt (README §4)
- `dist/`, `playwright-report/`, `test-results/`: generated output, never edit by hand
- `.github/workflows/`: gate definitions — check the trigger surface before editing

## Traps you cannot infer from the code

- Injection lives in Shadow DOM; styles must not leak into the host page.
- Writing to a controlled component requires the element's prototype value setter, then input→change→blur. Direct assignment does not sync framework state.
- Inside `about:srcdoc` frames `location.origin` is the string `"null"`; use `window.origin` for origin checks.
- Diffs that add or move a rejection, error, or failure path: read `docs/agents/review.md` before writing it — the check sits ahead of the first mutation, and a negative test locks the persisted state.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, driven by the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles map to the same label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: glossary at the repo root, open decisions as `needs-triage` issues. See `docs/agents/domain.md`.
