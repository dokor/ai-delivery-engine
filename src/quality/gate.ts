import {
  QUALITY_GATE_SCHEMA_VERSION,
  type QualityEvidence,
  type QualityGateFinding,
  type QualityGateInput,
  type QualityGateOverride,
  type QualityGatePolicy,
  type QualityGateReport,
  type QualityProfile,
  type QualityRevalidationCycle,
  type QualitySeverity,
  type QualitySignal,
  type QualitySignalKind,
  type QualitySignalStatus
} from './gate.types.ts';

const SENSITIVE_NAME_PATTERN = /(secret|token|password|passwd|api[_-]?key|credential|authorization)/i;
const INLINE_SECRET_PATTERN =
  /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|CREDENTIAL)[A-Z0-9_]*=)([^\s]+)/gi;
const OPENAI_TOKEN_PATTERN = /\bsk-[A-Za-z0-9_-]{8,}\b/g;
const GITHUB_TOKEN_PATTERN = /\bgh[pousr]_[A-Za-z0-9_]{8,}\b/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function requiredString(value: unknown, field: string): string {
  const stringValue = optionalString(value);
  if (!stringValue) {
    throw new Error(`Invalid quality gate input: "${field}" is required.`);
  }
  return stringValue;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function sanitizeText(value: string): string {
  return value
    .replace(INLINE_SECRET_PATTERN, '$1<masked>')
    .replace(OPENAI_TOKEN_PATTERN, '<masked-token>')
    .replace(GITHUB_TOKEN_PATTERN, '<masked-github-token>');
}

function isSensitiveLabel(...values: Array<string | undefined>): boolean {
  return values.some((value) => Boolean(value && SENSITIVE_NAME_PATTERN.test(value)));
}

function parseSignalKind(value: unknown, field: string): QualitySignalKind {
  if (value !== 'tool' && value !== 'ade-rule' && value !== 'specialist-check' && value !== 'ai-review') {
    throw new Error(`Invalid quality gate input: ${field} is invalid.`);
  }
  return value;
}

function parseSignalStatus(value: unknown, field: string): QualitySignalStatus {
  if (value !== 'passed' && value !== 'failed' && value !== 'warning' && value !== 'skipped') {
    throw new Error(`Invalid quality gate input: ${field} is invalid.`);
  }
  return value;
}

function parseSeverity(value: unknown, field: string): QualitySeverity | undefined {
  if (value === undefined) return undefined;
  if (value !== 'info' && value !== 'warning' && value !== 'error' && value !== 'critical') {
    throw new Error(`Invalid quality gate input: ${field} is invalid.`);
  }
  return value;
}

function parseTarget(value: unknown, field: string): 'staging' | 'production' {
  if (value !== 'staging' && value !== 'production') {
    throw new Error(`Invalid quality gate input: ${field} is invalid.`);
  }
  return value;
}

function parseEvidence(value: unknown, field: string): QualityEvidence[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid quality gate input: ${field}[${index}] must be an object.`);
    }
    return {
      label: sanitizeText(requiredString(entry.label, `${field}[${index}].label`)),
      url: optionalString(entry.url),
      path: optionalString(entry.path),
      log: optionalString(entry.log),
      sensitive: optionalBoolean(entry.sensitive)
    };
  });
}

function parsePolicy(value: unknown): QualityGatePolicy {
  if (!isRecord(value)) {
    throw new Error('Invalid quality gate input: "policy" is required.');
  }
  return {
    target: parseTarget(value.target, 'policy.target'),
    requiredSignalIds: stringArray(value.requiredSignalIds),
    requiredProfiles: stringArray(value.requiredProfiles),
    blockingSeverities: stringArray(value.blockingSeverities).map((severity) =>
      parseSeverity(severity, 'policy.blockingSeverities') ?? 'error'
    ),
    allowHumanOverride: optionalBoolean(value.allowHumanOverride)
  };
}

function parseProfiles(value: unknown): QualityProfile[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid quality gate input: profiles[${index}] must be an object.`);
    }
    return {
      role: sanitizeText(requiredString(entry.role, `profiles[${index}].role`)),
      required: optionalBoolean(entry.required),
      measured: optionalBoolean(entry.measured),
      note: optionalString(entry.note)
    };
  });
}

function parseSignals(value: unknown): QualitySignal[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid quality gate input: "signals" must contain at least one signal.');
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid quality gate input: signals[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `signals[${index}].id`),
      name: sanitizeText(requiredString(entry.name, `signals[${index}].name`)),
      kind: parseSignalKind(entry.kind, `signals[${index}].kind`),
      status: parseSignalStatus(entry.status, `signals[${index}].status`),
      severity: parseSeverity(entry.severity, `signals[${index}].severity`),
      profile: optionalString(entry.profile),
      tool: optionalString(entry.tool),
      provider: optionalString(entry.provider),
      executed: optionalBoolean(entry.executed),
      blocking: optionalBoolean(entry.blocking),
      summary: optionalString(entry.summary),
      evidence: parseEvidence(entry.evidence, `signals[${index}].evidence`)
    };
  });
}

function parseOverrides(value: unknown): QualityGateOverride[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid quality gate input: overrides[${index}] must be an object.`);
    }
    return {
      approved: Boolean(entry.approved),
      by: sanitizeText(requiredString(entry.by, `overrides[${index}].by`)),
      at: requiredString(entry.at, `overrides[${index}].at`),
      reason: sanitizeText(requiredString(entry.reason, `overrides[${index}].reason`)),
      appliesTo: stringArray(entry.appliesTo).map(sanitizeText)
    };
  });
}

function parseCycles(value: unknown): QualityRevalidationCycle[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid quality gate input: revalidationCycles[${index}] must be an object.`);
    }
    const status = entry.status;
    if (status !== 'open' && status !== 'revalidated') {
      throw new Error(`Invalid quality gate input: revalidationCycles[${index}].status is invalid.`);
    }
    return {
      id: sanitizeText(requiredString(entry.id, `revalidationCycles[${index}].id`)),
      status,
      rejectedAt: optionalString(entry.rejectedAt),
      reason: sanitizeText(requiredString(entry.reason, `revalidationCycles[${index}].reason`)),
      fixes: stringArray(entry.fixes).map(sanitizeText),
      revalidatedSignalIds: stringArray(entry.revalidatedSignalIds).map(sanitizeText)
    };
  });
}

export function parseQualityGateInput(value: unknown): QualityGateInput {
  if (!isRecord(value)) {
    throw new Error('Invalid quality gate input: root must be an object.');
  }
  if (value.schemaVersion !== QUALITY_GATE_SCHEMA_VERSION) {
    throw new Error(`Invalid quality gate input: schemaVersion must be ${QUALITY_GATE_SCHEMA_VERSION}.`);
  }
  const target = parseTarget(value.target, 'target');
  const policy = parsePolicy(value.policy);
  if (policy.target !== target) {
    throw new Error('Invalid quality gate input: target and policy.target must match.');
  }
  return {
    schemaVersion: QUALITY_GATE_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: requiredString(value.projectName, 'projectName'),
    target,
    generatedAt: optionalString(value.generatedAt),
    policy,
    profiles: parseProfiles(value.profiles),
    signals: parseSignals(value.signals),
    overrides: parseOverrides(value.overrides),
    revalidationCycles: parseCycles(value.revalidationCycles)
  };
}

function safeEvidence(evidence: QualityEvidence[] = []): QualityEvidence[] {
  return evidence
    .filter((entry) => !entry.sensitive && !isSensitiveLabel(entry.label, entry.url, entry.path, entry.log))
    .map((entry) => ({
      label: sanitizeText(entry.label),
      url: entry.url ? sanitizeText(entry.url) : undefined,
      path: entry.path ? sanitizeText(entry.path) : undefined,
      log: entry.log ? sanitizeText(entry.log) : undefined
    }));
}

function safeSignal(signal: QualitySignal): QualitySignal {
  return {
    ...signal,
    id: sanitizeText(signal.id),
    name: sanitizeText(signal.name),
    profile: signal.profile ? sanitizeText(signal.profile) : undefined,
    tool: signal.tool ? sanitizeText(signal.tool) : undefined,
    provider: signal.provider ? sanitizeText(signal.provider) : undefined,
    summary: signal.summary ? sanitizeText(signal.summary) : undefined,
    evidence: safeEvidence(signal.evidence)
  };
}

function isAiSignal(signal: QualitySignal): boolean {
  return signal.kind === 'ai-review';
}

function signalSeverity(signal: QualitySignal): QualitySeverity {
  if (signal.severity) return signal.severity;
  if (signal.status === 'failed') return 'error';
  if (signal.status === 'warning' || signal.status === 'skipped') return 'warning';
  return 'info';
}

function isBlockingFailure(signal: QualitySignal, policy: QualityGatePolicy): boolean {
  if (isAiSignal(signal) && !signal.blocking) return false;
  if (signal.status !== 'failed') return false;
  if (signal.blocking) return true;
  if ((policy.requiredSignalIds ?? []).includes(signal.id)) return true;
  return (policy.blockingSeverities ?? ['error', 'critical']).includes(signalSeverity(signal));
}

function createFinding(signal: QualitySignal, policy: QualityGatePolicy): QualityGateFinding | undefined {
  const severity = signalSeverity(signal);
  if (signal.status === 'passed') return undefined;
  const blocking = isBlockingFailure(signal, policy);
  return {
    id: `${signal.id}:${signal.status}`,
    signalId: signal.id,
    severity,
    blocking,
    origin: isAiSignal(signal) ? 'ai' : 'deterministic',
    message: `${signal.name}: ${signal.status}${signal.summary ? ` - ${signal.summary}` : ''}`
  };
}

function missingRequiredSignalFindings(signals: QualitySignal[], policy: QualityGatePolicy): QualityGateFinding[] {
  const ids = new Set(signals.map((signal) => signal.id));
  return (policy.requiredSignalIds ?? [])
    .filter((id) => !ids.has(id))
    .map((id) => ({
      id: `missing:${id}`,
      signalId: id,
      severity: 'critical',
      blocking: true,
      origin: 'deterministic',
      message: `Required validation signal "${id}" was not provided.`
    }));
}

function profileRecommendations(profiles: QualityProfile[], signals: QualitySignal[], policy: QualityGatePolicy): string[] {
  const measuredProfiles = new Set(signals.filter((signal) => signal.executed !== false).map((signal) => signal.profile));
  const configuredRequired = new Set(policy.requiredProfiles ?? []);
  const recommendations: string[] = [];

  for (const profile of profiles) {
    const required = profile.required || configuredRequired.has(profile.role);
    const measured = profile.measured !== false && measuredProfiles.has(profile.role);
    if (required && !measured) {
      recommendations.push(
        `Profile "${profile.role}" is required but has no reliable executed measurement; keep it as a recommendation, not a false blocker.`
      );
    }
    if (profile.note) {
      recommendations.push(`Profile "${profile.role}": ${sanitizeText(profile.note)}`);
    }
  }

  return recommendations;
}

function approvedOverrideCovers(overrides: QualityGateOverride[], findingIds: string[]): boolean {
  if (findingIds.length === 0) return false;
  return overrides.some(
    (override) =>
      override.approved &&
      findingIds.every((id) => override.appliesTo.includes(id) || override.appliesTo.includes('*'))
  );
}

function computeNextActions(verdict: QualityGateReport['verdict'], findings: QualityGateFinding[], cycles: QualityRevalidationCycle[]): string[] {
  const actions: string[] = [];
  const blocking = findings.filter((finding) => finding.blocking);
  if (verdict === 'pass') {
    actions.push('Attach the validation report to the run or PR before promotion.');
  }
  if (verdict === 'override-required') {
    actions.push('Record an approved human override that covers every blocking finding before promotion.');
  }
  if (verdict === 'fail') {
    actions.push('Fix blocking validation findings and run targeted revalidation.');
  }
  for (const finding of blocking) {
    actions.push(`Revalidate signal ${finding.signalId ?? finding.id}.`);
  }
  for (const cycle of cycles.filter((entry) => entry.status === 'open')) {
    actions.push(`Close revalidation cycle ${cycle.id}: ${cycle.reason}`);
  }
  return [...new Set(actions.map(sanitizeText))];
}

function executedTools(signals: QualitySignal[]): string[] {
  return [...new Set(signals.filter((signal) => signal.executed !== false && signal.tool).map((signal) => signal.tool as string))]
    .map(sanitizeText)
    .sort();
}

function renderSignal(signal: QualitySignal): string {
  const profile = signal.profile ? `, profile: ${signal.profile}` : '';
  const tool = signal.tool ? `, tool: ${signal.tool}` : '';
  const provider = signal.provider ? `, provider: ${signal.provider}` : '';
  return `- ${signal.status}: ${signal.id} (${signal.kind}${profile}${tool}${provider}) - ${signal.name}`;
}

function renderMarkdown(report: Omit<QualityGateReport, 'markdown'>): string {
  const lines = [
    `# Quality gate - ${report.projectName}`,
    '',
    '## Summary',
    `- Run: ${report.runId}`,
    `- Target: ${report.target}`,
    `- Verdict: ${report.verdict}`,
    `- Override used: ${report.overrideUsed ? 'yes' : 'no'}`,
    '',
    '## Profiles',
    ...(report.profiles.length
      ? report.profiles.map((profile) => `- ${profile.role}: required=${profile.required ? 'yes' : 'no'}, measured=${profile.measured === false ? 'no' : 'yes'}`)
      : ['- none']),
    '',
    '## Executed Tools',
    ...(report.executedTools.length ? report.executedTools.map((tool) => `- ${tool}`) : ['- none']),
    '',
    '## Deterministic Results',
    ...(report.deterministicResults.length ? report.deterministicResults.map(renderSignal) : ['- none']),
    '',
    '## AI Assisted Results',
    ...(report.aiResults.length ? report.aiResults.map(renderSignal) : ['- none']),
    '',
    '## Blocking Findings',
    ...(report.findings.filter((finding) => finding.blocking).length
      ? report.findings.filter((finding) => finding.blocking).map((finding) => `- ${finding.id}: ${finding.message}`)
      : ['- none']),
    '',
    '## Recommendations',
    ...(report.recommendations.length ? report.recommendations.map((item) => `- ${item}`) : ['- none']),
    '',
    '## Overrides',
    ...(report.overrides.length
      ? report.overrides.map((override) => `- ${override.approved ? 'approved' : 'pending'} by ${override.by} at ${override.at}: ${override.reason}`)
      : ['- none']),
    '',
    '## Revalidation Cycles',
    ...(report.revalidationCycles.length
      ? report.revalidationCycles.map((cycle) => `- ${cycle.status}: ${cycle.id} - ${cycle.reason}`)
      : ['- none']),
    '',
    '## Next Actions',
    ...report.nextActions.map((action) => `- ${action}`)
  ];
  return `${lines.join('\n')}\n`;
}

export function evaluateQualityGate(input: QualityGateInput, generatedAt = new Date().toISOString()): QualityGateReport {
  const signals = input.signals.map(safeSignal);
  const deterministicResults = signals.filter((signal) => !isAiSignal(signal));
  const aiResults = signals.filter(isAiSignal);
  const findings = [
    ...signals.map((signal) => createFinding(signal, input.policy)).filter((finding): finding is QualityGateFinding => Boolean(finding)),
    ...missingRequiredSignalFindings(signals, input.policy)
  ];
  const blockingFindings = findings.filter((finding) => finding.blocking);
  const blockingIds = blockingFindings.map((finding) => finding.id);
  const overrides = (input.overrides ?? []).map((override) => ({
    ...override,
    by: sanitizeText(override.by),
    reason: sanitizeText(override.reason),
    appliesTo: override.appliesTo.map(sanitizeText)
  }));
  const overrideUsed = approvedOverrideCovers(overrides, blockingIds);
  const verdict: QualityGateReport['verdict'] =
    blockingFindings.length === 0
      ? 'pass'
      : overrideUsed
        ? 'pass'
        : input.policy.allowHumanOverride
          ? 'override-required'
          : 'fail';
  const recommendations = [
    ...findings.filter((finding) => !finding.blocking).map((finding) => finding.message),
    ...profileRecommendations(input.profiles, signals, input.policy)
  ].map(sanitizeText);
  const revalidationCycles = input.revalidationCycles ?? [];
  const reportWithoutMarkdown = {
    schemaVersion: QUALITY_GATE_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    target: input.target,
    verdict,
    overrideUsed,
    profiles: input.profiles.map((profile) => ({ ...profile, role: sanitizeText(profile.role), note: profile.note ? sanitizeText(profile.note) : undefined })),
    executedTools: executedTools(signals),
    deterministicResults,
    aiResults,
    findings: findings.map((finding) => ({ ...finding, message: sanitizeText(finding.message) })),
    recommendations,
    nextActions: computeNextActions(verdict, findings, revalidationCycles),
    overrides,
    revalidationCycles: revalidationCycles.map((cycle) => ({
      ...cycle,
      id: sanitizeText(cycle.id),
      reason: sanitizeText(cycle.reason),
      fixes: (cycle.fixes ?? []).map(sanitizeText),
      revalidatedSignalIds: (cycle.revalidatedSignalIds ?? []).map(sanitizeText)
    }))
  };

  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown)
  };
}
