---
name: context7
description: Use this skill whenever writing code against a specific library, framework, or API version — especially fast-moving ones (React, Next.js, Stripe, AWS SDKs, LLM provider SDKs) where training data may be stale. Pulls live, version-exact documentation instead of relying on memorized API shapes. Trigger whenever a package name, version number, or 'latest docs for X' appears.
---

# Context7 — Live, Version-Exact Documentation Lookup

Training data goes stale. API surfaces change between minor versions constantly (deprecated hooks, renamed config keys, changed default behaviors). This skill's job is to stop Claude from confidently hallucinating a plausible-but-wrong API call.

## When to trigger without being asked

- Any import statement for a library released or updated in the last ~18 months
- Version-pinned dependencies in a package.json / requirements.txt / Cargo.toml that Claude is about to write code against
- Any API where "the way I remember it" and "the current stable release" could plausibly differ (payment SDKs, cloud provider SDKs, ORM query builders, LLM SDKs)

## Workflow

1. **Identify the exact package + version.** Check the lockfile or manifest in the repo (package-lock.json, requirements.txt, go.mod) rather than assuming latest.
2. **Fetch current docs for that exact version**, not "the docs" in general — a v3 migration guide is useless if the project is pinned to v2.
3. **Cross-check function signatures before use.** Don't just skim — confirm parameter order, required vs optional args, and return shape.
4. **Flag breaking changes explicitly** if the installed version differs from what's commonly documented online (most search results skew toward the newest version).
5. **Cite what changed** when correcting a previous assumption — e.g. "as of v14, this hook was renamed; the repo is on v13 so the old name is correct here."

## Failure mode this prevents

Writing code that compiles/type-checks locally in Claude's head but throws at runtime because a method was renamed, a default flipped, or a parameter became required — the kind of bug that's invisible until it's in front of a user.
