'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-collision-'));
}

test('User custom skills in native skills folder are preserved during installation and update', () => {
  const tmp = makeTmpDir();
  try {
    const customSkillDir = path.join(tmp, '.claude', 'skills', 'user-custom-skill');
    fs.mkdirSync(customSkillDir, { recursive: true });
    fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '# User Custom Skill\nCustom content here.');

    // Install BuildKit
    const res1 = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(res1.status, 0);

    // Verify user custom skill is intact
    assert.ok(fs.existsSync(path.join(customSkillDir, 'SKILL.md')));
    assert.equal(fs.readFileSync(path.join(customSkillDir, 'SKILL.md'), 'utf8'), '# User Custom Skill\nCustom content here.');

    // Run update
    const res2 = spawnSync(process.execPath, [CLI, 'update', tmp], { encoding: 'utf8' });
    assert.equal(res2.status, 0);

    // Verify user custom skill is STILL intact
    assert.ok(fs.existsSync(path.join(customSkillDir, 'SKILL.md')));
    assert.equal(fs.readFileSync(path.join(customSkillDir, 'SKILL.md'), 'utf8'), '# User Custom Skill\nCustom content here.');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('User spec files and .buildkit execution state are preserved during update', () => {
  const tmp = makeTmpDir();
  try {
    // Create existing user spec files
    fs.writeFileSync(path.join(tmp, 'PRD.md'), '# My Custom PRD\nDo not overwrite.');
    fs.writeFileSync(path.join(tmp, 'architecture.md'), '# My Custom Architecture\nDo not overwrite.');

    // Create existing .buildkit state
    const historyDir = path.join(tmp, '.buildkit', 'history');
    fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(path.join(historyDir, 'feature-1.md'), '# Feature 1 History\n');

    // Run install
    const res1 = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--with-blank-templates'], { encoding: 'utf8' });
    assert.equal(res1.status, 0);

    // Verify user PRD.md was NOT overwritten
    assert.equal(fs.readFileSync(path.join(tmp, 'PRD.md'), 'utf8'), '# My Custom PRD\nDo not overwrite.');

    // Run update
    const res2 = spawnSync(process.execPath, [CLI, 'update', tmp], { encoding: 'utf8' });
    assert.equal(res2.status, 0);

    // Verify PRD.md and history file remain intact
    assert.equal(fs.readFileSync(path.join(tmp, 'PRD.md'), 'utf8'), '# My Custom PRD\nDo not overwrite.');
    assert.ok(fs.existsSync(path.join(historyDir, 'feature-1.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
