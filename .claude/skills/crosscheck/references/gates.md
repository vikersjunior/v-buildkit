# Crosscheck from a lifecycle gate

`/feature`, `/fix` and `/audit` read this file when `.buildkit/config.json` turns a crosscheck policy on. They follow it directly; they never invoke `/crosscheck`, which runs only when the user types it.

1. Run `node .buildkit/bin/crosscheck.js policy`. If neither `plan` nor `review` is `true` for this step, there is nothing to do.
   - `/feature` and `/fix` handle `plan`.
   - `/audit` handles `review`.
2. Run `node .buildkit/bin/crosscheck.js select --gate --host <your agent>`. Gates use Codex only; Antigravity never runs from a gate.
   - **If it picks none** (for example, the host is Codex itself, or `crosscheck.vendors` doesn't list `openai`): stop this gate step. Tell the user that this step needs an independent review, which they can run by hand with `/crosscheck <plan|review>`. Explain why the gate couldn't run one. Never record `critics: none` silently.
3. Otherwise, follow steps 2–8 of the crosscheck skill (`.buildkit/workflow-skills/crosscheck/SKILL.md`) with the picked critic: prompts for both lenses, the pre-send summary, the run, verification, one rebuttal round, the receipt and the ledger. A gate runs one round only; the user can always run `/crosscheck` again.
4. Report the verdicts with the rest of the step's output.
   - A `DO-NOT-MERGE` receipt doesn't undo the step.
   - `/complete` refuses until a passing receipt matches the current work.
