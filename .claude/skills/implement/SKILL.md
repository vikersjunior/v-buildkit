---
name: implement
description: Use this whenever the user wants to continue building a project that already has an approved Implementation_plan.md and Progress.md — e.g. "let's keep building", "do the next task", "implement the next phase", or explicit "/implement". Picks up the next task from Implementation_plan.md and Progress.md, implements it following rules.md, then updates Progress.md.
---

0. If `.buildkit/state.md` exists and the current feature is `awaiting approval`, do not implement until the user explicitly approves it. Note: All BuildKit project documentation files (`Progress.md`, `Implementation_plan.md`, `rules.md`, `Tech_stack.md`, `architecture.md`, `PRD.md`) are resolved relative to the configured documentation root in `.buildkit/config.json` (defaulting to project root).
1. Read `Progress.md` (in configured documentation root) to determine current phase and next task(s).
2. Read `Implementation_plan.md` to confirm the exact scope and Definition of Done for that task.
3. Read `rules.md` and follow it strictly during implementation — coding conventions, dependency constraints, testing bar.
4. Read `Tech_stack.md` and `architecture.md` as needed for the relevant component — don't introduce a technology or structural pattern not already established there without flagging it as a proposed change first.
5. If `Implementation_plan.md` shows this task belongs to a sub-project with other independent work already active elsewhere (see the `spec-driven-dev` skill's git worktrees section), consider suggesting a worktree for this task rather than switching the whole repo's branch — but only when the sub-projects are genuinely independent (don't touch overlapping files); for a monolithic codebase, sequential work on one branch is usually simpler and avoids merge-conflict overhead. If a worktree is used, explicitly verify environment config, dependencies, and the correct working directory are set up in the new worktree before implementing — a fresh worktree does not inherit gitignored files or installed dependencies from the main checkout.
6. Implement the task as the smallest coherent, independently testable slice. If `.buildkit/features/<slug>/spec.md` exists, use the approved feature spec and acceptance criteria as the immediate contract while the six project documentation files remain authoritative for project facts.
7. Verify against the Definition of Done from `Implementation_plan.md` and the current feature acceptance criteria before considering the implementation slice complete: implementation exists, type checking passes (if applicable), tests pass, edge cases and UI states (loading/empty/error) handled where applicable.
7a. **Security gate — check this before step 7 can pass, not after.** If the task touches auth, data handling, user input, payment flows, or external API/network calls, and the project has a security-auditor, vulnerability-scanner, or equivalent tool installed (check the agent-specific directories documented in `.buildkit/agent.md` listed in `.buildkit/agent.md` for one), run it against the changed code before marking the task done. Treat any HIGH-severity finding as blocking — fix it or explicitly flag it to the user with the specific risk, don't silently proceed past it. If no such tool is installed, at minimum self-check against `rules.md`'s Security Gate section: no hardcoded secrets, input validated at the boundary, no client-side-only validation on anything that matters, no auth check silently skipped.
8. Update `Progress.md` (in configured documentation root): move the task from "In Progress"/"Next Tasks" to "Completed," update "Current Phase" if the phase is now fully done, log any notable implementation-level decision under "Decisions Made," add a one-line Session Log entry, update "Last Updated."
9. If this task revealed that the plan itself needs to change (task was larger than scoped, a dependency was missed), update `Implementation_plan.md` too and note why in `Progress.md` — don't let the two silently diverge.
10. Report back what was done, referencing the exact task name from `Implementation_plan.md` — not a vague "made progress" summary.


## BuildKit V2 feature lifecycle

For feature-scoped work, `/implement` stops after implementation and normal developer verification. It does not silently run `/check`, `/audit`, or `/complete`; those remain explicit gates.
