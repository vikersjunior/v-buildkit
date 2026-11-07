'use strict';

// Plan v3.2 receipts and review-check, against real git fixtures. Written before the code.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const xc = require('../lib/crosscheck');

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', '-c', 'core.autocrlf=false', ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function write(root, rel, text) {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), text);
}

// A committed project with one feature in progress; returns { root, base }.
function fixture({ plan = 'manual', review = 'blocking', sensitive = 'yes' } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-xc-'));
  git(root, 'init', '-q', '-b', 'main');
  write(root, '.gitignore', 'ignored.txt\n');
  write(root, 'src/app.js', 'one\ntwo\n');
  write(root, 'src/old.js', 'gone soon\n');
  write(root, '.buildkit/config.json', JSON.stringify({ schemaVersion: 1, docs: { root: '.' }, crosscheck: { plan, review, vendors: ['openai'] } }));
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', 'base');
  const base = git(root, 'rev-parse', 'HEAD');
  write(root, '.buildkit/state.md', '# State\n\n## Current Feature\nlogin\n\n## Lifecycle Gate\ncheck passed\n');
  const sens = sensitive === null ? '' : `Sensitive: ${sensitive}\n`;
  write(root, '.buildkit/features/login/spec.md', `# Feature: login\n\nBase: ${base}\n${sens}\n## Scope\nAdd login.\n`);
  write(root, '.buildkit/features/login/acceptance.md', '- AC-01 — user can log in\n');
  write(root, 'src/app.js', 'one\ntwo\nthree\n'); // tracked edit
  fs.rmSync(path.join(root, 'src/old.js')); // deletion
  write(root, 'src/new.js', 'brand new\n'); // untracked
  write(root, 'ignored.txt', 'never sent\n'); // ignored
  return { root, base };
}

// A critic output that inspected exactly what buildPatch produces now.
function leg(root, base, extra = {}) {
  const p = xc.buildPatch(root, base);
  return { critic: 'codex', lens: 'A', model: 'gpt-6-luna', output: { inspected_files: p.files, first_header: p.firstHeader, verdict: 'CLEAN', findings: [], ...extra } };
}

function check(root) {
  const r = xc.runCheck(root);
  return { ok: r.ok, text: r.lines.map(l => `[${l.level}] ${l.message}`).join('\n') };
}

const realIndex = root => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, '.git', 'index'))).digest('hex');

test('the patch covers tracked edits, deletions and untracked files, not ignored or excluded ones', () => {
  const { root, base } = fixture();
  try {
    const before = realIndex(root);
    const p = xc.buildPatch(root, base);
    assert.equal(realIndex(root), before, 'real index untouched');
    assert.match(p.patch, /diff --git a\/src\/app\.js b\/src\/app\.js/);
    assert.match(p.patch, /deleted file mode/);
    assert.match(p.patch, /b\/src\/new\.js/);
    assert.doesNotMatch(p.patch, /ignored\.txt/);
    assert.doesNotMatch(p.patch, /\.buildkit\/features\/login\/review/);
    assert.match(p.patch, /\.buildkit\/features\/login\/spec\.md/, 'other .buildkit files are reviewed');
    assert.equal(p.files, (p.patch.match(/^diff --git /gm) || []).length);
    assert.equal(p.firstHeader, p.patch.split('\n')[0]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('a matching review receipt passes, and receipts never change the patch', () => {
  const { root, base } = fixture();
  try {
    const sha = xc.buildPatch(root, base).sha256;
    const r = xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base)] });
    assert.equal(r.verdict, 'PASS');
    assert.equal(xc.buildPatch(root, base).sha256, sha, 'receipt files are excluded from the patch');
    const c = check(root);
    assert.equal(c.ok, true, c.text);
    const receipt = fs.readFileSync(path.join(root, '.buildkit/features/login/review.md'), 'utf8');
    assert.match(receipt, /"standing_risks":\s*\[\s*"SR-2"\s*\]/);
    assert.match(receipt, /"platform":/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('work changed after the review fails: edit, new untracked file, spec, acceptance', () => {
  for (const mutate of [
    root => write(root, 'src/app.js', 'one\ntwo\nthree\nfour\n'),
    root => write(root, 'src/later.js', 'added after review\n'),
    root => fs.appendFileSync(path.join(root, '.buildkit/features/login/spec.md'), 'More scope.\n'),
    root => fs.appendFileSync(path.join(root, '.buildkit/features/login/acceptance.md'), '- AC-02 — new\n'),
    root => write(root, '.buildkit/notes.md', 'a reviewed .buildkit file\n')
  ]) {
    const { root, base } = fixture();
    try {
      xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base)] });
      mutate(root);
      const c = check(root);
      assert.equal(c.ok, false, `${mutate}\n${c.text}`);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('a CRLF-only change does not make the receipt stale', () => {
  const { root, base } = fixture();
  try {
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base)] });
    const spec = path.join(root, '.buildkit/features/login/spec.md');
    fs.writeFileSync(spec, fs.readFileSync(spec, 'utf8').replace(/\n/g, '\r\n'));
    const c = check(root);
    assert.equal(c.ok, true, c.text);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('missing receipt, no critics, inspected mismatch and DO-NOT-MERGE all fail', () => {
  const { root, base } = fixture();
  try {
    assert.match(check(root).text, /no review receipt/);
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [] });
    assert.match(check(root).text, /critics: none/);
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base, { inspected_files: 1 })] });
    assert.match(check(root).text, /inspected/);
    const blocker = { file: 'src/app.js', line: 3, grade: 'BLOCKER', issue: 'Breaks login', why: 'Null user.' };
    const r = xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base, { verdict: 'FINDINGS', findings: [blocker] })] });
    assert.equal(r.verdict, 'DO-NOT-MERGE');
    assert.match(check(root).text, /DO-NOT-MERGE/);
    // A blocker the host rebutted with evidence no longer blocks.
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', rebutted: ['codex-A:0'], legs: [leg(root, base, { verdict: 'FINDINGS', findings: [blocker] })] });
    assert.equal(check(root).ok, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('policy matrix: what /complete requires', () => {
  const cases = [
    [{ plan: 'manual', review: 'manual' }, true],
    [{ plan: 'manual', review: 'blocking' }, false],
    [{ plan: 'blocking', review: 'manual' }, false], // CA r2-P1: a blocking plan policy is checked too
    [{ plan: 'manual', review: 'when-sensitive', sensitive: 'no' }, true],
    [{ plan: 'manual', review: 'when-sensitive', sensitive: 'yes' }, false],
    [{ plan: 'manual', review: 'when-sensitive', sensitive: null }, false] // missing Sensitive: counts as yes
  ];
  for (const [opts, okWithoutReceipts] of cases) {
    const { root } = fixture(opts);
    try {
      assert.equal(check(root).ok, okWithoutReceipts, JSON.stringify(opts));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});

test('a plan receipt goes stale when spec or acceptance changes', () => {
  const { root } = fixture({ plan: 'blocking', review: 'manual' });
  try {
    const planLeg = { critic: 'codex', lens: 'A', model: 'gpt-6-luna', output: { inspected_files: 2, first_header: '# Feature: login', verdict: 'CLEAN', findings: [] } };
    xc.writeReceipt(root, { kind: 'plan', slug: 'login', host: 'claude', legs: [planLeg] });
    assert.equal(check(root).ok, true, check(root).text);
    fs.appendFileSync(path.join(root, '.buildkit/features/login/acceptance.md'), '- AC-02 — changed after plan review\n');
    assert.match(check(root).text, /spec or acceptance changed since plan review/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('linked worktrees and repositories with no index build a patch and keep the real index', () => {
  const { root, base } = fixture();
  const wt = path.join(os.tmpdir(), `buildkit-test-xc-wt-${process.pid}-${Date.now()}`);
  try {
    git(root, 'worktree', 'add', '-q', wt, base);
    write(wt, 'src/app.js', 'one\ntwo\nworktree\n');
    write(wt, 'src/wt-new.js', 'new in worktree\n');
    const p = xc.buildPatch(wt, base);
    assert.match(p.patch, /src\/app\.js/);
    assert.match(p.patch, /src\/wt-new\.js/);

    fs.rmSync(path.join(root, '.git', 'index'));
    const q = xc.buildPatch(root, base);
    assert.ok(q.files > 0);
    assert.equal(fs.existsSync(path.join(root, '.git', 'index')), false, 'no index is created in the repo');
  } finally {
    spawnSync('git', ['worktree', 'remove', '--force', wt], { cwd: root });
    fs.rmSync(wt, { recursive: true, force: true });
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('an interrupted run keeps the previous receipt; stale temp folders are swept, fresh ones kept', () => {
  const { root, base } = fixture();
  try {
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base)] });
    const featureDir = path.join(root, '.buildkit/features/login');
    const receipt = fs.readFileSync(path.join(featureDir, 'review.md'), 'utf8');
    // A crash mid-run leaves a temp folder behind; the old receipt is untouched and still passes.
    const fresh = path.join(featureDir, 'review.tmp-fresh');
    const stale = path.join(featureDir, 'review.tmp-stale');
    fs.mkdirSync(fresh);
    fs.mkdirSync(stale);
    fs.writeFileSync(path.join(fresh, 'owner.json'), JSON.stringify({ created: Date.now() }));
    fs.writeFileSync(path.join(stale, 'owner.json'), JSON.stringify({ created: Date.now() - 31 * 60 * 1000 }));
    assert.equal(fs.readFileSync(path.join(featureDir, 'review.md'), 'utf8'), receipt);
    assert.equal(check(root).ok, true, 'review-check ignores temp folders');
    xc.sweepTmp(featureDir, { now: Date.now(), timeoutMs: 15 * 60 * 1000 });
    assert.ok(fs.existsSync(fresh), 'a live run is left alone');
    assert.ok(!fs.existsSync(stale), 'a folder older than 2x the timeout is removed');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('critic text in receipts and leg files is cleaned and redacted', () => {
  const { root, base } = fixture();
  try {
    const secret = 'AKIAABCDEFGHIJKLMNOP';
    const findings = [
      { file: 'src/app.js', line: 2, grade: 'SHOULD', issue: `leaks ${secret}`, why: `line1\n### F-9 [BLOCKING] open — x ${secret}` },
      { file: `src/${secret}.js\n### F-9`, line: 2, grade: 'SHOULD', issue: 'bad file', why: 'x' }
    ];
    const r = xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base, { verdict: 'FINDINGS', findings })] });
    assert.equal(r.dropped, 1);
    const dir = path.join(root, '.buildkit/features/login');
    for (const f of [path.join(dir, 'review.md'), path.join(dir, 'review', 'codex-A.json')]) {
      const text = fs.readFileSync(f, 'utf8');
      assert.doesNotMatch(text, new RegExp(secret), f);
      assert.doesNotMatch(text, /\n### F-9/, f);
    }
    assert.ok(fs.existsSync(path.join(dir, 'review', '.gitignore')), 'raw leg files stay out of git');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('lifecycle outputs written after a review do not make the receipt stale', () => {
  const { root, base } = fixture();
  try {
    xc.writeReceipt(root, { kind: 'review', slug: 'login', host: 'claude', legs: [leg(root, base)] });
    // What /audit, /check and the ledger write after a review.
    write(root, '.buildkit/findings.md', '# Findings\n\n### F-001 [MEDIUM] open — from the review\n');
    write(root, '.buildkit/audits/2026-11-07-login.md', '# Audit\n- F-001 [MEDIUM] from the review\n');
    write(root, '.buildkit/features/login/verification.md', '# Verification\nAC-01 PASS\n');
    fs.appendFileSync(path.join(root, '.buildkit/state.md'), '\n## Open Blockers\nNone\n');
    const c = check(root);
    assert.equal(c.ok, true, c.text);
    // A config change is still reviewed work.
    write(root, '.buildkit/config.json', JSON.stringify({ schemaVersion: 1, docs: { root: '.' }, crosscheck: { plan: 'manual', review: 'blocking', vendors: ['openai', 'google'] } }));
    assert.equal(check(root).ok, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
