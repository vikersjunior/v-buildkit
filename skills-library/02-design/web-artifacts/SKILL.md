---
name: web-artifacts
description: Use this skill when producing self-contained HTML artifacts (single-file interactive tools, calculators, mini-dashboards, forms) that use shadcn-style component conventions. Trigger on 'build me an artifact', 'make an interactive tool', 'build a calculator/widget'.
---

# Web Artifacts — shadcn-Convention HTML Artifacts

For single-file, self-contained interactive HTML/JS deliverables — not full applications, but focused tools (calculators, small dashboards, interactive explainers, forms).

## Structural rules

- One file. CSS and JS inline or in `<style>`/`<script>` tags within the same document — no external file dependencies beyond CDN imports.
- Use CSS variables for theming (color, spacing) so the artifact can be restyled without hunting through inline styles.
- No `localStorage`/`sessionStorage` — these fail in sandboxed artifact environments. Use in-memory JS state (variables, closures) instead.
- Keep the background transparent and avoid top-level padding unless the artifact needs its own visual frame.

## shadcn-style component conventions

- Consistent spacing scale (4/8/12/16/24px steps), not arbitrary pixel values per element.
- Buttons, inputs, and cards should share a consistent border-radius and shadow language across the artifact.
- Form elements need visible focus states and disabled-state styling — don't ship a form where you can't tell what's interactive.

## Interaction quality bar

- Every stateful control (input, toggle, slider) should visibly reflect its current state without requiring a page reload.
- Validate input inline where relevant (numeric ranges, required fields) rather than failing silently on submit.

## When NOT to use this

Anything genuinely multi-page, needing persistence across sessions, or requiring a backend — that's a real app, not an artifact. Say so rather than forcing a single-file HTML file to do a full app's job.
