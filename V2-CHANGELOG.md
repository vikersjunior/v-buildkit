# Viker's BuildKit Changelog

## Unreleased

### Added
- `lint` command: read-only spec-drift checks that cost no model tokens. Flags a partial spec set, leftover template placeholders, a Current Phase that isn't in the plan, unconfirmed assumptions, and a Current Feature with no folder. Exits `1` on failures for CI.

## 2.6.0 — Token Economy

### Added
- `tokens` command: estimates the context tokens each workflow command loads (skill body plus the project files it reads), so growing specs are easy to spot.
- `LICENSE` (MIT, Copyright (c) 2026 Orim Studio) and `THIRD_PARTY_NOTICES.md` for the bundled external-community skills, both now shipped in the npm package.
- Missing upstream `LICENSE` for `oklch-skill/` and the Apache-2.0 `NOTICE.md` for `impeccable-skill/`.

### Improved
- `/complete` rotates `Progress.md`: finished-phase tasks collapse to one line per phase and only the latest 10 Session Log entries stay. Removed lines are appended to `.buildkit/history/progress-archive.md`, never deleted. "Decisions Made" and "Known Issues" are never rotated.
- `/spec-review` treats archived phases as complete, and `/distill-skill` reads the archive as a session log.
- `/implement` no longer points agents at `PRD.md`, which its steps never use (about 600 fewer tokens per run).
- `spec-driven-dev` loads its rarely needed sections on demand from `references/` (`other-skills.md`, `sub-projects.md`, `background.md`). The skill text drops from about 5,300 to 3,200 tokens.

### Fixed
- Test suite on Windows: `npm test` ran no tests on Node 18/20, and the `npm pack` tests could not start `npm`.

### Upgrading
- Run `npx vikers-buildkit update` to pull the new skill files. Specs, state and history are untouched; `Progress.md` is rotated the next time `/complete` runs.

## 2.5.0 — Configurable Project Documentation Root

### Added
- Configurable Project Documentation Root allowing users to specify where BuildKit-managed project documentation (`PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`) lives.
- `--docs-dir <path>` CLI option for `install` and `update` commands.
- Interactive documentation root selection prompt during installation.
- Single canonical `.buildkit/config.json` file for project configuration (`docs.root`).
- Single canonical configuration resolver (`lib/config.js`) enforcing path security and containment.

### Improved
- Agent documentation path resolution instructions generated in `.buildkit/agent.md`.
- `status`, `doctor`, `repair`, and `update` commands now respect configured documentation roots.
- All 12 workflow skills updated with documentation root resolution rules.

### Safety
- Non-destructive handling of existing root documentation files during installation and update.
- Path containment validation preventing path traversal or external filesystem access.
- Malformed configuration detection with safe failure modes.

## 2.4.0 — Native Node CLI + package rename

- Renamed the public npm package to `vikers-buildkit`.
- Added `v-buildkit` and `viker-buildkit` executable aliases.
- Replaced the npm CLI's Bash dependency with a native Node.js installer.
- Added Windows-friendly directory junctions for `--link` installations.
- Preserved interactive agent detection and explicit `--agent` overrides.
- Preserved multi-agent installation and capability detection.
- Added `--skip-capabilities` for faster scripted installs when desired.
