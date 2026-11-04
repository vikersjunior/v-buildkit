'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { FINDING_HEADER } = require('../lib/lint');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'vikers-buildkit.js');

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

// One installed project for the whole file; each case rewrites the ledger and reports.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-ledger-'));
const LEDGER = path.join(tmp, '.buildkit', 'findings.md');
const AUDITS = path.join(tmp, '.buildkit', 'audits');

test.before(() => {
  const res = run('install', tmp, '--agent', 'claude', '--no-detect', '--skip-capabilities');
  assert.equal(res.status, 0, res.stderr);
});
test.after(() => fs.rmSync(tmp, { recursive: true, force: true }));

// Writes the ledger (null removes it) and the audit reports ({ name: text }), then runs lint.
function lintWith(ledger, reports = {}) {
  fs.rmSync(LEDGER, { recursive: true, force: true });
  fs.rmSync(AUDITS, { recursive: true, force: true });
  if (ledger !== null) fs.writeFileSync(LEDGER, ledger);
  if (Object.keys(reports).length) {
    fs.mkdirSync(AUDITS);
    for (const [name, text] of Object.entries(reports)) fs.writeFileSync(path.join(AUDITS, name), text);
  }
  const res = run('lint', tmp);
  return { status: res.status, out: res.stdout + res.stderr, fails: res.stdout.split('\n').filter(l => l.includes('[FAIL]')) };
}

const finding = (id, sev, status, ...body) => [`### ${id} [${sev}] ${status} — title ${id}`, ...body, ''].join('\n');

test('no ledger and no reports pass with one ledger line', () => {
  const r = lintWith(null);
  assert.equal(r.status, 0, r.out);
  assert.equal(r.out.match(/No findings ledger yet/g).length, 1);
});

test('a ledger with nothing blocking passes', () => {
  const ledger = '# Findings\n\n' + [
    finding('F-001', 'HIGH', 'open', '- Where: a.js:1'),
    finding('F-002', 'BLOCKING', 'closed', '- Verified in: .buildkit/audits/2026-11-03-x.md'),
    finding('F-003', 'BLOCKING', 'invalid', '- Reason: not reachable'),
    finding('F-004', 'MEDIUM', 'accepted', '- Reason: user ships it', '- Accepted by: Sam'),
    finding('F-005', 'LOW', 'fixed')
  ].join('\n');
  const r = lintWith(ledger, { '2026-11-03-x.md': '- F-002 [BLOCKING] title\n' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /\[PASS\] Findings ledger: 5 finding\(s\), none blocking \(2 open or fixed\)/);
});

test('an open or fixed BLOCKING finding fails with its line', () => {
  let r = lintWith('# Findings\n\n' + finding('F-001', 'BLOCKING', 'open'));
  assert.equal(r.status, 1);
  assert.match(r.out, /\.buildkit\/findings\.md:3: F-001 \[BLOCKING\] is open/);
  r = lintWith(finding('F-001', 'BLOCKING', 'fixed'));
  assert.equal(r.status, 1);
  assert.match(r.out, /F-001 \[BLOCKING\] is fixed but not yet re-verified by \/audit/);
});

test('accepted, invalid and closed need their lines, inside their own finding', () => {
  const cases = [
    [finding('F-001', 'LOW', 'accepted', '- Accepted by: Sam'), /F-001 is accepted without a "- Reason:" line/],
    [finding('F-001', 'LOW', 'accepted', '- Reason:', '- Accepted by: Sam'), /F-001 is accepted without a "- Reason:" line/],
    [finding('F-001', 'LOW', 'accepted', '- Reason: fine'), /F-001 is accepted without an "- Accepted by:" line/],
    [finding('F-001', 'LOW', 'invalid'), /F-001 is invalid without a "- Reason:" line/],
    [finding('F-001', 'LOW', 'invalid') + finding('F-002', 'LOW', 'open', '- Reason: belongs to F-002'), /F-001 is invalid without a "- Reason:" line/],
    [finding('F-001', 'LOW', 'invalid') + '### Notes\n- Reason: under a free heading\n', /F-001 is invalid without a "- Reason:" line/],
    [finding('F-001', 'LOW', 'closed'), /F-001 is closed without a "- Verified in:" line/]
  ];
  for (const [ledger, expected] of cases) {
    const r = lintWith(ledger);
    assert.equal(r.status, 1, ledger);
    assert.match(r.out, expected, ledger);
  }
});

test('closed must cite an audit report that names the finding', () => {
  const ledger = finding('F-001', 'HIGH', 'closed', '- Verified in: .buildkit/audits/a.md');
  let r = lintWith(ledger, { 'a.md': 'F-002 [LOW] other\n', 'b.md': 'F-001 [HIGH] x\nF-002 [LOW] y\n' });
  assert.equal(r.status, 1);
  assert.match(r.out, /F-001 is closed but "\.buildkit\/audits\/a\.md" is not an audit report/);
  r = lintWith(finding('F-001', 'HIGH', 'closed', '- Verified in: .buildkit/audits/missing.md'));
  assert.match(r.out, /F-001 is closed but "\.buildkit\/audits\/missing\.md"/);
  // Backticks, a leading ./ and Windows separators all name the same report.
  r = lintWith(finding('F-001', 'HIGH', 'closed', '- Verified in: `./.buildkit\\audits\\a.md`'), { 'a.md': 'F-001 [HIGH] x\n' });
  assert.equal(r.status, 0, r.out);
});

test('headers: three dashes accepted, malformed and duplicate fail, fences and free headings ignored', () => {
  let r = lintWith(['### F-001 [HIGH] open — em', '### F-002 [HIGH] open – en', '### F-003 [HIGH] open - hyphen', '### Notes', '```', '### F-004 [BLOCKING] open — in a fence', '```', ''].join('\n'));
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /3 finding\(s\)/);
  for (const bad of ['### F-7 [HIGH] open — short id', '### F-001 [P1] open — x', '### F-001 [HIGH] pending — x', '### F-001 [HIGH] open x']) {
    r = lintWith(bad + '\n');
    assert.equal(r.status, 1, bad);
    assert.match(r.out, /findings\.md:1: malformed finding header/, bad);
  }
  r = lintWith(finding('F-001', 'LOW', 'open') + finding('F-001', 'LOW', 'open'));
  assert.equal(r.status, 1);
  assert.match(r.out, /findings\.md:2: duplicate finding ID F-001 \(first at line 1\)/);
});

test('CRLF ledgers parse like LF', () => {
  const ledger = finding('F-001', 'LOW', 'accepted', '- Reason: ok', '- Accepted by: Sam') + finding('F-002', 'BLOCKING', 'open');
  const r = lintWith(ledger.replace(/\n/g, '\r\n'));
  assert.deepEqual(r.fails.length, 1, r.out);
  assert.match(r.fails[0], /findings\.md:4: F-002 \[BLOCKING\] is open/);
});

test('audit reports must not name IDs the ledger lacks', () => {
  let r = lintWith(finding('F-001', 'LOW', 'open'), { 'r.md': '# Audit\n\n- F-001 [LOW] a\n- F-002 [HIGH] b\n' });
  assert.equal(r.status, 1);
  assert.match(r.out, /\.buildkit\/audits\/r\.md:4: F-002 is not in \.buildkit\/findings\.md/);
  // Deleting the ledger doesn't hide findings a report names.
  r = lintWith(null, { 'r.md': 'F-001 [BLOCKING] a\n' });
  assert.equal(r.status, 1);
  assert.match(r.out, /F-001 is not in \.buildkit\/findings\.md/);
  // Pre-ledger reports name no IDs; IDs in code fences don't count.
  r = lintWith(null, { 'old.md': '# Audit\n\nBLOCKING: SQL injection\n\n```\nF-009\n```\n' });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /No findings ledger yet/);
});

test('an open or fixed finding may not be rated lower than a report rated it', () => {
  const reports = { 'r.md': 'F-001 [BLOCKING] a\n' };
  let r = lintWith(finding('F-001', 'HIGH', 'open'), reports);
  assert.equal(r.status, 1);
  assert.match(r.out, /findings\.md:1: F-001 is HIGH but \.buildkit\/audits\/r\.md:1 rated it BLOCKING/);
  r = lintWith(finding('F-001', 'LOW', 'fixed'), reports);
  assert.match(r.out, /F-001 is LOW but/);
  // Closed, invalid and accepted findings may be re-rated.
  r = lintWith(finding('F-001', 'HIGH', 'closed', '- Verified in: .buildkit/audits/r.md'), reports);
  assert.equal(r.status, 0, r.out);
  r = lintWith(finding('F-001', 'NOTE', 'invalid', '- Reason: re-rated as F-002') + finding('F-002', 'HIGH', 'open'), reports);
  assert.equal(r.status, 0, r.out);
  // A ledger rating higher than the report is fine.
  r = lintWith(finding('F-001', 'HIGH', 'open'), { 'r.md': 'F-001 [MEDIUM] a\n' });
  assert.equal(r.status, 0, r.out);
});

test('secret-shaped ledger lines warn without failing', () => {
  const r = lintWith(finding('F-001', 'LOW', 'open', '- Detail: key AKIAABCDEFGHIJKLMNOP leaked', '- Detail: -----BEGIN PRIVATE KEY-----'));
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /\[WARN\] \.buildkit\/findings\.md:2: looks like a secret or token/);
  assert.match(r.out, /\[WARN\] \.buildkit\/findings\.md:3: looks like a secret or token/);
});

test('gate inputs fail closed when they exist but cannot be read', (t) => {
  fs.rmSync(AUDITS, { recursive: true, force: true });
  fs.rmSync(LEDGER, { recursive: true, force: true });
  fs.mkdirSync(LEDGER);
  let res = run('lint', tmp);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /\[FAIL\] \.buildkit\/findings\.md is not a regular file/);
  fs.rmSync(LEDGER, { recursive: true });

  fs.writeFileSync(AUDITS, 'not a directory');
  res = run('lint', tmp);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /\[FAIL\] \.buildkit\/audits is not a readable directory inside the project/);
  fs.rmSync(AUDITS);

  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-ledger-outside-'));
  try {
    fs.writeFileSync(path.join(outside, 'r.md'), 'F-001 [BLOCKING] x\n');
    fs.symlinkSync(outside, AUDITS, 'junction');
    res = run('lint', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /\[FAIL\] \.buildkit\/audits is not a readable directory inside the project/);
  } catch (err) {
    if (err.code !== 'EPERM') throw err;
    t.skip('directory links are not permitted here');
  } finally {
    fs.rmSync(AUDITS, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('install vendors the lint checker byte-for-byte and tracks it in the manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'manifest.json'), 'utf8'));
  const vendored = { 'bin/lint.js': 'bin/lint.js', 'lib/lint.js': 'lib/lint.js', 'lib/config.js': 'lib/config.js', 'package.json': 'lib/buildkit-package.json' };
  for (const [rel, source] of Object.entries(vendored)) {
    assert.ok(fs.readFileSync(path.join(tmp, '.buildkit', rel)).equals(fs.readFileSync(path.join(ROOT, source))), rel);
    assert.ok(manifest.files[`.buildkit/${rel}`], `${rel} in manifest`);
  }
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'package.json'), 'utf8')), { type: 'commonjs' });
});

test('the vendored checker runs in a project whose package.json says "type": "module"', () => {
  const esm = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-esm-'));
  try {
    assert.equal(run('install', esm, '--agent', 'claude', '--no-detect', '--skip-capabilities').status, 0);
    fs.writeFileSync(path.join(esm, 'package.json'), JSON.stringify({ name: 'esm-app', type: 'module' }));
    const res = spawnSync(process.execPath, [path.join(esm, '.buildkit', 'bin', 'lint.js')], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(res.stdout, /No findings ledger yet/);
  } finally {
    fs.rmSync(esm, { recursive: true, force: true });
  }
});

test('node .buildkit/bin/lint.js lints its own project and its exit code is the gate', () => {
  const vendored = path.join(tmp, '.buildkit', 'bin', 'lint.js');
  lintWith(finding('F-001', 'BLOCKING', 'open'));
  let res = spawnSync(process.execPath, [vendored], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(res.status, 1, res.stdout + res.stderr);
  // __dirname is the real path (macOS: /var -> /private/var), so compare against tmp's real path.
  assert.match(res.stdout, new RegExp(`Lint — ${fs.realpathSync(tmp).replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')}`));
  assert.match(res.stdout, /F-001 \[BLOCKING\] is open/);
  lintWith(finding('F-001', 'BLOCKING', 'closed', '- Verified in: .buildkit/audits/r.md'), { 'r.md': 'F-001 [BLOCKING] x\n' });
  res = spawnSync(process.execPath, [vendored], { cwd: os.tmpdir(), encoding: 'utf8' });
  assert.equal(res.status, 0, res.stdout + res.stderr);
});

test('doctor reports a missing vendored checker and repair restores it', () => {
  const vendored = path.join(tmp, '.buildkit', 'lib', 'lint.js');
  fs.rmSync(vendored);
  let res = run('doctor', tmp);
  assert.equal(res.status, 1);
  assert.match(res.stdout, /Lint checker files missing: \.buildkit\/lib\/lint\.js/);
  res = run('repair', tmp, '--skip-capabilities');
  assert.equal(res.status, 0, res.stderr);
  assert.ok(fs.existsSync(vendored));
});

test('skill text matches the parser and keeps the binding gate', () => {
  const read = name => fs.readFileSync(path.join(ROOT, '.claude', 'skills', name, 'SKILL.md'), 'utf8');
  const audit = read('audit');
  const headers = audit.split(/\r?\n/).filter(l => l.startsWith('### F-'));
  assert.ok(headers.length > 0, 'audit skill shows the header format');
  for (const h of headers) assert.match(h, FINDING_HEADER);
  assert.match(audit, /Write the ledger first/);
  const complete = read('complete');
  assert.match(complete, /node \.buildkit\/bin\/lint\.js/);
  assert.match(complete, /non-zero exit code is binding/);
  assert.doesNotMatch(complete, /npx[^\n]*lint/, 'complete never runs lint through npx');
  assert.match(read('implement'), /set its status to `fixed`/);
});
