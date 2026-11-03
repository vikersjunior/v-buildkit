---
name: tools-check
description: Audits installed capability skills and agents against this project's Tech_stack.md and PRD.md, flagging tools that are relevant but unused, listed but irrelevant, or colliding by name. Use for /tools-check, "what tools should I be using", "am I using the right skills", after installing new skills, or periodically on a long project.
---

# Tools Check — Periodic Capability Audit

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

`spec-init` matches capability tools once, at project start, against the PRD and architecture as they existed then. This skill re-runs that matching later — after the project has evolved, or after new tools have been installed — since neither of those staying in sync with `Tech_stack.md`'s Capability Tools In Use section is automatic.

## Workflow

1. Read `PRD.md`, `architecture.md`, and `Tech_stack.md` (specifically its Capability Tools In Use section, resolved from the configured documentation root in `.buildkit/config.json`) for the project's current actual state.
2. Enumerate what's actually available: this kit's `.buildkit/skills-library/` (all 7 departments plus `02-design/external-community/` — currently inert, catalog-only) and this kit's active the native active skills directory listed in `.buildkit/agent.md` (the six workflow skills plus anything already promoted from the library), plus any other Claude Code agents/skills installed outside this kit.
3. Compare and report, in three categories — don't just say "looks fine," name specifics:
   - **Relevant but not active** — a genuine match exists between something in `PRD.md`/`architecture.md` and a skill sitting in `.buildkit/skills-library/` that hasn't been promoted into the native active skills directory listed in `.buildkit/agent.md`. Propose promoting it (copy the folder from `skills-library/<department>/<skill-name>/` into `<native active skills directory>/<skill-name>/`), with the specific requirement it would serve.
   - **Active but no longer relevant** — a skill was promoted into the native active skills directory listed in `.buildkit/agent.md` and referenced in `Tech_stack.md`, but no longer traces to anything in the current `PRD.md` (scope changed since it was added). Propose either removing it from the native active skills directory listed in `.buildkit/agent.md` or at minimum flagging the stale reference in `Tech_stack.md` — an unused active skill is unnecessary trigger-ambiguity surface, not just a documentation gap.
   - **Name collisions** — two installed skills (from this kit's library or any other source) share a name or near-identical trigger description, creating ambiguous activation. Flag this explicitly regardless of whether either is currently active — it's a latent problem worth resolving before it causes confusing behavior, not just when it's actively causing one.
4. Present findings, then apply changes (promote/demote skills, update `Tech_stack.md`'s Capability Tools In Use section) only if the user confirms — this skill reports and proposes, it doesn't silently rewrite the active skillset or the spec.

## What this is not

Not a replacement for `spec-review`, which checks the six files for internal consistency with each other. This skill checks the six files against what's actually available in the toolset — a different axis, worth running separately, not folded into the same pass.
