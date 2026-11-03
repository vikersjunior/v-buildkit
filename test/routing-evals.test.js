'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const route = require('../scripts/route-eval.js');

const ROOT = path.resolve(__dirname, '..');
const FLOOR_REL = 'evals/routing/floor.json';
const floor = JSON.parse(fs.readFileSync(path.join(ROOT, FLOOR_REL), 'utf8'));
const evals = route.loadEvals(ROOT);
const skills = route.loadSkills(ROOT);
const routed = skills.filter(s => !s.explicitOnly).map(s => s.name);

test('every model-routed workflow skill has an eval file, and nothing else does', () => {
  const src = fs.readFileSync(path.join(ROOT, 'bin', 'vikers-buildkit.js'), 'utf8');
  const listed = src.match(/const WORKFLOW_SKILLS = \[([\s\S]*?)\]/)[1].match(/'([^']+)'/g).map(s => s.slice(1, -1));
  assert.deepEqual([...listed].sort(), skills.map(s => s.name), 'WORKFLOW_SKILLS matches the .claude/skills folders');
  assert.deepEqual(Object.keys(evals).sort(), routed, 'eval files match the skills without disable-model-invocation');
});

test('eval prompts follow the dataset rules', () => {
  // A prompt may not quote 3 consecutive content words from any routed description.
  const grams = new Set();
  for (const s of skills.filter(s => !s.explicitOnly)) {
    const t = route.tokens(s.description);
    for (let i = 0; i + 2 < t.length; i++) grams.add(t.slice(i, i + 3).join(' '));
  }
  const hyphenated = skills.map(s => s.name).filter(n => n.includes('-'));
  const seen = new Set();
  for (const [skill, sets] of Object.entries(evals)) {
    assert.ok(sets.train.length >= 4, `${skill}: at least 4 train prompts`);
    assert.ok(sets.holdout.length >= 2, `${skill}: at least 2 holdout prompts`);
    for (const prompt of [...sets.train, ...sets.holdout]) {
      const norm = prompt.toLowerCase().replace(/\s+/g, ' ').trim();
      assert.ok(!seen.has(norm), `duplicate prompt: ${prompt}`);
      seen.add(norm);
      assert.ok(!prompt.includes('/'), `no slash commands or paths: ${prompt}`);
      for (const name of hyphenated) assert.ok(!norm.includes(name), `names skill ${name}: ${prompt}`);
      const t = route.tokens(prompt);
      for (let i = 0; i + 2 < t.length; i++) {
        assert.ok(!grams.has(t.slice(i, i + 3).join(' ')), `copies description wording "${t.slice(i, i + 3).join(' ')}": ${prompt}`);
      }
    }
  }
});

test('routing scores stay at or above floor.json', () => {
  const result = route.evaluate(ROOT);
  const fails = route.checkFloor(result, floor, evals);
  assert.deepEqual(fails, [], 'run `npm run eval:routing` to see train misses');
  if (result.overall > floor.overall) {
    console.log(`Routing eval improved (${floor.overall} -> ${result.overall}); run \`npm run eval:routing -- --write-floor\` to raise floor.json.`);
  }
});

test('the gate catches one skill copying another skill\'s description', () => {
  const steal = skills.find(s => s.name === 'spec-init').description;
  const result = route.evaluate(ROOT, { descriptions: { ideate: steal } });
  assert.notDeepEqual(route.checkFloor(result, floor, evals), []);
});

test('the evaluation is deterministic', () => {
  assert.deepEqual(route.evaluate(ROOT), route.evaluate(ROOT));
});

test('weakening floor.json is reported loudly', () => {
  const weaker = { ...floor, overall: floor.overall - 1, holdoutSha256: 'changed' };
  assert.deepEqual(route.floorChanges(floor, weaker), [`overall floor lowered ${floor.overall} -> ${floor.overall - 1}`, 'holdout pin (holdoutSha256) changed']);
  assert.deepEqual(route.floorChanges(floor, floor), []);

  // In CI, compare with the base branch (pull request) or the previous commit (push);
  // locally, with HEAD. Warn, don't fail: lowering a floor can be deliberate, but never silent.
  const base = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : process.env.CI ? 'HEAD~1' : 'HEAD';
  const old = spawnSync('git', ['show', `${base}:${FLOOR_REL}`], { cwd: ROOT, encoding: 'utf8' });
  if (old.status !== 0) return; // no earlier floor.json at that ref (first commit, shallow clone)
  const changes = route.floorChanges(JSON.parse(old.stdout), floor);
  if (changes.length) {
    route.loudly([`compared with ${base}`, ...changes]);
    if (process.env.GITHUB_ACTIONS) for (const c of changes) console.log(`::warning file=${FLOOR_REL}::Routing eval floor weakened: ${c}`);
  }
});
