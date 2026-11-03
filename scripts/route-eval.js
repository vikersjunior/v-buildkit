#!/usr/bin/env node
'use strict';

// Skill routing eval: a lexical smoke test. It ranks the model-routed workflow skills' descriptions
// against plain-language prompts with TF-IDF, so a description edit that steals or loses another
// skill's wording shows up in CI. It does not measure how an LLM agent actually routes.
//
//   node scripts/route-eval.js               report (train misses in full, holdout as counts only)
//   node scripts/route-eval.js --write-floor measure and write evals/routing/floor.json

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const EVALS = path.join('evals', 'routing');
const STOP = new Set(('a an the and or of to in on for with this that it is are be as at by from use when user any its ' +
  'into than then there these those was were will would should can do does not no yet if so via e g eg i me my we our ' +
  'you your they them their what how about after before also only just new').split(' '));

function tokens(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')
    .filter(w => w.length > 1 && !STOP.has(w))
    .map(w => w.replace(/(ing|ed|es|s)$/, ''));
}

function frontmatter(file) {
  const lines = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const end = lines.indexOf('---', 1);
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const i = line.indexOf(':');
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fields;
}

// Workflow skills with their descriptions. Explicit-only skills (disable-model-invocation: true)
// never compete for routing, so they are left out of the ranking.
function loadSkills(root = ROOT) {
  const dir = path.join(root, '.claude', 'skills');
  return fs.readdirSync(dir).sort()
    .filter(name => fs.existsSync(path.join(dir, name, 'SKILL.md')))
    .map(name => {
      const fields = frontmatter(path.join(dir, name, 'SKILL.md'));
      return { name, description: fields.description || '', explicitOnly: fields['disable-model-invocation'] === 'true' };
    });
}

function loadEvals(root = ROOT) {
  const dir = path.join(root, EVALS);
  const evals = {};
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'floor.json').sort()) {
    evals[file.replace(/\.json$/, '')] = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  }
  return evals;
}

// Returns rank(prompt) -> [[skill, score], ...] best first; ties break by name, so output is deterministic.
function ranker(skills) {
  const docs = skills.map(s => tokens(`${s.name.replace(/-/g, ' ')} ${s.description}`));
  const df = {};
  for (const doc of docs) for (const w of new Set(doc)) df[w] = (df[w] || 0) + 1;
  const idf = w => Math.log((skills.length + 1) / ((df[w] || 0) + 1)) + 1;
  const vector = words => {
    const v = {};
    for (const w of words) v[w] = (v[w] || 0) + 1;
    for (const w in v) v[w] *= idf(w);
    return v;
  };
  const norm = v => Math.sqrt(Object.values(v).reduce((sum, x) => sum + x * x, 0)) || 1;
  const vectors = docs.map(vector);
  return prompt => {
    const q = vector(tokens(prompt));
    return skills.map((s, i) => {
      let dot = 0;
      for (const w in q) dot += q[w] * (vectors[i][w] || 0);
      return [s.name, dot / (norm(q) * norm(vectors[i]))];
    }).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  };
}

// descriptions: optional { skill: text } override, for testing what a description edit would do.
function evaluate(root = ROOT, { descriptions = {} } = {}) {
  const skills = loadSkills(root).filter(s => !s.explicitOnly)
    .map(s => ({ ...s, description: descriptions[s.name] ?? s.description }));
  const rank = ranker(skills);
  const evals = loadEvals(root);
  const result = { skills: skills.map(s => s.name), train: 0, holdout: 0, perSkill: {}, results: [] };
  for (const [skill, sets] of Object.entries(evals)) {
    result.perSkill[skill] = { train: 0, holdout: 0 };
    for (const split of ['train', 'holdout']) {
      for (const prompt of sets[split] || []) {
        const ranking = rank(prompt);
        const ownerRank = ranking.findIndex(([name]) => name === skill) + 1;
        if (ownerRank === 1) { result[split]++; result.perSkill[skill][split]++; }
        result.results.push({ skill, split, prompt, ownerRank, got: ranking[0][0] });
      }
    }
  }
  result.overall = result.train + result.holdout;
  result.total = result.results.length;
  return result;
}

function holdoutSha256(evals) {
  const all = Object.entries(evals).flatMap(([skill, sets]) => (sets.holdout || []).map(p => `${skill}\t${p}`)).sort();
  return crypto.createHash('sha256').update(all.join('\n')).digest('hex');
}

function measureFloor(result, evals) {
  return {
    overall: result.overall,
    train: result.train,
    holdout: result.holdout,
    perSkill: result.perSkill,
    // Prompts that route correctly today must stay in the owner's top 3.
    top3: result.results.filter(r => r.ownerRank === 1).map(r => r.prompt).sort(),
    holdoutSha256: holdoutSha256(evals)
  };
}

// Every way the measured result falls short of the floor; empty means the gate passes.
function checkFloor(result, floor, evals) {
  const fails = [];
  for (const key of ['overall', 'train', 'holdout']) {
    if (result[key] < floor[key]) fails.push(`${key} rank-1 ${result[key]} < floor ${floor[key]}`);
  }
  for (const [skill, want] of Object.entries(floor.perSkill)) {
    const got = result.perSkill[skill] || { train: 0, holdout: 0 };
    if (got.train < want.train) fails.push(`${skill} train rank-1 ${got.train} < floor ${want.train}`);
    if (got.holdout < want.holdout) fails.push(`${skill} holdout rank-1 ${got.holdout} < floor ${want.holdout}`);
  }
  const byPrompt = new Map(result.results.map(r => [r.prompt, r]));
  for (const prompt of floor.top3) {
    const r = byPrompt.get(prompt);
    if (r && r.ownerRank > 3) fails.push(`${r.split === 'holdout' ? 'a holdout prompt' : `"${prompt}"`} fell to rank ${r.ownerRank} for ${r.skill}`);
  }
  if (holdoutSha256(evals) !== floor.holdoutSha256) fails.push('holdout prompts changed without updating holdoutSha256 in floor.json');
  return fails;
}

// Changes from an older floor that weaken the gate: lowered counts, a new holdout pin, dropped top-3 prompts.
function floorChanges(before, after) {
  const changes = [];
  for (const key of ['overall', 'train', 'holdout']) {
    if (after[key] < before[key]) changes.push(`${key} floor lowered ${before[key]} -> ${after[key]}`);
  }
  for (const [skill, was] of Object.entries(before.perSkill || {})) {
    const now = (after.perSkill || {})[skill] || { train: 0, holdout: 0 };
    if (now.train < was.train) changes.push(`${skill} train floor lowered ${was.train} -> ${now.train}`);
    if (now.holdout < was.holdout) changes.push(`${skill} holdout floor lowered ${was.holdout} -> ${now.holdout}`);
  }
  const dropped = (before.top3 || []).filter(p => !(after.top3 || []).includes(p)).length;
  if (dropped) changes.push(`${dropped} prompt(s) removed from the top-3 guard`);
  if (before.holdoutSha256 !== after.holdoutSha256) changes.push('holdout pin (holdoutSha256) changed');
  return changes;
}

function loudly(lines) {
  const bar = '!'.repeat(72);
  console.log(`\n${bar}\n!! ROUTING EVAL FLOOR WEAKENED — review this change deliberately\n${bar}`);
  for (const line of lines) console.log(`!! ${line}`);
  console.log(`${bar}\n`);
}

function report(result) {
  const pct = (n, d) => `${n}/${d} (${d ? Math.round((100 * n) / d) : 0}%)`;
  const count = split => result.results.filter(r => r.split === split).length;
  console.log(`Routing eval (lexical, ${result.skills.length} model-routed skills)`);
  console.log(`  overall rank-1  ${pct(result.overall, result.total)}`);
  console.log(`  train rank-1    ${pct(result.train, count('train'))}`);
  console.log(`  holdout rank-1  ${pct(result.holdout, count('holdout'))}  (counts only, so tuning can't target them)`);
  console.log('\nTrain rank-1 per skill:');
  for (const [skill, s] of Object.entries(result.perSkill)) {
    console.log(`  ${skill.padEnd(16)} ${s.train}/${result.results.filter(r => r.skill === skill && r.split === 'train').length}`);
  }
  const misses = result.results.filter(r => r.split === 'train' && r.ownerRank !== 1);
  if (misses.length) {
    console.log('\nTrain misses:');
    for (const m of misses) console.log(`  ${m.skill} <- "${m.prompt}" routed to ${m.got} (owner rank ${m.ownerRank})`);
  }
}

if (require.main === module) {
  const result = evaluate();
  report(result);
  if (process.argv.includes('--write-floor')) {
    const file = path.join(ROOT, EVALS, 'floor.json');
    const next = measureFloor(result, loadEvals());
    if (fs.existsSync(file)) {
      const changes = floorChanges(JSON.parse(fs.readFileSync(file, 'utf8')), next);
      if (changes.length) loudly(changes);
    }
    fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
    console.log(`\nWrote ${path.relative(ROOT, file)}`);
  }
}

module.exports = { tokens, loadSkills, loadEvals, ranker, evaluate, holdoutSha256, measureFloor, checkFloor, floorChanges, loudly };
