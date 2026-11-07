# Standing risks of every crosscheck run

These are accepted, known risks. Each receipt lists them (`standing_risks`). A project can keep its own list in `.buildkit/standing-risks.md`; agents read it and never edit it. When a critic's finding matches an entry, report it by reference (SR-n) with "made worse by this change: yes / no" and one sentence of evidence. A "yes" is a BLOCKER again.

## SR-1: Antigravity can search the web

`agy`'s `search_web` tool ran even with deny rules for `search_web`, `web` and `search` (tested 2026-11-07). A prompt-injected critic could put text from its input into a Google search. The input already goes to Google, so the added exposure is the search itself.

Mitigation: agy never runs from a gate, needs an explicit opt-in (`"google"` in `crosscheck.vendors`, or `--allow-web`), and the user is warned before each run.

## SR-2: the Codex sandbox restricts writes, not reads

`codex exec -s read-only` stops the critic from changing anything, but it isn't a read boundary: a prompt-injected critic could try to read files outside its input.

- **Windows:** on the authoring machine, Codex refused every shell command, so nothing could be read.
- **macOS and Linux:** that isn't verified. `blocking` and `when-sensitive` policies there run with this risk.

Codex's sandbox has no web access by default, so its only way out is its own output. BuildKit therefore redacts and cleans every critic field before it reaches a receipt or the ledger.

## Redaction is best-effort

Inputs and critic output are scanned for common credential shapes (private keys, AWS, GitHub, OpenAI and Slack tokens), and files like `.env*` and `*.pem` are never sent. Secrets in other formats can still get through. Don't enable crosscheck in projects that keep secrets in source.
