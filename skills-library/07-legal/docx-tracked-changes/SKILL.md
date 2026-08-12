---
name: docx-tracked-changes
description: Use this skill when producing Word documents that need tracked changes, comments, or redline-style editing — legal document markup specifically, distinct from general document creation. Trigger on 'add tracked changes', 'redline this document', 'add legal comments to this doc'.
---

# DOCX Tracked Changes — Legal Document Markup

For producing Word documents with tracked-changes/redline markup and comments — the legal/contract-editing convention, distinct from general document formatting. Pair with the core docx document-creation skill for the base file mechanics.

## When tracked changes are the right tool vs. clean output

Use tracked changes/redlines when the deliverable is a *proposed edit* to an existing document that another party needs to review and accept/reject (contract negotiation, legal drafting review). Use a clean final document when the deliverable is a finished, agreed document — mixing these up (sending a redline when a clean signature copy was expected, or vice versa) is a common and confusing mistake.

## Markup conventions to follow

- Insertions and deletions should be clearly marked in the standard redline convention (typically underline for insertions, strikethrough for deletions) so a reviewer can see exactly what changed without comparing two separate documents manually.
- Use comments for explaining *why* a change is proposed, not just what changed — the change itself is visible in the redline; the comment's job is to carry the reasoning/context a counterparty or colleague needs to evaluate it.
- Keep each tracked change atomic (one discrete edit per change) rather than bundling multiple unrelated edits into one large replaced block — atomic changes are easier for a counterparty to accept/reject individually.

## Numbering and cross-reference discipline

In legal documents specifically, verify that clause numbering and cross-references (e.g., "as defined in Section 4.2") still resolve correctly after edits — a common failure mode is edits shifting section numbers without updating cross-references elsewhere in the document, which silently breaks the document's internal logic.

## Final delivery

State clearly whether the delivered file is the redline (for negotiation) or the clean version (for signature) — never leave this ambiguous, since sending the wrong version at the wrong stage of a negotiation is a real and recurring operational mistake.
