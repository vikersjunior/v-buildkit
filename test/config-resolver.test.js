'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {
  normalizeDocsRoot,
  readBuildkitConfig,
  writeBuildkitConfig,
  resolveDocsRoot,
  resolveDocsRelative,
  resolveProjectDocument,
  ConfigStatus,
  DOC_MANIFEST,
  SPEC_FILES
} = require('../lib/config');

function createTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-config-test-'));
}

test('normalizeDocsRoot normalizes valid paths correctly', () => {
  const root = path.resolve('/mock/project');
  assert.equal(normalizeDocsRoot('.', root), '.');
  assert.equal(normalizeDocsRoot('docs/buildkit', root), 'docs/buildkit');
  assert.equal(normalizeDocsRoot('docs/buildkit/', root), 'docs/buildkit');
  assert.equal(normalizeDocsRoot('./docs/buildkit', root), 'docs/buildkit');
  assert.equal(normalizeDocsRoot('docs\\buildkit', root), 'docs/buildkit');
  assert.equal(normalizeDocsRoot('docs/project specifications', root), 'docs/project specifications');
});

test('normalizeDocsRoot rejects path traversal and external paths', () => {
  const root = path.resolve('/mock/project');
  assert.throws(() => normalizeDocsRoot('../outside', root), /escapes target project boundary/);
  assert.throws(() => normalizeDocsRoot('../../etc/passwd', root), /escapes target project boundary/);
  if (process.platform !== 'win32') {
    assert.throws(() => normalizeDocsRoot('/var/log', root), /escapes target project boundary/);
  }
});

test('readBuildkitConfig returns MISSING when no config exists', () => {
  const tmp = createTmpDir();
  try {
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.MISSING);
    assert.equal(res.config.docs.root, '.');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readBuildkitConfig returns VALID for valid config.json', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), JSON.stringify({
      schemaVersion: 1,
      docs: { root: 'docs/buildkit' }
    }));
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.VALID);
    assert.equal(res.config.docs.root, 'docs/buildkit');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readBuildkitConfig returns MALFORMED_JSON for invalid JSON', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), '{ malformed json: true ');
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.MALFORMED_JSON);
    assert.ok(res.error.includes('JSON parsing failed'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readBuildkitConfig returns UNSUPPORTED_SCHEMA for unknown schemaVersion', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), JSON.stringify({
      schemaVersion: 99,
      docs: { root: '.' }
    }));
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.UNSUPPORTED_SCHEMA);
    assert.ok(res.error.includes('Unsupported schemaVersion'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('readBuildkitConfig returns INVALID_ROOT if root escapes project', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), JSON.stringify({
      schemaVersion: 1,
      docs: { root: '../outside' }
    }));
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.INVALID_ROOT);
    assert.ok(res.error.includes('escapes target project boundary'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('writeBuildkitConfig creates and preserves config properties', () => {
  const tmp = createTmpDir();
  try {
    writeBuildkitConfig(tmp, { docs: { root: 'docs/specs' }, customProp: 'hello' });
    const res = readBuildkitConfig(tmp);
    assert.equal(res.status, ConfigStatus.VALID);
    assert.equal(res.config.docs.root, 'docs/specs');
    assert.equal(res.config.customProp, 'hello');

    // Update root only
    writeBuildkitConfig(tmp, { docs: { root: 'docs/new' } });
    const res2 = readBuildkitConfig(tmp);
    assert.equal(res2.config.docs.root, 'docs/new');
    assert.equal(res2.config.customProp, 'hello');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('resolveDocsRoot and resolveDocsRelative throw on malformed config', () => {
  const tmp = createTmpDir();
  try {
    fs.mkdirSync(path.join(tmp, '.buildkit'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), 'corrupted');
    assert.throws(() => resolveDocsRoot(tmp), /Invalid BuildKit configuration/);
    assert.throws(() => resolveDocsRelative(tmp), /Invalid BuildKit configuration/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('resolveProjectDocument maps keys and filenames correctly', () => {
  const tmp = createTmpDir();
  try {
    writeBuildkitConfig(tmp, { docs: { root: 'docs/buildkit' } });
    const prdPath = resolveProjectDocument(tmp, 'prd');
    assert.equal(prdPath, path.join(tmp, 'docs', 'buildkit', 'PRD.md'));

    const archPath = resolveProjectDocument(tmp, 'architecture.md');
    assert.equal(archPath, path.join(tmp, 'docs', 'buildkit', 'architecture.md'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
