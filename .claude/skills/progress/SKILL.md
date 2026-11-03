---
name: progress
description: Use this when the user asks for a project status update ("where are we", "what's left", "status check") or wants to know how far along things are on a project using this spec-driven-development system, or explicitly invokes "/progress". Reports current status by reading Progress.md, or force-updates it first if recent work isn't reflected yet.
---

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

1. Read `Progress.md` from the configured project documentation root (defined in `.buildkit/config.json` under `docs.root`, defaulting to project root).
2. If invoked with no other context, just report back: current phase, overall progress, in-progress items, blockers, and next tasks — a concise status readout, not a re-summary of the whole file.
3. If invoked after implementation work happened this session that isn't yet reflected in `Progress.md`, update the file first (per the update discipline in the `implement` skill and the `spec-driven-dev` skill itself), then report the updated status.
4. If `Progress.md`'s "Current Phase" doesn't match what `Implementation_plan.md` shows as the furthest fully-completed phase, flag this discrepancy explicitly rather than silently trusting either file.
