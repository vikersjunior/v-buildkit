---
name: contract-review
description: Use this skill when reviewing a contract clause-by-clause to identify risks, unusual terms, or negotiation points. Not a substitute for a licensed lawyer — flag this clearly. Trigger on 'review this contract', 'what are the risks in this agreement', 'flag issues in this NDA/MSA'.
---

# Contract Review — Clause-by-Clause Risk Review

**This is informational analysis, not legal advice — always state clearly that a licensed attorney should review anything material before signing.** This skill helps identify what to raise with counsel, not replace counsel.

## Review structure — go clause by clause, categorize each as: standard / negotiable / red flag

**Always check these clauses specifically:**
- **Liability & indemnification** — is liability capped, and at what (fees paid? a fixed amount? uncapped)? Uncapped liability on one side only is a common red flag worth escalating.
- **Termination** — what triggers termination, what notice period, what happens to data/deliverables/payment on termination? Vague or asymmetric termination rights (one party can terminate at will, the other can't) deserve flagging.
- **IP ownership** — who owns work product, pre-existing IP, and any IP created during the engagement? Ambiguous IP assignment language is a frequent and expensive source of later disputes.
- **Confidentiality** — scope (what's covered), duration (does it expire, and when), and carve-outs (independently developed info, publicly available info, legally compelled disclosure).
- **Payment terms** — timing, currency, late-payment consequences, and (for cross-border deals) which party bears FX and transfer-fee risk.
- **Governing law & dispute resolution** — which jurisdiction's law applies, and litigation vs. arbitration — matters significantly for practical enforceability, especially in cross-border agreements.
- **Non-compete / non-solicit** — scope, duration, and enforceability varies significantly by jurisdiction; flag anything that looks unusually broad in scope or duration for the deal size.

## Output format

A structured table: clause name, plain-language summary of what it says, risk level (standard/negotiable/red flag), and specific suggested negotiation language if it's a flagged item. This lets a non-lawyer stakeholder triage quickly and a lawyer review efficiently rather than re-reading the whole document from scratch.

## Hard boundary

Never present this analysis as a substitute for licensed legal review on anything with real financial or legal exposure — flag this limitation explicitly in the output every time, not just once at the start of the engagement.
