'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

// npm and node_modules/.bin entries are .cmd shims on Windows, which Node only runs through a shell.
const IS_WIN = process.platform === 'win32';
function run(cmd, args, opts) {
  if (!IS_WIN) return spawnSync(cmd, args, opts);
  const quote = s => (/\s/.test(s) ? `"${s}"` : s);
  return spawnSync([cmd, ...args].map(quote).join(' '), { ...opts, shell: true });
}

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-npm-'));
}

test('npm pack --dry-run output includes required binaries and workflow files', () => {
  const res = run('npm', ['pack', '--dry-run'], { cwd: REPO_ROOT, encoding: 'utf8' });
  assert.equal(res.status, 0);

  const output = res.stdout + res.stderr;
  assert.match(output, /bin\/vikers-buildkit\.js/);
  assert.match(output, /bin\/v-buildkit\.js/);
  assert.match(output, /bin\/viker-buildkit\.js/);
  assert.match(output, /skills-library/);
  assert.match(output, /templates/);
  assert.match(output, /\sLICENSE\s*$/m); // root LICENSE, not a nested one
  assert.match(output, /THIRD_PARTY_NOTICES\.md/);
  assert.match(output, /oklch-skill\/LICENSE/);
});

test('npm pack creates valid tarball that can be installed and executed', () => {
  const tmp = makeTmpDir();
  try {
    // Run npm pack
    const packRes = run('npm', ['pack'], { cwd: REPO_ROOT, encoding: 'utf8' });
    assert.equal(packRes.status, 0);

    const tgzName = packRes.stdout.trim().split('\n').pop();
    const tgzPath = path.join(REPO_ROOT, tgzName);
    assert.ok(fs.existsSync(tgzPath), `Tarball ${tgzName} should exist`);

    try {
      // Create clean target project
      const targetProj = path.join(tmp, 'my-test-app');
      fs.mkdirSync(targetProj, { recursive: true });
      fs.writeFileSync(path.join(targetProj, 'package.json'), JSON.stringify({ name: 'my-test-app', version: '1.0.0' }));

      // Install tarball locally inside target project
      const installRes = run('npm', ['install', '--no-save', tgzPath], { cwd: targetProj, encoding: 'utf8' });
      assert.equal(installRes.status, 0);

      // Run installed vikers-buildkit binary
      const binPath = path.join(targetProj, 'node_modules', '.bin', 'vikers-buildkit');
      const aliasPath = path.join(targetProj, 'node_modules', '.bin', 'v-buildkit');

      assert.ok(fs.existsSync(binPath), 'Installed vikers-buildkit binary should exist in node_modules/.bin');
      assert.ok(fs.existsSync(aliasPath), 'Installed v-buildkit binary alias should exist in node_modules/.bin');

      const runRes = run(IS_WIN ? binPath + '.cmd' : binPath, ['install', targetProj, '--agent', 'claude,codex', '--no-detect'], { cwd: targetProj, encoding: 'utf8' });
      assert.equal(runRes.status, 0);

      assert.ok(fs.existsSync(path.join(targetProj, '.buildkit', 'agent.md')));
      assert.ok(fs.existsSync(path.join(targetProj, '.claude', 'skills', 'spec-driven-dev')));
      assert.ok(fs.existsSync(path.join(targetProj, '.agents', 'skills', 'spec-driven-dev')));
    } finally {
      if (fs.existsSync(tgzPath)) {
        fs.unlinkSync(tgzPath);
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
