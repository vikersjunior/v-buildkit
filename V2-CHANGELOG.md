# Viker's BuildKit Changelog

## Unreleased

### Changed
- `/audit` records findings in a ledger, `.buildkit/findings.md`, with durable IDs (`### F-001 [BLOCKING] open — title`) and statuses open/fixed/closed/accepted/invalid. On its first run it carries every BLOCKING and HIGH finding from older reports into the ledger. `/implement` marks a finding `fixed`; only `/audit` closes it. `/complete` runs `node .buildkit/bin/lint.js` and refuses on a non-zero exit, so any lint failure, including an open or unverified BLOCKING finding, blocks completion. Customized copies of these three skills show as `update` conflicts.
- Sharper skill descriptions for `spec-init` (owns starting a new project from scratch), `spec-review` (read-only consistency check; updates belong to `spec-driven-dev`), `progress` and `ideate`, so agents pick the right one more often. If you customized one of these skills, `update` reports a conflict and keeps your text; use `update --dry-run`, then `--force` to back it up and take the new wording.
- BuildKit now requires Node.js 22 or newer (`engines`), since Node 18 and 20 are past end-of-life. CI tests Node 22 and 24 on Linux, macOS and Windows.
- Releases: the publish workflow fails when the tag doesn't match the `package.json` version, skips `npm publish` when that version is already on npm, and creates the GitHub release with generated notes.

### Fixed
- `update` no longer silently overwrites BuildKit skills you customized. Install, repair and update now record SHA-256 hashes of managed files in `.buildkit/manifest.json`. Update replaces a file only if it still matches its recorded hash, stops and lists conflicts otherwise, and with `--force` backs edited files up to `.buildkit/backups/<timestamp>/` before replacing them.
- `update` now removes files that a new release dropped, but only when they are unmodified. Previously, stale files stayed installed.
- The first `update` of an install made before this release (no manifest yet) backs up any file that differs from the new release and replaces it, instead of stopping.
- Hashes ignore CRLF/LF differences in text files, so a git checkout that converts line endings doesn't mark every skill as edited.
- `update` refuses manifest paths that are absolute or contain `..` or `\`, and paths whose parent directory resolves outside the project, so a tampered `manifest.json` or a symlinked folder can't make it write or delete files elsewhere. `install`, `repair` and `update` refuse to run when `.buildkit/`, its `workflow-skills/`, `skills-library/` or `backups/` folder, or `manifest.json` is a link, and containment is re-checked right before each write. In agent skill folders, `update` only prunes inside BuildKit's own skills, never your own. Files are written via a randomly named, exclusively created temp file and a rename. Backups get a `.gitignore`, and only the newest five timestamped runs are kept.

### Added
- `lint` checks the findings ledger: an open or fixed BLOCKING finding, a malformed or duplicate header, a missing `Reason`/`Accepted by`/`Verified in` line, an audit report naming an ID the ledger lacks or rating an open finding higher, or an unreadable ledger or report fails; a line that looks like a secret warns. CI running `lint --strict` now fails while a BLOCKING finding is open.
- Install, repair and update copy the lint checker to `.buildkit/bin/lint.js` (with `.buildkit/lib/`), tracked in the manifest, so skills run the checker from their own release without npx. `doctor` reports it as missing on projects installed before this release until you run `npx vikers-buildkit update`.
- `lint` command: read-only spec-drift checks that cost no model tokens. Flags a partial spec set, leftover template placeholders, a Current Phase that isn't in the plan, unconfirmed assumptions, and a Current Feature with no folder. Exits `1` on failures for CI.
- `update --dry-run` prints the add, update, remove and conflict plan without writing anything.
- Skill routing evals (repo only, not shipped): `npm run eval:routing` ranks the model-routed skills' descriptions against plain-language prompts, and `npm test` fails if routing drops below the recorded floor.
- `/feature` critiques its draft (missing states, implicit contracts, unobservable criteria, scope creep) and records material decisions the docs don't settle under `## Open questions` instead of guessing. `/implement` stops until they are answered.
- Proportional-engineering rule 11 in the `rules.md` template: build only for a current need, prefer the smaller reversible design. It never relaxes the Security Gate. `/audit` reports proportionality findings at `MEDIUM` or lower.

### Improved
- `/feature` and `/implement` load less context. `/feature` reads `state.md`, `rules.md` and `Progress.md` in full, the plan item, and only the matching sections of `PRD.md`, `architecture.md` and `Tech_stack.md`, in at most 4 tool rounds. The spec lists the sections the implementer needs under `## Context`, and `/implement` reads that packet instead of the whole spec set.
- Every workflow skill reuses files already read in the session instead of rereading them.
- `/feature`, `/check`, `/audit` and `/complete` run only when you ask for them. Claude Code enforces this with `disable-model-invocation`; other agents get the same instruction in the skill text.
- Shorter `spec-driven-dev`, `ideate`, `tools-check` and `spec-init` descriptions (each under 400 characters), so they cost less to keep loaded and trigger less often by mistake.

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
