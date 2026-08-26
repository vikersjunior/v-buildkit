---
name: feature
description: Use this when the user wants to define one implementation-ready feature from an approved project spec, including explicit /feature requests. Creates a small feature specification and acceptance criteria in .buildkit/features/ without writing application code.
---
# Feature — Feature Specification Gate

`/feature` turns one bounded item from `Implementation_plan.md` into an implementation-ready contract before code changes.

Read `PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md` (resolved from the configured documentation root in `.buildkit/config.json`, defaulting to project root), and `.buildkit/state.md` as relevant.

1. Identify the exact plan item and PRD/architecture traceability.
2. Define the smallest coherent implementation slice.
3. Define scope, non-goals, dependencies, affected components, risks and assumptions.
4. Define explicit acceptance criteria, including loading, empty, error, permission, security and accessibility states where relevant.
5. Define verification commands/approach.
6. Create `.buildkit/features/<slug>/spec.md` and `acceptance.md`.
7. Set `.buildkit/state.md` to `Lifecycle Gate: awaiting approval` and record the current feature.
8. STOP. Do not write application code. Wait for explicit approval.

`spec.md` must reference the root source-of-truth files rather than duplicating project-wide technical rules. Acceptance criteria use stable IDs such as `AC-01`.
