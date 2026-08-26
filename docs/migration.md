# Migrating Project Documentation Root

This guide provides instructions for migrating project documentation files (`PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`) from the project root to a custom documentation directory (or between custom directories).

---

## Safety Guarantee

BuildKit **never automatically moves, deletes, or overwrites** your existing project documentation files when you re-run `install` or `update` with `--docs-dir`. Your source of truth is always preserved.

---

## Step-by-Step Migration Guide

### 1. Identify Your Target Directory

Choose where you want your project documentation to live (e.g. `docs/buildkit/` or `docs/specs/`).

### 2. Update BuildKit Configuration

Run `vikers-buildkit update` specifying your desired documentation directory:

```bash
npx vikers-buildkit update . --docs-dir docs/buildkit
```

This updates `.buildkit/config.json`:

```json
{
  "schemaVersion": 1,
  "docs": {
    "root": "docs/buildkit"
  }
}
```

### 3. Create the Target Directory & Move Files Manually

Create the destination directory and move your existing specification files into it:

```bash
mkdir -p docs/buildkit
mv PRD.md architecture.md Tech_stack.md Implementation_plan.md rules.md Progress.md docs/buildkit/
```

> [!NOTE]
> Do **NOT** move the `.buildkit/` folder. The `.buildkit/` directory must always remain at your project root.

### 4. Verify Migration Status

Run `npx vikers-buildkit status` to verify that BuildKit correctly detects all your documentation files in the new location:

```bash
npx vikers-buildkit status
```

Expected output:

```
Viker's BuildKit Status — /path/to/project

BuildKit Version:    2.4.0
Documentation Root:  docs/buildkit/
Execution State:     .buildkit/
Configured Agents:   claude

Spec Files Status (docs/buildkit/):
  PRD.md                    : Present
  architecture.md           : Present
  Tech_stack.md             : Present
  Implementation_plan.md    : Present
  rules.md                  : Present
  Progress.md               : Present
```

### 5. Run Health Check

Run `npx vikers-buildkit doctor` to ensure configuration, paths, and skill links are healthy:

```bash
npx vikers-buildkit doctor
```
