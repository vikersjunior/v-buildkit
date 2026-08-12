---
name: xlsx-live-formulas
description: Use this skill when the deliverable needs to be a working Excel spreadsheet with live formulas — not a static export — so the user can adjust inputs and see outputs recalculate. Trigger on 'build this in Excel with formulas', 'make it editable', 'live spreadsheet not just numbers'.
---

# XLSX with Live Formulas — Editable Spreadsheet Construction

For spreadsheet deliverables that need to remain functional and editable, not a flattened numbers-only export. Complements the built-in xlsx document-creation skill — this is the practice discipline for how to structure formulas well, not the file-format mechanics.

## Structural discipline

1. **Separate inputs from calculations from outputs**, ideally on distinct tabs or clearly bounded regions — hardcoded assumption values buried inside formula cells make a model impossible to adjust safely later.
2. **Every calculated cell should be a formula referencing other cells**, never a hardcoded number that happens to match what the formula would produce — this is the single most common way spreadsheets silently break when an input changes but a downstream "calculated" cell doesn't actually recalculate because it was hardcoded.
3. **Use named ranges or clear, consistent cell references** for key assumptions that get referenced in many formulas — makes the model auditable and reduces the chance of a stray relative-reference error when copying formulas across rows/columns.
4. **Absolute vs. relative references deliberately** — lock ($) references to shared assumption cells so copying a formula across a range doesn't silently shift what it points to.

## Formula quality

- Prefer transparent, traceable formulas over clever one-liners that compress logic into a single unreadable cell — a formula that takes 3 intermediate columns to compute clearly beats one dense formula that's correct but unauditable.
- Use error-handling functions (IFERROR, IFNA) around any formula that could plausibly divide by zero or reference a missing lookup value, so the sheet degrades gracefully rather than showing raw #DIV/0! or #N/A errors to the end user.

## Verification before delivery

Manually recalculate at least 2-3 output cells by hand against the formula's inputs to confirm the formula logic is actually correct, not just that it returns a plausible-looking number. A formula that returns a reasonable-looking wrong answer is more dangerous than one that obviously errors.
