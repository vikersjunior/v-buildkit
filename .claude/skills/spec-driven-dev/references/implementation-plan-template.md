# Implementation_plan.md — Template & Writing Rules

**Owns:** the sequencing of work — what gets built in what order, and what "done" means for each unit of work. **Never contains:** requirement definitions (`PRD.md`), architectural reasoning (`architecture.md`), or technology justification (`Tech_stack.md`) — reference those by name, don't restate them.

## Phasing discipline

- Every phase should be small enough to be independently testable and independently shippable in principle — a phase that can't be verified as working on its own is too large and should be split.
- Order phases by dependency, not by perceived importance — auth typically comes before anything requiring a logged-in user, data models before the UI that displays them, not the reverse.
- Every phase must trace to specific requirements in `PRD.md` — if a phase doesn't map to any stated requirement, question whether it's actually needed or whether the PRD is missing something.

## Required structure

```markdown
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
```

## Writing rules specific to this file

- For projects large enough to decompose into genuinely independent deployable units (separate infrastructure and application stacks, multiple services with different deploy lifecycles), structure phases under named sub-project headings with explicit cross-sub-project dependencies instead of one flat phase list — see the skill's "Large / multi-stack projects" section for the full pattern. Don't do this by default; only when independent deployability is real.
- Break large features into small, independently testable chunks — a phase item like "build the dashboard" is too large; break it into the specific pieces (layout, data fetching, empty state, loading state, interaction) each as its own checkable item.
- Every phase needs an explicit "Delivers" line — a stakeholder or agent picking this up mid-project should be able to tell what capability exists after each phase without reading the code.
- Don't front-load every possible task into Phase 1 out of thoroughness — phases exist specifically so review and course-correction can happen between them; cramming everything into one giant phase defeats that.
