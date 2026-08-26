# Viker's BuildKit Changelog

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
