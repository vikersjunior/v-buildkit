'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

// Text files hash with CRLF folded to LF, so a git checkout that converts line endings doesn't
// make every managed file look edited. Files with a NUL byte (binary) are hashed as-is.
function hashFile(file) {
  let data = fs.readFileSync(file);
  if (!data.subarray(0, 8000).includes(0)) data = Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = { hashFile };
