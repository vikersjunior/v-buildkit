'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC_MANIFEST = Object.freeze({
  prd: 'PRD.md',
  architecture: 'architecture.md',
  tech_stack: 'Tech_stack.md',
  implementation_plan: 'Implementation_plan.md',
  rules: 'rules.md',
  progress: 'Progress.md'
});

const SPEC_FILES = Object.freeze([
  'PRD.md',
  'architecture.md',
  'Tech_stack.md',
  'Implementation_plan.md',
  'rules.md',
  'Progress.md'
]);

/**
 * Normalize and validate a docs root directory relative to the project root.
 * Enforces path containment within projectRoot to prevent path traversal.
 * Formats returned relative path with POSIX slashes for portability.
 */
function normalizeDocsRoot(inputPath, projectRoot) {
  if (typeof inputPath !== 'string' || !inputPath.trim()) {
    throw new Error('Documentation directory path must be a non-empty string.');
  }

  const trimmed = inputPath.trim();
  const absTarget = path.resolve(projectRoot);
  const absResolved = path.resolve(absTarget, trimmed);

  // Check path security / containment
  const relative = path.relative(absTarget, absResolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Documentation root '${inputPath}' escapes target project boundary.`);
  }

  if (relative === '' || relative === '.') {
    return '.';
  }

  // Convert to POSIX slashes (forward slashes) for config portability across OS
  return relative.replace(/\\/g, '/');
}

/**
 * Result statuses for config reading.
 */
const ConfigStatus = Object.freeze({
  MISSING: 'MISSING',
  VALID: 'VALID',
  MALFORMED_JSON: 'MALFORMED_JSON',
  UNSUPPORTED_SCHEMA: 'UNSUPPORTED_SCHEMA',
  INVALID_ROOT: 'INVALID_ROOT'
});

/**
 * Read .buildkit/config.json safely.
 * Returns { status, config, error, configPath }
 */
function readBuildkitConfig(projectRoot) {
  const configPath = path.join(projectRoot, '.buildkit', 'config.json');

  if (!fs.existsSync(configPath)) {
    return {
      status: ConfigStatus.MISSING,
      config: {
        schemaVersion: 1,
        docs: {
          root: '.'
        }
      },
      error: null,
      configPath
    };
  }

  let rawContent = '';
  try {
    rawContent = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    return {
      status: ConfigStatus.MALFORMED_JSON,
      config: null,
      error: `Failed to read config file: ${err.message}`,
      configPath
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    return {
      status: ConfigStatus.MALFORMED_JSON,
      config: null,
      error: `JSON parsing failed: ${err.message}`,
      configPath
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      status: ConfigStatus.MALFORMED_JSON,
      config: null,
      error: 'Config root must be a JSON object',
      configPath
    };
  }

  if (typeof parsed.schemaVersion !== 'number' || parsed.schemaVersion !== 1) {
    return {
      status: ConfigStatus.UNSUPPORTED_SCHEMA,
      config: parsed,
      error: `Unsupported schemaVersion '${parsed.schemaVersion}'. Expected 1.`,
      configPath
    };
  }

  if (!parsed.docs || typeof parsed.docs !== 'object' || typeof parsed.docs.root !== 'string') {
    return {
      status: ConfigStatus.INVALID_ROOT,
      config: parsed,
      error: "Missing or invalid 'docs.root' property in configuration.",
      configPath
    };
  }

  let normalizedRoot = '.';
  try {
    normalizedRoot = normalizeDocsRoot(parsed.docs.root, projectRoot);
  } catch (err) {
    return {
      status: ConfigStatus.INVALID_ROOT,
      config: parsed,
      error: err.message,
      configPath
    };
  }

  const validConfig = {
    ...parsed,
    schemaVersion: 1,
    docs: {
      ...parsed.docs,
      root: normalizedRoot
    }
  };

  return {
    status: ConfigStatus.VALID,
    config: validConfig,
    error: null,
    configPath
  };
}

/**
 * Write or update .buildkit/config.json.
 * Preserves existing fields when updating.
 */
function writeBuildkitConfig(projectRoot, updateObj) {
  const readRes = readBuildkitConfig(projectRoot);
  let baseConfig = {
    schemaVersion: 1,
    docs: {
      root: '.'
    }
  };

  if (readRes.status === ConfigStatus.VALID && readRes.config) {
    baseConfig = readRes.config;
  } else if (readRes.status === ConfigStatus.MISSING && readRes.config) {
    baseConfig = readRes.config;
  }

  const newDocsRoot = updateObj && updateObj.docs && updateObj.docs.root !== undefined
    ? updateObj.docs.root
    : baseConfig.docs.root;

  const normalizedRoot = normalizeDocsRoot(newDocsRoot, projectRoot);

  const finalConfig = {
    ...baseConfig,
    ...updateObj,
    schemaVersion: 1,
    docs: {
      ...(baseConfig.docs || {}),
      ...((updateObj && updateObj.docs) || {}),
      root: normalizedRoot
    }
  };

  const buildkitDir = path.join(projectRoot, '.buildkit');
  fs.mkdirSync(buildkitDir, { recursive: true });

  const configPath = path.join(buildkitDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(finalConfig, null, 2) + '\n', 'utf8');

  return finalConfig;
}

/**
 * Resolve absolute docs root directory for a project.
 * Throws an Error if config exists but is malformed/invalid.
 */
function resolveDocsRoot(projectRoot) {
  const readRes = readBuildkitConfig(projectRoot);
  if (readRes.status === ConfigStatus.VALID || readRes.status === ConfigStatus.MISSING) {
    const relRoot = readRes.config.docs.root;
    return path.resolve(projectRoot, relRoot);
  }

  const err = new Error(
    `Invalid BuildKit configuration in ${readRes.configPath}: ${readRes.error}. BuildKit cannot safely determine the documentation root.`
  );
  err.configStatus = readRes.status;
  err.configPath = readRes.configPath;
  throw err;
}

/**
 * Resolve relative docs root directory string for a project (e.g. "." or "docs/buildkit").
 */
function resolveDocsRelative(projectRoot) {
  const readRes = readBuildkitConfig(projectRoot);
  if (readRes.status === ConfigStatus.VALID || readRes.status === ConfigStatus.MISSING) {
    return readRes.config.docs.root;
  }

  const err = new Error(
    `Invalid BuildKit configuration in ${readRes.configPath}: ${readRes.error}`
  );
  err.configStatus = readRes.status;
  err.configPath = readRes.configPath;
  throw err;
}

/**
 * Resolve absolute path to a specific BuildKit project document.
 * docKey can be a key like "prd", "architecture", "progress", or filename "PRD.md".
 */
function resolveProjectDocument(projectRoot, docKey) {
  const absDocsRoot = resolveDocsRoot(projectRoot);
  const normalizedKey = String(docKey || '').toLowerCase();

  let filename = DOC_MANIFEST[normalizedKey];
  if (!filename) {
    for (const val of SPEC_FILES) {
      if (val.toLowerCase() === normalizedKey) {
        filename = val;
        break;
      }
    }
  }

  if (!filename) {
    filename = docKey;
  }

  return path.join(absDocsRoot, filename);
}

module.exports = {
  DOC_MANIFEST,
  SPEC_FILES,
  ConfigStatus,
  normalizeDocsRoot,
  readBuildkitConfig,
  writeBuildkitConfig,
  resolveDocsRoot,
  resolveDocsRelative,
  resolveProjectDocument
};
