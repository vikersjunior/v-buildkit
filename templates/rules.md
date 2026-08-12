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
