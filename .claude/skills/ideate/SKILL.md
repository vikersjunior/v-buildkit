---
name: ideate
description: Use this when the user has a rough, vague, or early-stage idea and isn't yet ready to commit to a spec — phrases like "I have an idea for...", "thinking about building something that...", "not sure exactly what this should be yet", or when they explicitly ask to brainstorm, validate, or refine a concept before building. Do NOT use this when the user already has a clear, specific project description — that goes straight to spec-init. This skill's entire job is turning a vague idea into a crisp enough brief that spec-init can act on it; it does not generate any of the six spec files itself.
---

# Ideate — Turning a Vague Idea into a Buildable Brief

This is the front door to the system, for the case `spec-init` isn't built to handle well: an idea that isn't crisp yet. `spec-init` assumes the person already knows roughly what they're building — this skill exists for the step before that's true.

**This skill produces no files.** Its only output is a clear, specific project description handed directly to `spec-init`'s intake — not a seventh spec document. The six-file system stays six files; this is a conversational step upstream of it, not an addition to it.

## When an idea needs this step vs. going straight to spec-init

Skip straight to `spec-init` if the idea already has: a clear problem, a clear target user, and a rough sense of the core feature. Use `ideate` when any of those three is genuinely missing or the idea is a direction rather than a concept ("something for African event planners" is a direction; "a WhatsApp-native invoicing tool for Ghanaian event planners who currently track payments in a notebook" is a concept).

## Workflow

1. **Restate the idea as understood, including what's still fuzzy.** Don't pretend more clarity exists than it does — naming the fuzziness is what makes the next step useful instead of premature.
2. **Identify which of these is the actual gap**, and address only that one, not all of them by default:
   - **Problem clarity** — is there a specific, real problem, or is this a solution looking for one? If fuzzy, ask what specifically prompted the idea — a real frustration, an observed gap, a pattern noticed — real ideas usually trace back to something concrete.
   - **User clarity** — who exactly is this for? "Everyone" or "small businesses" is not specific enough to build against; push toward a specific, narrow first user.
   - **Direction clarity** — if the idea could go multiple genuinely different ways (a marketplace vs. a SaaS tool vs. a service business, for the same underlying problem), surface the 2-3 real directions explicitly rather than silently picking one — this is a case where a real decision needs making, not an assumption to infer past.
3. **Ask only what's needed to close the identified gap** — as selectable options where the space of answers can be enumerated, exactly like `spec-init`'s own intake discipline. Do not run a broad discovery workshop covering everything about the idea; find the specific missing piece and ask about that.
4. **If genuinely useful and the user wants it, do a light competitive/market gut-check** — a handful of searches on whether this problem is already well-solved and by whom, surfaced as context, not as a blocker. This is optional and should be explicitly offered, not assumed — some ideas don't need it (a personal tool, an internal project), and running it unasked is scope creep on what should be a fast step.
5. **Converge on one clear, specific project description** — problem, target user, core value prop, in a few sentences. Present it back for a quick confirmation ("here's what I'm about to hand to spec-init — right?") before handing off.
6. **Hand off directly into `spec-init`'s workflow** using that description as the input. Don't stop and wait for a separate command — the natural continuation from a converged idea is straight into spec generation, since that's the entire point of this step existing.

## What this skill is not

Not a substitute for real user research or market validation on anything with real stakes — for a genuinely uncertain, high-investment idea, actual conversations with real potential users beat a handful of searches and a chat conversation, and this skill should say so rather than manufacture false confidence from a quick gut-check.

Not a place to start writing requirements, architecture, or technical decisions — the moment the conversation drifts into "so we'd need a database with..." is the moment this skill's job is done and `spec-init` should take over.
