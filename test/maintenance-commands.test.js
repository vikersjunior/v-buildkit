'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-maint-'));
}

test('Status command reports status for uninstalled and installed projects', () => {
  const tmp = makeTmpDir();
  try {
    const res1 = spawnSync(process.execPath, [CLI, 'status', tmp], { encoding: 'utf8' });
    assert.equal(res1.status, 0);
    assert.match(res1.stdout, /NOT INSTALLED/);

    const resInstall = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude,cursor'], { encoding: 'utf8' });
    assert.equal(resInstall.status, 0);

    const res2 = spawnSync(process.execPath, [CLI, 'status', tmp], { encoding: 'utf8' });
    assert.equal(res2.status, 0);
    assert.match(res2.stdout, /BuildKit Version:/);
    assert.match(res2.stdout, /claude, cursor/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Doctor command returns 0 on healthy project and 1 on broken project', () => {
  const tmp = makeTmpDir();
  try {
    const resInstall = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(resInstall.status, 0);

    const resDoc1 = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(resDoc1.status, 0);
    assert.match(resDoc1.stdout, /HEALTHY/);

    // Corrupt project by removing a workflow skill from agent folder
    fs.rmSync(path.join(tmp, '.claude', 'skills', 'feature'), { recursive: true, force: true });

    const resDoc2 = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.notEqual(resDoc2.status, 0);
    assert.match(resDoc2.stdout, /Missing skills/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Repair command fixes missing skills and corrupted metadata', () => {
  const tmp = makeTmpDir();
  try {
    const resInstall = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(resInstall.status, 0);

    // Delete a workflow skill
    fs.rmSync(path.join(tmp, '.claude', 'skills', 'implement'), { recursive: true, force: true });
    fs.rmSync(path.join(tmp, '.buildkit', 'agent.md'), { force: true });

    const resRepair = spawnSync(process.execPath, [CLI, 'repair', tmp], { encoding: 'utf8' });
    assert.equal(resRepair.status, 0);

    assert.ok(fs.existsSync(path.join(tmp, '.claude', 'skills', 'implement', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'agent.md')));

    const resDoc = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(resDoc.status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Update command is idempotent', () => {
  const tmp = makeTmpDir();
  try {
    const resInstall = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(resInstall.status, 0);

    const resUp1 = spawnSync(process.execPath, [CLI, 'update', tmp], { encoding: 'utf8' });
    assert.equal(resUp1.status, 0);

    const resUp2 = spawnSync(process.execPath, [CLI, 'update', tmp], { encoding: 'utf8' });
    assert.equal(resUp2.status, 0);

    const resDoc = spawnSync(process.execPath, [CLI, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(resDoc.status, 0);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Tokens command reports per-command load that grows with spec files', () => {
  const tmp = makeTmpDir();
  try {
    const res1 = spawnSync(process.execPath, [CLI, 'tokens', tmp], { encoding: 'utf8' });
    assert.equal(res1.status, 0);
    assert.match(res1.stdout, /NOT INSTALLED/);

    const resInstall = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--docs-dir', 'docs/specs'], { encoding: 'utf8' });
    assert.equal(resInstall.status, 0);

    const res2 = spawnSync(process.execPath, [CLI, 'tokens', tmp], { encoding: 'utf8' });
    assert.equal(res2.status, 0);
    assert.match(res2.stdout, /Progress\.md\s+\(missing\)/);
    assert.match(res2.stdout, /\/implement\s+[\d,]+/);

    // 4,000 chars => 1,000 tokens, read from the configured docs root
    fs.writeFileSync(path.join(tmp, 'docs', 'specs', 'Progress.md'), 'x'.repeat(4000));
    const res3 = spawnSync(process.execPath, [CLI, 'tokens', tmp], { encoding: 'utf8' });
    assert.equal(res3.status, 0);
    assert.match(res3.stdout, /Progress\.md\s+1,000/);
    assert.match(res3.stdout, /\/implement .*Progress\.md 1,000/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
