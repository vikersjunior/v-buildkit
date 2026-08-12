# Viker's BuildKit Changelog

## 2.4.0 — Native Node CLI + package rename

- Renamed the public npm package to `vikers-buildkit`.
- Added `v-buildkit` and `viker-buildkit` executable aliases.
- Replaced the npm CLI's Bash dependency with a native Node.js installer.
- Added Windows-friendly directory junctions for `--link` installations.
- Preserved interactive agent detection and explicit `--agent` overrides.
- Preserved multi-agent installation and capability detection.
- Added `--skip-capabilities` for faster scripted installs when desired.
