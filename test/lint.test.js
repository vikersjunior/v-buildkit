'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const CLI = path.resolve(__dirname, '..', 'bin', 'vikers-buildkit.js');
const LINT_SOURCE = path.resolve(__dirname, '..', 'lib', 'lint.js');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-lint-'));
}

function run(...args) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
}

function install(dir, ...extra) {
  const res = run('install', dir, '--agent', 'claude', '--no-detect', ...extra);
  assert.equal(res.status, 0, res.stderr);
}

// Six filled-in spec files whose Current Phase matches the plan.
function writeSpecs(docsDir, overrides = {}) {
  const specs = {
    'PRD.md': '# Shop — PRD\n\nSell things.\n',
    'architecture.md': '# Shop — Architecture\n\nOne web app.\n',
    'Tech_stack.md': '# Shop — Tech Stack\n\n- Node 22\n',
    'Implementation_plan.md': '# Shop — Plan\n\n## Phase 0 — Project Setup\n- repo\n\n## Phase 1 — Auth\n- login\n',
    'rules.md': '# Shop — Rules\n\n1. Test everything.\n',
    'Progress.md': '# Shop — Progress\n\n## Current Phase\nPhase 1 — Auth\n\n## Completed\n- [x] repo\n',
    ...overrides
  };
  fs.mkdirSync(docsDir, { recursive: true });
  for (const [name, text] of Object.entries(specs)) {
    if (text !== null) fs.writeFileSync(path.join(docsDir, name), text);
  }
}

// Every directory (including empty ones) and the SHA-256 of every file's contents.
function snapshot(root) {
  const out = {};
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.relative(root, abs);
      if (entry.isDirectory()) { out[rel + '/'] = 'dir'; walk(abs); }
      else out[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    }
  })(root);
  return out;
}

test('lib/lint.js imports only read-only fs functions and references no fs write API', () => {
  const src = fs.readFileSync(LINT_SOURCE, 'utf8');
  // Code only: comments and string literals may mention these words harmlessly.
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, "''");
  const writeApi = /\b(writeFile|appendFile|mkdir|mkdtemp|rmdir|rm|unlink|rename|copyFile|cp|symlink|link|truncate|chmod|chown|lchown|utimes|lutimes|futimes|open|opendir|createWriteStream|write|writev|fsync|fdatasync)(Sync)?\b/;
  assert.doesNotMatch(code, writeApi);
  assert.doesNotMatch(code, /\bfs\./, 'fs must be destructured, not used as a namespace');
  assert.doesNotMatch(src, /fs\/promises|child_process/);

  const requires = [...src.matchAll(/require\(\s*'([^']+)'\s*\)/g)].map(m => m[1]).sort();
  assert.deepEqual(requires, ['./config', 'node:fs', 'node:path']);
  const fsImport = src.match(/const \{([^}]+)\} = require\('node:fs'\)/);
  assert.ok(fsImport, 'fs must be imported by destructuring');
  const allowed = ['existsSync', 'statSync', 'readFileSync', 'realpathSync', 'readdirSync', 'lstatSync'];
  for (const name of fsImport[1].split(',').map(s => s.trim())) assert.ok(allowed.includes(name), `${name} is not a read-only fs API`);
});

test('lint reports NOT INSTALLED and refuses a missing target without creating it', () => {
  const tmp = makeTmpDir();
  try {
    const res = run('lint', tmp);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /NOT INSTALLED/);

    const missing = path.join(tmp, 'typo');
    const res2 = run('lint', missing);
    assert.equal(res2.status, 1);
    assert.match(res2.stderr, /Project directory not found/);
    assert.equal(fs.existsSync(missing), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint fails on blank templates, including placeholders at the end of a line', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp, '--with-blank-templates');
    const res = run('lint', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /\[FAIL\] PRD\.md:1: unfilled placeholder \[Project Name\]/);
    assert.match(res.stdout, /\[FAIL\] Tech_stack\.md:4: unfilled placeholder \[Framework\]/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint passes filled specs and is read-only on passing and failing runs', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp);
    fs.mkdirSync(path.join(tmp, 'empty-dir'));
    const before = snapshot(tmp);

    const ok = run('lint', tmp);
    assert.equal(ok.status, 0, ok.stdout);
    assert.match(ok.stdout, /\[PASS\] Current Phase matches a plan phase/);
    assert.match(ok.stdout, /0 failure\(s\)/);
    assert.deepEqual(snapshot(tmp), before);

    fs.writeFileSync(path.join(tmp, 'PRD.md'), '# [Project Name] — PRD\n');
    const failingBefore = snapshot(tmp);
    const bad = run('lint', tmp);
    assert.equal(bad.status, 1);
    assert.deepEqual(snapshot(tmp), failingBefore);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint checks Current Phase against plan headings', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp, { 'Progress.md': '# Shop — Progress\n\n## Current Phase\nAuth\n' });
    assert.equal(run('lint', tmp).status, 0, 'phase name without the "Phase N —" prefix matches');

    writeSpecs(tmp, { 'Progress.md': '# Shop — Progress\n\n## Current Phase\nPhase 1  -  Auth\n' });
    assert.equal(run('lint', tmp).status, 0, 'hyphen and extra spaces still match "Phase 1 — Auth"');

    writeSpecs(tmp, { 'Progress.md': '# Shop — Progress\n\n## Current Phase\nPhase 2 — Billing\n' });
    const res = run('lint', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /\[FAIL\] Progress\.md:4: Current Phase "Phase 2 — Billing" is not a phase heading/);

    for (const line of ['- Phase 1 — Auth', '`Phase 1 — Auth`', '<!-- keep current -->\nPhase 1 — Auth']) {
      writeSpecs(tmp, { 'Progress.md': `# Shop — Progress\n\n## Current Phase\n${line}\n` });
      assert.equal(run('lint', tmp).status, 0, `Current Phase written as ${JSON.stringify(line)} matches`);
    }

    writeSpecs(tmp, {
      'Implementation_plan.md': '# Shop — Plan\n\n## Phase 1: Auth\n- login\n',
      'Progress.md': '# Shop — Progress\n\n## Current Phase\nAuth\n'
    });
    assert.equal(run('lint', tmp).status, 0, 'bare name matches a "Phase 1: Auth" heading');

    writeSpecs(tmp, { 'Progress.md': '# Shop — Progress\n\n## Completed\n- x\n' });
    assert.match(run('lint', tmp).stdout, /\[FAIL\] Progress\.md: no "## Current Phase" heading/);

    writeSpecs(tmp, { 'Progress.md': '# Shop — Progress\n\n## Current Phase\n[Exact phase name from Implementation_plan.md — not a paraphrase]\n' });
    const placeholder = run('lint', tmp);
    assert.match(placeholder.stdout, /Progress\.md:4: unfilled placeholder/);
    assert.doesNotMatch(placeholder.stdout, /is not a phase heading/, 'a placeholder Current Phase is reported once, by L2');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint warns on assumptions without changing the exit code', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp, { 'PRD.md': '# Shop — PRD\n\n**Assumption:** web-first\n' });
    const res = run('lint', tmp);
    assert.equal(res.status, 0);
    assert.match(res.stdout, /\[WARN\] PRD\.md:3: unconfirmed assumption/);

    writeSpecs(tmp, {
      'PRD.md': '# Shop — PRD\n\n**Assumption:** web-first\n',
      'Progress.md': '# Shop — Progress\n\n## Current Phase\nPhase 9 — Nope\n'
    });
    assert.equal(run('lint', tmp).status, 1, 'a WARN never masks a FAIL');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint placeholder check uses exact tokens and skips code fences, checkboxes and links', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp, {
      'PRD.md': [
        '# Shop — PRD',
        '- [x] done',
        '- [ ] todo',
        'See [Name](http://example.com) and [docs][1] and [docs][Name].',
        'Routes live in `app/[user]/page.tsx` and ``[date]`` too.',
        '[Name]: http://example.com',
        '[Something else entirely]',
        '```',
        '# [Project Name] — inside a fence',
        '```',
        '~~~md',
        '[TBD]',
        '~~~'
      ].join('\n'),
      'rules.md': [
        '# Shop — Rules',
        '',
        'Owner: [TBD]',
        'Date: [fill in later]',
        '- [Framework]: React',
        '9. [Language-specific strictness rule, e.g. "Use TypeScript strictly, avoid `any`"]',
        '````md',
        '```',
        '[TBD] inside a nested example',
        '```',
        '````'
      ].join('\n')
    });
    const res = run('lint', tmp);
    assert.equal(res.status, 1);
    assert.doesNotMatch(res.stdout, /PRD\.md:\d+: unfilled placeholder/);
    assert.match(res.stdout, /rules\.md:3: unfilled placeholder \[TBD\]/);
    assert.match(res.stdout, /rules\.md:4: unfilled placeholder \[fill in later\]/);
    assert.match(res.stdout, /rules\.md:5: unfilled placeholder \[Framework\]/, '":" after a token is a definition only at line start');
    assert.match(res.stdout, /rules\.md:6: unfilled placeholder \[Language-specific/, 'a token that contains `code` still counts');
    assert.doesNotMatch(res.stdout, /rules\.md:9:/, 'a ``` inside a ```` fence does not close it');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint placeholder list covers every token in the spec templates', () => {
  const { PLACEHOLDERS } = require('../lib/lint');
  const root = path.resolve(__dirname, '..');
  const sources = ['PRD', 'architecture', 'Tech_stack', 'Implementation_plan', 'rules', 'Progress']
    .map(name => fs.readFileSync(path.join(root, 'templates', `${name}.md`), 'utf8'));
  const refsDir = path.join(root, '.claude', 'skills', 'spec-driven-dev', 'references');
  for (const file of fs.readdirSync(refsDir).filter(f => f.endsWith('-template.md'))) {
    // \r? because Windows checkouts with core.autocrlf=true have CRLF line endings.
    const blocks = fs.readFileSync(path.join(refsDir, file), 'utf8').match(/^```markdown\r?\n[\s\S]*?^```\r?$/gm) || [];
    assert.ok(blocks.length > 0, `${file} has no \`\`\`markdown block, so the drift check would be vacuous`);
    sources.push(...blocks);
  }
  const tokens = new Set(sources.flatMap(text => text.match(/\[[^\][]{2,}\]/g) || []));
  for (const token of tokens) assert.ok(PLACEHOLDERS.includes(token), `template token ${token} is missing from PLACEHOLDERS`);
});

test('lint --strict fails when BuildKit or the specs are missing', () => {
  const tmp = makeTmpDir();
  try {
    assert.equal(run('lint', tmp, '--strict').status, 1, 'not installed');
    install(tmp);
    const res = run('lint', tmp, '--strict');
    assert.equal(res.status, 1);
    assert.match(res.stdout, /\[FAIL\] No spec files/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint distinguishes no specs from a partial spec set', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    const none = run('lint', tmp);
    assert.equal(none.status, 0);
    assert.match(none.stdout, /\[WARN\] No spec files/);

    writeSpecs(tmp, { 'rules.md': null, 'Tech_stack.md': null, 'PRD.md': null });
    const partial = run('lint', tmp);
    assert.equal(partial.status, 1);
    assert.match(partial.stdout, /\[FAIL\] Missing spec files in \.\/: PRD\.md, Tech_stack\.md, rules\.md/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint reads the configured docs root and fails on invalid config', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp, '--docs-dir', 'docs/specs');
    writeSpecs(path.join(tmp, 'docs', 'specs'), { 'Tech_stack.md': '# [Project Name]\n' });
    const res = run('lint', tmp);
    assert.equal(res.status, 1);
    assert.match(res.stdout, /docs[\\/]specs[\\/]Tech_stack\.md:1: unfilled placeholder \[Project Name\]/);

    fs.writeFileSync(path.join(tmp, '.buildkit', 'config.json'), '{ not json');
    const broken = run('lint', tmp);
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /BuildKit error/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint checks the Current Feature in state.md', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp);
    const statePath = path.join(tmp, '.buildkit', 'state.md');
    const setFeature = value => fs.writeFileSync(statePath, `# State\n\n## Current Feature\n${value}\n\n## Lifecycle Gate\nx\n`);

    setFeature('`login-flow`');
    assert.match(run('lint', tmp).stdout, /\[WARN\] \.buildkit[\\/]state\.md:4: Current Feature "login-flow" has no/);

    fs.mkdirSync(path.join(tmp, '.buildkit', 'history', 'login-flow'), { recursive: true });
    assert.match(run('lint', tmp).stdout, /\[PASS\] Current Feature "login-flow" has a feature folder/);

    setFeature('../../etc');
    assert.match(run('lint', tmp).stdout, /\[WARN\] .*unrecognised Current Feature value "\.\.\/\.\.\/etc"/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('lint warns on a spec path that is a directory instead of aborting', () => {
  const tmp = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp, { 'PRD.md': null });
    fs.mkdirSync(path.join(tmp, 'PRD.md'));
    const res = run('lint', tmp);
    assert.doesNotMatch(res.stderr, /EISDIR/);
    assert.match(res.stdout, /\[WARN\] PRD\.md is not a regular file; not read/);
    assert.match(res.stdout, /Lint Summary/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('containment accepts a filesystem or drive root as the project', () => {
  const { isInside } = require('../lib/lint');
  const root = path.parse(process.cwd()).root;
  assert.ok(isInside(path.join(root, 'PRD.md'), root));
  const proj = path.join(root, 'proj');
  assert.ok(isInside(path.join(proj, 'PRD.md'), proj));
  assert.ok(!isInside(path.join(root, 'project-other', 'PRD.md'), proj), 'a sibling with a shared prefix is outside');
});

test('lint skips oversized files and files that resolve outside the project', (t) => {
  const tmp = makeTmpDir();
  const outside = makeTmpDir();
  try {
    install(tmp);
    writeSpecs(tmp, { 'architecture.md': '# [Project Name]\n' + 'x'.repeat(1024 * 1024) });
    const big = run('lint', tmp);
    assert.match(big.stdout, /\[WARN\] architecture\.md is larger than 1 MB; not checked/);
    assert.doesNotMatch(big.stdout, /architecture\.md:1: unfilled/);

    writeSpecs(tmp);
    fs.writeFileSync(path.join(outside, 'secret.md'), '# [Project Name]\n');
    fs.rmSync(path.join(tmp, 'PRD.md'));
    try {
      fs.symlinkSync(path.join(outside, 'secret.md'), path.join(tmp, 'PRD.md'));
    } catch (err) {
      if (err.code !== 'EPERM') throw err;
      t.skip('file symlinks need Developer Mode or an elevated shell on Windows');
      return;
    }
    const res = run('lint', tmp);
    assert.match(res.stdout, /\[WARN\] PRD\.md resolves outside the project/);
    assert.doesNotMatch(res.stdout, /PRD\.md:1: unfilled/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});
