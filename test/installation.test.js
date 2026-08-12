'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-install-'));
}

const WORKFLOW_SKILLS = [
  'spec-driven-dev', 'ideate', 'spec-init', 'spec-review', 'feature',
  'implement', 'check', 'audit', 'complete', 'progress', 'tools-check', 'distill-skill'
];

test('Installation on clean empty project creates workflow skills and skills library', () => {
  const tmp = makeTmpDir();
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude'], { encoding: 'utf8' });
    assert.equal(res.status, 0);

    const workflowDir = path.join(tmp, '.buildkit', 'workflow-skills');
    assert.ok(fs.existsSync(workflowDir));

    for (const skill of WORKFLOW_SKILLS) {
      assert.ok(fs.existsSync(path.join(workflowDir, skill, 'SKILL.md')), `Missing workflow skill: ${skill}`);
      assert.ok(fs.existsSync(path.join(tmp, '.claude', 'skills', skill, 'SKILL.md')), `Missing installed skill: ${skill}`);
    }

    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'skills-library')));
    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'agent.md')));
    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'agent-capabilities.json')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Installation with --with-blank-templates copies starter template md files', () => {
  const tmp = makeTmpDir();
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude', '--with-blank-templates'], { encoding: 'utf8' });
    assert.equal(res.status, 0);

    const specFiles = ['PRD.md', 'architecture.md', 'Tech_stack.md', 'Implementation_plan.md', 'rules.md', 'Progress.md'];
    for (const file of specFiles) {
      assert.ok(fs.existsSync(path.join(tmp, file)), `Missing starter template: ${file}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Capabilities JSON contains valid schema and evidence', () => {
  const tmp = makeTmpDir();
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'claude,codex'], { encoding: 'utf8' });
    assert.equal(res.status, 0);

    const capsPath = path.join(tmp, '.buildkit', 'agent-capabilities.json');
    assert.ok(fs.existsSync(capsPath));

    const caps = JSON.parse(fs.readFileSync(capsPath, 'utf8'));
    assert.equal(caps.schemaVersion, 1);
    assert.ok(Array.isArray(caps.agents));
    assert.equal(caps.agents.length, 2);
    assert.equal(caps.agents[0].agent, 'claude');
    assert.equal(caps.agents[1].agent, 'codex');
    assert.equal(typeof caps.agents[0].nativeSkills, 'boolean');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
