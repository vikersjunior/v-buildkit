'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');
const SKILL = path.join('.claude', 'skills', 'feature', 'SKILL.md');
const SKILL_REL = '.claude/skills/feature/SKILL.md';

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function installed() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-update-'));
  assert.equal(run('install', tmp, '--agent', 'claude').status, 0);
  return tmp;
}

function sha(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function editManifest(tmp, fn) {
  const file = path.join(tmp, '.buildkit', 'manifest.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  fn(data.files);
  fs.writeFileSync(file, JSON.stringify(data));
}

test('install records a hash manifest of managed files', () => {
  const tmp = installed();
  try {
    const manifest = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'manifest.json'), 'utf8'));
    assert.equal(manifest.files[SKILL_REL], sha(fs.readFileSync(path.join(tmp, SKILL))));
    assert.ok(manifest.files['.buildkit/workflow-skills/feature/SKILL.md']);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update refuses to overwrite a customized skill, and --force backs it up first', () => {
  const tmp = installed();
  try {
    const dest = path.join(tmp, SKILL);
    const pristine = fs.readFileSync(dest, 'utf8');
    fs.writeFileSync(dest, 'my custom feature skill');

    const blocked = run('update', tmp);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stdout, /Conflict \(1\)/);
    assert.match(blocked.stdout, /modified locally/);
    assert.equal(fs.readFileSync(dest, 'utf8'), 'my custom feature skill');

    const forced = run('update', tmp, '--force');
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(fs.readFileSync(dest, 'utf8'), pristine);
    const backups = path.join(tmp, '.buildkit', 'backups');
    const [stamp] = fs.readdirSync(backups);
    assert.equal(fs.readFileSync(path.join(backups, stamp, SKILL), 'utf8'), 'my custom feature skill');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update replaces an unmodified file from an older release', () => {
  const tmp = installed();
  try {
    const dest = path.join(tmp, SKILL);
    const pristine = fs.readFileSync(dest, 'utf8');
    // Simulate an older release: file differs but matches what that release recorded.
    fs.writeFileSync(dest, 'old release content');
    editManifest(tmp, files => { files[SKILL_REL] = sha('old release content'); });

    const res = run('update', tmp);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /updated 1,/);
    assert.equal(fs.readFileSync(dest, 'utf8'), pristine);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update removes obsolete unmodified files and keeps modified ones as conflicts', () => {
  const tmp = installed();
  try {
    const stale = path.join(tmp, '.claude', 'skills', 'feature', 'references', 'dropped.md');
    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, 'dropped in new release');
    editManifest(tmp, files => { files['.claude/skills/feature/references/dropped.md'] = sha('dropped in new release'); });

    const res = run('update', tmp);
    assert.equal(res.status, 0, res.stderr);
    assert.ok(!fs.existsSync(stale));
    assert.ok(!fs.existsSync(path.dirname(stale)), 'empty parent dir is pruned');

    fs.mkdirSync(path.dirname(stale), { recursive: true });
    fs.writeFileSync(stale, 'user edited this');
    editManifest(tmp, files => { files['.claude/skills/feature/references/dropped.md'] = sha('dropped in new release'); });
    const blocked = run('update', tmp);
    assert.equal(blocked.status, 1);
    assert.match(blocked.stdout, /obsolete file modified locally/);
    assert.ok(fs.existsSync(stale));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update never prunes user skills it did not install', () => {
  const tmp = installed();
  try {
    const own = path.join(tmp, '.claude', 'skills', 'my-skill', 'SKILL.md');
    fs.mkdirSync(path.dirname(own), { recursive: true });
    fs.writeFileSync(own, 'mine');
    assert.equal(run('update', tmp).status, 0);
    assert.equal(fs.readFileSync(own, 'utf8'), 'mine');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update --dry-run writes nothing', () => {
  const tmp = installed();
  try {
    const dest = path.join(tmp, SKILL);
    fs.writeFileSync(dest, 'old release content');
    editManifest(tmp, files => { files[SKILL_REL] = sha('old release content'); });
    const manifestBefore = fs.readFileSync(path.join(tmp, '.buildkit', 'manifest.json'), 'utf8');

    const res = run('update', tmp, '--dry-run');
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /Update \(1\):/);
    assert.match(res.stdout, /Dry run/);
    assert.equal(fs.readFileSync(dest, 'utf8'), 'old release content');
    assert.equal(fs.readFileSync(path.join(tmp, '.buildkit', 'manifest.json'), 'utf8'), manifestBefore);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update on a pre-manifest install treats differing files as conflicts', () => {
  const tmp = installed();
  try {
    fs.rmSync(path.join(tmp, '.buildkit', 'manifest.json'));
    fs.writeFileSync(path.join(tmp, SKILL), 'unknown provenance');

    const res = run('update', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /no baseline/);
    assert.match(res.stdout, /predates change tracking/);

    const clean = installed();
    fs.rmSync(path.join(clean, '.buildkit', 'manifest.json'));
    assert.equal(run('update', clean).status, 0, 'identical legacy install updates cleanly');
    assert.ok(fs.existsSync(path.join(clean, '.buildkit', 'manifest.json')));
    fs.rmSync(clean, { recursive: true, force: true });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
