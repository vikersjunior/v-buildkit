#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET="$(pwd)"
AGENT=""
WITH_TEMPLATES="false"
LINK="false"
AUTO_DETECT="true"
WORKFLOW_SKILLS=(spec-driven-dev ideate spec-init spec-review feature implement check audit complete progress tools-check distill-skill)

agent_path() {
  case "$1" in
    claude) echo ".claude/skills" ;;
    codex|codex-cli|antigravity) echo ".agents/skills" ;;
    cursor) echo ".cursor/skills" ;;
    gemini|gemini-cli) echo ".gemini/skills" ;;
    copilot|github-copilot) echo ".github/skills" ;;
    grok) echo ".grok/skills" ;;
    opencode) echo ".opencode/skills" ;;
    kiro) echo ".kiro/skills" ;;
    trae) echo ".trae/skills" ;;
    rovodev|rovo-dev) echo ".rovodev/skills" ;;
    qoder) echo ".qoder/skills" ;;
    vibe) echo ".vibe/skills" ;;
    *) return 1 ;;
  esac
}

canonical_agent_name() {
  case "$1" in
    codex-cli|antigravity) echo codex ;;
    gemini-cli) echo gemini ;;
    github-copilot) echo copilot ;;
    rovo-dev) echo rovodev ;;
    *) echo "$1" ;;
  esac
}

print_agents() {
  cat <<'LIST'
  1) Claude Code       .claude/skills/
  2) Codex CLI         .agents/skills/
  3) Cursor            .cursor/skills/
  4) Gemini CLI        .gemini/skills/
  5) GitHub Copilot    .github/skills/
  6) Grok              .grok/skills/
  7) OpenCode          .opencode/skills/
  8) Kiro              .kiro/skills/
  9) Trae              .trae/skills/
 10) Rovo Dev          .rovodev/skills/
 11) Qoder             .qoder/skills/
 12) Mistral Vibe      .vibe/skills/

You can also enter multiple names, e.g. claude,codex,cursor.
Antigravity is accepted as an alias for the .agents/skills integration.
LIST
}

# Detect agents from the target project and, where available, the local machine.
# Project-native folders/configuration are weighted more strongly than a global CLI
# binary so an unrelated globally installed tool does not unexpectedly get installed.
detect_agent_score() {
  local agent="$1" score=0
  case "$agent" in
    claude)
      [[ -d "$TARGET/.claude/skills" ]] && score=$((score+6))
      [[ -f "$TARGET/CLAUDE.md" || -f "$TARGET/.claude/settings.json" ]] && score=$((score+3))
      command -v claude >/dev/null 2>&1 && score=$((score+2))
      ;;
    codex)
      [[ -d "$TARGET/.agents/skills" ]] && score=$((score+6))
      [[ -f "$TARGET/AGENTS.md" ]] && score=$((score+3))
      command -v codex >/dev/null 2>&1 && score=$((score+2))
      ;;
    cursor)
      [[ -d "$TARGET/.cursor/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.cursor" ]] && score=$((score+3))
      command -v cursor-agent >/dev/null 2>&1 && score=$((score+2))
      ;;
    gemini)
      [[ -d "$TARGET/.gemini/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.gemini" ]] && score=$((score+3))
      command -v gemini >/dev/null 2>&1 && score=$((score+2))
      ;;
    copilot)
      [[ -d "$TARGET/.github/skills" ]] && score=$((score+6))
      [[ -f "$TARGET/.github/copilot-instructions.md" ]] && score=$((score+5))
      command -v copilot >/dev/null 2>&1 && score=$((score+2))
      ;;
    grok)
      [[ -d "$TARGET/.grok/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.grok" ]] && score=$((score+3))
      command -v grok >/dev/null 2>&1 && score=$((score+2))
      ;;
    opencode)
      [[ -d "$TARGET/.opencode/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.opencode" ]] && score=$((score+3))
      command -v opencode >/dev/null 2>&1 && score=$((score+2))
      ;;
    kiro)
      [[ -d "$TARGET/.kiro/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.kiro" ]] && score=$((score+3))
      command -v kiro >/dev/null 2>&1 && score=$((score+2))
      ;;
    trae)
      [[ -d "$TARGET/.trae/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.trae" ]] && score=$((score+3))
      command -v trae >/dev/null 2>&1 && score=$((score+2))
      ;;
    rovodev)
      [[ -d "$TARGET/.rovodev/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.rovodev" ]] && score=$((score+3))
      command -v rovodev >/dev/null 2>&1 && score=$((score+2))
      ;;
    qoder)
      [[ -d "$TARGET/.qoder/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.qoder" ]] && score=$((score+3))
      command -v qoder >/dev/null 2>&1 && score=$((score+2))
      ;;
    vibe)
      [[ -d "$TARGET/.vibe/skills" ]] && score=$((score+6))
      [[ -d "$TARGET/.vibe" ]] && score=$((score+3))
      command -v vibe >/dev/null 2>&1 && score=$((score+2))
      ;;
  esac
  echo "$score"
}

detected_agents() {
  local agent score
  for agent in claude codex cursor gemini copilot grok opencode kiro trae rovodev qoder vibe; do
    score="$(detect_agent_score "$agent")"
    if [[ "$score" -ge 3 ]]; then
      echo "$score $agent"
    fi
  done | sort -rn | awk '{print $2}'
}

print_detected_agents() {
  local found="$1"
  if [[ -n "$found" ]]; then
    echo "Detected in this project / environment:"
    while IFS= read -r agent; do
      [[ -n "$agent" ]] && echo "  ✓ $agent ($(agent_path "$agent"))"
    done <<< "$found"
    echo
  else
    echo "No supported coding agent was confidently detected."
    echo
  fi
}

capability_detect() {
  local agent="$1"
  local skills="false" instructions="false" cli="false" shell="true" git="false" mcp="false" parallel="false"
  local skill_dir
  skill_dir="$(agent_path "$agent")"
  [[ -d "$TARGET/$skill_dir" ]] && skills="true"
  [[ -d "$TARGET/.git" ]] && git="true"

  case "$agent" in
    claude)
      [[ -f "$TARGET/CLAUDE.md" || -f "$TARGET/.claude/settings.json" ]] && instructions="true"
      command -v claude >/dev/null 2>&1 && cli="true"
      [[ -d "$TARGET/.mcp.json" || -f "$TARGET/.mcp.json" || -f "$TARGET/.claude/mcp.json" ]] && mcp="true"
      parallel="true"
      ;;
    codex)
      [[ -f "$TARGET/AGENTS.md" ]] && instructions="true"
      command -v codex >/dev/null 2>&1 && cli="true"
      [[ -f "$TARGET/.mcp.json" || -f "$TARGET/AGENTS.md" ]] && mcp="true"
      parallel="true"
      ;;
    cursor)
      [[ -d "$TARGET/.cursor" ]] && instructions="true"
      command -v cursor-agent >/dev/null 2>&1 && cli="true"
      [[ -d "$TARGET/.cursor/mcp.json" || -f "$TARGET/.cursor/mcp.json" ]] && mcp="true"
      ;;
    gemini)
      [[ -d "$TARGET/.gemini" ]] && instructions="true"
      command -v gemini >/dev/null 2>&1 && cli="true"
      [[ -f "$TARGET/.gemini/settings.json" ]] && mcp="true"
      ;;
    copilot)
      [[ -f "$TARGET/.github/copilot-instructions.md" ]] && instructions="true"
      command -v copilot >/dev/null 2>&1 && cli="true"
      [[ -f "$TARGET/.github/mcp.json" ]] && mcp="true"
      ;;
    grok) command -v grok >/dev/null 2>&1 && cli="true" ;;
    opencode) command -v opencode >/dev/null 2>&1 && cli="true" ;;
    kiro) command -v kiro >/dev/null 2>&1 && cli="true" ;;
    trae) command -v trae >/dev/null 2>&1 && cli="true" ;;
    rovodev) command -v rovodev >/dev/null 2>&1 && cli="true" ;;
    qoder) command -v qoder >/dev/null 2>&1 && cli="true" ;;
    vibe) command -v vibe >/dev/null 2>&1 && cli="true" ;;
  esac

  printf '{"agent":"%s","nativeSkills":%s,"projectInstructions":%s,"cliDetected":%s,"shell":%s,"git":%s,"mcpEvidence":%s,"parallelWorkEvidence":%s}' \
    "$agent" "$skills" "$instructions" "$cli" "$shell" "$git" "$mcp" "$parallel"
}

write_capabilities() {
  local out="$BUILDKIT_DIR/agent-capabilities.json"
  {
    echo '{'
    echo '  "schemaVersion": 1,'
    echo '  "note": "Capabilities are evidence-based signals, not guarantees of vendor behavior.",' 
    echo '  "agents": ['
    local i=0
    for agent in "${AGENTS[@]}"; do
      [[ $i -gt 0 ]] && echo ','
      printf '    %s' "$(capability_detect "$agent")"
      i=$((i+1))
    done
    echo
    echo '  ]'
    echo '}'
  } > "$out"
}

usage() {
  cat <<'USAGE'
Usage:
  ./install.sh [PROJECT_DIR] [--agent <name[,name...]>] [--link] [--with-blank-templates]

If --agent is omitted, BuildKit detects supported agents from the target project and local environment. In an interactive terminal, detected agents are offered as the default; otherwise you can choose manually. In CI/non-interactive mode, confident detections are used automatically.

Supported: claude, codex, antigravity, cursor, gemini, copilot, grok, opencode, kiro, trae, rovodev, qoder, vibe

Options:
  --agent <names>        Agent name or comma-separated agent names.
  --link                 Use .buildkit/workflow-skills as one shared source and symlink native folders.
  --no-detect             Disable automatic agent detection and require --agent (or interactive selection).
  --with-blank-templates Copy blank starter templates into the project root.
  -h, --help             Show help.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent) [[ $# -ge 2 ]] || { echo "Missing value for --agent" >&2; exit 1; }; AGENT="$2"; shift 2 ;;
    --agent=*) AGENT="${1#*=}"; shift ;;
    --with-blank-templates|--with-templates) WITH_TEMPLATES="true"; shift ;;
    --link) LINK="true"; shift ;;
    --no-detect) AUTO_DETECT="false"; shift ;;
    -h|--help) usage; exit 0 ;;
    --*) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    *)
      if [[ "$TARGET" != "$(pwd)" ]]; then echo "Only one PROJECT_DIR is allowed." >&2; exit 1; fi
      TARGET="$1"; shift ;;
  esac
done

TARGET="$(cd "$TARGET" 2>/dev/null && pwd || (mkdir -p "$TARGET" && cd "$TARGET" && pwd))"

if [[ -z "$AGENT" ]]; then
  DETECTED=""
  if [[ "$AUTO_DETECT" == "true" ]]; then
    DETECTED="$(detected_agents || true)"
  fi

  if [[ -t 0 ]]; then
    echo ""
    echo "Viker's BuildKit — agent setup"
    echo ""
    print_detected_agents "$DETECTED"

    if [[ -n "$DETECTED" ]]; then
      DETECTED_CSV="$(printf '%s' "$DETECTED" | paste -sd, -)"
      read -r -p "Use detected agent(s) [$DETECTED_CSV]? [Y/n] " USE_DETECTED
      USE_DETECTED="${USE_DETECTED:-Y}"
      if [[ "$USE_DETECTED" =~ ^[Yy]$ ]]; then
        AGENT="$DETECTED_CSV"
      fi
    fi

    if [[ -z "$AGENT" ]]; then
      print_agents
      read -r -p "Agent(s) [1-12 or name(s)]: " AGENT_INPUT
      IFS=',' read -r -a CHOICES <<< "$AGENT_INPUT"
      RESOLVED=()
      for choice in "${CHOICES[@]}"; do
        choice="$(echo "$choice" | tr '[:upper:]' '[:lower:]' | xargs)"
        case "$choice" in
          1) RESOLVED+=(claude);; 2) RESOLVED+=(codex);; 3) RESOLVED+=(cursor);; 4) RESOLVED+=(gemini);;
          5) RESOLVED+=(copilot);; 6) RESOLVED+=(grok);; 7) RESOLVED+=(opencode);; 8) RESOLVED+=(kiro);;
          9) RESOLVED+=(trae);; 10) RESOLVED+=(rovodev);; 11) RESOLVED+=(qoder);; 12) RESOLVED+=(vibe);;
          *) RESOLVED+=("$choice");;
        esac
      done
      AGENT="$(IFS=,; echo "${RESOLVED[*]}")"
    fi
  else
    if [[ "$AUTO_DETECT" == "true" && -n "$DETECTED" ]]; then
      AGENT="$(printf '%s' "$DETECTED" | paste -sd, -)"
      echo "Auto-detected agent(s): $AGENT"
    else
      echo "No --agent supplied and installer is non-interactive. Use --agent <name> or install from a project containing a detectable agent configuration." >&2
      exit 1
    fi
  fi
fi

IFS=',' read -r -a RAW_AGENTS <<< "$AGENT"
AGENTS=()
for raw in "${RAW_AGENTS[@]}"; do
  name="$(echo "$raw" | tr '[:upper:]' '[:lower:]' | xargs)"
  [[ -n "$name" ]] || continue
  [[ "$name" != "both" ]] || { echo "Use --agent claude,codex (or any combination) instead of the old 'both' alias." >&2; exit 1; }
  name="$(canonical_agent_name "$name")"
  agent_path "$name" >/dev/null || { echo "Unknown agent: $name" >&2; print_agents >&2; exit 1; }
  if [[ ! " ${AGENTS[*]} " =~ " ${name} " ]]; then AGENTS+=("$name"); fi
done
[[ ${#AGENTS[@]} -gt 0 ]] || { echo "At least one agent is required." >&2; exit 1; }

BUILDKIT_DIR="$TARGET/.buildkit"
WORKFLOW_ROOT="$BUILDKIT_DIR/workflow-skills"
LIBRARY_ROOT="$BUILDKIT_DIR/skills-library"
mkdir -p "$BUILDKIT_DIR"
rm -rf "$WORKFLOW_ROOT" "$LIBRARY_ROOT"
mkdir -p "$WORKFLOW_ROOT" "$LIBRARY_ROOT"
for skill in "${WORKFLOW_SKILLS[@]}"; do cp -R "$SCRIPT_DIR/.claude/skills/$skill" "$WORKFLOW_ROOT/$skill"; done
cp -R "$SCRIPT_DIR/skills-library/." "$LIBRARY_ROOT/"

install_to_agent() {
  local agent="$1" rel dest
  rel="$(agent_path "$agent")"
  dest="$TARGET/$rel"
  if [[ "$LINK" == "true" ]]; then
    if [[ -e "$dest" || -L "$dest" ]]; then
      echo "Cannot --link $agent: $dest already exists. Remove/move it first, or omit --link." >&2
      exit 1
    fi
    mkdir -p "$(dirname "$dest")"
    ln -s "../.buildkit/workflow-skills" "$dest"
    echo "Linked $dest -> .buildkit/workflow-skills"
  else
    mkdir -p "$dest"
    for skill in "${WORKFLOW_SKILLS[@]}"; do rm -rf "$dest/$skill"; cp -R "$WORKFLOW_ROOT/$skill" "$dest/$skill"; done
    echo "Installed workflow skills into $dest"
  fi
}

for agent in "${AGENTS[@]}"; do install_to_agent "$agent"; done

{
  echo "# BuildKit Agent Configuration"
  echo
  echo "Selected agents: ${AGENTS[*]}"
  echo
  echo "Canonical BuildKit workflow skills: .buildkit/workflow-skills/"
  echo "Canonical BuildKit capability library: .buildkit/skills-library/"
  echo
  echo "Native active skills directories:"
  for agent in "${AGENTS[@]}"; do echo "- $agent: $(agent_path "$agent")/"; done
  echo
  echo "## Portability rule"
  echo
  echo "BuildKit workflow skills must not assume a vendor-specific path. Resolve the native active skills directory from this file when a workflow needs to inspect or promote skills."
  echo "The six project source-of-truth files remain in the repository root. .buildkit/ is execution state, feature evidence, history, and BuildKit configuration."
} > "$BUILDKIT_DIR/agent.md"

write_capabilities

if [[ "$WITH_TEMPLATES" == "true" ]]; then cp "$SCRIPT_DIR/templates/"*.md "$TARGET/"; fi

echo ""
echo "BuildKit installed successfully."
echo "Agents: ${AGENTS[*]}"
echo "Workflow: ideate -> spec-init -> approval -> feature -> approval -> implement -> check -> audit -> complete"
for agent in "${AGENTS[@]}"; do echo "  $agent: $(agent_path "$agent")"; done
echo "BuildKit config: .buildkit/agent.md"
if [[ "$LINK" == "true" ]]; then echo "Single source of truth: .buildkit/workflow-skills/"; else echo "Workflow skills copied to each selected agent. Use --link on a clean project for one shared source."; fi
