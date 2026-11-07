# Critic launchers

Only these two critics are supported. Each was verified read-only on 2026-11-07. Gemini CLI and Claude Code CLI are not supported until their read-only recipes are verified.

| Critic | Vendor | Gates | Read-only control |
|---|---|---|---|
| `codex` | OpenAI | yes | `-s read-only` is Codex's own sandbox. Live web search is off unless `--search` is passed, which BuildKit never does. `--ignore-user-config` keeps the operator's MCP servers out. |
| `agy` | Google | never | `--sandbox --mode plan`, with permission rules that deny `command`, `mcp`, `read_file`, `grep_search` and `list_dir`. **Its `search_web` tool cannot be denied**, so it runs only with `"google"` in `crosscheck.vendors` or `--allow-web`. |

## Common rules

- **Two temp folders:** `<tmp>/inputs/` holds the prompts, settings and outputs; `<tmp>/work/` is created empty and is the critic's working folder. The project is never the critic's workspace. All input is inside the prompt.
- **After each leg:** if `<tmp>/work/` is no longer empty, the critic tried to write. Report that and discard the leg's output.
- **Timeouts:** Codex runs with your shell's timeout at 15 minutes; agy gets `--print-timeout 12m`.
- **Schema:** `.buildkit/workflow-skills/crosscheck/references/finding.schema.json` (below, as `<schema>`).
- **Prompts:** feed prompt files on stdin. Never paste them into an argument; Windows breaks quoting and length.
- **Windows PowerShell 5.1:** it reads files as ANSI and pipes text to native programs as ASCII, turning every non-ASCII character into `?`. Set `$OutputEncoding` to UTF-8 and read with `-Encoding UTF8`, as shown below.

## Codex

bash:
```bash
cd <tmp>/work && codex exec --ephemeral --ignore-user-config --skip-git-repo-check -s read-only -c model_reasoning_effort="high" --output-schema <schema> -o <tmp>/out/codex-A.json - < <tmp>/inputs/A.txt
```

PowerShell:
```powershell
$OutputEncoding = [System.Text.UTF8Encoding]::new($false); Set-Location <tmp>\work; Get-Content <tmp>\inputs\A.txt -Raw -Encoding UTF8 | codex exec --ephemeral --ignore-user-config --skip-git-repo-check -s read-only -c model_reasoning_effort="high" --output-schema <schema> -o <tmp>\out\codex-A.json -
```

The model is the CLI's default under `--ignore-user-config`, and the startup line shows it (`model: …`). Record it. If it's a small or mini tier, re-run with `-c model=<flagship>`. "Selected model is at capacity" exits 0 but writes no `-o` file: treat a missing or empty output file as a failed leg.

## Antigravity (`agy`), opt-in only

Write the settings file `<tmp>/inputs/agy-settings.json`:
```json
{ "permissions": { "deny": ["command", "mcp", "read_file", "grep_search", "list_dir"] } }
```

Pick the newest Gemini model from `agy models`. Never use a Claude or GPT model there: two critics from one lab void the cross-vendor signal.

bash:
```bash
cd <tmp>/work && agy --sandbox --mode plan --settings <tmp>/inputs/agy-settings.json --model <model> --json-schema <schema> --print-timeout 12m --input-format stream-json --output-format stream-json -p= < <tmp>/inputs/A.ndjson > <tmp>/out/agy-A.ndjson
```

PowerShell: use the same flags, with `$OutputEncoding = [System.Text.UTF8Encoding]::new($false); Get-Content <tmp>\inputs\A.ndjson -Raw -Encoding UTF8 | agy … -p= | Out-File -Encoding utf8 <tmp>\out\agy-A.ndjson`.

- **`-p=`:** keep the `=`. A bare `-p` swallows the next flag as its prompt.
- **The prompt:** opens with a "you have no tools" note (`--format agy` adds it). Without it, agy tries a shell command, is denied, and ends with no output.
- **Reading the output:** the receipt command reads the last `result` event (`structured_output`, or the JSON in `response`). A result with an empty response is a failed leg.
