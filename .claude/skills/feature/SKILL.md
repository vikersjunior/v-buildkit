---
name: feature
description: Use this when the user wants to define one implementation-ready feature from an approved project spec, including explicit /feature requests. Creates a small feature specification and acceptance criteria in .buildkit/features/ without writing application code.
disable-model-invocation: true
---
# Feature — Feature Specification Gate

Run only when the user explicitly asks for this command (for example by typing /feature). Do not start it on your own initiative or chain into it from another skill.

`/feature` turns one bounded item from `Implementation_plan.md` into an implementation-ready contract before code changes.

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

Spec files are resolved from the configured documentation root in `.buildkit/config.json` (defaulting to project root). Gather context in at most 4 tool rounds:

- Read `.buildkit/state.md` first. If a different feature is active or awaiting approval, report it and stop instead of starting a second one. Revising the feature already recorded there is allowed.
- Read `rules.md` in full; it holds the project-wide rules, including the Security Gate.
- Read `Progress.md` and the item's section of `Implementation_plan.md` to pick the item.
- For `PRD.md`, `architecture.md` and `Tech_stack.md`, search for the item's names and terms and read the headings plus the matching sections only, not whole files.
- If something material is still unclear after 4 rounds, record it as an open question (step 8) instead of reading everything.

1. Identify the exact plan item and PRD/architecture traceability.
2. Define the smallest coherent implementation slice.
3. Define scope, non-goals, dependencies, affected components, risks and assumptions.
4. Define explicit acceptance criteria, including loading, empty, error, permission, security and accessibility states where relevant.
5. Define verification commands/approach.
6. List under `## Context` each source section the implementer needs, one per line as `File.md § Heading`: the bare name of one of the six spec files and the heading text without `#` marks. No other paths. Write `- None` if the packet `/implement` always reads is enough.
7. Critique the draft before writing anything. Fix or record each of these:
   - missing loading, empty, invalid, denied or error states
   - an implicit persisted-data or API contract
   - an implicit trusted actor or tenant scope
   - a route, file or component the user cannot reach
   - an acceptance criterion that cannot be observed
   - scope bigger than one slice
   - anything built without a current need (`rules.md` rule 11)
8. Decide open questions. A material decision the docs do not settle (public API or contract, security or permissions, persisted data shape, external integration) goes under `## Open questions`; do not guess it. For a reversible internal detail, pick one, record it under Risks / Assumptions, and continue. Write `- None` when nothing is open.
9. Create `.buildkit/features/<slug>/spec.md` and `acceptance.md`, each written once. Fill `Base:` with the output of `git rev-parse HEAD` and `Sensitive:` with yes when the work touches authentication, data handling, user input, payments, or external API or network calls; otherwise no.
10. Set `.buildkit/state.md` to `Lifecycle Gate: awaiting approval` and record the current feature.
10a. Run `node .buildkit/bin/crosscheck.js policy`. If it reports `plan: true`, follow `.buildkit/workflow-skills/crosscheck/references/gates.md` before stopping.
11. STOP. Do not write application code. Report any open questions first, then wait for explicit approval (`/implement` records it in `state.md`).

`spec.md` must reference the root source-of-truth files rather than duplicating project-wide technical rules. Acceptance criteria use stable IDs such as `AC-01`.
