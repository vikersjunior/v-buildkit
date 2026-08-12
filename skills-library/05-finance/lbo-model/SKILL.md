---
name: lbo-model
description: Use this skill when modeling a leveraged buyout — evaluating a debt-financed acquisition and the resulting equity returns. Trigger on 'model an LBO', 'what returns does this deal generate', 'leveraged buyout analysis'.
---

# LBO Model — Leveraged Buyout Returns Math

Models a debt-financed acquisition and solves for the resulting equity return to the sponsor.

## Build sequence

1. **Sources & uses.** Uses: purchase price (entry EV, typically entry multiple × EBITDA) plus transaction fees plus any refinancing of existing debt. Sources: new debt tranches (senior, subordinated, as applicable) plus sponsor equity plugging the remainder — sponsor equity is the balancing item, not an input picked independently of the debt capacity.
2. **Determine debt capacity realistically** — based on target leverage multiples (debt/EBITDA) that are actually obtainable for the target's size/sector/cash-flow stability, not an arbitrary maximum. Overly aggressive leverage assumptions produce unrealistic returns and, more importantly, an undeliverable deal.
3. **Build the operating projection** (revenue, EBITDA, cash flow) for the hold period — same rigor as a standalone 3-statement model, since debt paydown depends entirely on it.
4. **Model debt paydown** across the hold period — mandatory amortization plus cash sweep (excess free cash flow after mandatory items pays down debt, typically prioritized senior-first).
5. **Determine exit value** — exit EBITDA × exit multiple (commonly assumed flat to or conservatively below entry multiple unless there's a specific stated thesis for multiple expansion — assuming multiple expansion as the return driver is a red flag, not a base case).
6. **Solve for equity returns** — exit equity value (exit EV less remaining net debt at exit) versus initial sponsor equity, expressed as MOIC (multiple on invested capital) and IRR (accounting for the hold period length).

## Return driver decomposition

Break the total return into its components: EBITDA growth, debt paydown, and multiple expansion/contraction. A healthy deal thesis shouldn't be entirely dependent on multiple expansion — if it is, flag that as the primary risk in the model output, not just a footnote.

## Sensitivity requirement

Always show returns across a grid of entry multiple × exit multiple (or entry leverage × EBITDA growth) — a single-scenario IRR misrepresents the actual risk profile of a leveraged deal.
