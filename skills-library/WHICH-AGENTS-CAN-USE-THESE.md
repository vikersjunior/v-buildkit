# Which Agents Can Use These Skills

Short answer: **yes, plenty beyond Claude Code** — "Agent Skills" (a folder with a `SKILL.md` describing when/how to do something) has become a semi-standardized convention in 2026, not a Claude-only mechanism. But support quality and setup steps vary a lot by tool. Here's the honest breakdown, based on what the Impeccable and taste-skill repos above actually ship installers for.

## Tier 1 — Native, first-class support (drop the folder in, it just works)

- **Claude Code** — native. Project-local: `.claude/skills/<name>/SKILL.md`. Global: `~/.claude/skills/`.
- **Claude Desktop / Cowork** — same mechanism as Claude Code under the hood.
- **Cursor** — native as of the Nightly channel. Requires: switch to Nightly in Settings → Beta, then enable Agent Skills in Settings → Rules. Folder: `.cursor/skills/`.
- **OpenCode** — native, `.opencode/skills/`.
- **Google Gemini CLI** — native but gated behind a preview build: `npm i -g @google/gemini-cli@preview`, then `/settings` → enable "Skills". Folder: `.gemini/skills/`.
- **Codex CLI (OpenAI)** — native via `.agents/skills/` (repo-local) or `~/.agents/skills/` (user-wide). Accessed through `/skills` or `$<skill-name>`.
- **GitHub Copilot (CLI + coding agent)** — native, `.github/skills/`.
- **Grok Build (xAI)** — native, `.grok/skills/`, needs one-time folder trust (`/hooks-trust` or `--trust` flag) if the skill ships a hook.
- **Kiro** — native, `.kiro/skills/`.
- **Trae / Trae China** — native, two separate config paths (`~/.trae/skills/` international, `~/.trae-cn/skills/` China) — restart required after copying.
- **Rovo Dev (Atlassian)** — native, `.rovodev/skills/`.
- **Qoder** — native, `.qoder/skills/`.
- **Mistral Vibe** — native, `.vibe/skills/`.
- **Google Antigravity** — native, `.agent/skills/` (project) or `~/.gemini/config/skills/` (global).
- **Pi** — native, `.pi/skills/`.

That's 14+ tools with genuinely native support as of the Impeccable and taste-skill repos' current installers — this isn't a fringe convention anymore.

## Tier 2 — Works, with a manual step

Any agent that takes a system prompt, project instructions file, or persistent context window (most custom GPTs, most other LLM chat UIs, most home-grown agent frameworks) **can use a SKILL.md's content** — you just can't rely on automatic discovery/triggering. Paste the body of the SKILL.md into the system prompt or project instructions, and the agent will follow it as static guidance for that session/project. What you lose: the "only loads when relevant" progressive-disclosure behavior — it's just always-on context instead.

## Tier 3 — Doesn't apply

Non-agentic tools (a plain chatbot with no file/tool access, no persistent project context) can't meaningfully use skills that reference scripts, tools, or file operations — those skills assume an agent that can execute things, not just converse.

## The universal installer that ties this together

`npx skills add <github-repo>` (from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)) scans a repo's `skills/` folder and installs into whichever Tier-1 tool's folder convention it detects in your project — this is what jakubkrehel's and Leonxlnx's repos above use. `npx impeccable install` does the equivalent for the Impeccable pack specifically, auto-detecting up to 14 harness folders in one pass.

## Practical takeaway for this pack

Every skill in `01-developers` through `07-legal`, plus the original six in `02-design`, is a plain `SKILL.md` with no Claude-specific syntax — they'll work as Tier-1 native skills in Claude Code/Cowork, and as Tier-2 pasted context anywhere else. The five sourced repos under `02-design/external-community/` were built explicitly multi-agent from the start (see each folder's install command) — several already ship pre-compiled variants for Cursor, Codex, Gemini CLI, and others.
