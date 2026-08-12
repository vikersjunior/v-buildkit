---
name: webapp-testing
description: Use this skill whenever a web app needs to be smoke-tested, QA'd, or verified end-to-end in a real browser — after building a feature, before a release, or when debugging a reported UI bug. Trigger on 'test this app', 'does the login flow work', 'QA this before I ship'.
---

# Webapp Testing — Browser-Based Verification

Static code review misses runtime bugs. This skill drives an actual browser session against the running app to verify behavior, not just check that code compiles.

## Setup

1. Confirm the app is actually running (dev server, staging URL) before testing — don't assume.
2. Identify the critical paths to cover: auth, primary conversion action (signup, checkout, route search — whatever the app's core loop is), and any path just touched by a recent change.

## Test pass structure

1. **Happy path first.** Walk the primary user journey start to finish exactly as a real user would — click, type, submit, wait for response.
2. **Edge cases second.** Empty inputs, max-length inputs, back-button navigation mid-flow, double-submit, slow network (if simulatable), unauthenticated access to protected routes.
3. **Visual regression check.** Screenshot key screens and compare against expected layout — flag broken CSS, overlapping elements, cut-off text, missing images.
4. **Console/network check.** Watch for JS errors, failed network requests, and 4xx/5xx responses that don't surface as visible UI errors — these are silent failures a manual click-through misses.

## Reporting

Don't just say "it works" or "it's broken." For each failure: exact steps to reproduce, expected vs. actual behavior, and a screenshot or console error if available. Group by severity — blocking (breaks the core flow) vs. cosmetic.

## What this skill does not replace

Unit tests and CI. Browser testing catches integration and UX-level bugs; it's not a substitute for testing business logic in isolation.
