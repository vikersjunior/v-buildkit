---
name: sop-builder
description: Use this skill when documenting a repeatable operational process as a standard operating procedure — anything a team member should be able to follow without additional context. Trigger on 'write an SOP for X', 'document this process', 'make this process repeatable for the team'.
---

# SOP Builder — Standard Operating Procedure Writing

For documenting repeatable processes clearly enough that someone unfamiliar with the task can execute it correctly without needing to ask clarifying questions.

## Structure

1. **Purpose** — one sentence: what this process achieves and why it matters.
2. **Scope** — what this SOP covers and explicitly what it doesn't (prevents someone applying it to an adjacent-but-different situation incorrectly).
3. **Prerequisites** — access, tools, permissions, or prior steps needed before starting.
4. **Step-by-step procedure** — numbered, imperative, one action per step. Include the *expected result* of each step where verification matters ("click Submit — you should see a confirmation banner; if not, see Troubleshooting").
5. **Edge cases / exceptions** — the situations that deviate from the happy path and what to do instead. This section is often what separates a genuinely useful SOP from a fragile one that breaks the first time reality doesn't match the happy path.
6. **Escalation path** — who to contact and when, if the procedure can't be completed as documented.

## Writing discipline

- Write for the least-context reader who will realistically execute this, not for someone with the same context as the author — assumed knowledge is the most common SOP failure.
- Every ambiguous instruction ("configure appropriately") should be replaced with the specific value or decision rule.
- Include screenshots or exact UI labels for any software-based step — "click Settings" is ambiguous if there are multiple things labeled Settings.

## Maintenance

Note an owner and a review cadence on every SOP — an undated, unowned SOP silently goes stale and becomes actively harmful (worse than no SOP) once the underlying process changes but the doc doesn't.
