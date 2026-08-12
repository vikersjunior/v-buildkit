---
name: 3-statement-model
description: Use this skill when building a fully linked three-statement financial model (income statement, balance sheet, cash flow statement) for forecasting or planning purposes. Trigger on 'build a financial model', 'link the three statements', 'build a forecast model'.
---

# 3-Statement Model — Linked Financial Statement Modeling

The foundation model type underlying most other financial models (DCF, LBO, budgeting) — three statements that must tie out to each other, not stand-alone tabs.

## Build order (this sequence matters)

1. **Income statement first.** Revenue build (driven by explicit operational assumptions — units × price, or customers × ARPU, not a bare growth-rate assumption), cost structure (COGS, opex by category), down to net income.
2. **Balance sheet second**, driven substantially off the income statement: working capital items (AR/AP/inventory) as a function of revenue/COGS via day-based assumptions (DSO/DPO/DIO), PP&E rolling forward with CapEx and depreciation, debt schedule with any financing assumptions.
3. **Cash flow statement third**, built as the reconciliation, not an independent forecast: net income (from IS) + D&A + change in working capital (from BS) − CapEx (from BS) ± financing activity = change in cash, which then flows back to the balance sheet's cash line.

## The circularity problem

Interest expense depends on debt balance, which depends on the cash flow (which needs net income, which needs interest expense) — a genuine circular reference if there's a revolver or interest-bearing debt with variable draws. Handle with either an iterative calculation setting (enable circular references) or a simplifying convention (average beginning/ending balance for interest calc) — never leave this silently broken or hardcoded.

## The single most important check

**The balance sheet must actually balance** — assets = liabilities + equity — in every single forecast period. If it doesn't, there's a linking error somewhere (usually cash flow statement not fully reconciling back to the balance sheet, or a working-capital item double-counted). Never deliver a model where this check isn't visibly built in and passing.

## Assumptions sheet discipline

Every driving assumption (growth rates, margins, DSO/DPO/DIO days, CapEx as % of revenue) should live on a single, clearly labeled assumptions tab — never hardcoded inline inside formulas scattered across the model. This is what makes a model actually usable for scenario testing.
