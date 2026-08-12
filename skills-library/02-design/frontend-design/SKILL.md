---
name: frontend-design-plus
description: Use this skill when building any new UI — web pages, dashboards, landing pages, app screens — in React and Tailwind. Ensures output looks like a deliberate, designed product rather than a default AI-generated template. Trigger on 'build a UI', 'design a screen', 'build this component', 'make this a landing page'.
---

# Frontend Design Plus — Bold React + Tailwind UI

Generic AI-generated UI has a recognizable smell: centered card, purple gradient, generic sans-serif, rounded-xl everything. This skill exists to avoid that by forcing deliberate design decisions.

## Before writing a single component

Decide, explicitly, and let these decisions actually vary by project:
1. **Typographic voice** — one distinctive pairing (a display face for headings, a workhorse for body), not the default system stack.
2. **Color system** — a real palette with a dominant, an accent, and neutral tones — not "blue-600 for everything."
3. **Density and rhythm** — is this information-dense (dashboard) or spacious (landing page)? Match spacing scale to intent.
4. **A visual anchor** — one thing that makes this UI recognizable (a distinctive card treatment, an asymmetric layout, a signature interaction) rather than a symmetric grid of identical cards.

## Build rules

- Use Tailwind's core utility classes only — no compiler, so arbitrary values work but custom config-dependent classes don't.
- Every interactive element needs a visible state change on hover/focus/active — flat, static UI reads as unfinished.
- Real content over lorem ipsum wherever the domain is known — placeholder text makes layout bugs invisible.
- Mobile-first: build the constrained layout first, expand outward, not the reverse.
- Accessibility isn't optional: sufficient contrast, focus rings, semantic HTML elements over div soup.

## Red flags to self-check against

- Would this look identical if you swapped the color variable? If yes, the design isn't doing anything.
- Is every card the exact same shape and size regardless of content importance?
- Is there a clear visual hierarchy, or does everything have equal weight?

## Africa/emerging-market context note

For low-bandwidth or lower-end device contexts (common across African markets), bias toward lighter asset weight — fewer large images/animations, system fonts as fallback, and layouts that degrade gracefully on slow connections rather than blocking render.
