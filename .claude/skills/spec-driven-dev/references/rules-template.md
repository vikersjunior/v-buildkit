# rules.md — Template & Writing Rules

**Owns:** how THIS project specifically should be developed — coding conventions, dependency discipline, review checklist. **Never contains:** general AI-agent behavior instructions (that belongs in `CLAUDE.md`/`AGENTS.md`, a separate file — see distinction below), requirement definitions, or architectural reasoning.

## The critical distinction: rules.md is not CLAUDE.md / AGENTS.md

These are two different files with two different jobs. Conflating them is the most common mistake in setting this system up.

| | `CLAUDE.md` / `AGENTS.md` | `rules.md` |
|---|---|---|
| **Answers** | How should any AI agent behave in this repo, in general? | How should THIS PARTICULAR project be engineered? |
| **Scope** | Agent conduct — when to ask vs. proceed, how to report status, tool-use conventions | Code conventions, dependency policy, testing bar, git discipline — specific to this project's stack and standards |
| **Changes when** | Rarely — it's closer to a standing personal/org preference file | Whenever the project's tech stack, conventions, or standards evolve |
| **Portable across projects?** | Often yes, largely reusable | No — tied to this specific project's stack (see `Tech_stack.md`) |

If a rule would apply identically to every project regardless of stack ("always run tests before claiming a task is done"), it likely belongs in `CLAUDE.md`/`AGENTS.md`. If a rule only makes sense given this project's specific stack ("never introduce a second ORM alongside Drizzle"), it belongs in `rules.md`.

## Required structure

```markdown
# [Project Name] — Development Rules

## General
1. Read PRD.md, architecture.md, Tech_stack.md, and Implementation_plan.md before making any change that isn't a trivial fix.
2. Never implement functionality not defined in PRD.md — flag scope gaps instead of silently filling them.
3. Never change the architecture without adding an ADR to architecture.md documenting why.
4. Never introduce a new dependency without a stated justification (see Tech_stack.md's Technology Constraints section).
5. Keep implementation aligned with Tech_stack.md — don't substitute a different library for one already chosen without updating that file first.

## Planning
6. Complete/review the relevant Implementation_plan.md phase before writing code against it.
7. Break large tasks into small, independently testable chunks.
8. Ask for clarification only when a requirement is genuinely ambiguous and guessing wrong would be costly to unwind — state an assumption and proceed otherwise.

## Code
9. [Language-specific strictness rule, e.g. "Use TypeScript strictly, avoid `any`"]
10. Prefer reusable, composable components/functions over one-off duplicated logic.
11. Avoid unnecessary abstraction — don't build a plugin system for a feature that will only ever have one implementation.
12. Keep functions/components focused on one responsibility.
13. Follow this project's established naming conventions (define them here once established, don't leave this generic).

## UI (if applicable)
14. Follow the established design system / component library.
15. Every view must handle loading, empty, and error states — not just the happy path.
16. Ensure responsive behavior across the target device range stated in PRD.md.

## Testing
17. Add tests for meaningful business logic — not for trivial getters/setters or pure UI markup.
18. Run tests before marking any task complete in Progress.md.
19. Run type checking before marking any task complete.

## Security Gate
20. Before marking any task complete that touches auth, data handling, user input, payments, or external API calls, run a security/vulnerability check if one is available in the project's tooling (e.g. a `security-auditor` or `vulnerability-scanner` skill/agent) — treat a HIGH-severity finding as blocking, not advisory.
21. Never commit hardcoded secrets, API keys, or credentials — verify they're in environment variables and `.gitignore` covers env files, checked every time, not just at project setup.
22. Treat all user input as untrusted by default — validate and sanitize at the boundary, not deep inside business logic where it's easy to miss a path.
23. Flag (don't silently implement) anything that looks like it's building toward storing sensitive data unencrypted, skipping auth checks on a route that needs them, or trusting client-side validation as the only validation.

## Documentation & Spec Maintenance
24. Update Progress.md after any meaningful unit of work — not just at session end.
25. Update architecture.md (with an ADR) when an architectural decision changes.
26. Update PRD.md when requirements change — don't let implementation silently diverge from a stale PRD.
27. Update Implementation_plan.md when scope changes shift the phase breakdown.

## Git
28. Keep commits focused — one logical change per commit.
29. Do not mix unrelated changes in a single commit — focused commits are what make a bad change actually revertible.
30. Never commit secrets or credentials — verify .gitignore covers env files before first commit.
```

## Writing rules specific to this file

- Every rule should be specific enough to be checkable — "write good code" isn't a rule, "avoid `any` in TypeScript" is.
- Pull the Code and Testing sections' specifics directly from what's named in `Tech_stack.md` — a generic rules.md that could apply to any stack isn't doing its job.
- This file should function as the project's actual constitution — strict enough that violating it is a clear, nameable event, not vague enough to be gamed.
- **The Security Gate section only has teeth if it's enforced at completion time, not left as a suggestion.** If the project has installed a security-auditor, vulnerability-scanner, or code-reviewer tool (via Claude Code agents/skills or otherwise), reference it by name here and make its use a literal precondition in `Implementation_plan.md`'s Definition of Done — a tool that exists but isn't wired into the completion checklist gets skipped under deadline pressure, which is exactly when it's needed most.
