'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { readCrosscheckConfig } = require('../lib/config');
const { lintProject } = require('../lib/lint');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'vikers-buildkit.js');
const skill = rel => fs.readFileSync(path.join(ROOT, '.claude', 'skills', ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');

function git(cwd, ...args) {
  const r = spawnSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}

test('crosscheck config: defaults, validation, and vendors required for gates', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-xc-cfg-'));
  const cfg = obj => {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), JSON.stringify({ schemaVersion: 1, docs: { root: '.' }, ...obj }));
    return readCrosscheckConfig(tmp);
  };
  try {
    assert.deepEqual(cfg({}).config, { plan: 'manual', review: 'manual', vendors: [] });
    assert.equal(cfg({ crosscheck: { review: 'blocking', vendors: ['openai'] } }).ok, true);
    assert.equal(cfg({ crosscheck: { vendors: ['google'] } }).ok, true, 'vendors alone is the Antigravity opt-in');
    for (const bad of [
      { review: 'blocking' }, // gates need explicit vendors
      { review: 'always' },
      { vendors: ['anthropic'] },
      { vendors: ['openai', 'openai'] },
      { decide: 'manual' },
      []
    ]) assert.equal(cfg({ crosscheck: bad }).ok, false, JSON.stringify(bad));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('the vendored crosscheck tools work end to end in an installed project', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-xc-cli-'));
  try {
    git(tmp, 'init', '-q');
    assert.equal(spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--no-detect', '--skip-capabilities'], { encoding: 'utf8' }).status, 0);
    for (const rel of ['bin/crosscheck.js', 'bin/review-check.js', 'lib/crosscheck.js', 'lib/critics.js']) {
      assert.ok(fs.readFileSync(path.join(tmp, '.buildkit', rel)).equals(fs.readFileSync(path.join(ROOT, rel))), `${rel} vendored`);
    }
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), JSON.stringify({ schemaVersion: 1, docs: { root: '.' }, crosscheck: { review: 'blocking', vendors: ['openai'] } }));
    fs.writeFileSync(path.join(tmp, 'app.js'), 'one\n');
    git(tmp, 'add', '-A');
    git(tmp, 'commit', '-q', '-m', 'base');
    const base = git(tmp, 'rev-parse', 'HEAD');
    const fdir = path.join(tmp, '.buildkit', 'features', 'login');
    fs.mkdirSync(fdir, { recursive: true });
    fs.writeFileSync(path.join(fdir, 'spec.md'), `# Feature: login\n\nBase: ${base}\nSensitive: yes\n`);
    fs.writeFileSync(path.join(fdir, 'acceptance.md'), '- AC-01 — works\n');
    fs.writeFileSync(path.join(tmp, '.buildkit', 'state.md'), '# State\n\n## Current Feature\nlogin\n');
    fs.writeFileSync(path.join(tmp, 'app.js'), 'one\ntwo AKIAABCDEFGHIJKLMNOP\n');

    const xc = (...args) => spawnSync(process.execPath, [path.join(tmp, '.buildkit', 'bin', 'crosscheck.js'), ...args], { encoding: 'utf8' });
    const json = r => { assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); };

    assert.deepEqual(json(xc('policy')), { plan: false, review: true, sensitive: 'yes', base });
    assert.equal(spawnSync(process.execPath, [path.join(tmp, '.buildkit', 'bin', 'review-check.js')], { encoding: 'utf8' }).status, 1, 'gate fails without a receipt');

    const out = path.join(tmp, '..', `xc-prompt-${process.pid}.txt`);
    const meta = json(xc('prompt', 'review', '--lens', 'A', '--out', out));
    const promptText = fs.readFileSync(out, 'utf8');
    fs.rmSync(out);
    assert.match(promptText, /You are a senior code reviewer/);
    assert.doesNotMatch(promptText, /AKIAABCDEFGHIJKLMNOP/, 'the input is redacted before it is written');
    assert.equal(meta.redacted, 1);

    // Codex writes plain JSON; agy writes stream-json with a final result event.
    const leg = { inspected_files: meta.files, first_header: meta.first_header, verdict: 'FINDINGS', findings: [{ file: 'app.js', line: 2, grade: 'SHOULD', issue: 'Hard-coded key', why: 'Use config.' }] };
    const codexOut = path.join(tmp, '..', `xc-codex-${process.pid}.json`);
    const agyOut = path.join(tmp, '..', `xc-agy-${process.pid}.ndjson`);
    fs.writeFileSync(codexOut, JSON.stringify(leg));
    fs.writeFileSync(agyOut, `{"event":"init"}\n{"event":"result","result":{"status":"SUCCESS","response":${JSON.stringify(JSON.stringify(leg))}}}\n`);
    // Both lenses are required; one output in each format.
    const r = json(xc('receipt', 'review', '--host', 'claude', '--leg', `codex,A,gpt-6-luna,${codexOut}`, '--leg', `codex,B,gpt-6-luna,${agyOut}`));
    fs.rmSync(codexOut);
    fs.rmSync(agyOut);
    assert.equal(r.verdict, 'PASS');
    assert.deepEqual(r.findings.map(f => f.key), ['codex-A:0', 'codex-B:0']);

    const added = json(xc('add-finding', '--leg', 'codex-A', '--index', '0', '--security'));
    assert.deepEqual(added, { id: 'F-001', severity: 'HIGH' });
    const ledgerLines = lintProject(tmp).filter(f => /findings/i.test(f.message));
    assert.ok(ledgerLines.some(f => f.level === 'PASS' && /1 finding/.test(f.message)), JSON.stringify(ledgerLines));

    const check = spawnSync(process.execPath, [path.join(tmp, '.buildkit', 'bin', 'review-check.js')], { encoding: 'utf8' });
    assert.equal(check.status, 0, check.stdout + check.stderr);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('named files must stay inside the project and out of secrets', () => {
  const { containedFile } = require('../bin/crosscheck.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-xc-file-'));
  try {
    git(tmp, 'init', '-q');
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'secret.md\n');
    for (const f of ['plan.md', 'secret.md', '.env', 'k.pem']) fs.writeFileSync(path.join(tmp, f), 'x\n');
    assert.equal(containedFile(tmp, 'plan.md').rel, 'plan.md');
    for (const f of ['secret.md', '.env', 'k.pem', path.join('..', path.basename(tmp), '..', 'outside.md')]) {
      assert.throws(() => containedFile(tmp, f), undefined, f);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('skill text: plan and review only, verified launchers, gates wired, credit kept', () => {
  const main = skill('crosscheck/SKILL.md');
  assert.match(main, /`\/crosscheck plan`/);
  assert.match(main, /`\/crosscheck review`/);
  assert.doesNotMatch(main + skill('crosscheck/references/critics.md'), /\bdecide\b/, 'decide ships in 2.8.x, not 2.8.0');
  const critics = skill('crosscheck/references/critics.md');
  for (const flag of ['-s read-only', '--ephemeral', '--ignore-user-config', '--output-schema', '--sandbox --mode plan', '"mcp"', '--print-timeout 12m', 'empty']) assert.ok(critics.includes(flag), flag);
  assert.doesNotMatch(critics, /^gemini |claude -p/m, 'no unverified launchers');
  for (const name of ['feature', 'fix']) assert.match(skill(`${name}/SKILL.md`), /crosscheck\.js policy`\. If it reports `plan: true`/);
  assert.match(skill('audit/SKILL.md'), /reports `review: true`/);
  assert.match(skill('complete/SKILL.md'), /node \.buildkit\/bin\/review-check\.js/);
  assert.match(skill('crosscheck/references/NOTICE.md'), /Copyright \(c\) 2026 Sameer Ahmed Khan/);
  const notices = fs.readFileSync(path.join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notices, /model-crosscheck/);
  // The lens blocks the prompt command extracts must exist for both kinds and lenses.
  const lenses = skill('crosscheck/references/lenses.md');
  for (const kind of ['plan', 'review']) for (const lens of ['A', 'B']) assert.match(lenses, new RegExp(`### Lens ${lens} — ${kind}\\n+\`\`\`text\\n`));
});
