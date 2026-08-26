#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if command -v node >/dev/null 2>&1; then
  exec node "$SCRIPT_DIR/bin/vikers-buildkit.js" install "$@"
else
  echo "Viker's BuildKit requires Node.js >= 18." >&2
  echo "Please install Node.js and try again." >&2
  exit 1
fi
