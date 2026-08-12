# [Project Name] — Implementation Plan

## Phasing Philosophy
One or two sentences on the sequencing logic for this specific project — e.g. "auth and data model first since every later phase depends on them; UI polish deferred to the end of each phase rather than done globally at the end."

## Phase 0 — Project Setup
- [ ] Initialize repository
- [ ] Configure [language/framework tooling]
- [ ] Configure linting and formatting
- [ ] Configure environment variables / secrets handling
- [ ] Set up CI (even minimal — lint + typecheck on push)

## Phase 1 — [Name, e.g. "Authentication"]
**Depends on:** Phase 0
**Delivers:** [what a user/stakeholder can actually do once this phase is done]
- [ ] [Specific task]
- [ ] [Specific task]
- [ ] Tests

## Phase 2 — [Name]
**Depends on:** [prior phase(s)]
**Delivers:** [outcome]
- [ ] [tasks...]

*(continue for every phase needed to reach MVP scope as defined in PRD.md)*

## Definition of Done
Applies to every task in every phase — a task is not complete unless all of these are true:
- [ ] Implementation exists and matches the requirement it traces to
- [ ] Type checking passes (if applicable to the stack)
- [ ] Tests pass, including new tests for this task's logic
- [ ] Edge cases handled (empty states, error states, boundary values)
- [ ] UI states handled where applicable (loading, empty, error)
- [ ] Security gate passed for any task touching auth, data handling, user input, payments, or external calls — per rules.md's Security Gate section
- [ ] Progress.md updated to reflect this task's completion
