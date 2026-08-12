'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-link-'));
}

test('--link creates symlinks or junctions to .buildkit/workflow-skills', () => {
  const tmp = makeTmpDir();
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--link'], { encoding: 'utf8' });
    assert.equal(res.status, 0);

    const dest = path.join(tmp, '.claude', 'skills');
    const stat = fs.lstatSync(dest);
    assert.ok(stat.isSymbolicLink(), '.claude/skills should be a symbolic link / junction');
    assert.ok(fs.existsSync(path.join(dest, 'spec-driven-dev', 'SKILL.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('--link fails if target folder already exists as a non-symlink directory with content', () => {
  const tmp = makeTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.claude', 'skills', 'custom-user-skill'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.claude', 'skills', 'custom-user-skill', 'SKILL.md'), '# Custom User Skill\n');

    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--link'], { encoding: 'utf8' });
    assert.notEqual(res.status, 0);
    assert.match(res.stderr, /already exists as a directory/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Reinstalling or repairing over broken symlinks succeeds', () => {
  const tmp = makeTmpDir();
  try {
    // Install linked
    const res1 = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--link'], { encoding: 'utf8' });
    assert.equal(res1.status, 0);

    // Corrupt link target
    fs.rmSync(path.join(tmp, '.buildkit', 'workflow-skills'), { recursive: true, force: true });

    // Run doctor to verify broken link detected
    const resDoc = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.notEqual(resDoc.status, 0);
    assert.match(resDoc.stdout, /BROKEN/);

    // Run repair to fix
    const resRep = spawnSync(process.execPath, [CLI, 'repair', tmp], { encoding: 'utf8' });
    assert.equal(resRep.status, 0);

    // Doctor should now pass
    const resDoc2 = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(resDoc2.status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
