---
name: algorithmic-art
description: Use this skill when the user wants generative, algorithmic, or procedurally created visual art — p5.js sketches, particle systems, generative patterns — rather than a fixed designed layout. Trigger on 'generative art', 'make a p5.js sketch', 'procedural pattern/background'.
---

# Algorithmic Art — Generative p5.js Visuals

For rule-based, procedurally generated visual output — patterns, particle systems, noise-driven compositions — where the interesting part is the algorithm, not a hand-placed layout.

## Choosing the right technique for the brief

- **Noise-based** (Perlin/simplex) — organic, flowing textures; good for backgrounds, terrain-like patterns, ambient motion.
- **Particle systems** — good for dynamic, responsive, physics-feeling visuals (swarms, flow fields, explosions).
- **Grid/tiling algorithms** — good for structured, repeatable patterns (textile-style prints, geometric backgrounds).
- **L-systems/recursive** — good for organic branching structures (trees, coral, fractal patterns).

## Build discipline

1. Parametrize everything that could plausibly need tuning (color palette, density, speed, seed) as named variables at the top of the sketch, not hardcoded inline — makes iteration fast without touching logic.
2. Seed randomness explicitly when reproducibility matters (`randomSeed()`) — "make it again but slightly different" needs a controllable seed, not true randomness every run.
3. Keep frame rate in mind for anything animated — expensive per-frame calculations (large particle counts, unoptimized nested loops) will visibly stutter.
4. Constrain the color palette deliberately — algorithmic generation with unconstrained random color looks like noise, not art. Pick a fixed palette or a constrained hue/saturation range and sample from that.

## Quality bar

A generative piece should look intentional even though it's procedural — this comes from constraining parameters (bounded ranges, curated palettes, structured randomness) rather than maximizing randomness.
