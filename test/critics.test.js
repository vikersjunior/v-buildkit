'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { selectCritics, hostVendor } = require('../lib/critics');

const all = () => true;
const ids = r => r.picked.map(c => c.id);

test('host vendor comes from the agent key', () => {
  assert.equal(hostVendor('claude'), 'anthropic');
  assert.equal(hostVendor('codex'), 'openai');
  assert.equal(hostVendor('antigravity'), 'google');
  assert.equal(hostVendor('gemini'), 'google');
  assert.equal(hostVendor('cursor'), null);
});

test('manual runs: Codex by default; Antigravity only when opted in', () => {
  assert.deepEqual(ids(selectCritics({ host: 'claude', isPresent: all })), ['codex']);
  assert.deepEqual(ids(selectCritics({ host: 'claude', vendors: ['google'], isPresent: all })), ['codex', 'agy']);
  assert.deepEqual(ids(selectCritics({ host: 'claude', allowWeb: true, isPresent: all })), ['codex', 'agy']);
  const skipped = selectCritics({ host: 'claude', isPresent: all }).skipped.find(s => s.id === 'agy');
  assert.match(skipped.reason, /--allow-web/);
});

test('gate runs are Codex-only and need the vendor listed', () => {
  assert.deepEqual(ids(selectCritics({ host: 'claude', gate: true, vendors: ['openai', 'google'], allowWeb: true, isPresent: all })), ['codex']);
  assert.deepEqual(ids(selectCritics({ host: 'claude', gate: true, vendors: ['google'], isPresent: all })), []);
});

test('a critic never reviews its own vendor; a Codex host under gates gets none', () => {
  assert.deepEqual(ids(selectCritics({ host: 'codex', allowWeb: true, isPresent: all })), ['agy']);
  const r = selectCritics({ host: 'codex', gate: true, vendors: ['openai', 'google'], isPresent: all });
  assert.deepEqual(ids(r), []);
  assert.equal(r.hostVendor, 'openai');
});

test('unknown host vendor allows every supported critic; missing CLIs are skipped', () => {
  assert.deepEqual(ids(selectCritics({ host: undefined, allowWeb: true, isPresent: all })), ['codex', 'agy']);
  assert.deepEqual(ids(selectCritics({ host: 'claude', allowWeb: true, isPresent: id => id === 'agy' })), ['agy']);
});

test('only verified critics exist: no gemini or claude CLI recipes', () => {
  const r = selectCritics({ host: undefined, allowWeb: true, isPresent: all });
  assert.deepEqual([...ids(r), ...r.skipped.map(s => s.id)].sort(), ['agy', 'codex']);
});
