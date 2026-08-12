# Vikers Buildkit — Ideation to Product

A complete system for vibe coding with actual guardrails: from a vague idea, through a reviewed spec, through implementation with a mandatory security gate, to a finished project with its lessons captured for the next one. Built on three things that were previously separate — the spec-driven-development kit, a 70-skill capability catalog across 7 departments, and a tool-matching layer connecting the two — merged into one installable system.

## The full lifecycle

```
/ideate  →  /spec-init  →  [approval gate]  →  /implement (looped)  →  /distill-skill
              │                                      │
              ├─ matches + promotes            ├─ /progress
              │  relevant capability tools      ├─ /spec-review
              │  from skills-library/           └─ /tools-check
              └─ generates the 6 spec files
```

**`/ideate`** — only needed if the idea is still vague (no clear problem, no clear user, or genuinely undecided direction). Converges on a crisp project description, then hands off directly into `/spec-init`. Produces no files of its own — the six-file system stays six files.

**`/spec-init`** — generates `PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md` in dependency order. While drafting `Tech_stack.md`, it scans the project's actual requirements against `.buildkit/skills-library/` (this kit's 70-skill catalog) and proposes genuine matches — not padding the list, not forcing fits. Confirmed matches get promoted from the inert library into the active the selected agent's native skills directory folder. Ends at an explicit approval gate — no implementation code gets written until you say go.

**`/implement`** — picks up the next task from `Implementation_plan.md`, follows `rules.md`, and cannot mark a task done without passing a security gate (mandatory for anything touching auth, data, payments, or external calls) alongside the normal tests/type-checking bar. Aware of git worktrees for genuinely independent parallel work, and deliberately does not spawn agent teams by default (see the reasoning in `spec-driven-dev`'s `SKILL.md` — the cost/benefit doesn't favor it for solo-developer work).

**`/progress`, `/spec-review`, `/tools-check`** — the maintenance loop. `/progress` for a status readout. `/spec-review` checks the six files for internal drift. `/tools-check` is the newer one: periodically audits which capability tools are actually relevant vs. actually active vs. creating name collisions, since neither the project nor the installed toolset stays static.

**`/distill-skill`** — at the end (or after a hard-won phase), extracts transferable lessons — the "this API's CLI didn't support X, had to fall back to Y" kind of knowledge — into a new standalone skill, so the next project starts ahead instead of from scratch.

## What's in the box

```
vikers-buildkit/
├── install.sh
├── README.md
├── .claude/
│   └── skills/                    — source copy used to package the 12 workflow skills
│       ├── spec-driven-dev/       — the core: ownership rules, generation order, templates
│       ├── ideate/
│       ├── spec-init/
│       ├── spec-review/
│       ├── implement/
│       ├── progress/
│       ├── tools-check/
│       └── distill-skill/
├── skills-library/                — the 70-skill capability catalog (installed to .buildkit/skills-library/) (inert until promoted)
│   ├── 01-developers/    (6)
│   ├── 02-design/        (6 original + external-community/, 28 sourced from 5 open-source repos)
│   ├── 03-marketing/     (6)
│   ├── 04-social-content/(6)
│   ├── 05-finance/       (6)
│   ├── 06-operations/    (6)
│   └── 07-legal/         (6)
└── templates/                     — clean blank starter .md files for manual/non-agent use
```

## Package name and CLI aliases

The official npm package name is **`vikers-buildkit`**. The primary command is:

```bash
npx vikers-buildkit
```

For convenience, the package also exposes the shorter executable aliases `v-buildkit` and `viker-buildkit` when the package is installed/executed. The package name remains `vikers-buildkit` because it is more descriptive and discoverable than the abbreviated `v-buildkit`.

## Install via npm / npx

BuildKit is packaged as a CLI so developers do not need to clone the repository. The recommended command is:

```bash
npx vikers-buildkit@latest
```

This runs the installer in the current project. You can also be explicit:

```bash
npx vikers-buildkit@latest install .
npx vikers-buildkit@latest install . --agent claude
npx vikers-buildkit@latest install . --agent claude,codex,cursor --link
```

`npx` downloads the package into npm's cache when it is not already available locally and executes the package binary defined by its `bin` field. See npm's documentation for [`npx`](https://docs.npmjs.com/cli/commands/npx/) and [`package.json` `bin`](https://docs.npmjs.com/cli/configuring-npm/package-json/#bin).

For CI or scripted installs, pin the version and pass the agent explicitly:

```bash
npx --yes vikers-buildkit@2.4.0 install . --agent codex --no-detect
```

### Publishing BuildKit to npm

From the repository root:

```bash
npm login
npm whoami
npm publish --access public
```

Before publishing a new release, update the version with:

```bash
npm version patch   # bugfix
npm version minor   # new backwards-compatible feature
npm version major   # breaking change
```

Then publish again:

```bash
npm publish --access public
```

The package name used by this release is `vikers-buildkit`. If that name is available in the npm registry, users can install it with `npx vikers-buildkit@latest`. If you prefer the `npm init vikers-buildkit` experience, publish a small companion package named `create-vikers-buildkit`; npm maps `npm init vikers-buildkit` to `npm exec create-vikers-buildkit`.

## Install

BuildKit detects which supported coding agent(s) are already present in the target project and local environment. In an interactive install, detected agents are shown first and become the default; you can accept them or choose manually.

```bash
./install.sh /path/to/your-project
```

For example, if a project already contains `.claude/` and `.agents/skills/`, BuildKit can detect Claude Code and Codex/Antigravity and offer both before installation. In CI/non-interactive environments, confident detections are used automatically. You can always override detection explicitly with `--agent`:

```bash
./install.sh /path/to/your-project --agent claude
./install.sh /path/to/your-project --agent claude,codex,cursor
```

Supported native mappings:

| Agent | Native skills directory |
|---|---|
| Claude Code | `.claude/skills/` |
| Codex CLI / Antigravity | `.agents/skills/` |
| Cursor | `.cursor/skills/` |
| Gemini CLI | `.gemini/skills/` |
| GitHub Copilot | `.github/skills/` |
| Grok | `.grok/skills/` |
| OpenCode | `.opencode/skills/` |
| Kiro | `.kiro/skills/` |
| Trae | `.trae/skills/` |
| Rovo Dev | `.rovodev/skills/` |
| Qoder | `.qoder/skills/` |
| Mistral Vibe | `.vibe/skills/` |

For multiple agents, `--link` creates `.buildkit/workflow-skills/` as the single BuildKit workflow source and symlinks each selected native skills directory to it. This is especially useful when the same repository is worked on by several coding agents.

```bash
npx vikers-buildkit install . --agent claude,codex,cursor --link
```

`--link` never replaces an existing native skills directory. Move it first if you want a clean shared source. The old Claude+Antigravity-only `--agent both` shortcut is replaced by generalized comma-separated agent selection. Use `--no-detect` when you explicitly do not want the installer to inspect the project/environment for agent signals.

## Maintenance Commands

Viker's BuildKit includes built-in commands for managing, health-checking, and updating installations:

- **`npx vikers-buildkit status`**: Check current installation, configured agents, symlink validity, and specification files.
- **`npx vikers-buildkit doctor`**: Perform an automated health audit of `.buildkit/`, workflow skills, capabilities, and symlink targets. Returns non-zero exit code if health checks fail.
- **`npx vikers-buildkit repair`**: Repair broken symlinks/junctions, restore missing workflow skills, and regenerate corrupted metadata without touching user project state.
- **`npx vikers-buildkit update`**: Safely update workflow skills and capability library from the latest BuildKit package. Preserves all user specifications (`PRD.md`, `architecture.md`, `Tech_stack.md`, `Implementation_plan.md`, `rules.md`, `Progress.md`), history, and custom skills.

### Agent detection

Detection intentionally uses a confidence score rather than assuming that every global CLI installation is relevant. Existing project-native skills/configuration gets more weight than a globally installed binary. This prevents an unrelated tool installed on the developer's machine from unexpectedly changing the project's BuildKit installation.

Detection signals include native skills folders, agent-specific project configuration files/directories, and available local CLIs where their command is unambiguous. Detection is advisory: `--agent` always wins.

## Why the library is inert by default

70 skills always active for every project — including a two-line prototype — means constant trigger-ambiguity overhead for no benefit. `spec-init` and `tools-check` are the only two places that promote a library skill into the active, auto-triggering the selected agent's native skills directory folder, and only after confirming it actually traces to something in `PRD.md`/`architecture.md`. A project's active skillset should be intentional and lean, not maximal by default.

## Why spec generation stays clean even with 70+ skills sitting nearby

`PRD.md` and `architecture.md` are deliberately technology-agnostic — no frameworks, no implementation opinions — until `Tech_stack.md` introduces them. Both `spec-init` and `ideate` carry an explicit guard against broadly-triggering skills (a framework-opinionated one, a brainstorming/ideation one) overriding that discipline during those two phases. Capability tools get their say during `/implement`, where they belong, not during document generation. Full reasoning in `spec-driven-dev/SKILL.md`'s "Coexisting with other installed specialist agents/skills" section.

## Known name collisions to watch for

If you also install skills from other third-party sources (e.g. a marketplace CLI), check for name collisions against this kit's own catalog first — `mcp-builder`, `canvas-design`, and `code-reviewer` are common enough names that other sources reuse them. `/tools-check` flags these automatically once both are installed; worth a manual check the first time you add a new external source.

## Where this sits on the spec-driven-development spectrum

Three recognized levels exist: **spec-first** (spec written before code), **spec-anchored** (spec kept alive and revisited throughout, not abandoned once coding starts), and **spec-as-source** (the spec becomes the primary edited artifact; a human never touches code directly). This kit targets **spec-first with spec-anchored discipline** — `Progress.md`, `/spec-review`, and `/tools-check` exist specifically to stop the common "spec-once" failure mode where a good spec launches a project and is then never looked at again. It does not attempt spec-as-source; you still read and write code directly.

## Portability beyond Claude Code

Every file here is plain markdown with no Claude-specific syntax. For Cursor, Codex CLI, Gemini CLI, GitHub Copilot, and other tools with native "Agent Skills" support, copy the selected agent's native skills directory and `.buildkit/skills-library/` into that tool's equivalent directory structure — same folder-per-skill convention. For anything without native skill support, paste the relevant `SKILL.md` into the project's system prompt — you lose auto-triggering and the promote-on-match mechanic, but keep the workflow logic as static guidance.

## V2: Feature-gated engineering layer

V2 adds a feature execution layer while preserving BuildKit's six-file source-of-truth model and cross-functional capability library.

```text
/feature → approval → /implement → /check → /audit → /complete
```

- `/feature` — bounded implementation contract; no code changes
- `/implement` — implementation of the approved contract
- `/check` — acceptance verification against actual behavior
- `/audit` — quality/security/architecture/accessibility/performance review
- `/complete` — closure and archival after all gates pass

`.buildkit/` stores execution evidence and history; it is not a second specification system.
