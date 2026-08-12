---
name: spec-init
description: Use this whenever the user describes a brand new project idea, app concept, or product they want to build and no PRD.md/architecture.md/Tech_stack.md/Implementation_plan.md/rules.md/Progress.md exist yet in the project. Also trigger on explicit invocation via "/spec-init", "bootstrap the spec", "set up spec-driven docs for this", or "generate the 6 files". Bootstraps the full spec-driven-development document set from a project idea, then gates on explicit user approval before any implementation code gets written.
---

Invoke the `spec-driven-dev` skill's full generation workflow (see the sibling `spec-driven-dev` skill for the complete ownership rules, generation order, and file templates this depends on).

If the idea arriving here is still vague — no clear problem, no clear user, or genuinely undecided between multiple different directions — hand off to the `ideate` skill first rather than guessing past real ambiguity; `ideate` converges on a crisp project description and passes it back here. If the idea is already specific enough (clear problem, clear user, rough sense of the core feature), proceed directly with the steps below.

1. Take the project idea/description already provided (or ask for it in one line if not yet given — "What are you building?" — nothing more elaborate than that).
2. Follow the intake discipline: infer what's inferable, flag load-bearing assumptions explicitly inside the relevant file, and ask at most one clarifying question — only if a genuinely blocking ambiguity exists that would make every downstream file wrong if guessed. Do not run a multi-question discovery interview.
   - If that one question is needed, present it as selectable options (a short menu of 2-4 concrete choices) rather than open text, with one option left for "something else — describe it." Selectable options are faster to answer and reduce ambiguity in the response itself compared to free text. Reserve genuinely open questions for cases where the space of reasonable answers can't be enumerated in a handful of options.
3. Generate `PRD.md` and `architecture.md` first, in that order, using the templates and ownership rules defined in the `spec-driven-dev` skill.
3a. **Match capability tools before generating `Tech_stack.md`.** Scan `.buildkit/skills-library/` (this kit's bundled 70-skill catalog, organized by department — see its own README) plus any other installed Claude Code agents/skills, against `PRD.md`'s requirements and `architecture.md`'s components. Identify genuine matches — a payments feature matching a security/compliance skill, a heavy custom-UI requirement matching a design-taste skill, a new third-party integration matching an MCP-building skill, and so on. Only propose a match where a real requirement drives it — do not pad the list with tools that sound generally useful but don't trace to anything in the PRD. It's normal and fine for a project to have zero or very few matches; don't force fits. Present the shortlist as a proposal, not a fait accompli.
3b. **On confirmation**, copy each confirmed skill's folder from `.buildkit/skills-library/<department>/<skill-name>/` into `<native active skills directory>/<skill-name>/` — this is what actually activates it for auto-triggering; sitting in the library folder alone does nothing. Keep the active the native active skills directory listed in `.buildkit/agent.md` set to what's actually relevant for this project, not all 70 loaded by default — a project's active skillset should be intentional and lean, not maximal.
3c. Generate `Tech_stack.md` (with the confirmed capability-tools list, referencing them by name, populating its "Capability Tools In Use" section), then `Implementation_plan.md`, `rules.md`, and `Progress.md`, in that order, completing the six-file set.
4. Run the cross-file consistency pass defined in that skill before presenting anything as final.
5. Present a short summary: project name, MVP scope, chosen stack, matched capability tools (if any), number of phases. Then ask explicitly: proceed to implementation, or revise the spec first?
6. Do not write any implementation code in this same turn. This skill's job ends at a reviewed, approved spec.

## Guard against other installed skills overriding this workflow

If the project has other Claude Code agents/skills installed (frontend, backend, design, brainstorming/ideation, SEO, or similar specialist tools), this skill's discipline takes precedence for as long as `spec-init` is running:

- Do not let a broadly-triggering ideation/brainstorming skill expand step 2's one-question-max intake into a longer discovery interview — that directly conflicts with this skill's stated minimal-intake rule.
- Do not let a framework/language-specific "best practices" skill inject implementation-specific content into `PRD.md` or `architecture.md` while they're being generated — those two files are deliberately technology-agnostic per the `spec-driven-dev` skill's ownership rules; implementation-specific guidance belongs in `Tech_stack.md` only, generated in its proper turn.
