---
name: programmatic-seo
description: Use this skill when the user wants to generate a large number of structurally similar landing pages from a dataset to capture long-tail search volume — city/neighborhood pages, product-category combinations, comparison pages. Trigger on 'generate pages at scale', 'programmatic SEO', 'build pages for every X'.
---

# Programmatic SEO — Templated Pages at Scale from Data

The playbook behind "1,000 city pages" or "every product x use-case combination" SEO plays. High leverage, high risk of thin-content penalties if done carelessly.

## Step 1: Validate the keyword pattern is real

Before building anything, confirm there's actual, distinct search volume for the pattern (e.g. "[service] in [neighborhood]") and that different instances of the pattern have genuinely different user intent — not just a template with a word swapped in. If every page would say the same thing with one variable changed, this will read as thin content to both users and search engines.

## Step 2: Design the data model

Each generated page needs enough unique, real data to justify existing as its own page:
- Unique factual content per instance (not just the swapped variable) — actual local data, actual product specs, actual comparison numbers.
- A consistent template structure (so it scales) with variable-driven unique sections (so each page has genuine substance).

## Step 3: Template structure

- Unique, keyword-matched title and H1 per page (not literally identical templates with only the variable changed — vary the surrounding language too).
- A unique data block per page (stats, listings, local specifics) that couldn't be copy-pasted to a different instance without being factually wrong.
- Internal links to sibling pages (other cities, other categories) and to a parent hub page — this is what makes the whole cluster rank, not just individual pages.
- Genuinely useful supporting content per page, not filler paragraphs restating the title.

## Step 4: Technical execution

- Generate an XML sitemap covering all instances, submit to search console.
- Canonical tags per page pointing to themselves (not accidentally to a template default).
- Watch crawl budget — thousands of thin pages published at once can get a domain's crawl rate throttled; consider staged rollout.

## Common failure mode

Publishing thousands of near-duplicate pages with no genuinely unique content per page. Search engines increasingly detect and suppress this pattern (see: the "helpful content" class of ranking systems) — quality-per-page at scale matters more than raw page count.

## Ghana/African-market application

Strong fit for hyperlocal service directories, transit-route pages (e.g. one page per route/station pair), or market-by-market product availability pages — genuine location-specific or route-specific data makes each page legitimately distinct, avoiding the thin-content trap.
