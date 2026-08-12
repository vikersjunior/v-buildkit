---
name: mcp-builder
description: Use this skill when the user wants to connect Claude to a new external tool, API, or data source that doesn't have an existing integration — building a custom Model Context Protocol (MCP) server. Trigger on 'wire this API into Claude', 'build a connector for X', 'give Claude access to our internal tool'.
---

# MCP Builder — Wiring Claude to Arbitrary Tools

MCP (Model Context Protocol) is the open protocol that lets Claude call external tools/data sources as first-class functions rather than through screen-scraping or copy-paste. This skill scaffolds a new MCP server.

## Decide the shape first

- **Local vs. remote server** — local (stdio) for tools that only need to run on the user's machine (filesystem, local DB); remote (HTTP/SSE) for anything that needs to be shared across sessions/users or calls a hosted API.
- **Read-only vs. write-capable** — write/mutating tools (send, delete, modify) should require explicit confirmation flows in the calling agent, not fire silently.
- **Auth model** — API key, OAuth, or none. OAuth needs a proper redirect flow; don't shortcut it with hardcoded tokens in shipped code.

## Minimum viable server structure

1. Define each tool as a discrete function with a strict JSON schema for inputs — narrow the schema (enums over free text where possible) so the calling model can't pass malformed input.
2. Write a clear, specific tool `description` — this is the only thing the calling model sees before deciding to invoke it. Vague descriptions cause under- or over-triggering.
3. Implement the handler with explicit error handling — return structured error messages the calling model can react to, not raw stack traces.
4. Keep tools narrow and composable. One tool that does "manage_user" (create/update/delete/list all in one) is worse than four separate tools — it's harder for the model to pick the right parameters and harder to audit.

## Testing before handoff

- Call each tool directly with valid and invalid inputs.
- Verify auth failures return a clear, actionable error (not a silent empty result).
- Confirm destructive tools require the caller to pass an explicit confirmation flag or follow a two-step propose/confirm pattern.

## Common mistakes

- Overly broad tool scope (one tool trying to do everything) — hurts the calling model's ability to pick correctly.
- Missing rate-limit handling on the upstream API, causing silent failures under load.
- No versioning strategy — a breaking upstream API change silently breaks the tool with no clear failure signal.
