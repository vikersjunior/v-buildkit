---
name: seo-audit
description: Use this skill when the user wants an on-page SEO diagnosis of a website or page — before a rebuild, after a traffic drop, or as a pre-launch check. Trigger on 'audit our SEO', 'why did our traffic drop', 'check this page's SEO'.
---

# SEO Audit — On-Page SEO Diagnostic

A structured on-page audit — not link-building or off-page strategy.

## Audit checklist, in priority order

1. **Indexability** — is the page actually crawlable/indexable? Check robots.txt, meta robots tags, canonical tags pointing somewhere unintended. A perfectly optimized page that's accidentally `noindex`ed is the highest-severity finding possible.
2. **Title tags & meta descriptions** — unique per page, primary keyword near the front of the title, under ~60 chars for titles / ~155 for descriptions to avoid truncation in results.
3. **Heading structure** — one H1 per page matching primary search intent, logical H2/H3 nesting beneath it, not a flat wall of H1s or heading tags used purely for font-size styling.
4. **Content-intent match** — does the page's actual content match what someone searching the target keyword expects to find? Mismatch (thin content targeting a broad informational query) is a bigger problem than any technical issue.
5. **Core Web Vitals proxies** — page weight, largest content element load time, layout stability. Slow pages get down-ranked and lose users regardless of content quality.
6. **Internal linking** — does this page link to and get linked from relevant related pages? Orphaned pages rank worse regardless of on-page quality.
7. **Mobile rendering** — check the actual mobile-rendered layout, not just "is it responsive" — broken mobile UX is a ranking and conversion problem simultaneously.
8. **Structured data** — relevant schema.org markup present where applicable (article, product, local business, FAQ) to enable rich results.

## Output format

Rank findings by severity and effort: (blocking / high-impact-low-effort / high-impact-high-effort / minor). Don't bury a `noindex` tag finding under ten meta-description tweaks.

## Ghana/African-market note

Check for Mobile Money and local-payment-relevant schema/content if it's a commerce page — and verify page weight specifically on 3G-equivalent throttled load, since actual user connection speeds skew slower than typical Western dev/test environments.
