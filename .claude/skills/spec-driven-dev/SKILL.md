---
name: spec-driven-dev
description: Owns the six spec files (PRD.md, architecture.md, Tech_stack.md, Implementation_plan.md, rules.md, Progress.md), their templates, order and update rules. Use when one of these files must be written or updated after a milestone, scope change or new decision, or when the user names one of them. For a brand-new project use spec-init; for a vague idea use ideate.
---

# Spec-Driven Development — 6-File Project Scaffold

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

Generates six interlocking documents for any new coding project: `PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`. These aren't six independent documents — they're one coherent spec split by function, each with a narrow, non-overlapping job. Treat them as a system, not a checklist.

## Where this fits in the full ideation-to-product system

This skill is the core of a larger kit; the full lifecycle runs: `ideate` (turn a vague idea into a crisp brief — only if the idea isn't crisp yet) → `spec-init` (this skill's generation workflow, plus matching relevant tools from `.buildkit/skills-library/`) → approval gate → `implement` (looped per task, with a mandatory security gate) → `progress` / `spec-review` / `tools-check` as needed throughout → `distill-skill` at the end. Each of those is its own skill with its own file — this skill is specifically the six-file generation and maintenance engine at the center of that loop, not the whole system by itself.

## Documentation Root Resolution

BuildKit project documentation location is configured in `.buildkit/config.json` under `docs.root`.

Before reading or writing any of the six project documentation files (`PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`):
1. Check if `.buildkit/config.json` exists in the project root.
2. Read the `docs.root` relative path string (e.g., `docs/buildkit`, `docs/specs`, or `.`).
3. If `.buildkit/config.json` does not exist or has no `docs.root` defined, default to the project root (`.`).
4. Read and write all six documentation files relative to the resolved documentation root directory.
5. **Never assume BuildKit documentation files are located at the project root.**

## Core principle: single source of truth per fact

Every fact about the project lives in exactly one file. Every other file references it, never restates it in its own words. This is the single most common failure mode in hand-written spec docs — a requirement gets tweaked in the PRD and nobody updates the matching line in architecture.md, and six weeks later the two documents actively disagree.

Ownership map — memorize this before writing anything:

| Fact type | Owned by | Everyone else does this |
|---|---|---|
| What the product does, for whom, why | `PRD.md` | References by feature name, never restates the requirement |
| How the system is shaped — components, data model, data flow | `architecture.md` | References by component name |
| What specific technologies/libraries/services are used | `Tech_stack.md` | References by name only ("uses the auth service defined in Tech_stack.md"), never repeats version numbers or config elsewhere |
| Sequencing, phases, what's built when | `Implementation_plan.md` | Nobody else describes build order |
| Coding conventions, agent behavior constraints, review checklist | `rules.md` | Nobody else states a coding rule |
| Current state — done, in progress, blocked, next | `Progress.md` | The only file that changes on every work session; nothing else tracks status |

If you catch yourself about to write a paragraph in `Tech_stack.md` about *why the product needs this feature* — stop, that fact belongs in `PRD.md`. If you're about to describe *what database schema results from an architectural decision* inside `PRD.md` — stop, that belongs in `architecture.md`.

## Generation order (mandatory — do not skip or reorder)

Each file depends on decisions locked in the previous one. Generating out of order produces documents that contradict each other on the first real edit.

1. **PRD.md** — what and why, before anything else. No technical decisions yet.
2. **architecture.md** — how the system is shaped to satisfy the PRD. No specific libraries/vendors yet — components and data flow only.
3. **Tech_stack.md** — the specific technologies chosen to implement the architecture. This is where libraries, frameworks, and vendors get named.
4. **Implementation_plan.md** — sequenced phases to build the architecture using the chosen stack.
5. **rules.md** — conventions and constraints for anyone (human or agent) writing code against this plan.
6. **Progress.md** — initialized last, as a tracker against the phases defined in Implementation_plan.md.

## Workflow

### Step 1 — Intake

Take the project idea/description as given. Do not interrogate the user with a long clarifying-questions form before producing anything — that's the "drip" failure mode. Instead:

- Extract everything statable from what's already been said.
- For anything load-bearing but unstated (target platform, expected scale, must-have vs. nice-to-have features, hard technical constraints), make the most reasonable inference and **label it explicitly as an assumption** inside the relevant file (e.g., "**Assumption:** web-first, mobile-responsive, no native app in v1 — flag if incorrect"). Never silently invent a load-bearing fact without flagging it.
- Only ask a clarifying question up front if a genuinely blocking ambiguity exists that would make every downstream file wrong if guessed incorrectly (e.g., "is this a consumer app or an internal tool" when the answer changes the entire PRD). One question maximum, and only if truly blocking — otherwise proceed and flag assumptions.

### Step 2 — Generate all six files in one pass

Follow the generation order above. Use the templates in `references/` for exact section structure — read the relevant reference file before writing each document, don't improvise structure from memory. Write real, specific content — no `[TBD]`, no `[fill in later]`, no placeholder Lorem-ipsum-style text. If something is genuinely undecided at this stage (e.g., exact hosting provider), state the decision criteria and a recommended default, not a blank.

Deliver all six as actual files in the project root, in a single pass — never one file now and "the rest later."

### Step 2.5 — Present for approval before implementation begins

After generating the six files, present a short summary (project name, MVP scope from the PRD, chosen stack, phase count) and ask explicitly whether to proceed to implementation or revise the spec first. **Do not begin writing implementation code in the same turn the specs are generated** — spec-driven development's entire value is a review checkpoint between planning and building. If the user says "go" or gives no objection after being shown the summary, proceed. If they want changes, apply them through the same dependency-ordered update discipline as Step 4 below, not by patching files ad hoc.

This gate applies to initial generation only — once a project is underway, ordinary implementation work (picking up the next task in `Implementation_plan.md`) doesn't need a fresh approval round each time.

### Step 3 — Cross-file consistency pass

Before presenting the files as done, check:

- Does every feature named in `Implementation_plan.md` trace back to a requirement in `PRD.md`? If a phase references something not in the PRD, either the PRD is missing a requirement or the plan invented scope — fix one or the other.
- Does every component in `Tech_stack.md` correspond to a component named in `architecture.md`? A technology choice with no architectural role is either unnecessary or the architecture is incomplete.
- Does `rules.md` reference the actual stack (e.g., don't write generic "follow PEP8" rules into a project whose `Tech_stack.md` says TypeScript)?
- Is `Progress.md` initialized with Phase 0 = "not started" against the exact phase names used in `Implementation_plan.md`, not a paraphrase of them?

### Step 4 — Ongoing maintenance (after initial generation)

These files are living documents, not a one-time artifact. Re-trigger this skill's discipline whenever:

- **A milestone completes** → update `Progress.md` only. Don't touch the other five unless the milestone revealed the plan itself needs to change.
- **Scope changes** (a feature added/cut/changed) → update `PRD.md` first, then propagate: does this change `architecture.md`? Does it change `Tech_stack.md`? Does it reorder `Implementation_plan.md`? Update every downstream file the change actually touches, in the same dependency order as initial generation — never patch a downstream file without checking whether the upstream file needs the matching update first.
- **A technical decision is made or reversed** (e.g., switching databases) → update `Tech_stack.md`, then check whether `architecture.md` or `Implementation_plan.md` referenced the old choice by name and needs updating.
- **A new coding convention or constraint is adopted** → update `rules.md` only.

Never let `Progress.md` go stale — if a work session produced any completed work, blocked item, or new decision, it gets logged before the session ends. An out-of-date Progress.md is worse than none, because it actively misleads whoever (human or agent) reads it next to figure out what to do.

## Output format notes

- Use real markdown headers matching the templates — this is what makes the files scannable and what lets an agent (Claude Code, Cursor, etc.) reliably parse "what phase are we on" from `Progress.md` on session start.
- Keep `PRD.md` and `architecture.md` implementation-detail-free where the templates say so — mixing "what/why" with "how" inside the PRD is the most common structural mistake.
- For projects with an existing codebase (retrofitting these docs onto something already built), generate `architecture.md` and `Tech_stack.md` by reading the actual code first, not by inferring from the PRD — document what's true, not what was originally planned.

## Other skills, large projects and background

These live in `references/` so they load only when needed:

- `references/other-skills.md` — read during `spec-init` or `tools-check`, or when installing third-party skills. The rule that always applies: while `spec-init` generates `PRD.md` and `architecture.md`, no capability or best-practices skill may add implementation-specific content or expand the one-question intake. Specialist skills belong in `/implement`. The 70-skill `.buildkit/skills-library/` catalog is inert until a skill is promoted into the active skills directory.
- `references/sub-projects.md` — read when the plan needs independent sub-projects, or before suggesting a git worktree (it lists the setup a fresh worktree does not inherit).
- `references/background.md` — rationale: where this kit sits on the spec-driven spectrum, and why `/implement` runs sequentially instead of using agent teams.

## Reference files

Read the matching template before writing each document:

- `references/prd-template.md`
- `references/architecture-template.md`
- `references/tech-stack-template.md`
- `references/implementation-plan-template.md`
- `references/rules-template.md`
- `references/progress-template.md`

## `rules.md` vs. `CLAUDE.md` / `AGENTS.md` — do not conflate these

If the project also has (or will have) a `CLAUDE.md` or `AGENTS.md` file for general agent-behavior instructions, keep it strictly separate from `rules.md`:

- **`CLAUDE.md` / `AGENTS.md`** — how an AI agent should behave in general: when to ask vs. proceed, how to report status, tool-use conventions. Largely portable across projects.
- **`rules.md`** — how THIS project specifically should be engineered: coding conventions, dependency policy, testing bar, tied directly to what's named in `Tech_stack.md`. Not portable — regenerated per project.

Never write general agent-conduct instructions into `rules.md`, and never write project-specific coding conventions into `CLAUDE.md`/`AGENTS.md`. If both files exist, `rules.md`'s own header should note that `CLAUDE.md`/`AGENTS.md` (if present) governs agent conduct and this file governs project engineering standards, so a reader isn't left guessing why both exist.
