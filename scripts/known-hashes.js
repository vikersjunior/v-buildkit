#!/usr/bin/env node
'use strict';

// Writes lib/known-hashes.json: for every managed package file (skills and skills-library), the hashes
// it had in earlier published releases that differ from today's copy. `update` treats an untracked file
// that matches one of these as an unmodified older BuildKit file instead of a local edit.
// Re-run before each release: `npm run known-hashes` (needs network; downloads the published tarballs).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { hashFile } = require('../lib/hash');

const ROOT = path.resolve(__dirname, '..');
const ROOTS = ['.claude/skills', 'skills-library'];
// The vendored lint checker's sources (copied into .buildkit/bin, .buildkit/lib and .buildkit/package.json).
const VENDORED = ['bin/lint.js', 'lib/lint.js', 'lib/config.js', 'lib/buildkit-package.json'];

function sh(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (res.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed: ${res.stderr || res.stdout}`);
  return res.stdout.trim();
}

function listFiles(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) return listFiles(path.join(dir, e.name), rel);
    return e.isFile() ? [rel] : [];
  });
}

const name = require('../package.json').name;
const current = require('../package.json').version;
const versions = JSON.parse(sh('npm', ['view', name, 'versions', '--json'], ROOT)).filter(v => v !== current);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-known-'));
const known = {};
try {
  for (const version of versions) {
    const dir = path.join(tmp, version);
    fs.mkdirSync(dir);
    const tgz = sh('npm', ['pack', `${name}@${version}`, '--silent'], dir).split(/\r?\n/).pop();
    sh('tar', ['-xzf', tgz], dir);
    const keys = [...ROOTS.flatMap(root => listFiles(path.join(dir, 'package', ...root.split('/'))).map(rel => `${root}/${rel}`)),
      ...VENDORED.filter(rel => fs.existsSync(path.join(dir, 'package', ...rel.split('/'))))];
    for (const key of keys) {
      const now = path.join(ROOT, ...key.split('/'));
      if (!fs.existsSync(now)) continue; // no longer shipped, so never managed again
      const old = hashFile(path.join(dir, 'package', ...key.split('/')));
      if (old === hashFile(now)) continue;
      (known[key] = known[key] || []).includes(old) || known[key].push(old);
    }
    console.log(`${version}: scanned`);
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
const sorted = Object.fromEntries(Object.keys(known).sort().map(k => [k, known[k].sort()]));
fs.writeFileSync(path.join(ROOT, 'lib', 'known-hashes.json'), JSON.stringify({ versions, files: sorted }, null, 2) + '\n');
console.log(`lib/known-hashes.json: ${Object.keys(sorted).length} file(s) from ${versions.join(', ')}`);
