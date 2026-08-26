---
name: spec-review
description: Use this after any scope change, before starting a new implementation phase, periodically during a long-running project, or whenever explicitly invoked via "/spec-review", "check the specs for drift", or "are the docs still consistent". Checks the six spec files (PRD.md, architecture.md, Tech_stack.md, Implementation_plan.md, rules.md, Progress.md) for drift and internal contradiction.
---

Read all six files from the configured project documentation root (defined in `.buildkit/config.json` under `docs.root`, defaulting to project root): `PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`.

Run the following checks and report findings — don't silently fix anything, report first:

1. **PRD → Implementation_plan drift.** Does every phase in `Implementation_plan.md` trace to a stated requirement in `PRD.md`? Does every functional requirement in `PRD.md` appear somewhere in the plan (or explicitly deferred in PRD's Out of Scope section)?
2. **Architecture → Tech_stack drift.** Does every component named in `architecture.md` have a corresponding technology choice in `Tech_stack.md`? Does every technology in `Tech_stack.md` serve a component actually described in `architecture.md`?
3. **Progress vs. reality.** Does `Progress.md`'s "Current Phase" and "Completed" list match what `Implementation_plan.md` defines as done for those phases (per its Definition of Done)? Flag anything marked complete that doesn't actually satisfy the Definition of Done.
4. **rules.md alignment.** Does `rules.md` reference the actual stack named in `Tech_stack.md` (not generic/stale conventions from a different stack)?
5. **Stale assumptions.** Scan for any `**Assumption:**` tags left in `PRD.md` or elsewhere that were never confirmed or corrected — flag these for the user's attention specifically.

Output format: a short table — file pair checked, drift found (yes/no), and if yes, exactly what's inconsistent and which file should be corrected to resolve it (following the single-source-of-truth ownership rules from the `spec-driven-dev` skill, not an arbitrary pick).
