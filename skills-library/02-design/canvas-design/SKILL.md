---
name: canvas-design
description: Use this skill when producing static visual art or graphics meant for export — posters, social graphics, print-ready assets, PDFs — rather than interactive UI. Trigger on 'design a poster/flyer/graphic', 'make this exportable as PNG/PDF', 'create print-ready art'.
---

# Canvas Design — Static Visual Art to PNG/PDF

For flat, exportable visual output: posters, social graphics, invitation designs, print-ready one-pagers. Distinct from interactive UI work — the deliverable is a fixed image, not a live interface.

## Before building

Lock these decisions first, since static art has no interaction to compensate for weak choices:
1. **Canvas dimensions** — match the actual output context (1080x1080 for social square, A4/Letter proportions for print, custom for invitation card ratios). Wrong aspect ratio is the single most common failure.
2. **Print vs. screen** — print needs bleed margins and CMYK-safe color assumptions; screen can use full RGB vibrancy.
3. **Focal hierarchy** — one clear focal point (headline, hero image, key figure), everything else supporting. Competing focal points read as cluttered.

## Build approach

- Build via SVG for anything vector-based (typography-heavy posters, icon-based graphics) — scales cleanly to any export resolution.
- Use real typographic hierarchy: 3 sizes max per composition (display, subhead, body/caption) — more than that reads as unplanned.
- Leave intentional negative space — a common failure is filling the entire canvas because empty space feels "unfinished."
- For anything with brand color requirements (e.g. a specific client palette), lock hex values upfront rather than eyeballing.

## Export checklist

- Correct final dimensions and resolution for the target use (web vs. print DPI).
- Text legible at the actual display size it'll be viewed at (a poster viewed from 2 meters needs bigger type than the same content on a phone screen).
- No cut-off elements at the edges if bleed wasn't accounted for.
