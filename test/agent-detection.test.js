'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-agent-'));
}

test('Agent detection detects Claude project', () => {
  const tmp = makeTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.claude', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '# Claude Config\n');

    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--no-detect', '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'agent.md')));
    const content = fs.readFileSync(path.join(tmp, '.buildkit', 'agent.md'), 'utf8');
    assert.match(content, /Selected agents: claude/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Agent detection detects Codex / Antigravity project', () => {
  const tmp = makeTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.agents', 'skills'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'AGENTS.md'), '# Agents Config\n');

    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'antigravity'], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    const content = fs.readFileSync(path.join(tmp, '.buildkit', 'agent.md'), 'utf8');
    assert.match(content, /Selected agents: codex/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Multi-agent installation handles comma-separated list', () => {
  const tmp = makeTmpDir();
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude,codex,cursor'], { encoding: 'utf8' });
    assert.equal(res.status, 0);
    const content = fs.readFileSync(path.join(tmp, '.buildkit', 'agent.md'), 'utf8');
    assert.match(content, /Selected agents: claude codex cursor/);
    assert.ok(fs.existsSync(path.join(tmp, '.claude', 'skills', 'spec-driven-dev')));
    assert.ok(fs.existsSync(path.join(tmp, '.agents', 'skills', 'spec-driven-dev')));
    assert.ok(fs.existsSync(path.join(tmp, '.cursor', 'skills', 'spec-driven-dev')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
