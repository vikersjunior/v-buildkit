#!/usr/bin/env node
'use strict';

// Install, repair and update copy this file to .buildkit/bin/lint.js, with lib/lint.js and lib/config.js
// in .buildkit/lib/, so /complete can run `node .buildkit/bin/lint.js` from the same release as its skill
// text. Read-only, like `vikers-buildkit lint`. Exit code 1 means a check failed.
const path = require('node:path');
const { runLint } = require('../lib/lint');

const args = process.argv.slice(2);
const dir = args.find(arg => !arg.startsWith('--'));
try {
  // Default target: the project this copy is vendored into (.buildkit/bin/ -> project root).
  process.exitCode = runLint(dir ? path.resolve(dir) : path.resolve(__dirname, '..', '..'), { strict: args.includes('--strict') });
} catch (error) {
  console.error(`\nBuildKit error: ${error.message}`);
  process.exitCode = 1;
}
