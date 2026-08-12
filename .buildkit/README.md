# BuildKit Engineering State

This directory is the execution-state layer for Vikers BuildKit. The six root project documents remain the source of truth.

Lifecycle: `/feature → approval → /implement → /check → /audit → /complete`

Directories:
- `features/` active feature contracts and verification
- `history/` completed feature evidence
- `audits/` implementation audit reports
- `decisions/` execution decisions
- `rollbacks/` rollback notes

`.buildkit/` must never become a shadow product specification. If it conflicts with a root spec, resolve the conflict through `/spec-review` and the six-file ownership rules.


## Agent capability evidence

After installation, `.buildkit/agent-capabilities.json` records locally observable signals for each selected agent. These are evidence, not guarantees. Workflow skills should consult this file before assuming an agent supports a particular capability.

Current signals: native skills, project instructions, detected CLI, shell availability, git availability, MCP configuration evidence, and parallel-work evidence.
