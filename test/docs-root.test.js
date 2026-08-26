'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync, spawnSync } = require('node:child_process');

const CLI_PATH = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');
const INSTALL_SH = path.resolve(__dirname, '..', 'install.sh');

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-docs-root-test-'));
}

test('CLI --help includes --docs-dir option', () => {
  const result = spawnSync(process.execPath, [CLI_PATH, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(result.stdout.includes('--docs-dir <path>'));
});

test('CLI fails when --docs-dir is missing a value', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('Missing value for --docs-dir'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Default installation without --docs-dir creates config with docs.root = "."', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    const configPath = path.join(tmp, '.buildkit', 'config.json');
    assert.ok(fs.existsSync(configPath));
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    assert.equal(config.docs.root, '.');

    const agentMd = fs.readFileSync(path.join(tmp, '.buildkit', 'agent.md'), 'utf8');
    assert.ok(agentMd.includes('BUILDKIT PROJECT DOCUMENTATION ROOT'));
    assert.ok(agentMd.includes('docs.root'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Custom docs root --docs-dir docs/buildkit creates config and directory', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect', '--with-blank-templates'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/buildkit');

    const docsDir = path.join(tmp, 'docs', 'buildkit');
    assert.ok(fs.existsSync(docsDir));
    assert.ok(fs.existsSync(path.join(docsDir, 'PRD.md')));
    assert.ok(fs.existsSync(path.join(docsDir, 'architecture.md')));

    // Ensure templates were NOT created at project root
    assert.ok(!fs.existsSync(path.join(tmp, 'PRD.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Nested docs root --docs-dir docs/project/specs works', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/project/specs', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/project/specs');
    assert.ok(fs.existsSync(path.join(tmp, 'docs', 'project', 'specs')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Docs root with spaces --docs-dir "docs/project specifications" works', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/project specifications', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/project specifications');
    assert.ok(fs.existsSync(path.join(tmp, 'docs', 'project specifications')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Path traversal attempt with --docs-dir ../outside fails safely', () => {
  const tmp = createTmpDir();
  try {
    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', '../outside', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes('escapes target project boundary'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Existing directory and existing files are preserved without destruction', () => {
  const tmp = createTmpDir();
  try {
    const docsDir = path.join(tmp, 'docs', 'buildkit');
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'PRD.md'), '# My Existing PRD\nDo not overwrite');
    fs.writeFileSync(path.join(docsDir, 'custom-notes.md'), '# Custom Notes');

    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect', '--with-blank-templates'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    // Verify existing PRD was NOT overwritten
    assert.equal(fs.readFileSync(path.join(docsDir, 'PRD.md'), 'utf8'), '# My Existing PRD\nDo not overwrite');
    // Verify custom file remains
    assert.equal(fs.readFileSync(path.join(docsDir, 'custom-notes.md'), 'utf8'), '# Custom Notes');
    // Verify other blank templates were installed in docsDir
    assert.ok(fs.existsSync(path.join(docsDir, 'architecture.md')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Existing root documents are NOT silently moved or destroyed when custom docs root is selected', () => {
  const tmp = createTmpDir();
  try {
    fs.writeFileSync(path.join(tmp, 'PRD.md'), '# Original Root PRD');

    const result = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    // Original root document must remain intact
    assert.equal(fs.readFileSync(path.join(tmp, 'PRD.md'), 'utf8'), '# Original Root PRD');
    assert.ok(result.stdout.includes('Existing BuildKit documentation detected at project root'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Reinstalling BuildKit is idempotent and preserves configuration', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    const configPath = path.join(tmp, '.buildkit', 'config.json');
    assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).docs.root, 'docs/buildkit');

    // Reinstall without specifying --docs-dir (should keep existing config)
    const result2 = spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result2.status, 0);
    assert.equal(JSON.parse(fs.readFileSync(configPath, 'utf8')).docs.root, 'docs/buildkit');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Status command reports configured docs root correctly', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    const statusRes = spawnSync(process.execPath, [CLI_PATH, 'status', tmp], { encoding: 'utf8' });
    assert.equal(statusRes.status, 0);
    assert.ok(statusRes.stdout.includes('Documentation Root:  docs/buildkit/'));
    assert.ok(statusRes.stdout.includes('Spec Files Status (docs/buildkit/):'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Status command fails safely when config.json is malformed', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), 'invalid json');

    const statusRes = spawnSync(process.execPath, [CLI_PATH, 'status', tmp], { encoding: 'utf8' });
    assert.equal(statusRes.status, 1);
    assert.ok(statusRes.stdout.includes('Invalid BuildKit configuration'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Doctor command validates docs root and detects malformed config', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    const docRes1 = spawnSync(process.execPath, [CLI_PATH, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(docRes1.status, 0);
    assert.ok(docRes1.stdout.includes('docs.root = "docs/buildkit"'));

    // Corrupt config
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), '{ bad: ');
    const docRes2 = spawnSync(process.execPath, [CLI_PATH, 'doctor', tmp], { encoding: 'utf8' });
    assert.equal(docRes2.status, 1);
    assert.ok(docRes2.stdout.includes('config.json is invalid'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Repair command restores config and respects docs root', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });

    // Corrupt workflow skills
    fs.rmSync(path.join(tmp, '.buildkit', 'workflow-skills'), { recursive: true, force: true });

    const repairRes = spawnSync(process.execPath, [CLI_PATH, 'repair', tmp], { encoding: 'utf8' });
    assert.equal(repairRes.status, 0);

    assert.ok(fs.existsSync(path.join(tmp, '.buildkit', 'workflow-skills')));
    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/buildkit');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('Update command respects docs root and accepts --docs-dir change', () => {
  const tmp = createTmpDir();
  try {
    spawnSync(process.execPath, [CLI_PATH, 'install', tmp, '--docs-dir', 'docs/old', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });

    // Update with new docs root
    const updateRes = spawnSync(process.execPath, [CLI_PATH, 'update', tmp, '--docs-dir', 'docs/new'], { encoding: 'utf8' });
    assert.equal(updateRes.status, 0);

    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/new');
    assert.ok(fs.existsSync(path.join(tmp, 'docs', 'new')));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('install.sh thin compatibility wrapper delegates to Node CLI', () => {
  if (process.platform === 'win32') return; // install.sh is bash-only
  const tmp = createTmpDir();
  try {
    const result = spawnSync('bash', [INSTALL_SH, tmp, '--docs-dir', 'docs/buildkit', '--agent', 'claude', '--no-detect'], { encoding: 'utf8' });
    assert.equal(result.status, 0);

    const config = JSON.parse(fs.readFileSync(path.join(tmp, '.buildkit', 'config.json'), 'utf8'));
    assert.equal(config.docs.root, 'docs/buildkit');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
