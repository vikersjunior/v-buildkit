# Using Viker's BuildKit Effectively

**A Developer's Guide to AI-Assisted Software Engineering with Coding Agents**

Viker's BuildKit (`2.4.0`) is not a collection of prompt templates or an AI code generator. It is an **AI development operating system** designed to give your AI coding agents structure, persistent context, feature boundaries, security gates, and progress tracking.

This guide teaches you the mental model, workflows, and best practices to get the maximum benefit from BuildKit when building software with coding agents like Claude Code, Codex, Cursor, Gemini CLI, and GitHub Copilot.

---

## The Core Principle

> **Don't use BuildKit to make your AI agent code faster. Use BuildKit to make your AI-assisted development more deliberate, consistent, and maintainable.**

```text
Better context + Better specifications + Bounded features + Acceptance criteria + Audits = Superior Software
```

---

## Section 1 — The BuildKit Mental Model

BuildKit establishes a clear three-layer separation of responsibilities:

```text
Developer (You)
    │   Defines intent, priorities, business logic, constraints & approvals
    ▼
Viker's BuildKit
    │   Provides structured workflows, specs, feature gating, state & verification
    ▼
AI Coding Agent (Claude, Codex, Cursor, etc.)
    │   Reasons about implementation, writes code, runs tests & executes contracts
```

### 1. Developer Responsibilities
- Product intent, vision, and user persona definitions.
- Business decisions, tradeoffs, and scope boundaries.
- Reviewing and approving specification files (`PRD.md`, `architecture.md`, `Tech_stack.md`).
- Reviewing feature contracts before coding begins.

### 2. BuildKit Responsibilities
- Enforcing structured workflows (`/ideate` -> `/spec-init` -> `/feature` -> `/implement` -> `/check` -> `/audit` -> `/complete`).
- Maintaining project source-of-truth documents separate from execution logs.
- Tracking active agent capabilities and evidence in `.buildkit/agent-capabilities.json`.
- Archiving feature execution history and audit logs in `.buildkit/history/` and `.buildkit/audits/`.

### 3. AI Agent Responsibilities
- Reasoning about technical implementation details within assigned boundaries.
- Editing files, creating tests, and executing approved implementation contracts.
- Identifying edge cases and reporting unresolved assumptions.

---

## Section 2 — Don't Start With Implementation

The most common failure mode in AI-assisted development is starting with `/implement` immediately after having an idea.

### Bad Workflow
```text
Rough Idea  ──>  /implement  ──>  Agent Guesses Specs  ──>  Context Drift  ──>  Refactoring Chaos
```

### BuildKit Recommended Workflow
```text
Rough Idea  ──>  /ideate  ──>  /spec-init  ──>  Human Review  ──>  /feature  ──>  /implement
```

By defining requirements and architectural boundaries before writing code, you eliminate ambiguity while code changes are still zero-cost text.

---

## Section 3 — How to Start a New Project

When starting a project, do not tell your agent *"build me a full-stack document delivery app"*.

Instead, start by exploring problem space with `/ideate`:

```text
I want to build an international document delivery marketplace connecting travelers with senders.

Use /ideate to help me explore:
- Target user personas (sender vs traveler)
- Core user problems and friction
- Marketplace trust & verification requirements
- Key MVP features vs out-of-scope capabilities
- Technical risks and regulatory constraints

Do not write application implementation code yet.
```

---

## Section 4 — Using `/ideate` Effectively

The `/ideate` workflow skill converts vague ideas into crisp project scopes without writing project files.

### Weak Prompt
> *"Build me a delivery app."*

### Effective Prompt
> *"I want to build a peer-to-peer document delivery platform for international students.*
>
> **Users:** Senders needing urgent documents delivered abroad; Travelers with extra luggage allowance.  
> **Constraints:** Launch on one air route first; MVP must support ID verification and Escrow payments.  
>
> *Help me determine the core problem, user stories, and MVP scope. Do not write code yet."*

---

## Section 5 — Project Source of Truth (`/spec-init`)

Once product scope is clear, run `/spec-init`. BuildKit generates six core project specification files in dependency order:

1. **`PRD.md`**: Product Requirements Document (Problem, goals, target users, non-goals).
2. **`architecture.md`**: System Architecture & Component Design.
3. **`Tech_stack.md`**: Technology choices and matched capability skills from catalog.
4. **`Implementation_plan.md`**: Bounded development phases and roadmap checklist.
5. **`rules.md`**: Coding guidelines, architectural constraints, and security guardrails.
6. **`Progress.md`**: Project execution log and feature history.

> **Key Rule:** These six markdown files live in the repository root and serve as persistent memory for your AI agent across sessions.

---

## Section 6 — Review Specifications Before Building

Pause after `/spec-init` finishes. Review the generated markdown documents and challenge assumptions before proceeding:

- *What assumptions are we making about third-party APIs?*
- *What security or privacy edge cases are unaddressed?*
- *What features are explicitly marked OUT OF SCOPE for v1?*

Run `/spec-review` periodically to audit the six files for internal consistency and drift.

---

## Section 7 — Bounded Feature Development (`/feature`)

Never ask your agent to *"build the whole backend"*. Break development into small, bounded features using `/feature`:

```bash
# In your agent chat:
/feature traveler-verification
```

A good feature contract defines:
- **Feature Name & Objective**
- **User Stories & Flow**
- **Functional Requirements**
- **Acceptance Criteria**
- **Explicit Out-of-Scope Boundaries**

---

## Section 8 — Writing Good Feature Requests

Structure your feature requests with explicit boundaries:

```text
Feature: Traveler ID Verification

Goal: Allow travelers to upload passport photos for automated identity verification before accepting deliveries.

Requirements:
1. Accept JPG/PNG uploads up to 5MB.
2. Send image to verification API.
3. Store verification status (PENDING, APPROVED, REJECTED) on user profile.

Constraints:
- Do not store raw passport images in public storage buckets.
- Follow rules.md data security guidelines.

Out of Scope:
- Driver's license verification (v2).
- Manual admin review UI (v2).

Acceptance Criteria:
- Unverified users cannot accept delivery requests.
- Verification status updates asynchronously via webhook.
```

---

## Section 9 — Approval Gates

BuildKit enforces an explicit **Human Approval Gate** between feature contract generation (`/feature`) and execution (`/implement`).

Before saying *"go"*, verify:
- [ ] Are file modification boundaries restricted to relevant modules?
- [ ] Are out-of-scope boundaries explicit?
- [ ] Are acceptance criteria checkable as done/not-done?

---

## Section 10 — Implementation (`/implement`)

Once a feature contract is approved, run `/implement`:

```bash
/implement traveler-verification
```

### Rule of Implementation Discipline
If requirements change mid-implementation, **stop**. Update the feature specification or project specs first, review the change, then continue. Never let requirement changes happen silently in chat.

---

## Section 11 — Prompting During Implementation

### Weak Prompt
> *"Make it work."*

### Effective Prompt
> *"Implement the approved traveler-verification contract.*
> 
> *Follow rules.md and existing architecture.md patterns.*
> 
> *Before modifying code:*
> 1. Inspect existing user service modules.
> 2. Explain your proposed file edits.
> 
> *After implementation:*
> - Run unit tests for user verification.
> - Report any unresolved edge cases or assumptions."*

---

## Section 12 — Persistent Context vs Chat Memory

Understand where knowledge belongs:

```text
Chat History    ──>  Temporary, volatile session memory
Project Docs    ──>  Persistent repository memory (PRD.md, architecture.md, etc.)
.buildkit/      ──>  Execution state, feature history, audits, and capability metadata
```

If an important decision is made in chat, write it down in `architecture.md` or `.buildkit/decisions/` so future AI sessions remember it automatically.

---

## Section 13 — Acceptance Verification (`/check`)

After implementation, run `/check` to test the implementation against acceptance criteria:

- *Does an unverified traveler get blocked from accepting delivery requests?*
- *Does the webhook update verification status correctly?*
- *Are error states handled gracefully when the API fails?*

---

## Section 14 — Quality & Security Audits (`/audit`)

Distinguish `/check` from `/audit`:

- **`/check`**: Does the feature fulfill functional requirements?
- **`/audit`**: Is the code secure, maintainable, performant, and architecturally sound?

The `/audit` workflow checks:
- Security vulnerabilities (auth, data leaks, SQLi/XSS, untrusted inputs).
- Code quality & adherence to `rules.md`.
- Test coverage and error handling completeness.
- Accessibility and performance constraints.

---

## Section 15 — Feature Completion (`/complete`)

Run `/complete` after passing `/check` and `/audit`. BuildKit:
1. Archives feature contract and execution evidence to `.buildkit/history/`.
2. Updates `Progress.md` with completion logs.
3. Clears active feature state for the next feature.

---

## Section 16 — Regaining Context with `/progress`

When resuming work after days, switching AI tools, or starting a new session, run `/progress`:

```bash
/progress
```

This reads current `Progress.md` and project spec states, giving your agent instant situational awareness without re-reading the entire codebase.

---

## Section 17 — Multi-Agent Workflows

BuildKit supports multi-agent development. You can use different agents for different tasks on the same project:

- **Monday (Claude Code)**: High-level spec design and complex architecture refactoring.
- **Tuesday (Codex CLI)**: Fast feature execution and unit test generation.
- **Wednesday (Cursor)**: UI component implementation and inline styling.

Because BuildKit stores state in `.buildkit/` and active skills in native folders (or via `--link`), all agents share the exact same project memory.

---

## Section 18 — Using BuildKit in Existing Projects

To add BuildKit to an existing codebase:

```bash
cd my-existing-app
npx vikers-buildkit
```

### Steps After Installation:
1. Run `/spec-init` to document the existing architecture and requirements into `PRD.md` and `architecture.md`.
2. Document existing coding patterns in `rules.md`.
3. Pick the next single feature and execute it with `/feature` -> `/implement`.
4. *Do not attempt to rewrite existing code all at once.*

---

## Section 19 — Troubleshooting Guide

| Problem | Root Cause | Solution |
|---|---|---|
| **Agent editing unrelated files** | Scope boundary missing in feature contract. | Run `/feature` to define explicit file bounds and out-of-scope list. |
| **Agent forgetting project rules** | Rules trapped in chat history instead of persistent specs. | Move guidelines into `rules.md` or `architecture.md`. |
| **Agent proposing massive rewrites** | Agent missing architectural context. | Stop agent, reference `architecture.md`, and demand incremental plan. |
| **Tool/skill collisions** | Multiple installed skills triggering on similar names. | Run `/tools-check` to flag name collisions and deactivate unused skills. |

---

## Section 20 — Common Mistakes Checklist

- [ ] **Mistake 1**: Jumping straight to `/implement` without specification or feature contracts.
- [ ] **Mistake 2**: Giving vague requirements without explicit out-of-scope boundaries.
- [ ] **Mistake 3**: Letting the AI agent make major product or schema decisions silently.
- [ ] **Mistake 4**: Skipping `/check` or `/audit` quality gates before marking tasks done.
- [ ] **Mistake 5**: Storing architectural decisions in chat rather than `architecture.md`.
- [ ] **Mistake 6**: Attempting to implement multi-subsystem features in a single request.

---

## Section 21 — Best Practices Checklist

### Before Coding
- [ ] Idea explored via `/ideate`
- [ ] Core specs created via `/spec-init` (`PRD.md`, `architecture.md`, `rules.md`)
- [ ] Feature defined via `/feature` with clear acceptance criteria & out-of-scope limits
- [ ] Human review & approval gate passed

### During Coding
- [ ] Agent constrained to feature boundaries
- [ ] `rules.md` and existing code patterns enforced
- [ ] Unit tests generated alongside feature code

### After Coding
- [ ] Acceptance criteria verified via `/check`
- [ ] Security & code quality audited via `/audit`
- [ ] Feature closed & archived via `/complete`
- [ ] Progress logged in `Progress.md` via `/progress`

---

## Section 22 — A Complete Real-World Example

Here is a step-by-step walkthrough of building a feature using Viker's BuildKit:

### Step 1: Ideation
```text
User: /ideate
Prompt: "I want to add escrow payment holds for document delivery orders."
Outcome: Scope converged on stripe payment intent authorization holds.
```

### Step 2: Feature Contract (`/feature escrow-payment-hold`)
```text
User: /feature escrow-payment-hold
Outcome: .buildkit/features/escrow-payment-hold.md created with requirements, 
         Stripe API boundaries, and testable acceptance criteria.
```

### Step 3: Human Approval
```text
User: Review contract -> Approved.
```

### Step 4: Implementation (`/implement escrow-payment-hold`)
```text
User: /implement escrow-payment-hold
Outcome: Agent implements Stripe hold service & webhook handler, runs tests.
```

### Step 5: Verification (`/check`)
```text
User: /check
Outcome: Verified: Payment hold succeeds on order creation; Captured on delivery.
```

### Step 6: Audit (`/audit`)
```text
User: /audit
Outcome: Passed: Stripe secret keys loaded securely from env; Webhook signatures verified.
```

### Step 7: Completion (`/complete`)
```text
User: /complete
Outcome: Feature archived to .buildkit/history/; Progress.md updated.
```

---

## Section 23 — Summary: How to Get the Most From BuildKit

1. **Context First, Code Second**: Give your AI agent full architectural context before asking for code.
2. **Narrow Scope**: Small, well-defined feature contracts produce drastically higher quality code.
3. **Explicit Out-of-Scope Rules**: Tell the agent what *not* to touch.
4. **Enforce Verification Gates**: Treat `/check` and `/audit` as non-negotiable standards.
5. **Persistent Repository Memory**: Keep decisions in `architecture.md` and `.buildkit/`, not chat.
