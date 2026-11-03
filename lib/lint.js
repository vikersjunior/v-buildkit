'use strict';

// Read-only by construction: only these fs functions are imported, and test/lint.test.js
// fails if this file references any fs write API.
const { existsSync, statSync, readFileSync, realpathSync } = require('node:fs');
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

// Returns the file's text, or null with a WARN when it is missing, unreadable, outside the project,
// not a regular file, or too large. Never throws for a bad path, so one odd file can't abort the run.
function readContained(file, rel, projectReal, add) {
  if (!existsSync(file)) return null;
  let real;
  try {
    real = realpathSync(file);
  } catch (err) {
    add('WARN', `${rel} could not be resolved (${err.code || err.message}); not read`);
    return null;
  }
  if (!isInside(real, projectReal)) {
    add('WARN', `${rel} resolves outside the project; not read`);
    return null;
  }
  const stat = statSync(real);
  if (!stat.isFile()) {
    add('WARN', `${rel} is not a regular file; not read`);
    return null;
  }
  if (stat.size > MAX_BYTES) {
    add('WARN', `${rel} is larger than 1 MB; not checked`);
    return null;
  }
  return readFileSync(real, 'utf8');
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
      add('FAIL', `${progress.rel}: no "## Current Phase" heading`);
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

  return findings;
}

module.exports = { lintProject, isInside, PLACEHOLDERS };
