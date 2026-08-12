'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');

test('CLI --help outputs usage information', () => {
  const res = spawnSync(process.execPath, [CLI, '--help'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.match(res.stdout, /Viker's BuildKit/);
  assert.match(res.stdout, /Usage:/);
  assert.match(res.stdout, /Supported agents:/);
});

test('CLI --version outputs version', () => {
  const pkg = require('../package.json');
  const res = spawnSync(process.execPath, [CLI, '--version'], { encoding: 'utf8' });
  assert.equal(res.status, 0);
  assert.equal(res.stdout.trim(), pkg.version);
});

test('CLI handles short alias executables', () => {
  const vBuildkit = path.resolve(__dirname, '..', 'bin', 'v-buildkit.js');
  const vikerBuildkit = path.resolve(__dirname, '..', 'bin', 'viker-buildkit.js');
  
  const res1 = spawnSync(process.execPath, [vBuildkit, '--version'], { encoding: 'utf8' });
  assert.equal(res1.status, 0);
  assert.equal(res1.stdout.trim(), require('../package.json').version);

  const res2 = spawnSync(process.execPath, [vikerBuildkit, '--version'], { encoding: 'utf8' });
  assert.equal(res2.status, 0);
  assert.equal(res2.stdout.trim(), require('../package.json').version);
});

test('CLI fails with invalid option', () => {
  const res = spawnSync(process.execPath, [CLI, '--invalid-option'], { encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Unknown option: --invalid-option/);
});

test('CLI fails when missing value for --agent', () => {
  const res = spawnSync(process.execPath, [CLI, '--agent'], { encoding: 'utf8' });
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Missing value for --agent/);
});
