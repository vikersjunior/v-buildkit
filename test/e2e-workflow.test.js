'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { resolveProjectDocument, resolveDocsRoot } = require('../lib/config');

const CLI_PATH = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-e2e-test-'));
}

test('End-to-End Workflow Verification: Full BuildKit Lifecycle with Custom Docs Root', () => {
  const tmp = createTmpDir();
  try {
    // 1. INSTALL
    const installRes = spawnSync(process.execPath, [
      CLI_PATH, 'install', tmp,
      '--docs-dir', 'docs/buildkit',
      '--agent', 'claude,codex',
      '--no-detect',
      '--with-blank-templates'
    ], { encoding: 'utf8' });
    assert.equal(installRes.status, 0, `Install failed: ${installRes.stderr}`);

    const docsRoot = resolveDocsRoot(tmp);
    assert.equal(docsRoot, path.join(tmp, 'docs', 'buildkit'));

    // 2. CONFIG VERIFICATION
    const configPath = path.join(tmp, '.buildkit', 'config.json');
    assert.ok(fs.existsSync(configPath));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(config.docs.root, 'docs/buildkit');

    // 3. SPEC INIT Simulation
    // Verify blank spec templates exist inside docs/buildkit/ and NOT at root
    const prdPath = resolveProjectDocument(tmp, 'prd');
    const archPath = resolveProjectDocument(tmp, 'architecture');
    const techPath = resolveProjectDocument(tmp, 'tech_stack');
    const planPath = resolveProjectDocument(tmp, 'implementation_plan');
    const rulesPath = resolveProjectDocument(tmp, 'rules');
    const progressPath = resolveProjectDocument(tmp, 'progress');

    assert.equal(prdPath, path.join(tmp, 'docs', 'buildkit', 'PRD.md'));
    assert.equal(archPath, path.join(tmp, 'docs', 'buildkit', 'architecture.md'));

    assert.ok(fs.existsSync(prdPath), 'PRD.md should exist in docs/buildkit/');
    assert.ok(fs.existsSync(archPath), 'architecture.md should exist in docs/buildkit/');
    assert.ok(fs.existsSync(techPath), 'Tech_stack.md should exist in docs/buildkit/');
    assert.ok(fs.existsSync(planPath), 'Implementation_plan.md should exist in docs/buildkit/');
    assert.ok(fs.existsSync(rulesPath), 'rules.md should exist in docs/buildkit/');
    assert.ok(fs.existsSync(progressPath), 'Progress.md should exist in docs/buildkit/');

    assert.ok(!fs.existsSync(path.join(tmp, 'PRD.md')), 'PRD.md must NOT exist at project root');

    // 4. AGENT.MD Resolution Verification
    const agentMdPath = path.join(tmp, '.buildkit', 'agent.md');
    assert.ok(fs.existsSync(agentMdPath));
    const agentMd = fs.readFileSync(agentMdPath, 'utf8');
    assert.ok(agentMd.includes('BUILDKIT PROJECT DOCUMENTATION ROOT'));
    assert.ok(agentMd.includes('docs.root'));
    assert.ok(agentMd.includes('docs/buildkit'));

    // 5. WORKFLOW SKILLS Resolution Verification
    // Check that workflow skill files instruct agents on resolving docs.root
    const skillPath = path.join(tmp, '.buildkit', 'workflow-skills', 'spec-driven-dev', 'SKILL.md');
    assert.ok(fs.existsSync(skillPath));
    const skillContent = fs.readFileSync(skillPath, 'utf8');
    assert.ok(skillContent.includes('Documentation Root Resolution'));

    // 6. FEATURE & IMPLEMENTATION Simulation
    // Simulate updating Progress.md and Implementation_plan.md in docs/buildkit/
    fs.writeFileSync(prdPath, '# Product Requirements Document\nFeature A');
    fs.writeFileSync(planPath, '# Implementation Plan\nPhase 1: Feature A');
    fs.writeFileSync(progressPath, '# Progress\nCurrent Phase: Phase 1');

    // Verify files were read and updated in docs/buildkit/
    assert.equal(fs.readFileSync(prdPath, 'utf8'), '# Product Requirements Document\nFeature A');
    assert.equal(fs.readFileSync(progressPath, 'utf8'), '# Progress\nCurrent Phase: Phase 1');

    // 7. STATUS / DOCTOR / REPAIR Verification
    const statusRes = spawnSync(process.execPath, [CLI_PATH, 'status', tmp], { encoding: 'utf8' });
    assert.equal(statusRes.status, 0);
    assert.ok(statusRes.stdout.includes('Documentation Root:  docs/buildkit/'));
    assert.ok(statusRes.stdout.includes('PRD.md'));
    assert.ok(statusRes.stdout.includes('Present'));

    const docRes = spawnSync(process.execPath, [CLI_PATH, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(docRes.status, 0);
    assert.ok(docRes.stdout.includes('Documentation root directory exists (docs/buildkit/)'));

    const repairRes = spawnSync(process.execPath, [CLI_PATH, 'repair', tmp], { encoding: 'utf8' });
    assert.equal(repairRes.status, 0);

  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
