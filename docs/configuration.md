# BuildKit Configuration Guide

This guide explains how BuildKit configuration works, including the **Configurable Project Documentation Root** feature.

---

## Conceptual Overview

BuildKit separates a project's files into two distinct layers:

1. **Project Source of Truth** (Human-facing documentation):
   - `PRD.md` — Product Requirements Document
   - `architecture.md` — Architectural Blueprint & ADRs
   - `Tech_stack.md` — Technology Choices & Tools
   - `Implementation_plan.md` — Sequenced Milestones & Definitions of Done
   - `rules.md` — Engineering Standards & Constraints
   - `Progress.md` — Execution Tracker & History

2. **BuildKit Execution Layer** (Agent machinery & state):
   - `.buildkit/` — Execution state, workflow skills, capabilities, history, and configuration.

By default, BuildKit places project documentation at the project root (`.`). However, project teams can configure documentation to live in any subdirectory within the project (e.g. `docs/buildkit/`, `docs/specs/`, `custom/path/`). The execution directory (`.buildkit/`) always remains at the project root.

---

## Configuration File Schema

BuildKit stores configuration in `.buildkit/config.json` at the project root:

```json
{
  "schemaVersion": 1,
  "docs": {
    "root": "docs/buildkit"
  }
}
```

### Fields

- `schemaVersion` *(number, required)*: Schema version (currently `1`).
- `docs.root` *(string, required)*: Relative path from project root to the directory containing project documentation. Default is `"."`.

> [!NOTE]
> `docs.root` must be a relative path using POSIX forward slashes (`/`). Absolute paths or paths escaping the project root (e.g., `../outside`) are rejected.

---

## Setting the Documentation Root

### CLI Option

During installation, set the documentation directory with `--docs-dir`:

```bash
npx vikers-buildkit install . --docs-dir docs/buildkit
```

Or when updating an existing installation:

```bash
npx vikers-buildkit update --docs-dir docs/new-location
```

### Interactive Prompt

When running `npx vikers-buildkit install .` in an interactive terminal without `--docs-dir`, BuildKit prompts you:

```
Where should BuildKit store project documentation?

  1. Project root (.)
  2. docs/
  3. docs/buildkit/
  4. Custom path
```

---

## Configuration Error Policy

If `.buildkit/config.json` is missing, BuildKit safely defaults `docs.root` to `"."` for 100% backward compatibility.

If `.buildkit/config.json` exists but is invalid (malformed JSON, unsupported `schemaVersion`, or path traversal attempt):
- BuildKit will **NOT** silently fall back to project root.
- CLI commands (`status`, `doctor`, `repair`, `update`) fail safely with an error report explaining the exact issue.
- Run `npx vikers-buildkit doctor` to diagnose or `npx vikers-buildkit repair` to restore a valid configuration.

---

## Agent Path Resolution

BuildKit workflow skills and AI coding agents read `.buildkit/config.json` and `.buildkit/agent.md` to resolve document paths:

1. Check `.buildkit/config.json` for `docs.root`.
2. Default to `.` if `.buildkit/config.json` is missing.
3. Resolve requested documents relative to `docs.root` (e.g. `<docs.root>/PRD.md`).
4. Never assume `PRD.md` lives at the project root.
