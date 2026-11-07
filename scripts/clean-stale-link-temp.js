#!/usr/bin/env node
'use strict';

// Removes the buildkit-test-link-* folders that older --link test runs left in the OS temp folder.
// On Windows without symlink rights those folders hold a dangling junction (.claude/skills ->
// .buildkit/workflow-skills) that nothing can remove until its target exists again, so this script
// recreates the target, unlinks every link, then deletes the folder.
// Dry run by default; pass --delete to remove.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PREFIX = 'buildkit-test-link-';

function links(dir, out = []) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) out.push(p);
    else if (e.isDirectory()) links(p, out);
  }
  return out;
}

function clean(dir) {
  fs.mkdirSync(path.join(dir, '.buildkit', 'workflow-skills'), { recursive: true });
  for (const p of links(dir)) {
    try { fs.unlinkSync(p); } catch { fs.rmdirSync(p); }
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function main(argv) {
  const remove = argv.includes('--delete');
  const tmp = os.tmpdir();
  const dirs = fs.readdirSync(tmp, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.isSymbolicLink() && e.name.startsWith(PREFIX))
    .map(e => path.join(tmp, e.name));
  const withLinks = dirs.filter(d => links(d).length > 0).length;
  console.log(`${dirs.length} ${PREFIX}* folder(s) in ${tmp}; ${withLinks} hold a link.`);
  if (!remove) {
    if (dirs.length) console.log('Dry run: nothing deleted. Pass --delete to remove them.');
    return 0;
  }
  let failed = 0;
  for (const d of dirs) {
    try { clean(d); } catch (e) { failed++; console.error(`could not remove ${d}: ${e.code || e.message}`); }
  }
  console.log(`Removed ${dirs.length - failed}; ${failed} failed.`);
  return failed ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { links, clean };
