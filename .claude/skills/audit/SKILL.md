---
name: audit
description: Use this after a feature passes /check, or when explicitly asked to audit the current implementation. Reviews quality, architecture alignment, security, testing, accessibility, performance and spec divergence without silently changing code.
disable-model-invocation: true
---
# Audit — Implementation Quality Gate

Run only when the user explicitly asks for this command (for example by typing /audit). Do not start it on your own initiative or chain into it from another skill.

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

`/check` verifies the feature contract. `/audit` verifies implementation health.

Review:
- security and data handling
- authentication/authorization
- input validation and error boundaries
- dependencies and external APIs
- tests and gaps
- accessibility and UI states
- performance risks
- maintainability / duplication
- observability where relevant
- divergence from approved specs
- proportionality: code or machinery with no current need

A proportionality finding names what to delete and what replaces it. Rate it `MEDIUM` or lower unless it causes a real defect. It never downgrades a security finding.

Write `.buildkit/audits/<timestamp>-<feature-slug>.md`. Classify findings as `BLOCKING`, `HIGH`, `MEDIUM`, `LOW`, or `NOTE`.

Audit is read-only by default. Do not silently fix findings. A credible HIGH security exposure is blocking for completion.
