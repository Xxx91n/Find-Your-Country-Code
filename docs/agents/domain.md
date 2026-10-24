# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root, or
- **`GLOSSARY-MAP.md`** at the repo root if it exists: it points at one `GLOSSARY.md` per context. Read each one relevant to the topic.
- **GitHub issues** labelled `needs-triage` for decisions that are still open. Settled decisions live as self-contained comments at the code they govern — this repo keeps no ADR directory.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## Current layout (single-context)

| What | Where |
| --- | --- |
| Domain vocabulary | `GLOSSARY.md` at the repo root |
| Settled decisions | self-contained comments at the enforcement point, in `src/` and `tests/` |
| Open decisions | GitHub issues labelled `needs-triage` |

```
/
├── GLOSSARY.md
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts with settled decisions

Settled decisions are the comments at the code they govern. If your output contradicts one, surface it explicitly rather than silently overriding:

> _Contradicts the "cap is enforced on the write path" comment in `src/store/index.ts`, but worth reopening because…_
