---
name: skill-creator-lite
description: Use this skill when the user wants to package a repeatable workflow, house style, or domain checklist into a reusable Claude skill (a SKILL.md file). Trigger on 'turn this into a skill', 'make this repeatable', 'save this as a template Claude can reuse'.
---

# Skill Creator (Lite) — Package a Workflow into a Reusable Skill

A skill is a folder with a SKILL.md file: YAML frontmatter (name + description) plus markdown instructions, optionally with bundled scripts/templates/reference docs. It's loaded into context when relevant and makes Claude consistently apply a specific process instead of improvising each time.

## Anatomy

```
skill-name/
├── SKILL.md          (required: frontmatter + instructions)
├── scripts/           (optional: deterministic code — validators, generators)
├── references/        (optional: docs loaded only when needed)
└── assets/            (optional: templates, boilerplate files used in output)
```

## Writing the frontmatter

- **name**: short, lowercase, hyphenated identifier.
- **description**: this is the *entire* triggering mechanism — Claude decides whether to use the skill based on this line alone. Be specific about *what* it does and *when* to use it, and err toward being a little insistent — "always use this when X" beats a passive description, since under-triggering is the more common failure mode.

## Writing the body

- Keep it under ~500 lines. If it's growing past that, split into `references/` files and point to them conditionally ("if doing X, read references/x.md").
- Write it as an instruction set for future-Claude, not documentation for a human — imperative steps, explicit checklists, concrete examples of good vs. bad output.
- Include failure modes / anti-patterns the skill exists to prevent — this is often more useful than describing the happy path.
- For anything with an objectively checkable output (a file format, a data transform), include a verification step at the end.

## Test before shipping

Run 2-3 realistic prompts through the skill and check: did it actually trigger? Did the output match what you wanted? Iterate the description if triggering was inconsistent, iterate the body if the output was off.
