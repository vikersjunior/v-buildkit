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

// Same as BuildKit's manifest hash: text with CRLF folded to LF.
function sha(text) {
  return crypto.createHash('sha256').update(String(text).replace(/\r\n/g, '\n'), 'latin1').digest('hex');
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
    assert.equal(manifest.files[SKILL_REL], sha(fs.readFileSync(path.join(tmp, SKILL), 'latin1')));
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
    const [stamp] = fs.readdirSync(backups).filter(n => n !== '.gitignore');
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

test('update on a pre-manifest install backs up differing files and replaces them', () => {
  const tmp = installed();
  const clean = installed();
  try {
    fs.rmSync(path.join(tmp, '.buildkit', 'manifest.json'));
    const dest = path.join(tmp, SKILL);
    const pristine = fs.readFileSync(dest, 'utf8');
    fs.writeFileSync(dest, 'unknown provenance');

    const res = run('update', tmp);
    assert.equal(res.status, 0, res.stdout + res.stderr);
    assert.match(res.stdout, /no baseline/);
    assert.match(res.stdout, /predates change tracking/);
    assert.equal(fs.readFileSync(dest, 'utf8'), pristine);
    const backups = path.join(tmp, '.buildkit', 'backups');
    const [stamp] = fs.readdirSync(backups).filter(n => n !== '.gitignore');
    assert.equal(fs.readFileSync(path.join(backups, stamp, SKILL), 'utf8'), 'unknown provenance');

    fs.rmSync(path.join(clean, '.buildkit', 'manifest.json'));
    assert.equal(run('update', clean).status, 0, 'identical legacy install updates cleanly');
    assert.ok(fs.existsSync(path.join(clean, '.buildkit', 'manifest.json')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(clean, { recursive: true, force: true });
  }
});

test('update refuses manifest paths that escape the project, even with --force', () => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-victim-'));
  try {
    const victim = path.join(outside, 'keep.txt');
    fs.writeFileSync(victim, 'precious');
    const escape = `.buildkit/workflow-skills/${path.relative(path.join(tmp, '.buildkit', 'workflow-skills'), victim).split(path.sep).join('/')}`;
    for (const rel of [escape, '.buildkit/workflow-skills/..\\..\\x.md', '/etc/passwd', 'C:/x.md']) {
      editManifest(tmp, files => { files[rel] = sha('precious'); });
      for (const args of [[], ['--force']]) {
        const res = run('update', tmp, ...args);
        assert.equal(res.status, 1, `${rel} ${args}`);
        assert.match(res.stdout, /unsafe path in \.buildkit\/manifest\.json/);
        assert.equal(fs.readFileSync(victim, 'utf8'), 'precious');
      }
      editManifest(tmp, files => { delete files[rel]; });
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('update refuses to write through a symlinked parent directory', () => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    const skillDir = path.join(tmp, '.claude', 'skills', 'feature');
    fs.rmSync(skillDir, { recursive: true, force: true });
    // A junction needs no extra privileges on Windows; elsewhere it is a plain dir symlink.
    fs.symlinkSync(outside, skillDir, 'junction');
    const res = run('update', tmp, '--force');
    assert.equal(res.status, 1);
    assert.match(res.stdout, /a parent directory resolves outside the project/);
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('update treats a line-ending-only change as unchanged', () => {
  const tmp = installed();
  try {
    const dest = path.join(tmp, SKILL);
    const text = fs.readFileSync(dest, 'utf8');
    const flipped = text.includes('\r\n') ? text.replace(/\r\n/g, '\n') : text.replace(/\n/g, '\r\n');
    fs.writeFileSync(dest, flipped);
    const res = run('update', tmp);
    assert.equal(res.status, 0, res.stdout);
    assert.doesNotMatch(res.stdout, /Conflict/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update treats a malformed manifest as missing instead of crashing', () => {
  const tmp = installed();
  try {
    for (const files of [null, [], { [SKILL_REL]: 42 }]) {
      fs.writeFileSync(path.join(tmp, '.buildkit', 'manifest.json'), JSON.stringify({ schemaVersion: 1, files }));
      const res = run('update', tmp);
      assert.equal(res.status, 0, `${JSON.stringify(files)}: ${res.stderr}`);
      assert.doesNotMatch(res.stderr, /TypeError/);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('update refuses a linked .buildkit/backups and never prunes outside it', () => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    for (const name of ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']) fs.mkdirSync(path.join(outside, name));
    fs.symlinkSync(outside, path.join(tmp, '.buildkit', 'backups'), 'junction');
    fs.writeFileSync(path.join(tmp, SKILL), 'edited');
    const res = run('update', tmp, '--force');
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\.buildkit\/backups must be a real directory inside the project/);
    assert.deepEqual(fs.readdirSync(outside).sort(), ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot']);
    assert.equal(fs.readFileSync(path.join(tmp, SKILL), 'utf8'), 'edited', 'nothing changed');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('install, repair and update refuse a linked .buildkit', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-update-'));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    fs.symlinkSync(outside, path.join(tmp, '.buildkit'), 'junction');
    for (const cmd of ['install', 'repair', 'update']) {
      const res = run(cmd, tmp, '--agent', 'claude', '--no-detect');
      assert.equal(res.status, 1, cmd);
      assert.match(res.stderr, /\.buildkit must be a real directory inside the project/, cmd);
      assert.deepEqual(fs.readdirSync(outside), [], `${cmd} wrote nothing outside`);
    }
  } finally {
    fs.rmSync(path.join(tmp, '.buildkit'), { recursive: true, force: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('a manifest entry for a user skill in an agent folder never prunes it', () => {
  const tmp = installed();
  try {
    const own = path.join(tmp, '.claude', 'skills', 'my-skill', 'SKILL.md');
    fs.mkdirSync(path.dirname(own), { recursive: true });
    fs.writeFileSync(own, 'mine, committed to the repo');
    editManifest(tmp, files => { files['.claude/skills/my-skill/SKILL.md'] = sha('mine, committed to the repo'); });
    assert.equal(run('update', tmp).status, 0);
    assert.equal(fs.readFileSync(own, 'utf8'), 'mine, committed to the repo');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('install and update refuse a linked .buildkit/workflow-skills', () => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    const skills = path.join(tmp, '.buildkit', 'workflow-skills');
    fs.rmSync(skills, { recursive: true, force: true });
    fs.symlinkSync(outside, skills, 'junction');
    for (const cmd of ['install', 'update']) {
      const res = run(cmd, tmp, '--agent', 'claude', '--no-detect');
      assert.equal(res.status, 1, cmd);
      assert.match(res.stderr, /\.buildkit\/workflow-skills must be a real directory inside the project/, cmd);
    }
    assert.deepEqual(fs.readdirSync(outside), []);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('update --force does not follow a dangling .gitignore link in backups', (t) => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    const backups = path.join(tmp, '.buildkit', 'backups');
    fs.mkdirSync(backups, { recursive: true });
    try {
      fs.symlinkSync(path.join(outside, 'planted'), path.join(backups, '.gitignore'));
    } catch (err) {
      if (err.code !== 'EPERM') throw err;
      t.skip('file symlinks need Developer Mode or an elevated shell on Windows');
      return;
    }
    fs.writeFileSync(path.join(tmp, SKILL), 'edited');
    assert.equal(run('update', tmp, '--force').status, 0);
    assert.ok(!fs.existsSync(path.join(outside, 'planted')), 'nothing written through the link');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('update refuses a symlinked manifest', (t) => {
  const tmp = installed();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-outside-'));
  try {
    const target = path.join(outside, 'manifest.json');
    fs.copyFileSync(path.join(tmp, '.buildkit', 'manifest.json'), target);
    fs.rmSync(path.join(tmp, '.buildkit', 'manifest.json'));
    try {
      fs.symlinkSync(target, path.join(tmp, '.buildkit', 'manifest.json'));
    } catch (err) {
      if (err.code !== 'EPERM') throw err;
      t.skip('file symlinks need Developer Mode or an elevated shell on Windows');
      return;
    }
    const res = run('update', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /\.buildkit\/manifest\.json must be a real file inside the project/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

test('update --force keeps backups out of git and keeps only the newest five', () => {
  const tmp = installed();
  try {
    const backups = path.join(tmp, '.buildkit', 'backups');
    for (let i = 0; i < 6; i++) fs.mkdirSync(path.join(backups, `2000-01-0${i + 1}T00-00-00-000Z`), { recursive: true });
    fs.mkdirSync(path.join(backups, 'aaa-keep-me'));
    fs.writeFileSync(path.join(tmp, SKILL), 'edited');
    assert.equal(run('update', tmp, '--force').status, 0);
    assert.equal(fs.readFileSync(path.join(backups, '.gitignore'), 'utf8'), '*\n');
    assert.ok(fs.existsSync(path.join(backups, 'aaa-keep-me')), 'folders not named like a backup run are never pruned');
    const runs = fs.readdirSync(backups).filter(n => /^\d{4}-/.test(n)).sort();
    assert.equal(runs.length, 5);
    assert.ok(!runs.includes('2000-01-01T00-00-00-000Z') && !runs.includes('2000-01-02T00-00-00-000Z'), 'oldest runs pruned');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
