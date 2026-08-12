---
name: launch-runbook
description: Use this skill when planning a go-live, deployment, or launch event — sequencing, DNS/infrastructure cutover, rollback plans. Trigger on 'plan our launch', 'build a go-live runbook', 'DNS cutover plan'.
---

# Launch Runbook — Go-Live Sequencing & Cutover Planning

For planning the actual mechanics of a launch or deployment event — sequencing, checks, and rollback, not the marketing plan around it.

## Structure

1. **Pre-launch checklist** — everything that must be true before the go/no-go decision: staging environment matches production config, backups taken, monitoring/alerting live and tested, stakeholders notified of the launch window, support team briefed on what's changing.
2. **Go/no-go decision point** — an explicit checkpoint with named decision-makers, not an implicit "we'll just go when it's ready." State the criteria for "go" in advance so the decision isn't made under launch-day pressure with shifting goalposts.
3. **Cutover sequence** — exact ordered steps: DNS TTL lowered in advance (hours/days before, not at cutover time — this is the single most common launch-day mistake, since DNS propagation delay can silently extend an outage window), traffic migration steps, database migration/sync steps if applicable, each step with an owner and an expected duration.
4. **Verification steps between each major step** — don't proceed to the next step until the current one is confirmed working; define exactly what "confirmed working" means for each (specific URL returns 200, specific transaction completes end-to-end).
5. **Rollback plan — written before launch, not improvised during an incident.** Exact steps to revert to the prior state, the maximum time this should take, and the explicit trigger condition for invoking it (defined in advance so it's not a panic decision made live).
6. **Post-launch monitoring window** — a defined period of heightened monitoring after go-live, with specific metrics being watched and clear escalation contacts.

## DNS-specific guidance

Lower TTL well in advance of the cutover window (24-48 hours is common) so the eventual cutover propagates quickly — cutting over with a high existing TTL means some users hit the old infrastructure for hours after the "launch," a frequent and avoidable source of confusing partial-outage reports.

## Communication plan

Define exactly who gets notified at each phase (pre-launch, launch complete, any rollback) and through what channel — silence during a launch window, even a successful one, creates unnecessary stakeholder anxiety.
