#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const {
  readBuildkitConfig,
  writeBuildkitConfig,
  resolveDocsRoot,
  resolveDocsRelative,
  normalizeDocsRoot,
  SPEC_FILES,
  ConfigStatus
} = require('../lib/config');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const WORKFLOW_SOURCE = path.join(PACKAGE_ROOT, '.claude', 'skills');
const LIBRARY_SOURCE = path.join(PACKAGE_ROOT, 'skills-library');
const TEMPLATE_SOURCE = path.join(PACKAGE_ROOT, 'templates');

const WORKFLOW_SKILLS = [
  'spec-driven-dev', 'ideate', 'spec-init', 'spec-review', 'feature',
  'implement', 'check', 'audit', 'complete', 'progress', 'tools-check', 'distill-skill'
];

const AGENTS = {
  claude: { label: 'Claude Code', path: '.claude/skills', commands: ['claude'], signals: ['.claude/skills', 'CLAUDE.md', '.claude/settings.json'] },
  codex: { label: 'Codex CLI', path: '.agents/skills', commands: ['codex'], signals: ['.agents/skills', 'AGENTS.md'] },
  antigravity: { label: 'Antigravity Agent', path: '.agents/skills', commands: ['antigravity', 'codex'], signals: ['.agents/skills', 'AGENTS.md'] },
  cursor: { label: 'Cursor', path: '.cursor/skills', commands: ['cursor-agent'], signals: ['.cursor/skills', '.cursor'] },
  gemini: { label: 'Gemini CLI', path: '.gemini/skills', commands: ['gemini'], signals: ['.gemini/skills', '.gemini'] },
  copilot: { label: 'GitHub Copilot', path: '.github/skills', commands: ['copilot'], signals: ['.github/skills', '.github/copilot-instructions.md'] },
  grok: { label: 'Grok', path: '.grok/skills', commands: ['grok'], signals: ['.grok/skills', '.grok'] },
  opencode: { label: 'OpenCode', path: '.opencode/skills', commands: ['opencode'], signals: ['.opencode/skills', '.opencode'] },
  kiro: { label: 'Kiro', path: '.kiro/skills', commands: ['kiro'], signals: ['.kiro/skills', '.kiro'] },
  trae: { label: 'Trae', path: '.trae/skills', commands: ['trae'], signals: ['.trae/skills', '.trae'] },
  rovodev: { label: 'Rovo Dev', path: '.rovodev/skills', commands: ['rovodev'], signals: ['.rovodev/skills', '.rovodev'] },
  qoder: { label: 'Qoder', path: '.qoder/skills', commands: ['qoder'], signals: ['.qoder/skills', '.qoder'] },
  vibe: { label: 'Mistral Vibe', path: '.vibe/skills', commands: ['vibe'], signals: ['.vibe/skills', '.vibe'] },
};

const ALIASES = {
  'codex-cli': 'codex', 'gemini-cli': 'gemini',
  'github-copilot': 'copilot', 'rovo-dev': 'rovodev', 'mistral-vibe': 'vibe'
};

function usage() {
  console.log(`Viker's BuildKit — AI-assisted Development Operating System

Usage:
  npx vikers-buildkit [command] [PROJECT_DIR] [options]
  npx v-buildkit [command] [PROJECT_DIR] [options]

Commands:
  install, init     Install BuildKit in the target project (default).
  update            Safely update workflow skills without touching user specs or state.
  status            Show BuildKit installation and agent configuration status.
  doctor            Audit BuildKit state, symlinks, and skill health.
  repair            Repair broken links, missing skills, or corrupted metadata.

Examples:
  npx vikers-buildkit
  npx vikers-buildkit install .
  npx vikers-buildkit install . --docs-dir docs/buildkit
  npx vikers-buildkit . --agent claude
  npx vikers-buildkit . --agent claude,codex,cursor --link
  npx vikers-buildkit . --no-detect --agent codex
  npx vikers-buildkit status
  npx vikers-buildkit doctor
  npx vikers-buildkit update

Options:
  --docs-dir <path>        Set custom project documentation directory (default: project root).
  --agent <names>          Agent name or comma-separated agent names.
  --link                   Share workflow source via native symlinks/junctions.
  --no-detect              Disable automatic agent detection.
  --with-blank-templates   Copy blank starter templates to the documentation root.
  --skip-capabilities      Skip capability detection.
  -h, --help               Show this help message.
  -v, --version            Show version number.

Supported agents: ${Object.keys(AGENTS).join(', ')}
`);
}

function commandExists(command) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = spawnSync(checker, [command], { stdio: 'ignore', shell: false });
    return result.status === 0;
  } catch {
    return false;
  }
}

function normalizeAgent(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return ALIASES[key] || key;
}

function detectAgentScore(target, agent) {
  const cfg = AGENTS[agent];
  if (!cfg) return 0;
  let score = 0;
  for (const signal of cfg.signals) {
    if (fs.existsSync(path.join(target, signal))) score += signal.endsWith('/skills') ? 6 : 3;
  }
  if (cfg.commands.some(commandExists)) score += 2;
  return score;
}

function detectAgents(target) {
  return Object.keys(AGENTS)
    .map(agent => ({ agent, score: detectAgentScore(target, agent) }))
    .filter(x => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .map(x => x.agent);
}

function parseArgs(argv) {
  const options = {
    subcommand: 'install',
    target: process.cwd(),
    docsDir: null,
    agent: null,
    link: false,
    detect: true,
    templates: false,
    capabilities: true
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    if (arg === '--version' || arg === '-v') { console.log(require('../package.json').version); process.exit(0); }
    if (arg === '--link') { options.link = true; continue; }
    if (arg === '--no-detect') { options.detect = false; continue; }
    if (arg === '--skip-capabilities') { options.capabilities = false; continue; }
    if (arg === '--with-blank-templates' || arg === '--with-templates') { options.templates = true; continue; }
    if (arg === '--docs-dir') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error('Missing value for --docs-dir');
      options.docsDir = argv[++i]; continue;
    }
    if (arg.startsWith('--docs-dir=')) {
      const val = arg.slice('--docs-dir='.length);
      if (!val) throw new Error('Missing value for --docs-dir');
      options.docsDir = val; continue;
    }
    if (arg === '--agent') {
      if (!argv[i + 1]) throw new Error('Missing value for --agent');
      options.agent = argv[++i]; continue;
    }
    if (arg.startsWith('--agent=')) { options.agent = arg.slice('--agent='.length); continue; }
    if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }

  if (positional.length > 0) {
    const sub = positional[0].toLowerCase();
    if (['install', 'init', 'status', 'doctor', 'repair', 'update'].includes(sub)) {
      options.subcommand = sub === 'init' ? 'install' : sub;
      if (positional[1]) options.target = positional[1];
      if (positional.length > 2) throw new Error('Too many arguments supplied.');
    } else {
      options.target = positional[0];
      if (positional.length > 1) throw new Error('Only one PROJECT_DIR is allowed.');
    }
  }

  return options;
}

function resolveTarget(target) {
  const resolved = path.resolve(process.cwd(), target);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function copyDir(source, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(source, dest, { recursive: true, force: true });
}

function copyFile(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

function prompt(message) {
  process.stdout.write(message);
  const buffer = Buffer.alloc(4096);
  try {
    const bytes = fs.readSync(0, buffer, 0, buffer.length, null);
    if (bytes === 0) return '';
    return buffer.toString('utf8', 0, bytes).trim();
  } catch {
    return '';
  }
}

function selectDocsDir(options, target) {
  if (options.docsDir !== null) {
    return normalizeDocsRoot(options.docsDir, target);
  }

  // Check if config already exists
  const existingConfig = readBuildkitConfig(target);
  if (existingConfig.status === ConfigStatus.VALID) {
    return existingConfig.config.docs.root;
  }

  if (process.stdin.isTTY) {
    console.log('\nWhere should BuildKit store project documentation?\n');
    console.log('  1. Project root (.)');
    console.log('  2. docs/');
    console.log('  3. docs/buildkit/');
    console.log('  4. Custom path');

    const choice = prompt('\nChoice [1-4, default 1]: ');
    if (choice === '2') return 'docs';
    if (choice === '3') return 'docs/buildkit';
    if (choice === '4') {
      const customPath = prompt('Documentation directory: ');
      if (!customPath) return '.';
      return normalizeDocsRoot(customPath, target);
    }
    return '.';
  }

  return '.';
}

function selectAgents(options, target) {
  if (options.agent) return options.agent.split(',').map(normalizeAgent).filter(Boolean);
  const detected = options.detect ? detectAgents(target) : [];
  if (process.stdin.isTTY) {
    console.log('\nViker\'s BuildKit — agent setup\n');
    if (detected.length) {
      console.log('Detected in this project / environment:');
      for (const agent of detected) console.log(`  ✓ ${agent} (${AGENTS[agent].path}/)`);
      const answer = prompt(`\nUse detected agent(s) [${detected.join(',')}]? [Y/n] `);
      if (!answer || /^y(es)?$/i.test(answer)) return detected;
    } else {
      console.log('No supported coding agent was confidently detected.');
    }
    console.log('\nSupported agents:');
    Object.entries(AGENTS).forEach(([key, cfg], index) => console.log(` ${String(index + 1).padStart(2, ' ')}. ${cfg.label.padEnd(22)} ${cfg.path}/`));
    const answer = prompt('\nAgent(s) [number(s) or name(s), comma-separated]: ');
    const byNumber = Object.keys(AGENTS);
    const choices = answer.split(',').map(x => x.trim()).filter(Boolean).map(x => /^\d+$/.test(x) ? byNumber[Number(x) - 1] : normalizeAgent(x));
    return choices.filter(Boolean);
  }
  if (detected.length) {
    console.log(`Auto-detected agent(s): ${detected.join(', ')}`);
    return detected;
  }
  throw new Error('No --agent supplied and installer is non-interactive. Use --agent <name> or install from a project containing detectable agent configuration.');
}

function validateAgents(agents) {
  const unique = [...new Set(agents)];
  for (const agent of unique) {
    if (!AGENTS[agent]) throw new Error(`Unknown agent: ${agent}. Supported: ${Object.keys(AGENTS).join(', ')}`);
  }
  if (!unique.length) throw new Error('At least one agent is required.');
  return unique;
}

function installAgent(target, workflowRoot, agent, link) {
  const cfg = AGENTS[agent];
  if (!cfg) throw new Error(`Unknown agent: ${agent}`);
  const dest = path.join(target, cfg.path);

  let destExists = false;
  let isSymlink = false;
  try {
    const stat = fs.lstatSync(dest);
    destExists = true;
    isSymlink = stat.isSymbolicLink();
  } catch {}

  if (link) {
    if (destExists) {
      if (isSymlink) {
        try { fs.unlinkSync(dest); } catch (e) {
          throw new Error(`Cannot --link ${agent}: ${cfg.path} exists and could not be replaced: ${e.message}`);
        }
      } else {
        throw new Error(`Cannot --link ${agent}: ${cfg.path} already exists as a directory. Remove or move it first, or omit --link.`);
      }
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (process.platform === 'win32') {
      fs.symlinkSync(workflowRoot, dest, 'junction');
    } else {
      fs.symlinkSync(path.relative(path.dirname(dest), workflowRoot), dest, 'dir');
    }
    console.log(`Linked ${cfg.path}/ -> .buildkit/workflow-skills/`);
  } else {
    if (isSymlink) {
      fs.unlinkSync(dest);
    }
    fs.mkdirSync(dest, { recursive: true });
    for (const skill of WORKFLOW_SKILLS) {
      copyDir(path.join(workflowRoot, skill), path.join(dest, skill));
    }
    console.log(`Installed workflow skills into ${cfg.path}/`);
  }
}

function writeAgentConfig(target, agents) {
  let docsRoot = '.';
  try {
    docsRoot = resolveDocsRelative(target);
  } catch {}

  const lines = [
    '# BuildKit Agent Configuration', '',
    `Selected agents: ${agents.join(' ')}`, '',
    'Canonical BuildKit workflow skills: .buildkit/workflow-skills/',
    'Canonical BuildKit capability library: .buildkit/skills-library/', '',
    'Native active skills directories:',
    ...agents.map(agent => `- ${agent}: ${AGENTS[agent].path}/`), '',
    '## BUILDKIT PROJECT DOCUMENTATION ROOT', '',
    'BuildKit execution state lives at:',
    '.buildkit/', '',
    'BuildKit project documentation location is defined in:',
    '.buildkit/config.json', '',
    `The configuration field \`docs.root\` defines the project documentation root relative to the project root (currently: "${docsRoot}").`,
    'If .buildkit/config.json does not exist, the project documentation root is the project root (.).', '',
    'Before accessing a BuildKit-managed project document:',
    '1. Read .buildkit/config.json if it exists.',
    '2. Resolve docs.root relative to the project root.',
    '3. If no configuration exists, use the project root (.).',
    '4. Resolve the requested document relative to that directory.',
    '5. Never assume PRD.md or other BuildKit documents are located at the project root.', '',
    'Documents:',
    `- PRD: <docs.root>/PRD.md`,
    `- Architecture: <docs.root>/architecture.md`,
    `- Tech Stack: <docs.root>/Tech_stack.md`,
    `- Implementation Plan: <docs.root>/Implementation_plan.md`,
    `- Rules: <docs.root>/rules.md`,
    `- Progress: <docs.root>/Progress.md`, '',
    '## Portability rule', '',
    'BuildKit workflow skills must not assume a vendor-specific path. Resolve the native active skills directory from this file when a workflow needs to inspect or promote skills.'
  ];
  fs.mkdirSync(path.join(target, '.buildkit'), { recursive: true });
  fs.writeFileSync(path.join(target, '.buildkit', 'agent.md'), lines.join('\n') + '\n');
}

function getConfiguredAgents(target) {
  const agentMd = path.join(target, '.buildkit', 'agent.md');
  if (fs.existsSync(agentMd)) {
    const content = fs.readFileSync(agentMd, 'utf8');
    const match = content.match(/Selected agents:\s*([^\n]+)/);
    if (match && match[1]) {
      return match[1].split(/\s+/).map(normalizeAgent).filter(Boolean);
    }
  }
  return [];
}

function detectCapabilities(target, agents) {
  const result = agents.map(agent => {
    const cfg = AGENTS[agent];
    if (!cfg) return null;
    const skillDir = path.join(target, cfg.path);
    const nativeSkills = fs.existsSync(skillDir);
    const projectInstructions = cfg.signals.some(signal => !signal.endsWith('/skills') && fs.existsSync(path.join(target, signal)));
    const cliDetected = cfg.commands.some(commandExists);
    const git = fs.existsSync(path.join(target, '.git'));
    let mcpEvidence = false;
    if (agent === 'claude') mcpEvidence = fs.existsSync(path.join(target, '.mcp.json')) || fs.existsSync(path.join(target, '.claude', 'mcp.json'));
    if (agent === 'codex') mcpEvidence = fs.existsSync(path.join(target, '.mcp.json'));
    if (agent === 'cursor') mcpEvidence = fs.existsSync(path.join(target, '.cursor', 'mcp.json'));
    if (agent === 'gemini') mcpEvidence = fs.existsSync(path.join(target, '.gemini', 'settings.json'));
    if (agent === 'copilot') mcpEvidence = fs.existsSync(path.join(target, '.github', 'mcp.json'));
    let parallelWorkEvidence = "unknown";
    if (['claude', 'codex', 'antigravity'].includes(agent)) {
      parallelWorkEvidence = true;
    }
    return {
      agent,
      nativeSkills,
      projectInstructions,
      cliDetected,
      shell: true,
      git,
      mcpEvidence,
      parallelWorkEvidence
    };
  }).filter(Boolean);

  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    node: process.version,
    note: 'Capabilities are evidence-based signals, not guarantees of vendor behavior.',
    agents: result
  };
  fs.mkdirSync(path.join(target, '.buildkit'), { recursive: true });
  fs.writeFileSync(path.join(target, '.buildkit', 'agent-capabilities.json'), JSON.stringify(out, null, 2) + '\n');
  return out;
}

function install(options) {
  if (!fs.existsSync(WORKFLOW_SOURCE)) throw new Error('BuildKit workflow skills are missing from the package.');
  const target = resolveTarget(options.target);

  const docsDirRel = selectDocsDir(options, target);
  writeBuildkitConfig(target, { docs: { root: docsDirRel } });
  const absDocsRoot = path.resolve(target, docsDirRel);
  fs.mkdirSync(absDocsRoot, { recursive: true });

  // Detect existing root documents if docsDir is non-root
  if (docsDirRel !== '.') {
    const existingRootSpecs = SPEC_FILES.filter(file => fs.existsSync(path.join(target, file)));
    if (existingRootSpecs.length > 0) {
      console.log('\nNotice: Existing BuildKit documentation detected at project root:');
      for (const file of existingRootSpecs) {
        console.log(`  - ${file}`);
      }
      console.log(`Target documentation directory: ${docsDirRel}/`);
      console.log('BuildKit will not automatically move or overwrite your existing root documents.');
      console.log('To migrate existing documents, see docs/migration.md.\n');
    }
  }

  const agents = validateAgents(selectAgents(options, target));
  const buildkit = path.join(target, '.buildkit');
  const workflowRoot = path.join(buildkit, 'workflow-skills');
  const libraryRoot = path.join(buildkit, 'skills-library');
  fs.mkdirSync(buildkit, { recursive: true });
  copyDir(WORKFLOW_SOURCE, workflowRoot);
  copyDir(LIBRARY_SOURCE, libraryRoot);
  for (const agent of agents) installAgent(target, workflowRoot, agent, options.link);
  writeAgentConfig(target, agents);
  if (options.capabilities) detectCapabilities(target, agents);
  if (options.templates) {
    for (const file of fs.readdirSync(TEMPLATE_SOURCE).filter(f => f.endsWith('.md'))) {
      const dest = path.join(absDocsRoot, file);
      if (!fs.existsSync(dest)) copyFile(path.join(TEMPLATE_SOURCE, file), dest);
    }
  }
  console.log('\nBuildKit installed successfully.');
  console.log(`Agents: ${agents.join(', ')}`);
  console.log(`Documentation root: ${docsDirRel}/`);
  console.log('Workflow: ideate -> spec-init -> approval -> feature -> approval -> implement -> check -> audit -> complete');
  console.log(`BuildKit config: ${path.join('.buildkit', 'config.json')}`);
  console.log(options.link ? 'Single source of truth: .buildkit/workflow-skills/' : 'Workflow skills copied to each selected agent.');
}

function status(options) {
  const target = resolveTarget(options.target);
  const buildkitDir = path.join(target, '.buildkit');
  console.log(`\nViker's BuildKit Status — ${target}\n`);

  if (!fs.existsSync(buildkitDir)) {
    console.log('Status: NOT INSTALLED');
    console.log('Run `npx vikers-buildkit install` to set up BuildKit in this project.');
    return;
  }

  const configRes = readBuildkitConfig(target);
  if (configRes.status !== ConfigStatus.VALID && configRes.status !== ConfigStatus.MISSING) {
    console.log('✗ Invalid BuildKit configuration');
    console.log(`  File: ${configRes.configPath}`);
    console.log(`  Error: ${configRes.error}\n`);
    console.log('BuildKit cannot safely determine the project documentation root.');
    console.log('Run `npx vikers-buildkit doctor` or `npx vikers-buildkit repair` to resolve.\n');
    process.exitCode = 1;
    return;
  }

  const relDocsRoot = configRes.config.docs.root;
  const absDocsRoot = path.resolve(target, relDocsRoot);

  const configured = getConfiguredAgents(target);
  console.log(`BuildKit Version:    ${require('../package.json').version}`);
  console.log(`Documentation Root:  ${relDocsRoot}/`);
  console.log(`Execution State:     .buildkit/`);
  console.log(`Configured Agents:   ${configured.length ? configured.join(', ') : 'None recorded'}`);
  console.log('\nAgent Skills Folders:');

  const agentsToCheck = configured.length ? configured : Object.keys(AGENTS);
  for (const agent of agentsToCheck) {
    const cfg = AGENTS[agent];
    if (!cfg) continue;
    const dest = path.join(target, cfg.path);
    let state = 'Not present';
    try {
      const stat = fs.lstatSync(dest);
      if (stat.isSymbolicLink()) {
        let valid = false;
        try { valid = fs.existsSync(dest); } catch {}
        state = valid ? 'Linked (Valid)' : 'Linked (BROKEN target)';
      } else if (stat.isDirectory()) {
        state = 'Installed (Copied)';
      }
    } catch {}
    console.log(`  ${cfg.label.padEnd(24)} (${cfg.path}/): ${state}`);
  }

  console.log(`\nSpec Files Status (${relDocsRoot}/):`);
  for (const file of SPEC_FILES) {
    const exists = fs.existsSync(path.join(absDocsRoot, file));
    console.log(`  ${file.padEnd(26)}: ${exists ? 'Present' : 'Missing'}`);
  }
}

function doctor(options) {
  const target = resolveTarget(options.target);
  const buildkitDir = path.join(target, '.buildkit');
  console.log(`\nViker's BuildKit Doctor — Health Check for ${target}\n`);

  let issues = 0;
  function check(condition, passMsg, failMsg) {
    if (condition) {
      console.log(`  [PASS] ${passMsg}`);
    } else {
      console.log(`  [FAIL] ${failMsg}`);
      issues++;
    }
  }
  function warn(condition, passMsg, warnMsg) {
    if (condition) {
      console.log(`  [PASS] ${passMsg}`);
    } else {
      console.log(`  [WARN] ${warnMsg}`);
    }
  }

  check(fs.existsSync(buildkitDir), '.buildkit/ directory exists', '.buildkit/ directory missing');

  const configRes = readBuildkitConfig(target);
  if (configRes.status === ConfigStatus.MISSING) {
    check(true, '.buildkit/config.json missing (defaulting to project root)', '');
  } else if (configRes.status === ConfigStatus.VALID) {
    check(true, `.buildkit/config.json is valid (docs.root = "${configRes.config.docs.root}")`, '');
  } else {
    check(false, '', `.buildkit/config.json is invalid (${configRes.status}): ${configRes.error}`);
  }

  let absDocsRoot = target;
  let relDocsRoot = '.';
  if (configRes.status === ConfigStatus.VALID || configRes.status === ConfigStatus.MISSING) {
    relDocsRoot = configRes.config.docs.root;
    absDocsRoot = path.resolve(target, relDocsRoot);
    check(fs.existsSync(absDocsRoot), `Documentation root directory exists (${relDocsRoot}/)`, `Documentation root directory missing (${relDocsRoot}/)`);
  }

  const workflowRoot = path.join(buildkitDir, 'workflow-skills');
  const hasWorkflow = fs.existsSync(workflowRoot);
  check(hasWorkflow, '.buildkit/workflow-skills/ exists', '.buildkit/workflow-skills/ missing');

  if (hasWorkflow) {
    let missingWorkflowSkills = [];
    for (const skill of WORKFLOW_SKILLS) {
      if (!fs.existsSync(path.join(workflowRoot, skill, 'SKILL.md'))) {
        missingWorkflowSkills.push(skill);
      }
    }
    check(missingWorkflowSkills.length === 0, 'All 12 workflow skills present in .buildkit/workflow-skills/', `Missing workflow skills: ${missingWorkflowSkills.join(', ')}`);
  }

  const libraryRoot = path.join(buildkitDir, 'skills-library');
  check(fs.existsSync(libraryRoot), '.buildkit/skills-library/ exists', '.buildkit/skills-library/ missing');

  const configured = getConfiguredAgents(target);
  warn(configured.length > 0, `.buildkit/agent.md config found (${configured.join(', ')})`, '.buildkit/agent.md missing or no agents recorded');

  for (const agent of configured) {
    const cfg = AGENTS[agent];
    if (!cfg) continue;
    const dest = path.join(target, cfg.path);
    let destStat = null;
    try { destStat = fs.lstatSync(dest); } catch {}

    if (!destStat) {
      check(false, '', `Agent folder ${cfg.path}/ for ${agent} does not exist`);
    } else if (destStat.isSymbolicLink()) {
      check(fs.existsSync(dest), `Linked folder ${cfg.path}/ points to valid target`, `Linked folder ${cfg.path}/ is BROKEN`);
    } else {
      let missingInAgent = [];
      for (const skill of WORKFLOW_SKILLS) {
        if (!fs.existsSync(path.join(dest, skill, 'SKILL.md'))) {
          missingInAgent.push(skill);
        }
      }
      check(missingInAgent.length === 0, `Workflow skills complete in ${cfg.path}/`, `Missing skills in ${cfg.path}/: ${missingInAgent.join(', ')}`);
    }
  }

  console.log(`\nDoctor Audit Summary: ${issues === 0 ? 'HEALTHY (0 issues found)' : `${issues} issue(s) detected. Run \`npx vikers-buildkit repair\` to fix.`}\n`);
  if (issues > 0) {
    process.exitCode = 1;
  }
}

function repair(options) {
  const target = resolveTarget(options.target);
  const buildkitDir = path.join(target, '.buildkit');
  const workflowRoot = path.join(buildkitDir, 'workflow-skills');
  const libraryRoot = path.join(buildkitDir, 'skills-library');

  console.log(`\nViker's BuildKit Repair — Repairing BuildKit state in ${target}\n`);

  fs.mkdirSync(buildkitDir, { recursive: true });

  const configRes = readBuildkitConfig(target);
  let docsRootRel = '.';
  if (configRes.status === ConfigStatus.VALID) {
    docsRootRel = configRes.config.docs.root;
  } else {
    docsRootRel = options.docsDir ? normalizeDocsRoot(options.docsDir, target) : '.';
    writeBuildkitConfig(target, { docs: { root: docsRootRel } });
    console.log(`✓ Restored .buildkit/config.json with docs.root = "${docsRootRel}"`);
  }

  const absDocsRoot = path.resolve(target, docsRootRel);
  fs.mkdirSync(absDocsRoot, { recursive: true });

  copyDir(WORKFLOW_SOURCE, workflowRoot);
  copyDir(LIBRARY_SOURCE, libraryRoot);
  console.log('✓ Restored .buildkit/workflow-skills and .buildkit/skills-library');

  let configured = getConfiguredAgents(target);
  if (!configured.length) {
    configured = options.detect ? detectAgents(target) : ['claude'];
    if (!configured.length) configured = ['claude'];
  }

  for (const agent of configured) {
    const cfg = AGENTS[agent];
    if (!cfg) continue;
    const dest = path.join(target, cfg.path);
    let isSymlink = false;
    try { isSymlink = fs.lstatSync(dest).isSymbolicLink(); } catch {}

    if (isSymlink) {
      if (!fs.existsSync(dest)) {
        console.log(`Repairing broken link at ${cfg.path}/...`);
        fs.unlinkSync(dest);
        installAgent(target, workflowRoot, agent, true);
      }
    } else {
      installAgent(target, workflowRoot, agent, false);
    }
  }

  writeAgentConfig(target, configured);
  detectCapabilities(target, configured);

  console.log('\nRepair completed successfully.');
}

function update(options) {
  const target = resolveTarget(options.target);
  const buildkitDir = path.join(target, '.buildkit');

  if (!fs.existsSync(buildkitDir)) {
    console.log('BuildKit is not installed in this directory. Running clean install...');
    return install(options);
  }

  console.log(`\nViker's BuildKit Update — Updating ${target}\n`);

  if (options.docsDir) {
    const newDocsRel = normalizeDocsRoot(options.docsDir, target);
    writeBuildkitConfig(target, { docs: { root: newDocsRel } });
    console.log(`✓ Updated documentation root to ${newDocsRel}/`);
  }

  const docsRootRel = resolveDocsRelative(target);
  const absDocsRoot = path.resolve(target, docsRootRel);
  fs.mkdirSync(absDocsRoot, { recursive: true });

  const workflowRoot = path.join(buildkitDir, 'workflow-skills');
  const libraryRoot = path.join(buildkitDir, 'skills-library');

  copyDir(WORKFLOW_SOURCE, workflowRoot);
  copyDir(LIBRARY_SOURCE, libraryRoot);
  console.log('✓ Updated .buildkit/workflow-skills and .buildkit/skills-library');

  let configured = getConfiguredAgents(target);
  if (options.agent) {
    configured = validateAgents(options.agent.split(',').map(normalizeAgent).filter(Boolean));
  }
  if (!configured.length) configured = ['claude'];

  for (const agent of configured) {
    const cfg = AGENTS[agent];
    if (!cfg) continue;
    const dest = path.join(target, cfg.path);
    let isSymlink = false;
    try { isSymlink = fs.lstatSync(dest).isSymbolicLink(); } catch {}

    if (!isSymlink) {
      fs.mkdirSync(dest, { recursive: true });
      for (const skill of WORKFLOW_SKILLS) {
        copyDir(path.join(workflowRoot, skill), path.join(dest, skill));
      }
      console.log(`✓ Updated workflow skills in ${cfg.path}/`);
    } else {
      console.log(`✓ Preserved linked directory ${cfg.path}/`);
    }
  }

  writeAgentConfig(target, configured);
  detectCapabilities(target, configured);

  console.log('\nBuildKit update complete. User project specifications and history preserved.');
}

try {
  const options = parseArgs(process.argv.slice(2));
  switch (options.subcommand) {
    case 'status': status(options); break;
    case 'doctor': doctor(options); break;
    case 'repair': repair(options); break;
    case 'update': update(options); break;
    case 'install': default: install(options); break;
  }
} catch (error) {
  console.error(`\nBuildKit error: ${error.message}`);
  process.exit(1);
}
