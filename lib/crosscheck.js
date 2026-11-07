'use strict';

// Crosscheck receipts and the /complete gate (plan v3.2). Critic output is untrusted: every field is
// allow-listed or cleaned before it is written, and critic text only ever follows a host prefix.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { readBuildkitConfig, readCrosscheckConfig, ConfigStatus } = require('./config');
const { CRITICS, hostVendor } = require('./critics');

const CRITIC_TIMEOUT_MS = 15 * 60 * 1000;
const GRADES = ['BLOCKER', 'SHOULD', 'NIT'];
const VERDICTS = ['CLEAN', 'FINDINGS', 'FILE-NOT-READ'];
// Never part of a reviewed patch: receipts (so writing one can't change the patch); the lifecycle
// state BuildKit's own gates write after a review (state, ledger, audit reports, /check results),
// which would otherwise make every receipt stale at once; backups; and files that commonly hold
// secrets. Every other .buildkit change, such as config.json, is reviewed.
const PATCH_EXCLUDES = Object.freeze([
  '.buildkit/state.md',
  '.buildkit/findings.md',
  '.buildkit/audits/**',
  '.buildkit/features/*/verification.md',
  '.buildkit/features/*/review.md',
  '.buildkit/features/*/review/**',
  '.buildkit/features/*/review.tmp-*/**',
  '.buildkit/features/*/plan-review.md',
  '.buildkit/features/*/plan-review/**',
  '.buildkit/features/*/plan-review.tmp-*/**',
  '.buildkit/backups/**',
  '**/.env*',
  '**/*.pem',
  '**/*.key',
  '**/*.p12',
  '**/id_*'
]);
// The credential shapes lib/lint.js warns about, as replace patterns.
const REDACTIONS = [
  // A whole PEM block (only base64 between BEGIN and END), or a lone BEGIN line. Never a span of
  // ordinary text, which would mangle the code a critic reviews.
  /-----BEGIN [A-Z0-9 ]+-----[A-Za-z0-9+/=\s]*?-----END [A-Z0-9 ]+-----|-----BEGIN [A-Z0-9 ]+-----/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{10,}/g,
  /\bsk-[A-Za-z0-9_-]{20,}/g,
  /\bxox[bp]-[A-Za-z0-9-]*/g
];

function redact(text) {
  let count = 0;
  let out = String(text);
  for (const re of REDACTIONS) {
    out = out.replace(re, () => {
      count++;
      return '[REDACTED]';
    });
  }
  return { text: out, count };
}

// One line, no control characters, secrets redacted, capped.
function cleanText(value, max = 300) {
  const oneLine = String(value == null ? '' : value).replace(/[\r\n\t]+/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '');
  return redact(oneLine).text.replace(/ {2,}/g, ' ').trim().slice(0, max);
}

// A project-relative path with forward slashes: no leading slash or drive, no "..", no control
// characters or backslashes, at most 200 characters.
function isSafeFile(file) {
  return typeof file === 'string' && file.length > 0 && file.length <= 200 &&
    !/[\u0000-\u001f\u007f\\]/.test(file) && !file.startsWith('/') && !/^[A-Za-z]:/.test(file) &&
    file.split('/').every(seg => seg !== '..');
}

// Returns { ok: true, finding } with cleaned fields, or { ok: false, reason } to drop it.
function cleanFinding(f) {
  if (!f || typeof f !== 'object') return { ok: false, reason: 'not an object' };
  if (!isSafeFile(f.file)) return { ok: false, reason: 'file is not a plain project-relative path' };
  if (!Number.isInteger(f.line) || f.line < 1) return { ok: false, reason: 'line is not a positive integer' };
  if (!GRADES.includes(f.grade)) return { ok: false, reason: 'grade is not BLOCKER, SHOULD or NIT' };
  return { ok: true, finding: { file: redact(f.file).text, line: f.line, grade: f.grade, issue: cleanText(f.issue), why: cleanText(f.why) } };
}

function mapSeverity(grade, { securityOrDataLoss = false } = {}) {
  if (grade === 'BLOCKER') return 'BLOCKING';
  if (grade === 'SHOULD') return securityOrDataLoss ? 'HIGH' : 'MEDIUM';
  return null;
}

const safeLabel = v => (/^[A-Za-z0-9._:-]{1,60}$/.test(String(v)) ? String(v) : 'unknown');

// A ledger entry written only from host-controlled prefixes; critic text sits after them.
function formatLedgerEntry({ id, severity, feature, finding, source, date }) {
  return [
    `### ${id} [${severity}] open — ${finding.issue || 'untitled'}`,
    `- Feature: ${safeLabel(feature)}`,
    `- Where: ${finding.file}:${finding.line}`,
    `- Found: ${date} by /audit (crosscheck)`,
    `- Source: ${safeLabel(source.critic)} (${safeLabel(source.model)}), lens ${source.lens === 'B' ? 'B' : 'A'}`,
    '- Detail:',
    `  > ${finding.why || '(none)'}`,
    ''
  ].join('\n');
}

function nextFindingId(ledger) {
  const max = Math.max(0, ...[...String(ledger).matchAll(/^### F-(\d+)/gm)].map(m => Number(m[1])));
  return `F-${String(max + 1).padStart(3, '0')}`;
}

const sha256 = text => crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n')).digest('hex');

function git(root, args, env) {
  const res = spawnSync('git', ['-c', 'core.autocrlf=true', '-c', 'core.quotepath=off', ...args], {
    cwd: root, encoding: 'utf8', env: { ...process.env, ...env }, maxBuffer: 256 * 1024 * 1024
  });
  if (res.error || res.status !== 0) throw new Error(`git ${args[0]} failed: ${(res.stderr || (res.error && res.error.message) || '').trim()}`);
  return res.stdout;
}

// The reviewed patch: tracked changes since base plus untracked, non-ignored files, built with a
// temporary copy of the index so the real one is never written. Binary and excluded files are left out.
function buildPatch(root, base) {
  if (!/^[0-9a-f]{7,40}$/.test(String(base))) throw new Error(`base must be a commit SHA, got "${base}"`);
  const realIndex = path.resolve(root, git(root, ['rev-parse', '--git-path', 'index']).trim());
  const tmpIndex = path.join(os.tmpdir(), `buildkit-index-${crypto.randomBytes(8).toString('hex')}`);
  try {
    if (fs.existsSync(realIndex)) fs.copyFileSync(realIndex, tmpIndex);
    const env = { GIT_INDEX_FILE: tmpIndex };
    git(root, ['add', '--intent-to-add', '--all'], env);
    const spec = ['--', '.', ...PATCH_EXCLUDES.map(p => `:(exclude,glob)${p}`)];
    const flags = ['--no-color', '--no-ext-diff', '--no-textconv', '--no-renames'];
    const changed = git(root, ['diff', '--name-only', ...flags, base, '--', '.'], env).split('\n').filter(Boolean);
    const binaries = git(root, ['diff', '--numstat', ...flags, base, ...spec], env).split('\n')
      .filter(l => l.startsWith('-\t-\t')).map(l => l.slice(4));
    const patch = git(root, ['diff', ...flags, '--src-prefix=a/', '--dst-prefix=b/', base, ...spec, ...binaries.map(f => `:(exclude,literal)${f}`)], env);
    const headers = patch.split('\n').filter(l => l.startsWith('diff --git '));
    const included = new Set(headers.map(h => h.replace(/^diff --git a\/(.*) b\/.*$/, '$1')));
    const excluded = changed.filter(f => !included.has(f));
    // Not sent, but tracked: a later change to an excluded binary or secrets-like file makes the
    // receipt stale. BuildKit's own receipts and lifecycle files are left out of the digest.
    const digested = excluded.filter(f => !/^\.buildkit\//.test(f)).sort();
    const excludedSha256 = sha256(digested.map(f => {
      try { return `${f}:${crypto.createHash('sha256').update(fs.readFileSync(path.join(root, f))).digest('hex')}`; } catch { return `${f}:missing`; }
    }).join('\n'));
    return { patch, sha256: sha256(patch), files: headers.length, firstHeader: headers[0] || '', excluded, excludedSha256 };
  } finally {
    for (const f of [tmpIndex, `${tmpIndex}.lock`]) fs.rmSync(f, { force: true });
  }
}

const acceptanceMissing = slug => `.buildkit/features/${slug}/acceptance.md missing; run /feature first`;

function readFeature(root, slug) {
  if (!/^[A-Za-z0-9._-]+$/.test(String(slug)) || slug === '.' || slug === '..') throw new Error(`invalid feature slug "${slug}"`);
  const dir = path.join(root, '.buildkit', 'features', slug);
  const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
  const spec = read('spec.md');
  if (spec === null) throw new Error(`.buildkit/features/${slug}/spec.md not found`);
  // null when missing: the gates refuse rather than review a feature without acceptance criteria.
  const acceptance = read('acceptance.md');
  const base = (spec.match(/^Base:\s*([0-9a-f]{7,40})\s*$/m) || [])[1] || null;
  const sensitive = ((spec.match(/^Sensitive:\s*(yes|no)\s*$/mi) || [])[1] || '').toLowerCase() || null;
  return { dir, spec, acceptance, base, sensitive };
}

// Removes other runs' temp folders once they are older than 2x the critic timeout (by their
// owner.json timestamp, or the folder mtime when that is unreadable). pids are not used: they get reused.
function sweepTmp(featureDir, { now = Date.now(), timeoutMs = CRITIC_TIMEOUT_MS } = {}) {
  let entries = [];
  try { entries = fs.readdirSync(featureDir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory() || !/^(plan-)?review\.tmp-/.test(e.name)) continue;
    const dir = path.join(featureDir, e.name);
    let created;
    try { created = JSON.parse(fs.readFileSync(path.join(dir, 'owner.json'), 'utf8')).created; } catch {}
    if (!Number.isFinite(created)) created = fs.statSync(dir).mtimeMs;
    if (now - created > 2 * timeoutMs) fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseLegOutput(output, key) {
  const o = typeof output === 'string' ? JSON.parse(output) : output;
  if (!o || !Number.isInteger(o.inspected_files) || typeof o.first_header !== 'string' || !VERDICTS.includes(o.verdict) || !Array.isArray(o.findings)) {
    throw new Error(`${key}: output does not match the critic schema`);
  }
  if (o.verdict === 'FILE-NOT-READ') throw new Error(`${key}: the critic could not read its input; this leg is not a review`);
  return o;
}

// Writes .buildkit/features/<slug>/<review|plan-review>.md plus cleaned leg files. The new set is
// built in a temp folder and swapped in only when complete: a run that fails before the swap keeps
// the previous receipt; a crash during the swap can leave no receipt, and the gate then fails
// closed ("no review receipt"). Returns { file, verdict, legs, dropped }.
function writeReceipt(root, { kind, slug, legs = [], host, rebutted = [], now = Date.now() }) {
  if (kind !== 'review' && kind !== 'plan') throw new Error('kind must be "review" or "plan"');
  const rebuts = parseRebuts(rebutted);
  const rebutKeys = new Set(rebuts.map(r => r.key));
  const feature = readFeature(root, slug);
  if (!feature.base) throw new Error(`.buildkit/features/${slug}/spec.md has no "Base: <commit sha>" line`);
  if (feature.acceptance === null) throw new Error(acceptanceMissing(slug));
  const name = kind === 'plan' ? 'plan-review' : 'review';
  sweepTmp(feature.dir, { now });
  const rand = crypto.randomBytes(6).toString('hex');
  const tmp = path.join(feature.dir, `${name}.tmp-${rand}`);
  fs.mkdirSync(path.join(tmp, name), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'owner.json'), JSON.stringify({ created: now }));
  try {
    // Raw leg files stay local; only the receipt is meant to be committed.
    fs.writeFileSync(path.join(tmp, name, '.gitignore'), '*\n');
    let dropped = 0;
    const counts = { BLOCKER: 0, SHOULD: 0, NIT: 0 };
    const blockers = [];
    const allBlockers = new Set();
    const cleanedLegs = legs.map(l => {
      if (!CRITICS[l.critic]) throw new Error(`unsupported critic "${l.critic}"`);
      if (l.lens !== 'A' && l.lens !== 'B') throw new Error(`lens must be A or B, got "${l.lens}"`);
      const key = `${l.critic}-${l.lens}`;
      const o = parseLegOutput(l.output, key);
      const findings = [];
      const drops = [];
      for (const raw of o.findings) {
        const c = cleanFinding(raw);
        if (!c.ok) { dropped++; drops.push(c.reason); continue; }
        const i = findings.push(c.finding) - 1;
        counts[c.finding.grade]++;
        if (c.finding.grade === 'BLOCKER') {
          allBlockers.add(`${key}:${i}`);
          if (!rebutKeys.has(`${key}:${i}`)) blockers.push(`${key}:${i}`);
        }
      }
      const leg = { critic: l.critic, vendor: CRITICS[l.critic].vendor, lens: l.lens, model: safeLabel(l.model), inspected_files: o.inspected_files, first_header: cleanText(o.first_header, 500), verdict: o.verdict, findings, dropped: drops };
      fs.writeFileSync(path.join(tmp, name, `${key}.json`), JSON.stringify(leg, null, 2) + '\n');
      return leg;
    });
    for (const r of rebuts) {
      if (!allBlockers.has(r.key)) throw new Error(`--rebut ${r.key}: not a BLOCKER in this run`);
    }
    const data = {
      kind,
      slug,
      date: new Date(now).toISOString(),
      platform: process.platform,
      host_vendor: hostVendor(host),
      critics: cleanedLegs.map(({ findings, dropped: d, ...rest }) => rest),
      base: feature.base,
      spec_sha256: sha256(feature.spec),
      acceptance_sha256: sha256(feature.acceptance),
      counts,
      dropped_findings: dropped,
      rebutted: rebuts,
      verdict: blockers.length ? 'DO-NOT-MERGE' : 'PASS',
      standing_risks: ['SR-2']
    };
    if (kind === 'review') {
      const p = buildPatch(root, feature.base);
      Object.assign(data, { patch_sha256: p.sha256, excluded_sha256: p.excludedSha256, patch_files: p.files, excluded: p.excluded.map(f => cleanText(f, 200)) });
    }
    const body = [
      `# Crosscheck ${kind} review: ${slug}`,
      '',
      '```json',
      JSON.stringify(data, null, 2),
      '```',
      '',
      `Verdict: ${data.verdict}. Critics: ${data.critics.map(c => `${c.critic} (${c.model}) lens ${c.lens}`).join(', ') || 'none'}.`,
      `Findings: ${counts.BLOCKER} BLOCKER, ${counts.SHOULD} SHOULD, ${counts.NIT} NIT; ${dropped} dropped by the field allow-list.`,
      'Standing risk SR-2: the Codex read-only sandbox restricts writes, not reads.',
      ''
    ].join('\n');
    fs.writeFileSync(path.join(tmp, `${name}.md`), body);

    // Swap: move the old receipt aside, move the new one in, then delete the old one.
    const moved = [];
    for (const item of [`${name}.md`, name]) {
      const final = path.join(feature.dir, item);
      if (fs.existsSync(final)) {
        const old = `${final}.old-${rand}`;
        fs.renameSync(final, old);
        moved.push(old);
      }
      fs.renameSync(path.join(tmp, item), final);
    }
    for (const old of moved) fs.rmSync(old, { recursive: true, force: true });
    return { file: path.join(feature.dir, `${name}.md`), verdict: data.verdict, legs: cleanedLegs, dropped };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// Each rebuttal names a finding key and carries a one-line reason, cleaned like critic text.
// Accepts "codex-A:0=reason" strings (the CLI form) or { key, reason } objects.
function parseRebuts(rebutted) {
  return rebutted.map(item => {
    const [key, ...rest] = typeof item === 'string' ? item.split('=') : [item && item.key, item && item.reason];
    const reason = cleanText(Array.isArray(rest) ? rest.join('=') : rest, 200);
    if (!/^[a-z]+-[AB]:\d+$/.test(String(key))) throw new Error(`--rebut "${cleanText(item, 80)}": expected <critic>-<lens>:<index>=<reason>`);
    if (!reason) throw new Error(`--rebut ${key}: a one-line reason is required (${key}=<why the critic conceded>)`);
    return { key, reason };
  });
}

function readReceipt(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  const m = text.match(/```json\r?\n([\s\S]*?)\r?\n```/);
  if (!m) return { invalid: 'no JSON block' };
  try { return JSON.parse(m[1]); } catch { return { invalid: 'unreadable JSON block' }; }
}

// The /complete gate. Returns { ok, lines: [{ level, message }] }; never writes anything.
function runCheck(root) {
  const lines = [];
  const add = (level, message) => lines.push({ level, message });
  const cfg = readCrosscheckConfig(root);
  if (!cfg.ok) {
    add('FAIL', `.buildkit/config.json: ${cfg.error}`);
    return { ok: false, lines };
  }
  const { plan, review } = cfg.config;
  let slug = null;
  try {
    const state = fs.readFileSync(path.join(root, '.buildkit', 'state.md'), 'utf8');
    const m = state.match(/^## Current Feature\s*\r?\n+\s*(?:[-*]\s+)?`?([^\s`]+)`?/m);
    if (m && !/^none$/i.test(m[1])) slug = m[1];
  } catch {}
  if (!slug) {
    add('PASS', 'Crosscheck: no feature in progress');
    return { ok: true, lines };
  }
  let feature;
  try { feature = readFeature(root, slug); } catch (e) {
    add('FAIL', `Crosscheck: ${e.message}`);
    return { ok: false, lines };
  }
  // A missing Sensitive: line counts as yes.
  const applies = policy => policy === 'blocking' || (policy === 'when-sensitive' && feature.sensitive !== 'no');
  const need = [];
  if (applies(plan)) need.push('plan');
  if (applies(review)) need.push('review');
  if (!need.length) {
    add('PASS', `Crosscheck: not required for "${slug}" (plan: ${plan}, review: ${review})`);
    return { ok: true, lines };
  }
  if (feature.acceptance === null) {
    add('FAIL', `Crosscheck: ${acceptanceMissing(slug)}`);
    return { ok: false, lines };
  }
  const where = `.buildkit/features/${slug}`;
  for (const kind of need) {
    const file = kind === 'plan' ? 'plan-review.md' : 'review.md';
    const r = readReceipt(path.join(feature.dir, file));
    const fail = msg => add('FAIL', `Crosscheck ${kind}: ${msg}`);
    if (!r) { fail(`no ${kind} receipt (${where}/${file}); run /crosscheck ${kind}`); continue; }
    if (r.invalid) { fail(`${where}/${file}: ${r.invalid}`); continue; }
    const before = lines.length;
    if (!Array.isArray(r.critics) || r.critics.length === 0) fail('critics: none; no other-vendor critic reviewed this. Run /crosscheck by hand, or lower the policy in .buildkit/config.json deliberately');
    if (Array.isArray(r.critics)) {
      for (const id of new Set(r.critics.map(c => c.critic))) {
        const ran = new Set(r.critics.filter(c => c.critic === id).map(c => c.lens));
        if (!ran.has('A') || !ran.has('B')) fail(`${id} reviewed with lens ${[...ran].join(', ')} only; both lens A and lens B are required`);
      }
      const same = r.critics.filter(c => r.host_vendor && c.vendor === r.host_vendor);
      if (same.length) fail(`${same.map(c => c.critic).join(', ')} is from the host agent's own vendor (${r.host_vendor}); not an independent review`);
    }
    if (r.spec_sha256 !== sha256(feature.spec) || r.acceptance_sha256 !== sha256(feature.acceptance)) {
      fail(kind === 'plan' ? 'spec or acceptance changed since plan review; run /crosscheck plan again' : 'spec or acceptance changed since the review; run /crosscheck review again');
    }
    if (kind === 'review') {
      if (r.base !== feature.base) fail(`receipt base ${r.base} differs from the spec's Base ${feature.base}`);
      else {
        let p = null;
        try { p = buildPatch(root, feature.base); } catch (e) { fail(e.message); }
        if (p && p.sha256 !== r.patch_sha256) fail('the work changed since the review (patch hash differs); run /crosscheck review again');
        if (p && p.excludedSha256 !== r.excluded_sha256) fail('a file left out of the review (binary or secrets-like) changed since the review; run /crosscheck review again');
        if (p && Array.isArray(r.critics)) {
          for (const c of r.critics) {
            if (c.inspected_files !== p.files || c.first_header !== p.firstHeader) fail(`${c.critic} lens ${c.lens}: inspected ${c.inspected_files} file(s) / "${c.first_header}", but the patch has ${p.files} / "${p.firstHeader}"`);
          }
        }
      }
    } else if (Array.isArray(r.critics)) {
      const firstLine = feature.spec.split(/\r?\n/)[0];
      for (const c of r.critics) {
        if (c.inspected_files !== 2 || c.first_header !== firstLine) fail(`${c.critic} lens ${c.lens}: inspected ${c.inspected_files} file(s) / "${c.first_header}", expected 2 / "${firstLine}"`);
      }
    }
    if (r.verdict !== 'PASS') fail(`verdict is ${r.verdict}`);
    // Every rebutted BLOCKER is shown to the human, never silent.
    for (const rb of Array.isArray(r.rebutted) ? r.rebutted : []) {
      if (!rb || typeof rb.reason !== 'string' || !rb.reason) fail(`rebutted ${cleanText(rb && rb.key ? rb.key : rb, 40)} has no reason`);
      else add('REBUTTED', `Crosscheck ${kind}: BLOCKER ${cleanText(rb.key, 40)} rebutted: ${cleanText(rb.reason, 200)}`);
    }
    if (!lines.slice(before).some(l => l.level === 'FAIL')) add('PASS', `Crosscheck ${kind}: receipt matches the current work (${r.critics.map(c => `${c.critic} ${c.lens}`).join(', ')})`);
  }
  return { ok: !lines.some(l => l.level === 'FAIL'), lines };
}

module.exports = {
  CRITIC_TIMEOUT_MS,
  PATCH_EXCLUDES,
  redact,
  cleanText,
  cleanFinding,
  mapSeverity,
  formatLedgerEntry,
  nextFindingId,
  buildPatch,
  readFeature,
  sweepTmp,
  writeReceipt,
  parseRebuts,
  readReceipt,
  runCheck,
  sha256
};
