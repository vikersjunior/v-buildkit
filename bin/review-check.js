#!/usr/bin/env node
'use strict';

// Vendored to .buildkit/bin/review-check.js. /complete runs it when a crosscheck policy applies to the
// current feature: it rebuilds the reviewed patch and checks the receipts. Exit code 1 means refuse.
const path = require('node:path');
const { runCheck } = require('../lib/crosscheck');

const dir = process.argv.slice(2).find(arg => !arg.startsWith('--'));
try {
  // Default target: the project this copy is vendored into (.buildkit/bin/ -> project root).
  const r = runCheck(dir ? path.resolve(dir) : path.resolve(__dirname, '..', '..'));
  console.log("\nViker's BuildKit Crosscheck Gate\n");
  for (const l of r.lines) console.log(`  [${l.level}] ${l.message}`);
  console.log('');
  process.exitCode = r.ok ? 0 : 1;
} catch (error) {
  console.error(`\nBuildKit error: ${error.message}`);
  process.exitCode = 1;
}
