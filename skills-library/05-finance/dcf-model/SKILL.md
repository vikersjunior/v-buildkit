---
name: dcf-model
description: Use this skill when building a discounted cash flow valuation for a company, project, or investment decision. Trigger on 'build a DCF', 'what's this company worth', 'value this business/project'.
---

# DCF Model — Discounted Cash Flow Valuation

Standard intrinsic valuation method: project future free cash flows, discount them to present value.

## Build sequence

1. **Project unlevered free cash flow (UFCF)** for an explicit forecast period (typically 5-10 years): Revenue → EBIT → less taxes (NOPAT) → plus D&A → less CapEx → less change in net working capital = UFCF per year. Build revenue projections off explicit, stated assumptions (growth rate, market size, penetration) — never a bare "revenue grows 20%/year" without a stated driver behind it.
2. **Determine the discount rate (WACC).** Weighted average cost of equity (via CAPM: risk-free rate + beta × equity risk premium) and after-tax cost of debt, weighted by target capital structure. For early-stage/private companies without observable beta, use a comparable public company's beta unlevered and relevered to the target's capital structure.
3. **Calculate terminal value** — either a perpetuity growth model (final year UFCF × (1+g) / (WACC−g), where g is a conservative long-run rate, typically ≤ long-run GDP growth) or an exit multiple approach (final year EBITDA × a comparable exit multiple). Cross-check both methods against each other — a large divergence signals an assumption error somewhere.
4. **Discount everything to present value** using the WACC, sum the discounted explicit-period cash flows plus the discounted terminal value.
5. **Bridge to equity value** if needed: enterprise value − net debt − minority interest + investments = equity value; divide by share count for per-share value.

## Sensitivity is not optional

DCF outputs are highly sensitive to WACC and terminal growth rate assumptions. Always present a sensitivity table (2-3 WACC values × 2-3 terminal growth values) rather than a single point estimate — a single number without sensitivity misrepresents the actual confidence level of a DCF.

## Common errors to avoid

- Using an overly aggressive terminal growth rate (above long-run GDP growth is a red flag).
- Mixing levered and unlevered cash flows with the wrong discount rate.
- Forecasting revenue growth without a stated real-world driver behind it.
