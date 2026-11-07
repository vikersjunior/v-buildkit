#!/usr/bin/env node
'use strict';

// Vendored to .buildkit/bin/crosscheck.js. The deterministic half of /crosscheck: choose critics,
// build the redacted input and prompts, write receipts, add ledger entries, and run the gate. The
// agent launches the critic CLIs itself (recipes in the crosscheck skill's references/critics.md).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const xc = require('../lib/crosscheck');
const { selectCritics } = require('../lib/critics');
const { readCrosscheckConfig } = require('../lib/config');

const USAGE = `Usage: node .buildkit/bin/crosscheck.js <command> [options]
  policy   [--slug <s>]                                      which gates apply to the feature (JSON)
  select   [--gate] [--host <agent>] [--allow-web]          critics for this run (JSON)
  prompt   <plan|review> --lens <A|B> [--slug <s>] [--file <path>] [--format text|agy] --out <file>
  receipt  <plan|review> --slug <s> --host <agent> --leg <critic>,<lens>,<model>,<output file> ... [--rebut <critic-lens:index>]
  add-finding --slug <s> --leg <critic-lens> --index <n> [--security]
  check                                                     the /complete gate (exit 1 on failure)
Options: --project <dir> (default: the project this copy is vendored into)`;

function parseArgs(argv) {
  const out = { _: [], leg: [], rebut: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const key = a.slice(2);
    if (['gate', 'allow-web', 'security'].includes(key)) { out[key] = true; continue; }
    const val = argv[++i];
    if (val === undefined) throw new Error(`${a} needs a value`);
    if (key === 'leg' || key === 'rebut') out[key].push(val);
    else out[key] = val;
  }
  return out;
}

function isPresent(cmd) {
  const res = process.platform === 'win32'
    ? spawnSync('where', [cmd], { encoding: 'utf8' })
    : spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' });
  return res.status === 0;
}

function currentSlug(root) {
  const state = fs.readFileSync(path.join(root, '.buildkit', 'state.md'), 'utf8');
  const m = state.match(/^## Current Feature\s*\r?\n+\s*(?:[-*]\s+)?`?([^\s`]+)`?/m);
  if (!m || /^none$/i.test(m[1])) throw new Error('no current feature in .buildkit/state.md; pass --slug');
  return m[1];
}

// A file named on the command line must resolve inside the project, not be git-ignored, and not
// look like a secrets file.
function containedFile(root, file) {
  const real = fs.realpathSync(path.resolve(root, file));
  const rootReal = fs.realpathSync(root);
  const rel = path.relative(rootReal, real);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`${file} is outside the project`);
  if (/(^|[\\/])(\.env[^\\/]*|[^\\/]*\.(pem|key|p12)|id_[^\\/]*)$/.test(rel)) throw new Error(`${file} looks like a secrets file`);
  if (spawnSync('git', ['check-ignore', '-q', '--', rel], { cwd: rootReal }).status === 0) throw new Error(`${file} is git-ignored`);
  return { real, rel: rel.split(path.sep).join('/') };
}

function lensTemplate(root, kind, lens) {
  const file = path.join(root, '.buildkit', 'workflow-skills', 'crosscheck', 'references', 'lenses.md');
  const text = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = text.match(new RegExp(`### Lens ${lens} — ${kind}\\n+\`\`\`text\\n([\\s\\S]*?)\\n\`\`\``));
  if (!m) throw new Error(`lens ${lens} for ${kind} not found in ${file}`);
  return m[1];
}

const NO_TOOLS = 'IMPORTANT: You have NO tools in this session. Every tool call is denied, and a turn that ends after a denied tool call loses your whole review. Do not call any tool. Everything you need is in this message.\n\n';

function prompt(root, kind, opts) {
  if (opts.lens !== 'A' && opts.lens !== 'B') throw new Error('--lens must be A or B');
  if (!opts.out) throw new Error('--out is required');
  let body;
  let meta;
  if (kind === 'review') {
    const f = xc.readFeature(root, opts.slug || currentSlug(root));
    if (!f.base) throw new Error('the spec has no "Base: <commit sha>" line');
    const p = xc.buildPatch(root, f.base);
    const r = xc.redact(p.patch);
    body = r.text;
    meta = { kind, base: f.base, files: p.files, first_header: p.firstHeader, bytes: Buffer.byteLength(r.text), redacted: r.count, excluded: p.excluded };
  } else {
    const parts = [];
    if (opts.file) {
      const c = containedFile(root, opts.file);
      parts.push([c.rel, fs.readFileSync(c.real, 'utf8')]);
    } else {
      const slug = opts.slug || currentSlug(root);
      const f = xc.readFeature(root, slug);
      parts.push([`.buildkit/features/${slug}/spec.md`, f.spec], [`.buildkit/features/${slug}/acceptance.md`, f.acceptance]);
    }
    const joined = parts.map(([rel, text]) => `===== FILE: ${rel} =====\n${text}`).join('\n');
    const r = xc.redact(joined);
    body = r.text;
    meta = { kind, files: parts.length, first_header: parts[0][1].split(/\r?\n/)[0], bytes: Buffer.byteLength(r.text), redacted: r.count, sent: parts.map(p => p[0]) };
  }
  const full = `${lensTemplate(root, kind, opts.lens)}\n\nINPUT (${kind === 'review' ? 'git diff' : 'files'}):\n${body}`;
  const content = opts.format === 'agy'
    ? JSON.stringify({ event: 'user', message: { role: 'user', content: NO_TOOLS + full } }) + '\n'
    : full;
  fs.writeFileSync(opts.out, content);
  return { ...meta, lens: opts.lens, out: opts.out, format: opts.format || 'text' };
}

// Reads a critic's output: a JSON file (codex -o), or agy stream-json (last result event).
function readLegFile(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  try { return JSON.parse(text); } catch {}
  const results = text.split(/\r?\n/).filter(l => l.startsWith('{"event":"result"'));
  if (!results.length) throw new Error(`${file}: no JSON and no stream-json result event`);
  const r = JSON.parse(results[results.length - 1]).result;
  if (r.structured_output) return r.structured_output;
  const m = String(r.response || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`${file}: the result has no JSON review`);
  return JSON.parse(m[0]);
}

function receipt(root, kind, opts) {
  const legs = opts.leg.map(spec => {
    const [critic, lens, model, ...file] = spec.split(',');
    return { critic, lens, model, output: readLegFile(file.join(',')) };
  });
  const r = xc.writeReceipt(root, { kind, slug: opts.slug || currentSlug(root), legs, host: opts.host, rebutted: opts.rebut });
  return {
    receipt: path.relative(root, r.file).split(path.sep).join('/'),
    verdict: r.verdict,
    dropped: r.dropped,
    findings: r.legs.flatMap(l => l.findings.map((f, i) => ({ key: `${l.critic}-${l.lens}:${i}`, ...f })))
  };
}

function addFinding(root, opts) {
  const slug = opts.slug || currentSlug(root);
  const legFile = path.join(root, '.buildkit', 'features', slug, 'review', `${opts.leg}.json`);
  if (!/^[a-z]+-[AB]$/.test(String(opts.leg))) throw new Error('--leg must look like codex-A');
  const leg = JSON.parse(fs.readFileSync(legFile, 'utf8'));
  const finding = leg.findings[Number(opts.index)];
  if (!finding) throw new Error(`no finding ${opts.index} in ${opts.leg}`);
  const severity = xc.mapSeverity(finding.grade, { securityOrDataLoss: Boolean(opts.security) });
  if (!severity) throw new Error('NIT findings are not recorded in the ledger');
  const ledgerFile = path.join(root, '.buildkit', 'findings.md');
  // One writer at a time: concurrent runs would otherwise pick the same ID or overwrite each other.
  const lock = `${ledgerFile}.lock`;
  for (let tries = 0; ; tries++) {
    try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); break; } catch (e) {
      if (e.code !== 'EEXIST' || tries >= 50) throw new Error(`${lock} is held by another run; retry, or delete it if no run is active`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  try {
    const ledger = fs.existsSync(ledgerFile) ? fs.readFileSync(ledgerFile, 'utf8') : '# Findings\n\n';
    const id = xc.nextFindingId(ledger);
    const entry = xc.formatLedgerEntry({ id, severity, feature: slug, finding, source: { critic: leg.critic, model: leg.model, lens: leg.lens }, date: new Date().toISOString().slice(0, 10) });
    const tmp = `${ledgerFile}.tmp-${crypto.randomBytes(6).toString('hex')}`;
    fs.writeFileSync(tmp, ledger.replace(/\n*$/, '\n\n') + entry, { flag: 'wx' });
    fs.renameSync(tmp, ledgerFile);
    return { id, severity };
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

function main(argv) {
  const opts = parseArgs(argv);
  const [cmd, kind] = opts._;
  // Default project: the one this copy is vendored into (.buildkit/bin/ -> project root).
  const root = path.resolve(opts.project || path.join(__dirname, '..', '..'));
  const print = obj => console.log(JSON.stringify(obj, null, 2));
  switch (cmd) {
    case 'policy': {
      const cfg = readCrosscheckConfig(root);
      if (!cfg.ok) throw new Error(cfg.error);
      const f = xc.readFeature(root, opts.slug || currentSlug(root));
      // A missing Sensitive: line counts as yes.
      const applies = p => p === 'blocking' || (p === 'when-sensitive' && f.sensitive !== 'no');
      print({ plan: applies(cfg.config.plan), review: applies(cfg.config.review), sensitive: f.sensitive || 'missing (treated as yes)', base: f.base });
      return 0;
    }
    case 'select': {
      const cfg = readCrosscheckConfig(root);
      if (!cfg.ok) throw new Error(cfg.error);
      print(selectCritics({ host: opts.host, gate: Boolean(opts.gate), vendors: cfg.config.vendors, allowWeb: Boolean(opts['allow-web']), isPresent }));
      return 0;
    }
    case 'prompt':
      if (kind !== 'plan' && kind !== 'review') throw new Error('prompt needs plan or review');
      print(prompt(root, kind, opts));
      return 0;
    case 'receipt':
      if (kind !== 'plan' && kind !== 'review') throw new Error('receipt needs plan or review');
      print(receipt(root, kind, opts));
      return 0;
    case 'add-finding':
      print(addFinding(root, opts));
      return 0;
    case 'check': {
      const r = xc.runCheck(root);
      for (const l of r.lines) console.log(`  [${l.level}] ${l.message}`);
      return r.ok ? 0 : 1;
    }
    default:
      console.log(USAGE);
      return cmd ? 1 : 0;
  }
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`crosscheck: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { main, readLegFile, containedFile };
