# Tech_stack.md — Template & Writing Rules

**Owns:** the specific technologies, frameworks, libraries, and vendors chosen to implement the architecture. **Never contains:** why the product needs a feature (`PRD.md`) or how components are structured conceptually (`architecture.md` — this file names the tools, architecture.md names the shape). If you're explaining what a component *does* rather than *which tool implements it*, that content belongs upstream.

## Selection discipline — apply before naming a single technology

Never default to a technology because it's popular or familiar. Run every choice through this sequence and be prepared to show the work:

```
Requirement (from PRD.md / architecture.md)
        ↓
Constraint (team skillset, budget, region-specific infra, timeline)
        ↓
Existing ecosystem (what's already chosen elsewhere in the stack that this needs to fit)
        ↓
Candidate technologies
        ↓
Chosen technology + justification
```

A technology with no traceable requirement behind it doesn't belong in the stack — this is the single biggest source of unnecessary complexity in a young codebase.

## Required structure

```markdown
# [Project Name] — Technology Stack

## Frontend
- [Framework]
- [Language]
- [Styling approach]
- [Component library, if any]

## Backend
- [Framework/runtime]
- [Database]
- [ORM/query layer]

## Authentication
- [Auth provider/library]

## State Management
- [Client state approach]

## Validation
- [Validation library]

## Testing
- [Unit/integration test framework]
- [E2E test framework]

## Deployment
- [Hosting/deployment target]

## Infrastructure
- [CDN, storage, queues, cron/background jobs — whatever applies]

## Third-Party Services
- [Payments, email, SMS, analytics, etc. — name the actual vendor]

## Development Tools
- [Linting, formatting, CI]

## Why These Technologies?

### [Technology name]
**Requirement it serves:** [trace back to PRD/architecture]
**Why this over alternatives:** [the actual reasoning]
**Alternatives considered:** [what else was evaluated and why it lost]

*(repeat for every non-obvious choice — trivial choices like "we're using Git" don't need justification, meaningful ones like database or auth-provider choice do)*

## Technology Constraints
Explicit boundaries on what NOT to introduce, so future work (human or agent) doesn't casually add a second ORM, a second state management library, or a redundant dependency:
- Do not introduce [X] — [reason]
- Do not introduce [Y] — [reason]
- Do not add a new dependency without checking whether an existing one in this stack already covers the need

## Version Pins
Lock exact major versions for anything where breaking changes between versions matter (framework, language, ORM). Minor/patch can float; major versions should be explicit and only bumped deliberately.

## Capability Tools In Use
If the project has specialist Claude Code agents/skills installed beyond this kit (e.g. a frontend specialist, a mobile-design skill, an SEO-optimization skill, a prompt-engineering skill), list which ones are actually relevant to THIS project here — not every installed tool applies to every project. This is what lets `rules.md` and `/implement` reference them by name instead of guessing which of a large installed toolset should fire for a given task.

- [Tool name] — relevant for: [which part of this project it applies to, e.g. "frontend component work" or "no relevance — backend-only API project, do not expect this to fire"]

A tool installed globally but not listed here as relevant to this project should not be assumed to apply — this section is the single source of truth for "which specialist tools are in scope for this project," same discipline as everything else in this file.
```

## Writing rules specific to this file

- Every entry needs a one-line reason it exists tied to an actual requirement — a stack list with no justification is not useful six months later when someone (human or agent) is deciding whether to add something new.
- The Technology Constraints section is not optional — it's what prevents dependency sprawl and is one of the most-cited sections when `rules.md` enforces "don't introduce X without justification."
- For projects with region-specific infrastructure needs (e.g. Mobile Money integration for African markets, specific local payment rails), name that constraint explicitly here rather than assuming a Western-default payment stack transfers directly.
