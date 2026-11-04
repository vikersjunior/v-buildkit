'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SKILLS = path.join(ROOT, '.claude', 'skills');
const CLI = path.join(ROOT, 'bin', 'vikers-buildkit.js');
const GATES = ['feature', 'check', 'audit', 'complete', 'fix', 'investigate'];
// Built-in or bundled command names in agents BuildKit installs into (Claude Code bundles /debug, for one).
// A skill folder with one of these names would shadow or be shadowed by the agent's own command.
const RESERVED_NAMES = ['debug', 'review', 'code-review', 'verify', 'run', 'simplify', 'doctor', 'status', 'batch', 'loop', 'init', 'help', 'compact', 'config'];
const GATE_LINE = 'Run only when the user explicitly asks for this command';

function readSkill(dir) {
  // CRLF-normalised: Windows checkouts with core.autocrlf=true have CRLF line endings.
  const text = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
  const lines = text.split('\n');
  const end = lines.indexOf('---', 1);
  assert.ok(lines[0] === '---' && end > 0, `${dir}: missing frontmatter`);
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const i = line.indexOf(':');
    fields[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  return { fields, body: lines.slice(end + 1).join('\n') };
}

const skills = fs.readdirSync(SKILLS).filter(name => fs.existsSync(path.join(SKILLS, name, 'SKILL.md')));

test('every workflow skill has valid, short frontmatter', () => {
  for (const name of skills) {
    const { fields, body } = readSkill(path.join(SKILLS, name));
    assert.equal(fields.name, name, `${name}: name must match its folder`);
    const desc = fields.description || '';
    assert.ok(desc.length > 0 && desc.length <= 400, `${name}: description is ${desc.length} chars (limit 400)`);
    // Unquoted YAML plain scalar rules, so a quoting slip fails here instead of in the agent's loader.
    assert.ok(!/^['"&*!|>%@`[{#?,:-]/.test(desc), `${name}: description starts with a YAML indicator`);
    assert.ok(!desc.includes(': ') && !desc.includes(' #') && !desc.endsWith(':'), `${name}: description needs quoting (contains ": " or " #")`);
    assert.ok(body.includes('Context reuse:'), `${name}: missing the Context reuse line`);
  }
});

test('no skill uses a name agents reserve for their own commands', () => {
  for (const name of skills) assert.ok(!RESERVED_NAMES.includes(name), `${name}: reserved by an agent's built-in command; pick another name`);
});

test('only the lifecycle gates are explicit-only', () => {
  for (const name of skills) {
    const { fields, body } = readSkill(path.join(SKILLS, name));
    if (GATES.includes(name)) {
      assert.equal(fields['disable-model-invocation'], 'true', `${name}: gate must set disable-model-invocation`);
      assert.ok(body.includes(`${GATE_LINE} (for example by typing /${name})`), `${name}: gate line missing or names the wrong command`);
    } else {
      assert.ok(!('disable-model-invocation' in fields), `${name}: must stay model-invocable`);
    }
  }
});

test('gate text reaches non-Claude agent folders on install', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'buildkit-test-gates-'));
  try {
    const res = spawnSync(process.execPath, [CLI, 'install', tmp, '--agent', 'codex', '--no-detect'], { encoding: 'utf8' });
    assert.equal(res.status, 0, res.stderr);
    for (const name of GATES) {
      const { body } = readSkill(path.join(tmp, '.agents', 'skills', name));
      assert.ok(body.includes(GATE_LINE), `${name}: gate line missing from installed codex copy`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
