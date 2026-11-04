'use strict';

// Read-only by construction: only these fs functions are imported, and test/lint.test.js
// fails if this file references any fs write API.
const { existsSync, statSync, lstatSync, readFileSync, readdirSync, realpathSync } = require('node:fs');
const path = require('node:path');
const { resolveDocsRoot, SPEC_FILES } = require('./config');

const MAX_BYTES = 1024 * 1024;

// Placeholders: the bracket tokens of templates/{PRD,architecture,Tech_stack,Implementation_plan,rules,Progress}.md,
// plus [stated assumption], [TBD] and [fill in later]. Exact tokens only; no bracket pattern matching.
// test/lint.test.js fails if a template gains a token missing here.
const PLACEHOLDERS = Object.freeze([
  '[Any known bug/gap not yet fixed — or "None"]',
  '[Auth provider/library]',
  '[CDN, storage, queues, cron/background jobs — whatever applies]',
  '[Client state approach]',
  '[Component library, if any]',
  '[Database]',
  '[Decision title]',
  '[E2E test framework]',
  '[Exact phase name from Implementation_plan.md — not a paraphrase]',
  '[Framework/runtime]',
  '[Framework]',
  '[Hosting/deployment target]',
  '[Language-specific strictness rule, e.g. "Use TypeScript strictly, avoid `any`"]',
  '[Language]',
  '[Linting, formatting, CI]',
  '[Name, e.g. "Authentication"]',
  '[Name]',
  '[Next task, in priority order]',
  '[Next task]',
  '[ORM/query layer]',
  '[Optional but recommended for longer projects — one line per work session]',
  '[Payments, email, SMS, analytics, etc. — name the actual vendor]',
  '[Project Name]',
  '[Specific blocker and what\'s needed to unblock it — or "None"]',
  '[Specific task]',
  '[Styling approach]',
  '[Task currently being worked on]',
  '[Task — matches wording in Implementation_plan.md]',
  '[Technology name]',
  '[Tool name]',
  '[Unit/integration test framework]',
  '[Validation library]',
  '[action]',
  '[date]',
  '[decision]',
  '[language/framework tooling]',
  '[one-line reason]',
  '[outcome]',
  '[prior phase(s)]',
  '[reason]',
  '[tasks...]',
  '[the actual reasoning]',
  '[trace back to PRD/architecture]',
  '[user]',
  '[what a user/stakeholder can actually do once this phase is done]',
  '[what else was evaluated and why it lost]',
  '[what else was weighed]',
  '[what this costs us in exchange for what it buys us]',
  '[what was decided]',
  '[what was done this session]',
  '[why, tied to a requirement or constraint]',
  '[which part of this project it applies to, e.g. "frontend component work" or "no relevance — backend-only API project, do not expect this to fire"]',
  '[Visual or numeric — e.g. a simple bar/percentage against total phases, or "X of Y phases complete"]',
  '[Running log of notable decisions made during implementation that weren\'t pre-planned in architecture.md\'s ADRs — small implementation-level calls, not architectural ones. If a decision is architectural, it belongs as an ADR in architecture.md, cross-referenced here, not duplicated in full.]',
  '[stated assumption]',
  '[TBD]',
  '[fill in later]'
]);

// True when real is projectReal or inside it. A drive or filesystem root already ends with a separator.
function isInside(real, projectReal) {
  const prefix = projectReal.endsWith(path.sep) ? projectReal : projectReal + path.sep;
  return real === projectReal || real.startsWith(prefix);
}

// True when the path does not exist. Any other lstat error (EACCES, ELOOP...) means "exists but unreadable".
function isMissing(file) {
  try {
    lstatSync(file);
    return false;
  } catch (err) {
    return err.code === 'ENOENT' || err.code === 'ENOTDIR';
  }
}

// Returns the file's text, or null when it is missing; reports `level` (WARN by default) and returns
// null when it is unreadable, outside the project, not a regular file, or too large. Never throws for
// a bad path, so one odd file can't abort the run.
function readContained(file, rel, projectReal, add, level = 'WARN') {
  if (isMissing(file)) return null;
  let real;
  try {
    real = realpathSync(file);
  } catch (err) {
    add(level, `${rel} could not be resolved (${err.code || err.message}); not read`);
    return null;
  }
  if (!isInside(real, projectReal)) {
    add(level, `${rel} resolves outside the project; not read`);
    return null;
  }
  try {
    const stat = statSync(real);
    if (!stat.isFile()) {
      add(level, `${rel} is not a regular file; not read`);
      return null;
    }
    if (stat.size > MAX_BYTES) {
      add(level, `${rel} is larger than 1 MB; not checked`);
      return null;
    }
    return readFileSync(real, 'utf8');
  } catch (err) {
    add(level, `${rel} could not be read (${err.code || err.message}); not checked`);
    return null;
  }
}

// Lines outside fenced code blocks, with 1-based line numbers. A fence closes only on the same
// character, at least as long as the opener, with no info string (CommonMark).
function contentLines(text) {
  const out = [];
  let fence = null;
  text.split(/\r?\n/).forEach((line, i) => {
    const marker = line.trim().match(/^(`{3,}|~{3,})(.*)$/);
    if (marker && !fence) {
      fence = marker[1];
      return;
    }
    if (marker && fence && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) {
      fence = null;
      return;
    }
    if (!fence) out.push({ n: i + 1, line });
  });
  return out;
}

// [start, end) ranges of inline `code` spans.
function codeSpans(line) {
  return [...line.matchAll(/(`+)[^`]*?\1/g)].map(m => [m.index, m.index + m[0].length]);
}

// Phase names compare with whitespace runs collapsed and any dash (-, –, —) treated as "—".
function normalisePhase(text) {
  return text.replace(/\s+/g, ' ').replace(/[-–—]/g, '—').trim();
}

// Link syntax, not a placeholder: a token directly followed by "(" or "[", directly preceded by "]",
// or a reference definition "[label]: url" at the start of the line.
function isLinkUse(line, start, end) {
  const next = line[end];
  if (next === '(' || next === '[' || line[start - 1] === ']') return true;
  return next === ':' && /^ {0,3}$/.test(line.slice(0, start));
}

// First meaningful line under a heading: skips blank lines and HTML comments, strips a list marker
// and backticks. Returns { text, n } (n is 1-based), { text: '', n } when empty, or null if no heading.
function sectionFirstLine(text, heading) {
  const lines = text.split(/\r?\n/);
  const at = lines.findIndex(l => l.trim() === heading);
  if (at === -1) return null;
  for (let i = at + 1; i < lines.length; i++) {
    const l = lines[i].trim();
    if (/^#/.test(l)) break;
    if (!l || /^<!--.*-->$/.test(l)) continue;
    return { text: l.replace(/^(?:[-*+]|\d+[.)])\s+/, '').replace(/`/g, '').trim(), n: i + 1 };
  }
  return { text: '', n: at + 1 };
}

// A finding header in .buildkit/findings.md. The skills write "—"; "–" and "-" are accepted too.
// Built from a string: the status word "open" in a regex literal would trip the read-only source test.
const FINDING_HEADER = new RegExp('^### (F-\\d{3,}) \\[(BLOCKING|HIGH|MEDIUM|LOW|NOTE)\\] (open|fixed|closed|accepted|invalid) [—–-] (\\S.*)$');
const SEVERITY_RANK = { NOTE: 0, LOW: 1, MEDIUM: 2, HIGH: 3, BLOCKING: 4 };
// Obvious credential shapes. The ledger is committed, so a hit is a WARN (never a FAIL: no false fails).
const SECRET_SHAPES = [/-----BEGIN /, /\bAKIA[0-9A-Z]{16}\b/, /\b(?:ghp|github_pat)_[A-Za-z0-9_]{10,}/, /\bsk-[A-Za-z0-9]{20,}/, /\bxox[bp]-/];

// L6: the findings ledger gate. Its inputs fail closed: a ledger or audit report that exists but
// can't be read is a FAIL, so the gate never passes without having checked them.
function checkFindings(target, projectReal, add) {
  let fails = 0;
  const gate = (level, message) => {
    if (level === 'FAIL') fails++;
    add(level, message);
  };
  const ledgerRel = '.buildkit/findings.md';
  const ledgerFile = path.join(target, '.buildkit', 'findings.md');
  const auditsRel = '.buildkit/audits';
  const auditsDir = path.join(target, '.buildkit', 'audits');

  const reports = [];
  if (!isMissing(auditsDir)) {
    let real = null;
    let names = null;
    try {
      real = realpathSync(auditsDir);
      if (isInside(real, projectReal) && statSync(real).isDirectory()) names = readdirSync(real);
    } catch {}
    if (!names) {
      gate('FAIL', `${auditsRel} is not a readable directory inside the project; audit reports could not be checked`);
    } else {
      for (const name of names.filter(n => n.endsWith('.md')).sort()) {
        const rel = `${auditsRel}/${name}`;
        const text = readContained(path.join(real, name), rel, projectReal, gate, 'FAIL');
        if (text !== null) reports.push({ rel, text });
      }
    }
  }

  // IDs the reports name, and the highest severity any report gave each (written "F-007 [BLOCKING]").
  const named = new Map();
  for (const { rel, text } of reports) {
    for (const { n, line } of contentLines(text)) {
      for (const [, id, severity] of line.matchAll(/\b(F-\d{3,})\b(?: \[(BLOCKING|HIGH|MEDIUM|LOW|NOTE)\])?/g)) {
        if (!named.has(id)) named.set(id, { at: `${rel}:${n}`, reports: new Set(), rated: null });
        const entry = named.get(id);
        entry.reports.add(rel);
        if (severity && (!entry.rated || SEVERITY_RANK[severity] > SEVERITY_RANK[entry.rated.severity])) {
          entry.rated = { severity, at: `${rel}:${n}` };
        }
      }
    }
  }

  const ledgerExists = !isMissing(ledgerFile);
  const ledger = readContained(ledgerFile, ledgerRel, projectReal, gate, 'FAIL');
  const findings = new Map();
  if (ledger !== null) {
    ledger.split(/\r?\n/).forEach((line, i) => {
      if (SECRET_SHAPES.some(shape => shape.test(line))) {
        add('WARN', `${ledgerRel}:${i + 1}: looks like a secret or token; the ledger is committed, so name the location instead`);
      }
    });
    let current = null;
    for (const { n, line } of contentLines(ledger)) {
      // Any heading up to ### ends the previous finding's body.
      if (/^#{1,3}\s/.test(line)) current = null;
      if (line.startsWith('### F-')) {
        const m = line.match(FINDING_HEADER);
        if (!m) {
          gate('FAIL', `${ledgerRel}:${n}: malformed finding header (expected "### F-001 [BLOCKING] open — title")`);
        } else if (findings.has(m[1])) {
          gate('FAIL', `${ledgerRel}:${n}: duplicate finding ID ${m[1]} (first at line ${findings.get(m[1]).n})`);
        } else {
          current = { id: m[1], n, severity: m[2], status: m[3], fields: {} };
          findings.set(current.id, current);
        }
        continue;
      }
      const field = current && line.match(/^\s*[-*]\s+(Reason|Accepted by|Verified in):\s*(.*?)\s*$/);
      if (field && field[2]) current.fields[field[1]] = field[2];
    }
  }

  for (const [id, { at }] of named) {
    if (!findings.has(id)) gate('FAIL', `${at}: ${id} is not in ${ledgerRel}`);
  }
  let active = 0;
  for (const f of findings.values()) {
    const where = `${ledgerRel}:${f.n}: ${f.id}`;
    const live = f.status === 'open' || f.status === 'fixed';
    if (live) active++;
    if ((f.status === 'accepted' || f.status === 'invalid') && !f.fields.Reason) {
      gate('FAIL', `${where} is ${f.status} without a "- Reason:" line`);
    }
    if (f.status === 'accepted' && !f.fields['Accepted by']) {
      gate('FAIL', `${where} is accepted without an "- Accepted by:" line naming who accepted it`);
    }
    if (f.status === 'closed') {
      // Character classes, not literal backticks or "//", keep the read-only source test's stripper simple.
      const cited = (f.fields['Verified in'] || '').replace(/[\x60]/g, '').replace(/[\\]/g, '/').replace(/^[.][/]/, '');
      if (!cited) gate('FAIL', `${where} is closed without a "- Verified in:" line naming the audit report`);
      else if (!(named.get(f.id) && named.get(f.id).reports.has(cited))) {
        gate('FAIL', `${where} is closed but "${cited}" is not an audit report in ${auditsRel}/ that names ${f.id}`);
      }
    }
    // Severity only matters while the finding can still block: closed, accepted and invalid ones may be re-rated.
    const rated = named.get(f.id) && named.get(f.id).rated;
    if (live && rated && SEVERITY_RANK[rated.severity] > SEVERITY_RANK[f.severity]) {
      gate('FAIL', `${where} is ${f.severity} but ${rated.at} rated it ${rated.severity}`);
    }
    if (f.severity === 'BLOCKING' && f.status === 'open') gate('FAIL', `${where} [BLOCKING] is open`);
    if (f.severity === 'BLOCKING' && f.status === 'fixed') gate('FAIL', `${where} [BLOCKING] is fixed but not yet re-verified by /audit`);
  }

  if (fails) return;
  if (!ledgerExists) add('PASS', 'No findings ledger yet');
  else add('PASS', `Findings ledger: ${findings.size} finding(s), none blocking (${active} open or fixed)`);
}

// Returns the findings list ({ level, message }), or null when BuildKit is not installed in target.
// strict turns "no spec files yet" into a FAIL.
function lintProject(target, { strict = false } = {}) {
  if (!existsSync(path.join(target, '.buildkit'))) return null;
  const findings = [];
  const add = (level, message) => findings.push({ level, message });
  const projectReal = realpathSync(target);
  const docsRoot = resolveDocsRoot(target);
  const docsRel = path.relative(target, docsRoot) || '.';

  const specs = {};
  for (const file of SPEC_FILES) {
    const rel = path.join(docsRel, file);
    const text = readContained(path.join(docsRoot, file), rel, projectReal, add);
    if (text !== null) specs[file] = { rel, text };
  }

  // L1: spec files present
  const present = SPEC_FILES.filter(f => existsSync(path.join(docsRoot, f)));
  if (present.length === 0) add(strict ? 'FAIL' : 'WARN', `No spec files in ${docsRel}/ yet; run /spec-init`);
  else if (present.length < SPEC_FILES.length) add('FAIL', `Missing spec files in ${docsRel}/: ${SPEC_FILES.filter(f => !present.includes(f)).join(', ')}`);
  else add('PASS', `All ${SPEC_FILES.length} spec files present in ${docsRel}/`);

  // L2: unfilled template placeholders
  let placeholders = 0;
  for (const { rel, text } of Object.values(specs)) {
    for (const { n, line } of contentLines(text)) {
      const spans = codeSpans(line);
      for (const token of PLACEHOLDERS) {
        for (let at = line.indexOf(token); at !== -1; at = line.indexOf(token, at + 1)) {
          const end = at + token.length;
          // Skip a token wholly inside inline code; a token that itself contains `code` still counts.
          if (spans.some(([s, e]) => at >= s && end <= e)) continue;
          if (isLinkUse(line, at, end)) continue;
          add('FAIL', `${rel}:${n}: unfilled placeholder ${token}`);
          placeholders++;
        }
      }
    }
  }
  if (placeholders === 0 && Object.keys(specs).length) add('PASS', 'No unfilled template placeholders');

  // L3: Progress.md "Current Phase" names a phase heading in Implementation_plan.md
  const progress = specs['Progress.md'];
  const plan = specs['Implementation_plan.md'];
  if (!progress || !plan) {
    if (present.length) add('WARN', 'Current Phase not checked (Progress.md or Implementation_plan.md unavailable)');
  } else {
    const section = sectionFirstLine(progress.text, '## Current Phase');
    const current = section && section.text;
    const phases = contentLines(plan.text)
      .map(({ line }) => line.match(/^##\s+(Phase\b.*)$/))
      .filter(Boolean)
      .map(m => m[1].trim());
    // "Phase 1 — Auth" and "Phase 1: Auth" both also accept the bare name "Auth".
    const accepted = phases.flatMap(p => [p, p.replace(/^Phase\s+(\S+?)(?::|\s+[—–-])\s+/, '')]).map(normalisePhase);
    if (!section) {
      // A Progress.md written before BuildKit's template may lack the heading: report it, don't block /complete.
      add('WARN', `${progress.rel}: no "## Current Phase" heading; Current Phase not checked`);
    } else if (current && PLACEHOLDERS.some(t => current.includes(t))) {
      // Already reported by L2; don't report the same line twice.
    } else if (current && accepted.includes(normalisePhase(current))) {
      add('PASS', `Current Phase matches a plan phase ("${current}")`);
    } else {
      add('FAIL', `${progress.rel}:${section.n}: Current Phase "${current}" is not a phase heading in ${plan.rel} (phases: ${phases.join('; ') || 'none'})`);
    }
  }

  // L4: unconfirmed assumptions
  let assumptions = 0;
  for (const { rel, text } of Object.values(specs)) {
    for (const { n, line } of contentLines(text)) {
      if (line.includes('**Assumption:**')) {
        add('WARN', `${rel}:${n}: unconfirmed assumption`);
        assumptions++;
      }
    }
  }
  if (assumptions === 0 && Object.keys(specs).length) add('PASS', 'No unconfirmed assumptions');

  // L5: state.md points at a real feature
  const stateRel = path.join('.buildkit', 'state.md');
  const state = readContained(path.join(target, stateRel), stateRel, projectReal, add);
  const feature = state === null ? null : sectionFirstLine(state, '## Current Feature');
  if (feature && feature.text) {
    const slug = feature.text;
    const where = `${stateRel}:${feature.n}`;
    if (/^none$/i.test(slug)) {
      add('PASS', 'No feature in progress');
    } else if (!/^[A-Za-z0-9._-]+$/.test(slug) || slug === '.' || slug === '..') {
      add('WARN', `${where}: unrecognised Current Feature value "${slug}"`);
    } else if (existsSync(path.join(target, '.buildkit', 'features', slug, 'spec.md')) || existsSync(path.join(target, '.buildkit', 'history', slug))) {
      add('PASS', `Current Feature "${slug}" has a feature folder`);
    } else {
      add('WARN', `${where}: Current Feature "${slug}" has no .buildkit/features/${slug}/spec.md or history folder`);
    }
  }

  // L6: findings ledger
  checkFindings(target, projectReal, add);

  return findings;
}

// Prints the lint report for target and returns the exit code: 1 when any check fails.
// Shared by `vikers-buildkit lint` and the vendored .buildkit/bin/lint.js.
function runLint(target, { strict = false } = {}) {
  if (!existsSync(target) || !statSync(target).isDirectory()) {
    throw new Error(`Project directory not found: ${target}`);
  }
  console.log(`\nViker's BuildKit Lint — ${target}\n`);

  const findings = lintProject(target, { strict });
  if (!findings) {
    console.log('Status: NOT INSTALLED');
    console.log('Run `npx vikers-buildkit install` to set up BuildKit in this project.');
    return strict ? 1 : 0;
  }
  for (const f of findings) console.log(`  [${f.level}] ${f.message}`);
  const fails = findings.filter(f => f.level === 'FAIL').length;
  const warns = findings.filter(f => f.level === 'WARN').length;
  console.log(`\nLint Summary: ${fails} failure(s), ${warns} warning(s).\n`);
  return fails > 0 ? 1 : 0;
}

module.exports = { lintProject, runLint, isInside, PLACEHOLDERS, FINDING_HEADER };
