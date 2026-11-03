---
name: check
description: Use this after /implement to verify the current feature against its approved .buildkit feature specification and acceptance criteria, including explicit /check requests.
disable-model-invocation: true
---
# Check — Feature Verification Gate

Run only when the user explicitly asks for this command (for example by typing /check). Do not start it on your own initiative or chain into it from another skill.

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

`/check` answers: does the implementation satisfy the approved feature contract?

1. Read `.buildkit/state.md`, the current feature `spec.md`, and `acceptance.md`.
2. Read `Progress.md`, `rules.md`, and relevant architecture/stack files.
3. Inspect actual changed code and tests.
4. Run relevant type checks, tests, lint/build checks, and feature-specific verification.
5. Verify every acceptance criterion individually, plus required UI states, permissions, validation, accessibility and security gates where applicable.
6. Write `.buildkit/features/<slug>/verification.md` with PASS / FAIL / BLOCKED and evidence for each criterion.
7. Set `.buildkit/state.md` to `Lifecycle Gate: check passed` only when all blocking criteria pass.

Never mark PASS merely because code exists. Never weaken acceptance criteria silently. If the approved spec is wrong, route the discrepancy through `/spec-review`.
