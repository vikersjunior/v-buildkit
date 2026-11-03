# Background — why the kit is shaped this way

Rationale only; nothing here changes how the six files are generated or maintained.

## Where this kit sits on the spec-driven-development spectrum

Spec-driven development has three recognized levels of commitment (see Birgitta Böckeler's framing, referenced in Martin Fowler's writing on the topic): **spec-first** (a well-thought-out spec is written before implementation), **spec-anchored** (the spec is kept alive and revisited throughout the project, not abandoned once coding starts), and **spec-as-source** (the spec becomes the primary artifact a human edits; code is treated as generated output and the human never touches it directly).

This kit targets **spec-first with spec-anchored discipline** — the six files are generated before implementation, and `Progress.md` plus `/spec-review` exist specifically to prevent them from being abandoned once coding starts (the common "spec-once" failure mode, where a good spec launches a project and is then never looked at again). This kit does not implement spec-as-source — you and any agent working in the project still read and write code directly; the spec constrains and documents that work rather than replacing it.

## Why this kit doesn't orchestrate agent teams

Claude Code supports "agent teams" — multiple teammates sharing a task list and working in parallel, distinct from subagents (which only report back to a main agent). This kit's `/implement` skill deliberately runs sequentially, one task at a time, rather than spawning a team, based on a documented real-world finding: for typical solo-developer feature work (4-6 requirements per task, most implementations completing in 15-20 minutes regardless of team size), agent teams add real costs — each teammate carries its own context window (a team of 4 can burn ~4x the tokens of a solo session for the same work), coordination has known rough edges, and the actual bottleneck in practice is specification quality and review bandwidth, not implementation speed. Agent teams pay off specifically for larger organizations running many developers against many genuinely independent, non-overlapping feature requests in parallel — not for the single-developer, spec-first workflow this kit is built around. If that changes for a given project (multiple people, genuinely parallel non-overlapping workstreams), that's a deliberate call to make explicitly, not something this kit does by default.

