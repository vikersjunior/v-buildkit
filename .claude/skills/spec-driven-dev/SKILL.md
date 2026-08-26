---
name: spec-driven-dev
description: Always use this skill at the start of any new coding project, the moment the user describes a project idea, app concept, or feature they want built — before writing any code. Generates the full spec-driven-development document set (PRD.md, architecture.md, Tech_stack.md, Implementation_plan.md, rules.md, Progress.md) in the correct dependency order, in one pass, with no placeholders. Also use this skill any time the user asks to "set up spec docs," "start a new project properly," "generate the PRD/architecture/etc," or references any of these six files by name. After initial generation, this skill also governs how these six files get updated as the project evolves — use it whenever a completed milestone, a scope change, or a new decision needs to be reflected back into the docs.
---

# Spec-Driven Development — 6-File Project Scaffold

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

## Where this kit sits on the spec-driven-development spectrum

Spec-driven development has three recognized levels of commitment (see Birgitta Böckeler's framing, referenced in Martin Fowler's writing on the topic): **spec-first** (a well-thought-out spec is written before implementation), **spec-anchored** (the spec is kept alive and revisited throughout the project, not abandoned once coding starts), and **spec-as-source** (the spec becomes the primary artifact a human edits; code is treated as generated output and the human never touches it directly).

This kit targets **spec-first with spec-anchored discipline** — the six files are generated before implementation, and `Progress.md` plus `/spec-review` exist specifically to prevent them from being abandoned once coding starts (the common "spec-once" failure mode, where a good spec launches a project and is then never looked at again). This kit does not implement spec-as-source — you and any agent working in the project still read and write code directly; the spec constrains and documents that work rather than replacing it.

## Large / multi-stack projects — splitting into sub-projects

For a project large enough to naturally decompose into genuinely independent deployable units (e.g. a separate infrastructure stack and an application stack, or multiple services with different deploy lifecycles), a single flat `Implementation_plan.md` phase list can become unwieldy. In that case:

- Keep one `PRD.md` and one `architecture.md` at the project root — the overall requirements and system shape are still one coherent story.
- Structure `Implementation_plan.md` around named sub-projects, each with its own phase sequence and explicit dependency on the others (e.g. "Sub-project A: Infrastructure — must complete Phase 2 before Sub-project B: API Service can begin its Phase 1"). This mirrors building genuinely modular, independently testable stacks rather than one monolithic build sequence.
- `Progress.md`'s "Current Phase" should track per sub-project once this split happens, not a single global phase number — otherwise it stops accurately reflecting reality on multi-track work.
- Don't split into sub-projects prematurely — if the whole thing can be reasonably sequenced as one phase list, do that; the split is for genuine independent-deployability cases, not a default structure.

## Parallelizing work with git worktrees (use sparingly, and only when it earns its cost)

Once `Implementation_plan.md` has genuinely independent sub-projects or phases, git worktrees let separate work happen in separate directories on separate branches without constant branch-switching — each worktree checks out its own branch while sharing the same repository history.

**When this is worth it:** two or more phases/sub-projects that are truly independent (don't touch overlapping files) and both need active work right now — not as a default parallelization habit for every project.

**When it isn't:** a monolithic codebase where "independent" phases still touch shared files. Parallel work on a shared monolith produces real merge conflicts on integration, not just theoretical risk — resolve via `git rebase` (not merge, to keep linear history) when it happens, and expect it to happen if file overlap exists between the parallel branches.

**Before starting a worktree, verify these explicitly — this is the actual failure mode, not a hypothetical:**
- A fresh worktree does NOT inherit gitignored files — environment config, `.env` files, local secrets, and installed dependencies all need to be set up again in the new worktree directory. Skipping this produces confusing "why isn't my change showing up" debugging sessions that are actually just "you're running the old worktree/branch."
- Confirm which directory and branch a terminal session or IDE window is actually pointed at before making changes or testing — running the app from the wrong worktree while editing in the right one (or vice versa) is the single most common mistake here.

If `/implement` is invoked on a task that's part of an independent sub-project/phase with other active work in flight elsewhere, it's reasonable to suggest a worktree — but always flag the setup steps above explicitly rather than assuming the environment carries over.

## Why this kit doesn't orchestrate agent teams

Claude Code supports "agent teams" — multiple teammates sharing a task list and working in parallel, distinct from subagents (which only report back to a main agent). This kit's `/implement` skill deliberately runs sequentially, one task at a time, rather than spawning a team, based on a documented real-world finding: for typical solo-developer feature work (4-6 requirements per task, most implementations completing in 15-20 minutes regardless of team size), agent teams add real costs — each teammate carries its own context window (a team of 4 can burn ~4x the tokens of a solo session for the same work), coordination has known rough edges, and the actual bottleneck in practice is specification quality and review bandwidth, not implementation speed. Agent teams pay off specifically for larger organizations running many developers against many genuinely independent, non-overlapping feature requests in parallel — not for the single-developer, spec-first workflow this kit is built around. If that changes for a given project (multiple people, genuinely parallel non-overlapping workstreams), that's a deliberate call to make explicitly, not something this kit does by default.

## Coexisting with other installed specialist agents/skills

This kit ships its own 70-skill catalog at `.buildkit/skills-library/` (organized by department: developers, design, marketing, social/content, finance, operations, legal — plus a design `external-community/` subfolder of sourced third-party design-taste skills). That catalog is **inert by default** — sitting in `skills-library/` doesn't make a skill active or auto-triggering. `spec-init` (during initial generation) and `tools-check` (periodically afterward) are the two places that match catalog skills against a project's actual `PRD.md`/`architecture.md` and, on confirmation, promote the matched ones by copying their folder into the native active skills directory listed in `.buildkit/agent.md` where they become live. This keeps each project's active skillset intentional and lean instead of running all 70 by default.

Beyond this kit's own catalog, a project may also have other Claude Code agents/skills installed from elsewhere entirely (e.g. a third-party marketplace CLI). Installing more of these is fine and doesn't dilute this kit's quality — **but only if they're kept out of the spec-generation phase and confined to implementation.**

**The specific failure mode to prevent:** `PRD.md` and `architecture.md` are deliberately technology-agnostic by this skill's ownership rules (see the ownership table above) — no frameworks, no specific implementation opinions, until `Tech_stack.md` deliberately introduces them. A broadly-triggering specialist skill (a frontend/backend "senior" skill, a framework-specific best-practices skill) can plausibly fire *during* `spec-init`'s document generation and start injecting implementation-specific opinions into a document whose entire job is staying implementation-free — this is the actual disruption risk, not "too many tools installed."

**The rule:** during `spec-init`'s generation of `PRD.md` and `architecture.md` specifically, do not let any general capability/best-practices skill override or add content beyond what those files' templates call for — technology and implementation-specific guidance belongs in `Tech_stack.md`'s Capability Tools In Use section and surfaces during `/implement`, not during initial spec generation. A skill oriented around open-ended ideation/brainstorming should especially not be allowed to expand `spec-init`'s deliberately minimal one-question-max intake into a longer discovery interview — that's a direct conflict with this kit's stated intake discipline (and with `ideate`'s own scoped intake discipline, if that's the skill in play), and this kit's discipline takes precedence during both `ideate` and `spec-init`.

**During `/implement`,** the opposite is true — specialist agents/skills relevant to the task at hand (whether promoted from this kit's `skills-library/` or installed from elsewhere, per `Tech_stack.md`'s Capability Tools In Use section) should be used freely; this is exactly where they add value, applying focused expertise to code that's already scoped by an approved spec.

**Avoid name collisions.** If installing third-party skills that share a name with a skill already present in `.buildkit/skills-library/` or the native active skills directory listed in `.buildkit/agent.md` (this kit's own catalog uses names like `mcp-builder`, `canvas-design`, `code-reviewer` that are common enough to collide with similarly-named skills from other sources), resolve the collision before relying on either — rename one, or remove the duplicate — rather than leaving two differently-authored skills with the same name and an ambiguous trigger priority. `tools-check` flags these automatically; still worth checking manually the first time a new external source gets installed.

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
