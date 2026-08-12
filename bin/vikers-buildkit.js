#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

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
  codex: { label: 'Codex CLI / Antigravity', path: '.agents/skills', commands: ['codex'], signals: ['.agents/skills', 'AGENTS.md'] },
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
  'codex-cli': 'codex', antigravity: 'codex', 'gemini-cli': 'gemini',
  'github-copilot': 'copilot', 'rovo-dev': 'rovodev', 'mistral-vibe': 'vibe'
};

function usage() {
  console.log(`Viker's BuildKit\n\nUsage:\n  npx vikers-buildkit [install|init] [PROJECT_DIR] [options]\n\nExamples:\n  npx vikers-buildkit\n  npx vikers-buildkit install .\n  npx vikers-buildkit . --agent claude\n  npx vikers-buildkit . --agent claude,codex,cursor --link\n  npx vikers-buildkit . --no-detect --agent codex\n\nOptions:\n  --agent <names>          Agent name or comma-separated agent names.\n  --link                   Share one workflow source via native symlinks/junctions.\n  --no-detect              Disable automatic agent detection.\n  --with-blank-templates   Copy blank starter templates to the project root.\n  --skip-capabilities      Skip capability detection.\n  -h, --help               Show this help.\n\nSupported agents: ${Object.keys(AGENTS).join(', ')}\n`);
}

function commandExists(command) {
  const checker = process.platform === 'win32' ? 'where' : 'which';
  const args = [command];
  const result = spawnSync(checker, args, { stdio: 'ignore', shell: false });
  return result.status === 0;
}

function normalizeAgent(name) {
  const key = String(name || '').trim().toLowerCase();
  if (!key) return null;
  return ALIASES[key] || key;
}

function detectAgentScore(target, agent) {
  const cfg = AGENTS[agent];
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
  const options = { target: process.cwd(), agent: null, link: false, detect: true, templates: false, capabilities: true };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    if (arg === '--version' || arg === '-v') { console.log(require('../package.json').version); process.exit(0); }
    if (arg === '--link') { options.link = true; continue; }
    if (arg === '--no-detect') { options.detect = false; continue; }
    if (arg === '--skip-capabilities') { options.capabilities = false; continue; }
    if (arg === '--with-blank-templates' || arg === '--with-templates') { options.templates = true; continue; }
    if (arg === '--agent') {
      if (!argv[i + 1]) throw new Error('Missing value for --agent');
      options.agent = argv[++i]; continue;
    }
    if (arg.startsWith('--agent=')) { options.agent = arg.slice('--agent='.length); continue; }
    if (arg.startsWith('--')) throw new Error(`Unknown option: ${arg}`);
    positional.push(arg);
  }
  if (positional.length > 1) throw new Error('Only one PROJECT_DIR is allowed.');
  if (positional[0]) options.target = positional[0];
  return options;
}

function resolveTarget(target) {
  const resolved = path.resolve(process.cwd(), target);
  fs.mkdirSync(resolved, { recursive: true });
  return resolved;
}

function copyDir(source, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(source, dest, { recursive: true, force: true });
}

function copyFile(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
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

function prompt(message) {
  process.stdout.write(message);
  const buffer = Buffer.alloc(4096);
  const bytes = fs.readSync(0, buffer, 0, buffer.length, null);
  return buffer.toString('utf8', 0, bytes).trim();
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
  const dest = path.join(target, AGENTS[agent].path);
  if (link) {
    let destExists = fs.existsSync(dest);
    try { fs.lstatSync(dest); destExists = true; } catch {}
    if (destExists) {
      throw new Error(`Cannot --link ${agent}: ${AGENTS[agent].path} already exists. Remove/move it first, or omit --link.`);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (process.platform === 'win32') {
      fs.symlinkSync(workflowRoot, dest, 'junction');
    } else {
      fs.symlinkSync(path.relative(path.dirname(dest), workflowRoot), dest, 'dir');
    }
    console.log(`Linked ${AGENTS[agent].path}/ -> .buildkit/workflow-skills/`);
  } else {
    fs.mkdirSync(dest, { recursive: true });
    for (const skill of WORKFLOW_SKILLS) copyDir(path.join(workflowRoot, skill), path.join(dest, skill));
    console.log(`Installed workflow skills into ${AGENTS[agent].path}/`);
  }
}

function writeAgentConfig(target, agents) {
  const lines = [
    '# BuildKit Agent Configuration', '',
    `Selected agents: ${agents.join(' ')}`, '',
    'Canonical BuildKit workflow skills: .buildkit/workflow-skills/',
    'Canonical BuildKit capability library: .buildkit/skills-library/', '',
    'Native active skills directories:',
    ...agents.map(agent => `- ${agent}: ${AGENTS[agent].path}/`), '',
    '## Portability rule', '',
    'BuildKit workflow skills must not assume a vendor-specific path. Resolve the native active skills directory from this file when a workflow needs to inspect or promote skills.',
    'The six project source-of-truth files remain in the repository root. .buildkit/ is execution state, feature evidence, history, and BuildKit configuration.'
  ];
  fs.writeFileSync(path.join(target, '.buildkit', 'agent.md'), lines.join('\n') + '\n');
}

function detectCapabilities(target, agents) {
  const result = agents.map(agent => {
    const cfg = AGENTS[agent];
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
    return {
      agent, nativeSkills, projectInstructions, cliDetected,
      shell: true, git, mcpEvidence,
      parallelWorkEvidence: ['claude', 'codex'].includes(agent)
    };
  });
  const out = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: process.platform,
    node: process.version,
    note: 'Capabilities are evidence-based signals, not guarantees of vendor behavior.',
    agents: result
  };
  fs.writeFileSync(path.join(target, '.buildkit', 'agent-capabilities.json'), JSON.stringify(out, null, 2) + '\n');
}

function install(options) {
  if (!fs.existsSync(WORKFLOW_SOURCE)) throw new Error('BuildKit workflow skills are missing from the package.');
  const target = resolveTarget(options.target);
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
  if (options.templates) for (const file of fs.readdirSync(TEMPLATE_SOURCE).filter(f => f.endsWith('.md'))) copyFile(path.join(TEMPLATE_SOURCE, file), path.join(target, file));
  console.log('\nBuildKit installed successfully.');
  console.log(`Agents: ${agents.join(', ')}`);
  console.log('Workflow: ideate -> spec-init -> approval -> feature -> approval -> implement -> check -> audit -> complete');
  console.log(`BuildKit config: ${path.join('.buildkit', 'agent.md')}`);
  console.log(options.link ? 'Single source of truth: .buildkit/workflow-skills/' : 'Workflow skills copied to each selected agent.');
}

try {
  let argv = process.argv.slice(2);
  if (argv[0] === 'install' || argv[0] === 'init') argv = argv.slice(1);
  const options = parseArgs(argv);
  install(options);
} catch (error) {
  console.error(`\nBuildKit installation failed: ${error.message}`);
  process.exit(1);
}
