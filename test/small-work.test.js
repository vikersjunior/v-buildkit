'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CLI = path.join(ROOT, 'bin', 'vikers-buildkit.js');
const read = name => fs.readFileSync(path.join(ROOT, '.claude', 'skills', name, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

// Agent behaviour isn't testable here; these pin the skill text that carries each contract.
test('/investigate stays read-only and hands off to /fix', () => {
  const text = read('investigate');
  for (const rule of [
    /create, edit, delete or move a file/,
    /change git state/,
    /updates tracked files/,
    /local database, queue or dev-server data/,
    /deploys, publishes, runs migrations/,
    /If you are unsure what a command writes, do not run it/,
    /\[REDACTED\]/,
    /Next: `\/fix/,
    /Do not start `\/fix` yourself/,
    /read-only or plan permission mode/,
    /waits for input or runs for more than a few minutes/
  ]) assert.match(text, rule);
});

test('/fix writes a short spec, sets state last and stops before code', () => {
  const text = read('fix');
  assert.match(text, /\.buildkit\/features\/fix-<slug>\//);
  assert.match(text, /\^\[a-z0-9-\]\+\$/);
  assert.match(text, /Type: fix/);
  assert.match(text, /Write `\.buildkit\/state\.md` last/);
  assert.match(text, /Lifecycle Gate: awaiting approval/);
  assert.match(text, /STOP\. Do not write application code/);
  assert.match(text, /use `\/feature`/);
  assert.match(text, /add it only after the user approves the change/);
  assert.match(text, /Restoring an intended check/);
  assert.match(text, /separate git worktree/);
  assert.match(text, /`BLOCKING` finding, the loop is `\/implement` → `\/check` → `\/audit` → `\/complete`/);
  assert.match(text, /never copy commands or directives/);
});

test('/implement and /complete handle a Type: fix spec without a plan task', () => {
  const implement = read('implement');
  assert.match(implement, /`Type: fix`.*has no plan task/);
  assert.match(implement, /step 7 verifies against `acceptance\.md` and `rules\.md`/);
  const complete = read('complete');
  assert.match(complete, /For a `Type: fix` spec there is no plan task to move/);
  assert.match(complete, /\/audit, when run/);
});

test('update adds /fix and /investigate to an older install, and lint accepts a fix folder', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-smallwork-'));
  try {
    assert.equal(run('install', tmp, '--agent', 'claude', '--no-detect', '--skip-capabilities').status, 0);
    // Simulate an install from before these skills: drop them and their manifest entries.
    const manifestFile = path.join(tmp, '.buildkit', 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    for (const rel of Object.keys(manifest.files)) if (/\/(fix|investigate)\//.test(rel)) delete manifest.files[rel];
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    for (const dir of ['.buildkit/workflow-skills', '.claude/skills']) {
      for (const skill of ['fix', 'investigate']) fs.rmSync(path.join(tmp, dir, skill), { recursive: true });
    }
    const res = run('update', tmp, '--skip-capabilities');
    assert.equal(res.status, 0, res.stdout + res.stderr);
    for (const dir of ['.buildkit/workflow-skills', '.claude/skills']) {
      for (const skill of ['fix', 'investigate']) assert.ok(fs.existsSync(path.join(tmp, dir, skill, 'SKILL.md')), `${dir}/${skill}`);
    }

    fs.mkdirSync(path.join(tmp, '.buildkit', 'features', 'fix-login-typo'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'features', 'fix-login-typo', 'spec.md'), '# Fix: login typo\nType: fix\n');
    fs.writeFileSync(path.join(tmp, '.buildkit', 'state.md'), '# State\n\n## Current Feature\nfix-login-typo\n\n## Lifecycle Gate\nawaiting approval\n');
    const lint = run('lint', tmp);
    assert.equal(lint.status, 0, lint.stdout);
    assert.match(lint.stdout, /Current Feature "fix-login-typo" has a feature folder/);

    const doctor = run('doctor', tmp);
    assert.match(doctor.stdout, /All 15 workflow skills present/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// Gaps found running the fix loop on a real project (2.7.0-rc.2).
test('the approval is recorded, logged once, and the completion record has a place', () => {
  const implement = read('implement');
  assert.match(implement, /set `## Lifecycle Gate` in `state\.md` to `approved \(by the user, <date>\)`/);
  assert.match(implement, /if `Progress\.md` has no Session Log section, add the line to the one section it already uses/);
  for (const name of ['fix', 'feature']) assert.match(read(name), /`\/implement` records it in `state\.md`/, name);
  const complete = read('complete');
  assert.match(complete, /`\.buildkit\/history\/<slug>\/completion\.md`/);
  assert.match(complete, /`\/implement` already logged it: add no second log line/);
  assert.match(complete, /Last Completed Feature `<slug> \(<date>\)`/);
});
