# Skills 全量落盘索引（仅标题）

> 生成时间: 2026-09-03T10:26:56.857Z
> 用途: 供大脑 Agent 与子代理按路径读取全文副本，避免会话内联爆炸

## ask-matt (11615 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\ask-matt\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\ask-matt.md
  - # Ask Matt
  - ## The main flow: idea → ship
  - ### Context hygiene
  - ## On-ramps
  - ## Codebase health
  - ## Vocabulary underneath
  - ## Phase boundaries
  - ## Standalone
  - ## Precondition

## atomcode-research-agents (10799 bytes)
- source: C:/Users/Administrator/.agents/skills/atomcode-research/SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\atomcode-research-agents.md
  - # AtomCode Research
  - ## Serialized research (hard guardrail — read before dispatching)
  - ## The only command (MUST run inside ctx via ctx_batch_execute)
  - ### Fallback if ctx_batch_execute is unreachable
  - ## Resume anchoring (续跑锚定 — 失败即续，完成前不开新调研)
  - ## Timeout (10 minutes = 600000 ms, fixed, no negotiation)
  - ## Success signal (dual, version-resilient)
  - ## Monitoring & failure (trigger → detection → action)
  - ## ctx integration
  - ## Mode hints (phrase into the -p prompt)
  - ## Rules

## atomcode-research-codex (10799 bytes)
- source: C:/Users/Administrator/.codex/skills/atomcode-research/SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\atomcode-research-codex.md
  - # AtomCode Research
  - ## Serialized research (hard guardrail — read before dispatching)
  - ## The only command (MUST run inside ctx via ctx_batch_execute)
  - ### Fallback if ctx_batch_execute is unreachable
  - ## Resume anchoring (续跑锚定 — 失败即续，完成前不开新调研)
  - ## Timeout (10 minutes = 600000 ms, fixed, no negotiation)
  - ## Success signal (dual, version-resilient)
  - ## Monitoring & failure (trigger → detection → action)
  - ## ctx integration
  - ## Mode hints (phrase into the -p prompt)
  - ## Rules

## but-gitbutler (22068 bytes)
- source: C:/Users/Administrator/.agents/skills/gitbutler/SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\but-gitbutler.md
  - # GitButler CLI Skill
  - ## Start Here
  - # Selected dirty files/hunks:
  - # Commit order, branch/stack placement, conflict overview:
  - # File/hunk IDs, per-commit files, amend/split details:
  - # Details for one known branch or commit:
  - ## IDs
  - ## Non-Negotiable Rules
  - ## Command Patterns
  - ## Task Recipes
  - ### Update workspace from main
  - ### Commit selected files or hunks
  - ### Amend into existing commit
  - ### Split an existing commit
  - ### Reorder commits
  - ### Squash commits
  - ### Stack existing branches
  - ### Create or manage pull requests
  - ### Dependency conflict with another branch
  - ### Resolve conflicted commits (after pull, move, or reorder)
  - ### Conflicts in uncommitted files
  - ## Git-to-But Map
  - ## Notes

## claude-handoff (1301 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\claude-handoff\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\claude-handoff.md

## code-review (6649 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\code-review\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\code-review.md
  - ## Process
  - ### 1. Pin the fixed point
  - ### 2. Identify the spec source
  - ### 3. Identify the standards sources
  - ### 4. Spawn both sub-agents in parallel
  - ### 5. Aggregate
  - ## Why two axes

## codebase-design (6488 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\codebase-design\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\codebase-design.md
  - # Codebase Design
  - ## Glossary
  - ## Deep vs shallow
  - ## Principles
  - ## Designing for testability
  - ## Relationships
  - ## Rejected framings
  - ## Going deeper

## diagnosing-bugs (8614 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\diagnosing-bugs\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\diagnosing-bugs.md
  - # Diagnosing Bugs
  - ## Redact
  - ## Phase 1 — Build a feedback loop
  - ### Ways to construct one — try them in roughly this order
  - ### Tighten the loop
  - ### Non-deterministic bugs
  - ### When you genuinely cannot build a loop
  - ### Completion criterion — a tight loop that goes red
  - ## Phase 2 — Reproduce + minimise
  - ### Minimise
  - ## Phase 3 — Hypothesise
  - ## Phase 4 — Instrument
  - ## Phase 5 — Fix + regression test
  - ## Phase 6 — Cleanup

## domain-modeling (3361 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\domain-modeling\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\domain-modeling.md
  - # Domain Modeling
  - ## File structure
  - ## During the session
  - ### Challenge against the glossary
  - ### Sharpen fuzzy language
  - ### Discuss concrete scenarios
  - ### Cross-reference with code
  - ### Update CONTEXT.md inline
  - ### Offer ADRs sparingly

## git-guardrails-claude-code (2312 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\misc\git-guardrails-claude-code\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\git-guardrails-claude-code.md
  - # Setup Git Guardrails
  - ## What Gets Blocked
  - ## Steps
  - ### 1. Ask scope
  - ### 2. Copy the hook script
  - ### 3. Add hook to settings
  - ### 4. Ask about customization
  - ### 5. Verify

## grill-me (157 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\grill-me\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\grill-me.md

## grill-with-docs (247 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\grill-with-docs\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\grill-with-docs.md

## grilling (1857 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\grilling\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\grilling.md

## handoff (894 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\handoff\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\handoff.md

## implement (433 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\implement\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\implement.md

## improve-codebase-architecture (6049 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\improve-codebase-architecture\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\improve-codebase-architecture.md
  - # Improve Codebase Architecture
  - ## Process
  - ### 1. Explore
  - ### 2. Present candidates as an HTML report
  - ### 3. Grilling loop

## loop-me (2560 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\loop-me\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\loop-me.md
  - ## The loop lens
  - ## Vocabulary
  - ## Definition of done
  - ## The workspace

## migrate-to-shoehorn (2795 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\misc\migrate-to-shoehorn\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\migrate-to-shoehorn.md
  - # Migrate to Shoehorn
  - ## Why shoehorn?
  - ## Install
  - ## Migration patterns
  - ### Large objects with few needed properties
  - ### `as Type` → `fromPartial()`
  - ### `as unknown as Type` → `fromAny()`
  - ## When to use each
  - ## Workflow

## ponytail (6757 bytes)
- source: C:/Users/Administrator/.codex/plugins/cache/ponytail/ponytail/4.9.0/skills/ponytail/SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\ponytail.md
  - # Ponytail
  - ## Persistence
  - ## The ladder
  - ## Rules
  - ## Output
  - ## Intensity
  - ## When NOT to be lazy
  - ## Boundaries

## prototype (2954 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\prototype\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\prototype.md
  - # Prototype
  - ## Pick a branch
  - ## Rules that apply to both

## research (799 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\research\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\research.md

## resolving-merge-conflicts (921 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\resolving-merge-conflicts\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\resolving-merge-conflicts.md

## scaffold-exercises (3589 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\misc\scaffold-exercises\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\scaffold-exercises.md
  - # Scaffold Exercises
  - ## Directory naming
  - ## Exercise variants
  - ## Required files
  - # Exercise Title
  - ## Workflow
  - ## Lint rules summary
  - ## Moving/renaming exercises
  - ## Example: stubbing from a plan

## setup-matt-pocock-skills (6922 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\setup-matt-pocock-skills\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\setup-matt-pocock-skills.md
  - # Setup Matt Pocock's Skills
  - ## Process
  - ### 1. Explore
  - ### 2. Present findings and ask
  - ### 3. Confirm and edit
  - ### 4. Write
  - ## Agent skills
  - ### Issue tracker
  - ### Triage labels
  - ### Domain docs
  - ### 5. Done

## setup-pre-commit (2261 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\misc\setup-pre-commit\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\setup-pre-commit.md
  - # Setup Pre-Commit Hooks
  - ## What This Sets Up
  - ## Steps
  - ### 1. Detect package manager
  - ### 2. Install dependencies
  - ### 3. Initialize Husky
  - ### 4. Create `.husky/pre-commit`
  - ### 5. Create `.lintstagedrc`
  - ### 6. Create `.prettierrc` (if missing)
  - ### 7. Verify
  - ### 8. Commit
  - ## Notes

## setup-ts-deep-modules (7612 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\setup-ts-deep-modules\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\setup-ts-deep-modules.md
  - # Setup TS Deep Modules
  - ## The shape this enforces
  - ## Steps
  - ### 1. Detect the environment
  - ### 2. Install dependency-cruiser
  - ### 3. Write the config
  - ### 4. Wire it into the checks
  - ### 5. Scaffold the example package
  - ### 6. Prove the rules bite
  - ### 7. Document the convention
  - ## Notes

## tdd (3578 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\tdd\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\tdd.md
  - # Test-Driven Development
  - ## What a good test is
  - ## Seams — where tests go
  - ## Anti-patterns
  - ## Rules of the loop

## teach (9507 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\teach\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\teach.md
  - ## Teaching Workspace
  - ## Philosophy
  - ### Fluency vs Storage Strength
  - ## Lessons
  - ## Assets
  - ## The Mission
  - ## Zone Of Proximal Development
  - ## Knowledge
  - ## Skills
  - ## Acquiring Wisdom
  - ## Reference Documents
  - ## `NOTES.md`

## to-questionnaire (2921 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\to-questionnaire\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\to-questionnaire.md
  - ## Document structure
  - # <Questionnaire title>
  - ## Context
  - ## How to answer
  - ## <Theme heading>
  - ### What load is the system expected to handle at launch?
  - ## Anything else?

## to-spec (3050 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\to-spec\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\to-spec.md
  - ## Process
  - ## Problem Statement
  - ## Solution
  - ## User Stories
  - ## Implementation Decisions
  - ## Testing Decisions
  - ## Out of Scope
  - ## Further Notes

## to-tickets (5722 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\to-tickets\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\to-tickets.md
  - # To Tickets
  - ## Process
  - ### 1. Gather context
  - ### 2. Explore the codebase (optional)
  - ### 3. Draft vertical slices
  - ### 4. Quiz the user
  - ### 5. Publish the tickets to the configured tracker
  - # <NN> — <Ticket title>
  - ## Parent
  - ## What to build
  - ## Acceptance criteria
  - ## Blocked by

## triage (6604 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\triage\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\triage.md
  - # Triage
  - ## Reference docs
  - ## Roles
  - ## Invocation
  - ## Show what needs attention
  - ## Triage a specific issue or PR
  - ## Quick state override
  - ## Needs-info template
  - ## Triage Notes
  - ## Resuming a previous session

## wait-what (325 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\wait-what\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\wait-what.md

## wayfinder (12056 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\wayfinder\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\wayfinder.md
  - ## Plan, don't do
  - ## Refer by name
  - ## The Map
  - ### The map body
  - ## Destination
  - ## Notes
  - ## Decisions so far
  - ## Not yet specified
  - ## Out of scope
  - ### Tickets
  - ## Question
  - ## Ticket Types
  - ## Fog of war
  - ## Out of scope
  - ## Invocation
  - ### Chart the map
  - ### Work through the map

## wizard (4163 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\engineering\wizard\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\wizard.md
  - # Wizard
  - ## Process
  - ### 1. Scope the procedure
  - ### 2. Map each stage's journey
  - ### 3. Author the wizard
  - ### 4. Verify and hand off

## writing-beats (4905 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\writing-beats\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\writing-beats.md
  - ## Grounding
  - ## What is a beat
  - ## Pulling from the pile
  - ## Ending the journey
  - ## Writing rhythm

## writing-for-agents (10966 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\productivity\writing-for-agents\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\writing-for-agents.md
  - ## Context pointers
  - ## The two loads
  - ## Information hierarchy
  - ## Steps and completion criteria
  - ## When to split
  - ## Leading words
  - ## Pruning

## writing-fragments (3579 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\writing-fragments\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\writing-fragments.md
  - ## What is a fragment
  - ## File format
  - # Working title
  - ## Writing rhythm

## writing-shape (5970 bytes)
- source: C:\Users\Administrator\.agents\skills\grill\in-progress\writing-shape\SKILL.md
- copy: D:\Aworker\mozilla\choose-your-country\.scratch\architecture-recovery\research\skills\writing-shape.md
  - ## The loop
  - ## Grounding
  - ## Conversational feel
  - ## Pulling from the pile
  - ## Format arguments to actually have
  - ## Writing rhythm
  - ## Out of scope

