---
name: claude-mem
description: Use this skill when working across multiple sessions on the same project and past context (decisions made, architecture chosen, conventions established) needs to persist rather than being re-explained each time. Trigger on 'remember this for next time', 'don't make me re-explain the architecture', or when resuming a project after a gap.
---

# Claude-Mem — Cross-Session Project Memory

Long-running projects lose coherence when every session starts from zero. This skill defines what to persist, how, and how to use it without over-indexing on stale context.

## What to persist

- **Decisions, not conversations.** "We chose Postgres over Firebase because offline-first sync wasn't a requirement" is worth keeping. The back-and-forth that led there isn't.
- **Standing conventions.** Naming patterns, folder structure, coding style choices, the project's non-negotiables.
- **Open threads.** What's mid-flight, what's explicitly deferred (and why), what's blocked and on what.
- **Rejected approaches and why.** Prevents re-litigating a path that was already tried and discarded — this is often the highest-value thing to keep.

## What not to persist

- Anything that will go stale fast (current sprint status, "as of today" facts) — timestamp these or leave them out.
- Redundant detail already recoverable by reading the codebase directly.

## Workflow

1. **At the end of a substantial session**, write a short structured summary: decisions made, why, what's next, what's explicitly out of scope for now.
2. **At the start of a new session on the same project**, read the summary first, then verify it against current reality (code may have moved on) before acting on it — stale memory presented as current fact is worse than no memory.
3. **When memory conflicts with what you observe in the codebase**, trust the codebase and flag the discrepancy rather than silently picking one.

## Anti-pattern

Treating persisted memory as unquestionable truth. It's a starting point for continuity, not a substitute for checking current state.
