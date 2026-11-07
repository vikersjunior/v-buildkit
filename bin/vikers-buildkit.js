#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
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
const { runLint } = require('../lib/lint');
const { hashFile } = require('../lib/hash');
// Hashes managed files had in earlier releases (scripts/known-hashes.js), for installs without a manifest.
const KNOWN_HASHES = require('../lib/known-hashes.json').files;

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const WORKFLOW_SOURCE = path.join(PACKAGE_ROOT, '.claude', 'skills');
const LIBRARY_SOURCE = path.join(PACKAGE_ROOT, 'skills-library');
const TEMPLATE_SOURCE = path.join(PACKAGE_ROOT, 'templates');

// The lint and crosscheck checkers ship next to the skills (same layout as the package), so /complete runs
// `node .buildkit/bin/lint.js` from the release that wrote its instructions, with no npx.
// .buildkit/package.json marks it CommonJS, so it still runs in a project with "type": "module".
const VENDORED_LINT = {
  'bin/lint.js': 'bin/lint.js',
  'bin/crosscheck.js': 'bin/crosscheck.js',
  'bin/review-check.js': 'bin/review-check.js',
  'lib/lint.js': 'lib/lint.js',
  'lib/config.js': 'lib/config.js',
  'lib/crosscheck.js': 'lib/crosscheck.js',
  'lib/critics.js': 'lib/critics.js',
  'package.json': 'lib/buildkit-package.json'
};

const WORKFLOW_SKILLS = [
  'spec-driven-dev', 'ideate', 'spec-init', 'spec-review', 'feature',
  'implement', 'check', 'audit', 'complete', 'progress', 'tools-check', 'distill-skill', 'fix', 'investigate', 'crosscheck'
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
  tokens            Estimate the context tokens each workflow command loads.
  lint              Check spec files for drift (read-only; exits 1 on failures).

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
  npx vikers-buildkit tokens
  npx vikers-buildkit lint

Options:
  --docs-dir <path>        Set custom project documentation directory (default: project root).
  --agent <names>          Agent name or comma-separated agent names.
  --link                   Share workflow source via native symlinks/junctions.
  --no-detect              Disable automatic agent detection.
  --with-blank-templates   Copy blank starter templates to the documentation root.
  --skip-capabilities      Skip capability detection.
  --dry-run                (update) Show which managed files would change; write nothing.
  --force                  (update) Replace locally modified managed files after backing them up.
  --strict                 lint: fail when BuildKit or the spec files are missing.
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
    capabilities: true,
    strict: false
  };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    if (arg === '--version' || arg === '-v') { console.log(require('../package.json').version); process.exit(0); }
    if (arg === '--link') { options.link = true; continue; }
    if (arg === '--dry-run') { options.dryRun = true; continue; }
    if (arg === '--force') { options.force = true; continue; }
    if (arg === '--no-detect') { options.detect = false; continue; }
    if (arg === '--skip-capabilities') { options.capabilities = false; continue; }
    if (arg === '--strict') { options.strict = true; continue; }
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
    if (['install', 'init', 'status', 'doctor', 'repair', 'update', 'tokens', 'lint'].includes(sub)) {
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

function copyVendoredLint(target) {
  // Atomic rename replaces a pre-planted link at the destination instead of writing through it.
  for (const [rel, source] of Object.entries(VENDORED_LINT)) copyFileAtomic(path.join(PACKAGE_ROOT, ...source.split('/')), path.join(target, '.buildkit', ...rel.split('/')));
}

// .buildkit/state.md is the project's execution state: created from the template when missing, never
// overwritten. lstat first, so a dangling link at that path counts as present and is left alone.
function ensureStateFile(target) {
  const dest = path.join(target, '.buildkit', 'state.md');
  try { fs.lstatSync(dest); return false; } catch {}
  fs.copyFileSync(path.join(PACKAGE_ROOT, '.buildkit', 'state.md'), dest, fs.constants.COPYFILE_EXCL);
  return true;
}

function copyFile(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(source, dest);
}

const MANIFEST_PATH = path.join('.buildkit', 'manifest.json');
const BACKUPS_KEPT = 5;

// A random temp name, created exclusively, so a pre-planted file or link at that path can't redirect the write.
function tempPath(dest) {
  return `${dest}.buildkit-tmp-${crypto.randomBytes(8).toString('hex')}`;
}

// Writes through a temp file and a rename, so an interrupted update never leaves a half-written file.
function copyFileAtomic(source, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = tempPath(dest);
  try {
    fs.copyFileSync(source, tmp, fs.constants.COPYFILE_EXCL);
    fs.renameSync(tmp, dest);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

// Manifest paths are untrusted (.buildkit/ is usually committed): only plain relative posix paths.
function isSafeRel(rel) {
  return typeof rel === 'string' && !rel.includes('\\') && !rel.startsWith('/') && !/^[A-Za-z]:/.test(rel) &&
    rel.split('/').every(seg => seg && seg !== '.' && seg !== '..');
}

// True when the deepest existing ancestor of dest resolves inside the project, so a symlinked
// parent directory can't redirect a write or delete outside it.
function parentInside(targetReal, dest) {
  let dir = path.dirname(dest);
  while (!fs.existsSync(dir)) dir = path.dirname(dir);
  const real = fs.realpathSync(dir);
  const prefix = targetReal.endsWith(path.sep) ? targetReal : targetReal + path.sep;
  return real === targetReal || real.startsWith(prefix);
}

function listFiles(dir, prefix = '') {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

function isSymlinkPath(file) {
  try { return fs.lstatSync(file).isSymbolicLink(); } catch {}
  // lstat fails with ENOENT on a dangling Windows junction; the parent folder's entry still lists it.
  try {
    return fs.readdirSync(path.dirname(file), { withFileTypes: true }).some(e => e.name === path.basename(file) && e.isSymbolicLink());
  } catch { return false; }
}

// Every file BuildKit owns in the target, as posix relPath -> package source file,
// plus the roots under which recorded-but-obsolete files may be pruned.
function managedSources(target, agents) {
  const files = new Map();
  const roots = ['.buildkit/workflow-skills', '.buildkit/skills-library', '.buildkit/bin', '.buildkit/lib'];
  const addTree = (sourceDir, destRel) => {
    for (const rel of listFiles(sourceDir)) files.set(`${destRel}/${rel}`, path.join(sourceDir, ...rel.split('/')));
  };
  addTree(WORKFLOW_SOURCE, roots[0]);
  addTree(LIBRARY_SOURCE, roots[1]);
  for (const [rel, source] of Object.entries(VENDORED_LINT)) files.set(`.buildkit/${rel}`, path.join(PACKAGE_ROOT, ...source.split('/')));
  for (const agent of agents) {
    const cfg = AGENTS[agent];
    // Linked agent dirs resolve into .buildkit/workflow-skills, which is already tracked.
    if (!cfg || isSymlinkPath(path.join(target, cfg.path))) continue;
    roots.push(cfg.path);
    for (const skill of WORKFLOW_SKILLS) addTree(path.join(WORKFLOW_SOURCE, skill), `${cfg.path}/${skill}`);
  }
  return { files, roots };
}

function readManifest(target) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(target, MANIFEST_PATH), 'utf8'));
    const files = data && data.files;
    const valid = files && typeof files === 'object' && !Array.isArray(files) &&
      Object.values(files).every(hash => typeof hash === 'string');
    return valid ? data : null;
  } catch {
    return null;
  }
}

function writeManifest(target, agents) {
  const files = {};
  const sources = managedSources(target, agents).files;
  for (const [rel, source] of [...sources].sort(([a], [b]) => a.localeCompare(b))) files[rel] = hashFile(source);
  const data = { schemaVersion: 1, version: require('../package.json').version, files };
  const dest = path.join(target, MANIFEST_PATH);
  const tmp = tempPath(dest);
  try {
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
    fs.renameSync(tmp, dest);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}

// .buildkit/ is project state that is usually committed, so neither it, its backups folder nor the
// manifest may be a link: a link would let install, repair or update read or write outside the project.
function assertBuildkitContained(target) {
  const targetReal = fs.realpathSync(target);
  const checked = [
    ['.buildkit', 'directory'], ['.buildkit/workflow-skills', 'directory'], ['.buildkit/skills-library', 'directory'],
    ['.buildkit/bin', 'directory'], ['.buildkit/lib', 'directory'], ['.buildkit/backups', 'directory'], ['.buildkit/manifest.json', 'file']
  ];
  for (const [rel, kind] of checked) {
    const abs = path.join(target, ...rel.split('/'));
    let stat;
    try { stat = fs.lstatSync(abs); } catch { continue; }
    const rightKind = kind === 'directory' ? stat.isDirectory() : stat.isFile();
    if (stat.isSymbolicLink() || !rightKind || !parentInside(targetReal, path.join(abs, 'x'))) {
      throw new Error(`${rel} must be a real ${kind} inside the project, not a link. Nothing was changed.`);
    }
  }
}

// Sort managed files into add / update / remove / unchanged / conflict / blocked.
// A file is only overwritten or removed when it still matches the hash BuildKit recorded,
// so local edits are never lost silently.
function planUpdate(target, { files: sources, roots }, manifest) {
  const recorded = manifest ? manifest.files : {};
  const plan = { add: [], update: [], remove: [], unchanged: [], conflict: [], blocked: [] };
  const targetReal = fs.realpathSync(target);
  const outside = 'a parent directory resolves outside the project';
  for (const [rel, source] of sources) {
    const dest = path.join(target, ...rel.split('/'));
    if (!parentInside(targetReal, dest)) { plan.blocked.push({ rel, reason: outside }); continue; }
    let stat = null;
    try { stat = fs.lstatSync(dest); } catch {}
    if (!stat) { plan.add.push({ rel, source }); continue; }
    if (!stat.isFile()) { plan.blocked.push({ rel, reason: 'not a regular file' }); continue; }
    const current = hashFile(dest);
    const reason = recorded[rel] ? 'modified locally' : manifest ? 'already exists and was not installed by BuildKit' : 'no baseline (installed before manifest tracking)';
    // On an install from before manifest tracking, a file identical to a published release's copy is
    // BuildKit's own, unmodified. With a manifest, an unrecorded file stays a conflict.
    const knownOld = !manifest && (KNOWN_HASHES[path.relative(PACKAGE_ROOT, source).split(path.sep).join('/')] || []).includes(current);
    if (current === hashFile(source)) plan.unchanged.push({ rel });
    else if (recorded[rel] === current || knownOld) plan.update.push({ rel, source });
    else plan.conflict.push({ rel, source, reason });
  }
  // Only prune recorded files under roots this update still manages.
  for (const [rel, hash] of Object.entries(recorded)) {
    if (!isSafeRel(rel)) { plan.blocked.push({ rel, reason: 'unsafe path in .buildkit/manifest.json' }); continue; }
    if (sources.has(rel)) continue;
    const root = roots.find(r => rel.startsWith(`${r}/`));
    if (!root) continue;
    // Agent skill folders also hold the user's own skills: only prune inside BuildKit's own skill names.
    if (!root.startsWith('.buildkit/') && !WORKFLOW_SKILLS.includes(rel.slice(root.length + 1).split('/')[0])) continue;
    const dest = path.join(target, ...rel.split('/'));
    if (!parentInside(targetReal, dest)) { plan.blocked.push({ rel, reason: outside }); continue; }
    let stat = null;
    try { stat = fs.lstatSync(dest); } catch {}
    if (!stat) continue;
    if (!stat.isFile()) plan.blocked.push({ rel, reason: 'not a regular file' });
    else if (hashFile(dest) === hash) plan.remove.push({ rel });
    else plan.conflict.push({ rel, source: null, reason: 'obsolete file modified locally' });
  }
  return plan;
}

function removeEmptyParents(target, rel) {
  const parts = rel.split('/').slice(0, -1);
  while (parts.length > 1) {
    try { fs.rmdirSync(path.join(target, ...parts)); } catch { return; }
    parts.pop();
  }
}

// Backups stay out of version control and only the newest BACKUPS_KEPT runs are kept.
function prepareBackups(target) {
  const root = path.join(target, '.buildkit', 'backups');
  fs.mkdirSync(root, { recursive: true });
  // Anything already at .gitignore (a file, or a link, even a dangling one) is left alone: on Windows
  // 'wx' still follows a dangling link, so lstat first. 'wx' then covers the race on POSIX.
  const ignore = path.join(root, '.gitignore');
  let existing = null;
  try { existing = fs.lstatSync(ignore); } catch {}
  if (!existing) fs.writeFileSync(ignore, '*\n', { flag: 'wx' });
  // Only prune real directories named like a backup run; never anything else that lives here.
  const runs = fs.readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/.test(e.name))
    .map(e => e.name).sort();
  for (const old of runs.slice(0, Math.max(0, runs.length - (BACKUPS_KEPT - 1)))) {
    fs.rmSync(path.join(root, old), { recursive: true, force: true });
  }
  return path.join(root, new Date().toISOString().replace(/[:.]/g, '-'));
}

function applyUpdatePlan(target, plan, force) {
  const targetReal = fs.realpathSync(target);
  // Re-check containment right before touching each path, so a folder swapped for a link after
  // planning still can't redirect the write or delete.
  const contained = rel => {
    const dest = path.join(target, ...rel.split('/'));
    if (!parentInside(targetReal, dest)) throw new Error(`${rel}: a parent directory now resolves outside the project; update stopped.`);
    return dest;
  };
  let backupDir = null;
  if (force && plan.conflict.length) {
    backupDir = prepareBackups(target);
    for (const { rel } of plan.conflict) copyFile(contained(rel), path.join(backupDir, ...rel.split('/')));
  }
  const writes = [...plan.add, ...plan.update, ...(force ? plan.conflict.filter(c => c.source) : [])];
  for (const { rel, source } of writes) copyFileAtomic(source, contained(rel));
  const removals = [...plan.remove, ...(force ? plan.conflict.filter(c => !c.source) : [])];
  for (const { rel } of removals) {
    fs.unlinkSync(contained(rel));
    removeEmptyParents(target, rel);
  }
  return backupDir;
}

function printUpdatePlan(plan) {
  const show = (label, items) => {
    if (!items.length) return;
    console.log(`${label} (${items.length}):`);
    for (const item of items) console.log(`  ${item.rel}${item.reason ? ` — ${item.reason}` : ''}`);
  };
  show('Add', plan.add);
  show('Update', plan.update);
  show('Remove', plan.remove);
  show('Conflict', plan.conflict);
  show('Blocked', plan.blocked);
  console.log(`Unchanged: ${plan.unchanged.length}`);
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
  assertBuildkitContained(target);

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
  copyVendoredLint(target);
  ensureStateFile(target);
  for (const agent of agents) installAgent(target, workflowRoot, agent, options.link);
  writeManifest(target, agents);
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
  console.log('Small changes: investigate -> fix -> approval -> implement -> check -> complete');
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
    if (isSymlinkPath(dest)) {
      state = fs.existsSync(dest) ? 'Linked (Valid)' : 'Linked (BROKEN target)';
    } else {
      try { if (fs.lstatSync(dest).isDirectory()) state = 'Installed (Copied)'; } catch {}
    }
    console.log(`  ${cfg.label.padEnd(24)} (${cfg.path}/): ${state}`);
  }

  console.log(`\nSpec Files Status (${relDocsRoot}/):`);
  for (const file of SPEC_FILES) {
    const exists = fs.existsSync(path.join(absDocsRoot, file));
    console.log(`  ${file.padEnd(26)}: ${exists ? 'Present' : 'Missing'}`);
  }
}

// shortcut: ~4 chars/token heuristic, real tokenizers vary by model; good enough to rank costs
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

function tokens(options) {
  const target = resolveTarget(options.target);
  const skillsRoot = path.join(target, '.buildkit', 'workflow-skills');
  console.log(`\nViker's BuildKit Token Report — ${target}\n`);

  if (!fs.existsSync(skillsRoot)) {
    console.log('Status: NOT INSTALLED');
    console.log('Run `npx vikers-buildkit install` to set up BuildKit in this project.');
    return;
  }

  const readText = file => { try { return fs.readFileSync(file, 'utf8'); } catch { return ''; } };
  const fmt = n => n.toLocaleString('en-US').padStart(7);
  const absDocsRoot = resolveDocsRoot(target);

  const files = {};
  for (const file of SPEC_FILES) files[file] = estimateTokens(readText(path.join(absDocsRoot, file)));
  files['.buildkit/state.md'] = estimateTokens(readText(path.join(target, '.buildkit', 'state.md')));
  files['.buildkit/findings.md'] = estimateTokens(readText(path.join(target, '.buildkit', 'findings.md')));

  const skills = WORKFLOW_SKILLS.map(name => {
    const body = readText(path.join(skillsRoot, name, 'SKILL.md'));
    const frontmatter = (body.match(/^---[\s\S]*?\n---/) || [''])[0];
    // A skill "loads" every project file its instructions name.
    const reads = Object.keys(files).filter(f => body.includes(path.basename(f)));
    const total = estimateTokens(body) + reads.reduce((sum, f) => sum + files[f], 0);
    return { name, body: estimateTokens(body), frontmatter: estimateTokens(frontmatter), reads, total };
  });

  console.log('Estimates use ~4 characters per token.\n');
  console.log(`Always loaded (skill descriptions): ${fmt(skills.reduce((s, k) => s + k.frontmatter, 0)).trim()} tokens\n`);

  console.log('Project files:');
  for (const [file, count] of Object.entries(files)) {
    console.log(`  ${file.padEnd(26)} ${count ? fmt(count) : '  (missing)'}`);
  }

  console.log('\nPer command (skill body + files it reads):');
  for (const s of [...skills].sort((a, b) => b.total - a.total)) {
    const parts = s.reads.filter(f => files[f]).map(f => `${f} ${files[f].toLocaleString('en-US')}`);
    console.log(`  /${s.name.padEnd(16)} ${fmt(s.total)}   (skill ${s.body.toLocaleString('en-US')}${parts.length ? ', ' + parts.join(', ') : ''})`);
  }
}

function lint(options) {
  // Not resolveTarget(): lint must never create the target directory.
  process.exitCode = runLint(path.resolve(process.cwd(), options.target), { strict: options.strict });
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
    check(missingWorkflowSkills.length === 0, `All ${WORKFLOW_SKILLS.length} workflow skills present in .buildkit/workflow-skills/`, `Missing workflow skills: ${missingWorkflowSkills.join(', ')}`);
  }

  const libraryRoot = path.join(buildkitDir, 'skills-library');
  check(fs.existsSync(libraryRoot), '.buildkit/skills-library/ exists', '.buildkit/skills-library/ missing');
  const missingLint = Object.keys(VENDORED_LINT).filter(rel => !fs.existsSync(path.join(buildkitDir, ...rel.split('/'))));
  check(missingLint.length === 0, '.buildkit/bin/lint.js checker present', `Lint checker files missing: ${missingLint.map(rel => `.buildkit/${rel}`).join(', ')}`);

  const configured = getConfiguredAgents(target);
  warn(configured.length > 0, `.buildkit/agent.md config found (${configured.join(', ')})`, '.buildkit/agent.md missing or no agents recorded');

  for (const agent of configured) {
    const cfg = AGENTS[agent];
    if (!cfg) continue;
    const dest = path.join(target, cfg.path);
    let destStat = null;
    try { destStat = fs.lstatSync(dest); } catch {}

    if (isSymlinkPath(dest)) {
      check(fs.existsSync(dest), `Linked folder ${cfg.path}/ points to valid target`, `Linked folder ${cfg.path}/ is BROKEN`);
    } else if (!destStat) {
      check(false, '', `Agent folder ${cfg.path}/ for ${agent} does not exist`);
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
  assertBuildkitContained(target);

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
  copyVendoredLint(target);
  if (ensureStateFile(target)) console.log('✓ Created missing .buildkit/state.md');
  console.log('✓ Restored .buildkit/workflow-skills, .buildkit/skills-library and .buildkit/bin/lint.js');

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

  writeManifest(target, configured);
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
  assertBuildkitContained(target);

  console.log(`\nViker's BuildKit Update — Updating ${target}\n`);

  let configured = getConfiguredAgents(target);
  if (options.agent) {
    configured = validateAgents(options.agent.split(',').map(normalizeAgent).filter(Boolean));
  }
  if (!configured.length) configured = ['claude'];

  const manifest = readManifest(target);
  const plan = planUpdate(target, managedSources(target, configured), manifest);
  if (options.dryRun || plan.conflict.length || plan.blocked.length) printUpdatePlan(plan);
  if (options.dryRun) {
    console.log('\nDry run: no files were changed.');
    return;
  }
  if (plan.blocked.length) {
    throw new Error('Update blocked by the paths listed above. Nothing was changed. Fix or move them aside, then re-run.');
  }
  // A pre-manifest install has no record of what BuildKit wrote, so any difference may be an old
  // release rather than an edit: back the files up and replace them instead of stopping every upgrade.
  const force = options.force || !manifest;
  if (plan.conflict.length && !force) {
    console.log(`\nUpdate stopped: ${plan.conflict.length} BuildKit-managed file(s) differ from what BuildKit installed.`);
    console.log('Nothing was changed. Re-run with --force to back them up to .buildkit/backups/ and replace them.');
    process.exitCode = 1;
    return;
  }
  if (plan.conflict.length && !manifest && !options.force) {
    console.log(`\nThis install predates change tracking: backing up and replacing ${plan.conflict.length} file(s) that differ from the new release.`);
  }

  if (options.docsDir) {
    const newDocsRel = normalizeDocsRoot(options.docsDir, target);
    writeBuildkitConfig(target, { docs: { root: newDocsRel } });
    console.log(`✓ Updated documentation root to ${newDocsRel}/`);
  }

  const docsRootRel = resolveDocsRelative(target);
  const absDocsRoot = path.resolve(target, docsRootRel);
  fs.mkdirSync(absDocsRoot, { recursive: true });

  const backupDir = applyUpdatePlan(target, plan, force);
  if (ensureStateFile(target)) console.log('✓ Created missing .buildkit/state.md');
  writeManifest(target, configured);
  console.log(`✓ Added ${plan.add.length}, updated ${plan.update.length}, removed ${plan.remove.length}, unchanged ${plan.unchanged.length} managed file(s)`);
  if (backupDir) console.log(`✓ Replaced ${plan.conflict.length} locally modified file(s); originals backed up to ${path.relative(target, backupDir)}/`);
  for (const agent of configured) {
    const cfg = AGENTS[agent];
    if (cfg && isSymlinkPath(path.join(target, cfg.path))) console.log(`✓ Preserved linked directory ${cfg.path}/`);
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
    case 'tokens': tokens(options); break;
    case 'lint': lint(options); break;
    case 'install': default: install(options); break;
  }
} catch (error) {
  console.error(`\nBuildKit error: ${error.message}`);
  process.exit(1);
}
