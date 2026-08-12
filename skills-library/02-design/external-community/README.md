# External Community Design Skills — Sourced, Not Written By This Pack

Everything else in this repo (`01-developers` through `07-legal`, plus the rest of `02-design`) was written from scratch for this pack. The five folders in this directory are different: they are **real, unmodified skill files pulled directly from public open-source GitHub repos**, kept in their original form so they behave exactly as their authors intended. Each retains its original LICENSE file.

| Folder | Source | License | What it is |
|---|---|---|---|
| `emilkowalski-skills/` | [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | 9 skills on animation and interface taste from a Vercel/Linear design engineer — `emil-design-eng` (main), `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `animation-vocabulary`, `apple-design`, `pick-ui-library`, `prototype`. |
| `taste-skill/` | [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | MIT | Anti-"AI slop" frontend skills. Kept the code-output skills (`taste-skill`, `taste-skill-v1`, `gpt-tasteskill`, `redesign-skill`, `soft-skill`, `output-skill`, `minimalist-skill`, `brutalist-skill`, `stitch-skill`). Dropped the pure image-generation skills (`imagegen-frontend-web/mobile`, `brandkit`) since they produce reference images only, not code — pull them from the source repo directly if you want them. |
| `oklch-skill/` | [jakubkrehel/oklch-skill](https://github.com/jakubkrehel/oklch-skill) | MIT | OKLCH color space handling — palette generation, dark-mode derivation, WCAG/APCA contrast checking, Tailwind v4 theming. |
| `jakubkrehel-skills/` | [jakubkrehel/skills](https://github.com/jakubkrehel/skills) | MIT | 8 skills: `better-ui`, `better-typography`, `better-accessibility`, `better-layout`, `better-writing`, `better-interface`, `better-colors`, `interface-review`. |
| `impeccable-skill/` | [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | The core `impeccable` skill only — 23 commands (`polish`, `audit`, `critique`, `distill`, `animate`, `harden`, and more) plus its 59-rule deterministic anti-slop detector. **Note:** the full Impeccable project is a much larger toolkit (CLI, browser extension, per-agent install adapters) — this is the skill payload only. For the full CLI/detector/hook system, install from source: `npx impeccable install`. |

## Why these aren't rewritten like the rest of the pack

These authors have shipped, iterated, and battle-tested these specific instructions against real agent behavior — Emil Kowalski at Vercel/Linear, Paul Bakaus building a 59-rule deterministic detector, communities validating taste-skill and oklch-skill at scale (60k+ and 180+ GitHub stars respectively at time of writing). Rewriting them from a README summary would be a worse version of something that already exists and works. Use them as-is.

## Updating these

These are point-in-time copies. To pull the latest version of any of them:

```bash
npx skills add emilkowalski/skills
npx skills add leonxlnx/taste-skill
npx skills add jakubkrehel/oklch-skill
npx skills add jakubkrehel/skills
npx impeccable install
```

## A note on overlap

`emilkowalski-skills/apple-design`, `taste-skill/*`, `jakubkrehel-skills/better-*`, and `impeccable-skill` all compete for the same job — stopping generic-looking AI-generated UI. Don't run all of them on one project; they'll give overlapping (occasionally conflicting) opinions. Pick one as your primary design-taste layer per project:

- **Fastest to adopt, broadest command surface** → `impeccable-skill` (23 commands, deterministic detector, works across 14 agent tools)
- **Strongest animation/motion specificity** → `emilkowalski-skills/emil-design-eng` + `animate`
- **Most aggressive anti-slop enforcement, tunable dials** → `taste-skill`
- **Lightest weight, narrow and composable** → `jakubkrehel-skills` (pick just `better-colors` or `better-typography` individually)
- **Color-specific work only** → `oklch-skill`
