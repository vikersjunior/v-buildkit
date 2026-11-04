---
name: investigate
description: Use this when explicitly asked to /investigate a bug or unexpected behaviour. Reproduces and localizes the problem without editing anything, reports the likely cause with evidence, then hands off to /fix.
disable-model-invocation: true
---
# Investigate — Read-Only Diagnosis

Run only when the user explicitly asks for this command (for example by typing /investigate). Do not start it on your own initiative or chain into it from another skill.

Context reuse: if a file this skill needs was already read in this session and has not changed since, reuse it. Reread only if it is absent from context, may have changed, or exact current text is needed.

`/investigate` answers: what is going wrong, where, and why? It changes nothing. "Read-only" here is an instruction you follow, not a sandbox: if the user wants it enforced, they run this in their agent's read-only or plan permission mode.

1. Read `.buildkit/state.md`. Read `rules.md` (in the configured documentation root) only if the problem touches one of its rules, such as security or data handling.
2. Restate the symptom in one or two lines. If it is not reproducible as described, ask at most one question.
3. Reproduce with commands the project already has: its tests, scripts, or a documented run command. Prefer the narrowest test, run non-interactively (CI mode, no watch mode). Stop a command that waits for input or runs for more than a few minutes, and report the step as not reproduced in time. Before each command, say what it may write. Never:
   - create, edit, delete or move a file, or install a package;
   - change git state (commit, checkout, switch, stash, reset, merge);
   - run a command that updates tracked files (snapshot updates, fixture regeneration, formatters, `--fix` or `-u` flags);
   - run a command that resets, seeds or writes to a local database, queue or dev-server data, other than an isolated, throwaway test database the test suite already creates and removes;
   - run a command that deploys, publishes, runs migrations, sends email or messages, calls production or any other non-local service, or needs credentials beyond what the test suite already uses.
   Writes to git-ignored build or cache output, or to the system temp directory, are fine. If you are unsure what a command writes, do not run it. If reproducing needs a new script, a code change or one of the commands above, describe it and ask the user instead.
4. Localize: narrow the cause to `file:line` with evidence (failing output, the code path you read).
5. Report in chat:
   - Symptom.
   - Reproduction: the exact command and a short output excerpt, or "not reproduced". Replace secrets, tokens and personal data with `[REDACTED]`.
   - Root cause, with confidence: confirmed, likely or unknown.
   - The smallest fix direction, and its risks.
   - If the cause is a security or data-loss problem, say so and suggest `/audit`.
6. End with: "Next: `/fix <one-line summary>`". Do not start `/fix` yourself.

`/investigate` writes no file, including anything in `.buildkit/`, so it can run while a feature is in progress.
