---
name: sql-queries
description: Use this skill when pulling or analyzing structured records via SQL for legal, compliance, or operational review purposes — e.g. pulling contract records, audit trails, user data for a compliance request. Trigger on 'pull these records with SQL', 'query the database for X records', 'write a SQL query for this report'.
---

# SQL Queries — Structured Record Retrieval

For writing SQL queries to pull and analyze structured records — commonly for legal/compliance record pulls (audit trails, data subject requests, contract records) but applicable to any structured-data retrieval task.

## Query discipline

1. **Select only the columns actually needed**, never `SELECT *` for anything going into a compliance/legal deliverable — pulling unnecessary columns (especially ones containing personal or sensitive data) creates unnecessary exposure and review burden.
2. **Filter precisely** — date ranges, specific IDs, or explicit status filters rather than broad pulls that get filtered manually afterward; broad pulls risk including records that shouldn't be in scope for a specific legal/compliance request.
3. **Use explicit JOINs with clear ON conditions** — implicit joins or ambiguous join conditions are a common source of accidental duplicate rows or missing records in the result set, which is especially dangerous when the output feeds a legal or audit deliverable that needs to be complete and accurate.
4. **Aggregate carefully** — double-check GROUP BY logic against what's actually being counted; a common error is grouping at the wrong granularity and silently double-counting or under-counting records.

## For compliance/legal-specific pulls

- Log the exact query used and the timestamp it was run — audit trails for data-subject-request or legal-discovery pulls often need to show *how* the data was retrieved, not just the resulting data.
- Cross-check the row count against an independent expectation where possible (e.g. "we expect roughly N records based on X") before delivering — an unexpectedly high or low count is often the first signal of a filter or join error.
- Flag if the query touches personally identifiable or otherwise sensitive data, so appropriate handling (access restriction, secure transfer) is applied to the output, not just the source table.

## Verification before handoff

Spot-check a handful of individual result rows against the source data manually — a query that runs without error can still silently return the wrong rows due to a logic mistake; row-count and structure alone don't confirm correctness.
