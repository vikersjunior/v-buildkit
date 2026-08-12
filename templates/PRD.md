# [Project Name] — Product Requirements Document

## 1. Overview
One paragraph: what this product is, in plain language, as if explaining it to someone outside the team.

## 2. Problem Statement
The specific problem this solves and for whom. Include the cost of the problem persisting (what happens if this doesn't get built) — this is what justifies every later prioritization decision.

## 3. Goals
Numbered list. Each goal should be a specific, checkable outcome — not "improve user experience" but "reduce time-to-first-booking to under 90 seconds."

## 4. Non-Goals
Explicit list of what this project will NOT do, at least in this version. This is as important as the goals list — it's what prevents scope creep later and gives Implementation_plan.md a clear boundary.

## 5. Target Users
Who uses this, described specifically enough that a feature prioritization debate could be resolved by asking "does this serve this specific user?" Avoid generic personas — ground in real, specific user situations.

## 6. User Stories / Core Use Cases
Format: "As a [user], I want to [action], so that [outcome]." Cover the primary flows only here — this isn't an exhaustive spec, it's the core scenarios that define what "done" looks like.

## 7. Functional Requirements
Numbered, specific, testable requirements. Each should be checkable as done/not-done without ambiguity. Group by feature area if the project has more than ~10 requirements.

## 8. Non-Functional Requirements
Performance, reliability, security, accessibility, localization, compliance — whatever applies. State specific thresholds where possible ("page load under 2s on 3G", not "fast").

## 9. Success Metrics
How this will be measured as successful after launch — specific, numeric where possible. If a metric can't be measured, it's not a metric, it's a hope.

## 10. Out of Scope (this version)
Distinct from Non-Goals: this is specifically what's deferred to a later version, not rejected outright. Useful for keeping Implementation_plan.md's v1 phase bounded.

## 11. Open Questions
Anything genuinely unresolved that a stakeholder needs to weigh in on before or during build. Don't hide uncertainty — surface it here explicitly rather than silently picking an answer and moving on.
