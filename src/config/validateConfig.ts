import type {
  AdeConfig,
  AdeProfile,
  AdeRule,
  ConfigIssue
} from './config.types.ts';

/**
 * Keys whose presence signals a secret or credential. ADE config must never
 * store these — a provider's secrets are supplied at runtime, not committed.
 */
const SECRET_KEY_REGEX = /(api[-_]?key|secret|token|password|passwd|credential|private[-_]?key)/i;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'extends',
  'ignore',
  'sensitive',
  'tools',
  'rules',
  'profiles',
  'context',
  'thresholds',
  'output'
]);

const PROFILE_MODES = new Set(['deterministic', 'assisted']);
const PROFILE_CONTEXTS = new Set(['compact', 'full']);
const PROFILE_PRIVACY = new Set(['strict', 'standard']);
const RULE_SEVERITIES = new Set(['info', 'warn', 'error']);
const OUTPUT_FORMATS = new Set(['markdown', 'json']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Recursively flags any object key that looks like a secret. */
function scanForSecrets(value: unknown, path: string, issues: ConfigIssue[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanForSecrets(item, `${path}[${index}]`, issues));
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = path ? `${path}.${key}` : key;
    if (SECRET_KEY_REGEX.test(key)) {
      issues.push({
        code: 'SECRET_IN_CONFIG',
        severity: 'error',
        message: `Secret-like key "${key}" must not be stored in ADE config; provide secrets at runtime instead.`,
        path: childPath
      });
    }
    scanForSecrets(child, childPath, issues);
  }
}

function validateRules(value: unknown, issues: ConfigIssue[]): AdeRule[] | undefined {
  if (!Array.isArray(value)) {
    issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`rules` must be an array.', path: 'rules' });
    return undefined;
  }
  const rules: AdeRule[] = [];
  value.forEach((raw, index) => {
    const at = `rules[${index}]`;
    if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim() === '') {
      issues.push({ code: 'INVALID_RULE', severity: 'error', message: `${at} must be an object with a non-empty string \`id\`.`, path: at });
      return;
    }
    if (raw.severity !== undefined && !RULE_SEVERITIES.has(raw.severity as string)) {
      issues.push({ code: 'INVALID_ENUM', severity: 'error', message: `${at}.severity must be one of info|warn|error.`, path: `${at}.severity` });
    }
    if (raw.appliesTo !== undefined && !isStringArray(raw.appliesTo)) {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `${at}.appliesTo must be a string array.`, path: `${at}.appliesTo` });
    }
    rules.push(raw as unknown as AdeRule);
  });
  return rules;
}

function validateProfiles(value: unknown, issues: ConfigIssue[]): Record<string, AdeProfile> | undefined {
  if (!isRecord(value)) {
    issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`profiles` must be an object.', path: 'profiles' });
    return undefined;
  }
  for (const [name, raw] of Object.entries(value)) {
    const at = `profiles.${name}`;
    if (!isRecord(raw)) {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `${at} must be an object.`, path: at });
      continue;
    }
    if (raw.mode !== undefined && !PROFILE_MODES.has(raw.mode as string)) {
      issues.push({ code: 'INVALID_ENUM', severity: 'error', message: `${at}.mode must be deterministic|assisted.`, path: `${at}.mode` });
    }
    if (raw.context !== undefined && !PROFILE_CONTEXTS.has(raw.context as string)) {
      issues.push({ code: 'INVALID_ENUM', severity: 'error', message: `${at}.context must be compact|full.`, path: `${at}.context` });
    }
    if (raw.privacy !== undefined && !PROFILE_PRIVACY.has(raw.privacy as string)) {
      issues.push({ code: 'INVALID_ENUM', severity: 'error', message: `${at}.privacy must be strict|standard.`, path: `${at}.privacy` });
    }
    if (raw.allowProvider !== undefined && typeof raw.allowProvider !== 'boolean') {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `${at}.allowProvider must be a boolean.`, path: `${at}.allowProvider` });
    }
    if (raw.tokenBudget !== undefined && typeof raw.tokenBudget !== 'number') {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `${at}.tokenBudget must be a number.`, path: `${at}.tokenBudget` });
    }
  }
  return value as Record<string, AdeProfile>;
}

/**
 * Validates a single config layer's shape and scans it for secrets, returning a
 * sanitized config containing only correctly-typed fields plus any issues
 * found. `sourceLabel` prefixes secret findings so provenance stays clear.
 */
export function validateLayer(
  value: unknown,
  sourceLabel: string
): { sanitized: AdeConfig; issues: ConfigIssue[] } {
  const issues: ConfigIssue[] = [];
  const sanitized: AdeConfig = {};

  if (!isRecord(value)) {
    issues.push({
      code: 'INVALID_CONFIG',
      severity: 'error',
      message: `Configuration in "${sourceLabel}" must export an object.`
    });
    return { sanitized, issues };
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_TOP_LEVEL_KEYS.has(key)) {
      issues.push({
        code: 'UNKNOWN_KEY',
        severity: 'error',
        message: `Unknown configuration key "${key}" in "${sourceLabel}".`,
        path: key
      });
    }
  }

  scanForSecrets(value, '', issues);

  if (value.extends !== undefined && !isStringArray(value.extends)) {
    issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`extends` must be a string array.', path: 'extends' });
  } else if (isStringArray(value.extends)) {
    sanitized.extends = value.extends;
  }

  for (const key of ['ignore', 'sensitive', 'tools'] as const) {
    if (value[key] === undefined) {
      continue;
    }
    if (isStringArray(value[key])) {
      sanitized[key] = value[key] as string[];
    } else {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `\`${key}\` must be a string array.`, path: key });
    }
  }

  if (value.rules !== undefined) {
    const rules = validateRules(value.rules, issues);
    if (rules) {
      sanitized.rules = rules;
    }
  }

  if (value.profiles !== undefined) {
    const profiles = validateProfiles(value.profiles, issues);
    if (profiles) {
      sanitized.profiles = profiles;
    }
  }

  if (value.context !== undefined) {
    if (isRecord(value.context)) {
      sanitized.context = value.context as AdeConfig['context'];
    } else {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`context` must be an object.', path: 'context' });
    }
  }

  if (value.thresholds !== undefined) {
    if (isRecord(value.thresholds) && Object.values(value.thresholds).every((v) => typeof v === 'number')) {
      sanitized.thresholds = value.thresholds as Record<string, number>;
    } else {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`thresholds` must be an object of numbers.', path: 'thresholds' });
    }
  }

  if (value.output !== undefined) {
    if (isRecord(value.output)) {
      if (value.output.formats !== undefined) {
        if (!isStringArray(value.output.formats) || !(value.output.formats as string[]).every((f) => OUTPUT_FORMATS.has(f))) {
          issues.push({ code: 'INVALID_ENUM', severity: 'error', message: '`output.formats` must be an array of markdown|json.', path: 'output.formats' });
        }
      }
      sanitized.output = value.output as AdeConfig['output'];
    } else {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`output` must be an object.', path: 'output' });
    }
  }

  return { sanitized, issues };
}
