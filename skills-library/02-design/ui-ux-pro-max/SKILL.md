---
name: ui-ux-pro-max
description: Use this skill as a reference library when making design system decisions — choosing a visual style, color palette, font pairing, chart type, or frontend stack for a project. Trigger on 'what style should this be', 'pick a palette', 'what font pairing works here', 'design system for X'.
---

# UI/UX Pro Max — Design System Decision Reference

A decision-support reference for style, palette, typography, and stack choices — not a component library itself.

## Style selection framework

Match style to product intent, not personal taste:
- **Minimalism** — content-heavy products where the content is the product (reading apps, docs, marketplaces with lots of listings).
- **Glassmorphism/neumorphism** — premium, tactile feel; works for consumer apps with a strong brand identity, overused and dated if applied to enterprise/utility tools.
- **Brutalism** — bold, opinionated brands willing to trade "safe" for "memorable" — works for creative-industry or youth-skewing products, wrong for trust-sensitive domains (fintech, healthcare, legal).
- **Bento grid** — dashboards and feature-showcase pages with heterogeneous content types.
- **Flat/functional** — utility tools, internal ops software, anything where speed of comprehension beats visual flourish.

## Palette selection

Pick palettes around functional roles, not just aesthetics: a primary action color, a neutral scale (5-7 steps for text/background/border), a success/warning/error triad that's colorblind-distinguishable, and at most one accent. Test contrast ratios against WCAG AA minimums before finalizing, not after.

## Font pairing principle

Pair by contrast, not similarity: a distinctive display face for headlines against a highly legible, neutral workhorse for body text. Two similar-weight sans-serifs paired together reads as an accident, not a choice.

## Stack selection

Match framework to actual requirement, not default habit — React/Next.js for complex interactive apps, static site generators for content-heavy low-interaction sites, no-framework HTML/CSS for single-purpose artifacts. Don't reach for a heavier stack than the project needs.

## Accessibility is a design decision, not a QA afterthought

Contrast, focus states, tap-target sizing (minimum ~44px for mobile), and semantic structure should be decided at design time, not patched in later.
