---
name: complete
description: Use this to close a feature after /check and /audit have passed, including explicit /complete requests. Archives feature evidence and updates Progress.md.
disable-model-invocation: true
---
# Complete — Feature Closure Gate

Run only when the user explicitly asks for this command (for example by typing /complete). Do not start it on your own initiative or chain into it from another skill.

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

Completion requires: approved feature spec, implementation, passing `/check`, no blocking `/audit` findings, and passing relevant tests/type checks/build checks.

1. Read `.buildkit/state.md`, feature spec, acceptance, verification and latest audit.
2. Refuse completion if a required gate is missing or failed.
3. Move `.buildkit/features/<slug>/` to `.buildkit/history/<slug>/` preserving evidence.
4. Add a completion record.
5. Update `Progress.md` according to its ownership rules.
5a. Rotate `Progress.md` as its writing rules describe: collapse finished-phase tasks to one line per phase and keep only the latest 10 Session Log entries, appending everything removed to `.buildkit/history/progress-archive.md` under a dated heading. Never rotate "Decisions Made" or "Known Issues".
6. Clear/update `.buildkit/state.md`.
7. Flag any plan/spec drift for `/spec-review`.

`/complete` does not modify application code.
