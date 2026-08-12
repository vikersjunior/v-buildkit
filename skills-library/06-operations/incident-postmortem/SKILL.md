---
name: incident-postmortem
description: Use this skill when writing a postmortem after an operational incident, outage, or significant failure — to document what happened and prevent recurrence without assigning blame. Trigger on 'write a postmortem', 'document this incident', 'what went wrong report'.
---

# Incident Postmortem — Blameless Post-Incident Documentation

Blameless means focused on systemic/process causes, not "who made the mistake" — this isn't about softening language, it's a deliberate choice because blame-focused postmortems make people hide information in future incidents, which produces worse outcomes long-term.

## Structure

1. **Summary** — what happened, impact (who/what was affected, for how long), current status, in 3-4 sentences a non-technical stakeholder can understand.
2. **Timeline** — factual, timestamped sequence: when the issue started, when it was detected, when it was diagnosed, when mitigation began, when it was resolved. Distinguish "detected" from "started" explicitly — the gap between them is often the most actionable finding.
3. **Root cause(s)** — the actual underlying cause(s), not just the immediate trigger. Use "5 whys" style drilling: the trigger event caused X, which was possible because Y, which existed because Z (a process gap, missing safeguard, or unowned risk) — that final layer is usually where the real fix lives.
4. **Impact** — quantified where possible (users affected, revenue impact, duration) — vague impact statements make prioritizing the fix harder.
5. **What went well** — genuinely include this; incident response strengths worth reinforcing shouldn't be lost in a purely negative document.
6. **Action items** — specific, owned, and dated. Each item should map to a specific root-cause layer identified above, not generic "be more careful" items that don't change the underlying system.

## Language discipline

Describe actions and system states, not people's competence — "the deploy script did not validate config before applying" not "the engineer forgot to validate config." The former points at a fixable system gap; the latter points at a person and produces defensiveness instead of improvement.

## Follow-through

A postmortem with no completed action items six months later has failed at its actual purpose — track action item completion, don't let the document be the deliverable.
