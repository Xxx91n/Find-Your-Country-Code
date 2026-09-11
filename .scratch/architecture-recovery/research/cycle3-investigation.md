# Cycle-3 Investigation Report — Repository Engineering Hygiene

> Brain Agent | 2026-09-11 | Trigger: 锐评1.txt forensic audit + atomcode industry survey
> Inputs: handoff-mmv2-cycle-complete (v1.4.0 closed), 锐评1.txt (16 allegations), atomcode testing-strategies survey

## Executive Summary

v1.4.0 detection engine is production-quality (precision=1.0 on 41 corpus cases, 5-layer scoring waterfall, React 19 probe, iframe governance, visibility gate). However, repository engineering hygiene lags significantly behind industry standards.

Key deficiencies (script-verified, not self-reported):

1. **CI scripts in .scratch/** — verify-13/15/16/18.yml reference scratch paths; any cleanup breaks CI
2. **Zero pull_request triggers** — all 8 workflows use workflow_dispatch + push only; PR merges have zero gating
3. **TS strict:false + no typecheck** — tsconfig.json line 5, no typecheck script in package.json
4. **src/Find-Your-Country-Code.js (985 lines)** — 0 imports across entire repo; dual maintenance surface
5. **5+ dead exports** — L3_PLUS_LIKE_MIN_RATE (1 ref: own def), tierOf (2 refs: def+TODO), _notifySubs (self-call only)
6. **postMessage '*' targetOrigin** — ui/index.ts:413,443,609 all use '*' with string-tag authentication only
7. **pageTierOverride() no selector scope** — rules/index.ts:88-94 iterates all overrides, takes first match globally
8. **SCAN_SELECTORS overlap** — detect/index.ts:207-214 .iti input overlaps with input[type="tel"]
9. **Dependencies 'latest'** — typescript, vite, vite-plugin-monkey all float on latest
10. **test/ + tests/ dual directories** — manual HTML pages vs playwright specs

## Investigation Method

All 16 allegations from 锐评1.txt were verified programmatically via rg/grep/sed + file byte inspection.
15/16 confirmed true; 1 (git has only 1 commit) is factually wrong (actual: 84 commits).

## atomcode Industry Survey Summary

Full report indexed at atomcode-testing-strategies. Key references:
- Better-Moodle: Playwright + Tampermonkey CRX extension install (closest to real env)
- WaniKani: vitest + mock-violentmonkey for unit tests
- Cypress #28107: MV3 extension isolated world limits → Playwright addScriptTag preferred
- Industry standard: PR + push:main dual trigger, typecheck gate, version-pinned deps

## Priority Framework

| Priority | Tickets | Rationale |
|----------|---------|-----------|
| P0 | 20 (CI relocation), 21 (PR triggers+typecheck CI) | CI single-point-of-failure + zero PR gating |
| P1 | 22 (dead code), 23 (TS strict) | Code quality foundations |
| P2 | 24 (security hardening), 25 (dependency/directory hygiene) | Anti-patterns + reproducibility |
| P3 | 26 (docs/ADR) | Traceability |

## Out of Scope (this cycle)

- Detection engine scoring changes
- Fill strategy changes
- iframe governance changes
- New E2E test cases
- Real-site smoke tests
- Country data expansion
- GreasyFork publishing
