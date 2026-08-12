---
name: complete
description: Use this to close a feature after /check and /audit have passed, including explicit /complete requests. Archives feature evidence and updates Progress.md.
---
# Complete — Feature Closure Gate

Completion requires: approved feature spec, implementation, passing `/check`, no blocking `/audit` findings, and passing relevant tests/type checks/build checks.

1. Read `.buildkit/state.md`, feature spec, acceptance, verification and latest audit.
2. Refuse completion if a required gate is missing or failed.
3. Move `.buildkit/features/<slug>/` to `.buildkit/history/<slug>/` preserving evidence.
4. Add a completion record.
5. Update `Progress.md` according to its ownership rules.
6. Clear/update `.buildkit/state.md`.
7. Flag any plan/spec drift for `/spec-review`.

`/complete` does not modify application code.
