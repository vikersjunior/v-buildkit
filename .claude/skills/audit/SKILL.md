---
name: audit
description: Use this after a feature passes /check, or when explicitly asked to audit the current implementation. Reviews quality, architecture alignment, security, testing, accessibility, performance and spec divergence without silently changing code.
---
# Audit — Implementation Quality Gate

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

Write `.buildkit/audits/<timestamp>-<feature-slug>.md`. Classify findings as `BLOCKING`, `HIGH`, `MEDIUM`, `LOW`, or `NOTE`.

Audit is read-only by default. Do not silently fix findings. A credible HIGH security exposure is blocking for completion.
