# Progress.md — Template & Writing Rules

**Owns:** current, real-time state of the project against the plan. **The only file of the six that changes on every work session.** Never contains: requirement definitions, architectural reasoning, or technology justification — reference phase/feature names from the other files, don't restate their content.

## The core discipline this file exists to enforce

Never let this file say "the project is complete" or "phase 2 is done" without it being independently verifiable against `Implementation_plan.md`'s Definition of Done. This file's entire value is being a trustworthy, current snapshot — not a status message. An agent (or a person) picking up the project after a gap should be able to read this file alone and know exactly what state things are in and what to do next, without re-deriving it from the codebase.

## Required structure

```markdown
# [Project Name] — Progress

## Current Phase
[Exact phase name from Implementation_plan.md — not a paraphrase]

## Overall Progress
[Visual or numeric — e.g. a simple bar/percentage against total phases, or "X of Y phases complete"]

---

## Completed
- [x] [Task — matches wording in Implementation_plan.md]

## In Progress
- [ ] [Task currently being worked on]

## Blocked
[Specific blocker and what's needed to unblock it — or "None"]

## Next Tasks
1. [Next task, in priority order]
2. [Next task]

## Known Issues
- [Any known bug/gap not yet fixed — or "None"]

## Decisions Made
[Running log of notable decisions made during implementation that weren't pre-planned in architecture.md's ADRs — small implementation-level calls, not architectural ones. If a decision is architectural, it belongs as an ADR in architecture.md, cross-referenced here, not duplicated in full.]
- [decision] — [one-line reason]

## Session Log
[Optional but recommended for longer projects — one line per work session]
- [date]: [what was done this session]

## Last Updated
[date]
```

## Writing rules specific to this file

- Update this file at the end of every meaningful work session — not just when a phase fully completes. An "In Progress" section that's empty when real work is mid-flight is a sign this file went stale.
- Never mark something "Completed" unless it actually satisfies `Implementation_plan.md`'s Definition of Done (implementation exists, tests pass, edge cases handled) — a task that "mostly works" belongs in "In Progress," not "Completed."
- If a session reveals the plan itself needs to change (a phase needs splitting, a task was harder than scoped), note it here AND go update `Implementation_plan.md` — don't let the two silently diverge.
- Keep the Session Log terse — one line per session is enough; this is a trail for context recovery, not a narrative.
