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

/**
 * Legitimate ADE config keys that contain a trigger substring but are not
 * secrets — notably token *budgeting* keys (`tokenBudget`, `maxTokens`, …)
 * which are about counting tokens, not authenticating. Auth-style keys such as
 * `authToken` or `apiToken` do not match and remain flagged.
 */
const SAFE_KEY_REGEX = /^(token(budget|count|limit|estimate|s)|max[-_]?tokens|estimated[-_]?tokens)$/i;

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'extends',
  'ignore',
  'sensitive',
  'tools',
  'rules',
  'packs',
  'profiles',
  'context',
  'thresholds',
  'output',
  'issueLifecycle'
]);

const PROFILE_MODES = new Set(['deterministic', 'assisted']);
const PROFILE_CONTEXTS = new Set(['compact', 'full']);
const PROFILE_PRIVACY = new Set(['strict', 'standard']);
const RULE_SEVERITIES = new Set(['info', 'warn', 'error']);
const OUTPUT_FORMATS = new Set(['markdown', 'json']);
const ISSUE_RETRY_POLICIES = new Set(['safe', 'reconcile-first', 'never']);
const PROFILE_NAME_REGEX = /^[a-z][a-z0-9-]{0,63}$/;
const RULE_ID_REGEX = /^[a-z][a-z0-9._/-]{0,127}$/;

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
    if (SECRET_KEY_REGEX.test(key) && !SAFE_KEY_REGEX.test(key)) {
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

function validateIssueLifecycle(value: unknown, issues: ConfigIssue[]): AdeConfig['issueLifecycle'] | undefined {
  if (!isRecord(value)) {
    issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle` must be an object.', path: 'issueLifecycle' });
    return undefined;
  }
  const lifecycle: NonNullable<AdeConfig['issueLifecycle']> = {};
  if (value.priority !== undefined) {
    if (typeof value.priority === 'number' && Number.isInteger(value.priority) && value.priority >= 0 && value.priority <= 100) lifecycle.priority = value.priority;
    else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.priority` must be an integer between 0 and 100.', path: 'issueLifecycle.priority' });
  }
  if (value.retryPolicy !== undefined) {
    if (typeof value.retryPolicy === 'string' && ISSUE_RETRY_POLICIES.has(value.retryPolicy)) lifecycle.retryPolicy = value.retryPolicy as NonNullable<AdeConfig['issueLifecycle']>['retryPolicy'];
    else issues.push({ code: 'INVALID_ENUM', severity: 'error', message: '`issueLifecycle.retryPolicy` must be safe|reconcile-first|never.', path: 'issueLifecycle.retryPolicy' });
  }
  if (value.enrichment !== undefined) {
    if (!isRecord(value.enrichment)) {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.enrichment` must be an object.', path: 'issueLifecycle.enrichment' });
    } else {
      const enrichment: NonNullable<NonNullable<AdeConfig['issueLifecycle']>['enrichment']> = {};
      if (value.enrichment.enabled !== undefined) {
        if (typeof value.enrichment.enabled === 'boolean') enrichment.enabled = value.enrichment.enabled;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.enrichment.enabled` must be a boolean.', path: 'issueLifecycle.enrichment.enabled' });
      }
      if (value.enrichment.profile !== undefined) {
        if (typeof value.enrichment.profile === 'string' && PROFILE_NAME_REGEX.test(value.enrichment.profile)) enrichment.profile = value.enrichment.profile;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.enrichment.profile` must be a safe profile name.', path: 'issueLifecycle.enrichment.profile' });
      }
      if (value.enrichment.minimumAcceptanceCriteria !== undefined) {
        const count = value.enrichment.minimumAcceptanceCriteria;
        if (typeof count === 'number' && Number.isInteger(count) && count >= 1 && count <= 20) enrichment.minimumAcceptanceCriteria = count;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.enrichment.minimumAcceptanceCriteria` must be an integer between 1 and 20.', path: 'issueLifecycle.enrichment.minimumAcceptanceCriteria' });
      }
      lifecycle.enrichment = enrichment;
    }
  }
  if (value.deliveryPlan !== undefined) {
    if (!isRecord(value.deliveryPlan)) {
      issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.deliveryPlan` must be an object.', path: 'issueLifecycle.deliveryPlan' });
    } else {
      const deliveryPlan: NonNullable<NonNullable<AdeConfig['issueLifecycle']>['deliveryPlan']> = {};
      if (value.deliveryPlan.implementationProfile !== undefined) {
        if (typeof value.deliveryPlan.implementationProfile === 'string' && PROFILE_NAME_REGEX.test(value.deliveryPlan.implementationProfile)) deliveryPlan.implementationProfile = value.deliveryPlan.implementationProfile;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.deliveryPlan.implementationProfile` must be a safe profile name.', path: 'issueLifecycle.deliveryPlan.implementationProfile' });
      }
      for (const key of ['reviewProfiles', 'validationRuleIds'] as const) {
        if (value.deliveryPlan[key] === undefined) continue;
        const items = value.deliveryPlan[key];
        const identifierRegex = key === 'reviewProfiles' ? PROFILE_NAME_REGEX : RULE_ID_REGEX;
        if (isStringArray(items) && items.length <= 32 && items.every((item) => identifierRegex.test(item))) deliveryPlan[key] = [...new Set(items)];
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: `\`issueLifecycle.deliveryPlan.${key}\` must contain at most 32 safe identifiers.`, path: `issueLifecycle.deliveryPlan.${key}` });
      }
      if (value.deliveryPlan.maxCorrectionAttempts !== undefined) {
        const attempts = value.deliveryPlan.maxCorrectionAttempts;
        if (typeof attempts === 'number' && Number.isInteger(attempts) && attempts >= 0 && attempts <= 5) deliveryPlan.maxCorrectionAttempts = attempts;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.deliveryPlan.maxCorrectionAttempts` must be an integer between 0 and 5.', path: 'issueLifecycle.deliveryPlan.maxCorrectionAttempts' });
      }
      if (value.deliveryPlan.requireHumanApprovalBeforePublish !== undefined) {
        if (typeof value.deliveryPlan.requireHumanApprovalBeforePublish === 'boolean') deliveryPlan.requireHumanApprovalBeforePublish = value.deliveryPlan.requireHumanApprovalBeforePublish;
        else issues.push({ code: 'INVALID_TYPE', severity: 'error', message: '`issueLifecycle.deliveryPlan.requireHumanApprovalBeforePublish` must be a boolean.', path: 'issueLifecycle.deliveryPlan.requireHumanApprovalBeforePublish' });
      }
      lifecycle.deliveryPlan = deliveryPlan;
    }
  }
  return lifecycle;
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

  for (const key of ['ignore', 'sensitive', 'tools', 'packs'] as const) {
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

  if (value.issueLifecycle !== undefined) {
    const lifecycle = validateIssueLifecycle(value.issueLifecycle, issues);
    if (lifecycle) sanitized.issueLifecycle = lifecycle;
  }

  return { sanitized, issues };
}
