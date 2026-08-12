---
name: superpowers
description: Use this skill for any non-trivial coding task before writing code: feature builds, bug fixes, refactors, or anything with more than one logical step. Enforces a plan-first, test-driven workflow instead of jumping straight to code. Trigger on 'build me', 'implement', 'add a feature', 'fix this bug', or any multi-file change.
---

# Superpowers — Plan-First, Test-Driven Build Discipline

A workflow skill, not a code generator. It stops Claude from writing code before thinking, and stops Claude from calling a task done before it's verified.

## The core loop

1. **Restate the task in one paragraph.** If any part is ambiguous (which entity owns this data, what happens on failure, what the empty state looks like), state the assumption explicitly rather than silently picking one.
2. **Write the plan before the code.** A short numbered list: files touched, new files created, data model changes, and the order of operations. For anything touching shared state (a database schema, a public API contract), call out the migration or versioning implication.
3. **Write the test (or acceptance criteria) before the implementation.** If there's a test runner in the repo, write a failing test first. If there isn't one, write out 3-5 concrete acceptance criteria as comments or a checklist — "given X input, returns Y", "rejects malformed Z with a 400" — before touching the implementation file.
4. **Implement the smallest slice that could pass.** Don't build the whole feature in one pass if it can be decomposed. Ship the core path, then edge cases, then polish — and say out loud which step you're on.
5. **Run it. Actually run it.** Never report a task as done without executing the test suite, the build, or the script. If there's no automated way to verify, describe exactly what manual check you performed.
6. **Report deltas, not just success.** If you deviated from the plan (a library didn't support something, an edge case forced a different data shape), say so — don't silently reconcile the story after the fact.

## Anti-patterns this skill exists to prevent

- Writing 200 lines of code for a task that needed 20, because no plan was made first.
- Claiming "this should work" without running it.
- Silently changing scope mid-task without flagging it.
- Skipping error handling because the happy path worked in one manual test.
- Big-bang refactors when an incremental path existed and was safer.

## When to skip this

Single-line fixes, config value changes, or anything genuinely one-shot with no ambiguity. Don't ceremony-ize trivial work — that itself violates the "no filler" principle.
