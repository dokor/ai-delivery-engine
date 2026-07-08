import {
  DELIVERY_CLOSURE_SCHEMA_VERSION,
  type DeliveryArtifact,
  type DeliveryBudgetEntry,
  type DeliveryClosureInput,
  type DeliveryClosureResult,
  type DeliveryDecision,
  type DeliveryEnvironment,
  type DeliveryEvidence,
  type DeliveryOperations,
  type DeliveryRepository,
  type DeliveryValidation,
  type DeliveryVariable
} from './closure.types.ts';

const SENSITIVE_NAME_PATTERN = /(secret|token|password|passwd|api[_-]?key|credential|authorization)/i;
const INLINE_SECRET_PATTERN =
  /\b([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|CREDENTIAL)[A-Z0-9_]*=)([^\s]+)/gi;
const OPENAI_TOKEN_PATTERN = /\bsk-[A-Za-z0-9_-]{8,}\b/g;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

function requiredString(value: unknown, field: string): string {
  const stringValue = optionalString(value);
  if (!stringValue) {
    throw new Error(`Invalid delivery closure input: "${field}" is required.`);
  }
  return stringValue;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function hasApprovedDecision(decisions: DeliveryDecision[], decisionId: string | undefined): boolean {
  return Boolean(decisionId && decisions.some((decision) => decision.id === decisionId && decision.status === 'approved'));
}

function sanitizeText(value: string): string {
  return value
    .replace(INLINE_SECRET_PATTERN, '$1<masked>')
    .replace(OPENAI_TOKEN_PATTERN, '<masked-token>');
}

function isSensitiveLabel(...values: Array<string | undefined>): boolean {
  return values.some((value) => Boolean(value && SENSITIVE_NAME_PATTERN.test(value)));
}

function safeLine(value: string | undefined, fallback = 'not provided'): string {
  return value ? sanitizeText(value) : fallback;
}

function parseRepository(value: unknown): DeliveryRepository {
  if (!isRecord(value)) {
    return {};
  }

  const access = optionalString(value.access);
  return {
    url: optionalString(value.url),
    branch: optionalString(value.branch),
    commit: optionalString(value.commit),
    pullRequestUrl: optionalString(value.pullRequestUrl),
    releaseUrl: optionalString(value.releaseUrl),
    access: access === 'verified' || access === 'pending' || access === 'missing' ? access : undefined
  };
}

function parseEnvironment(value: unknown): DeliveryEnvironment | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const status = value.status;
  if (status !== 'validated' && status !== 'pending' && status !== 'missing' && status !== 'exception') {
    throw new Error('Invalid delivery closure input: environment status is invalid.');
  }

  return {
    url: optionalString(value.url),
    status,
    decisionId: optionalString(value.decisionId),
    exceptionReason: optionalString(value.exceptionReason)
  };
}

function parseValidations(value: unknown): DeliveryValidation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: validations[${index}] must be an object.`);
    }

    const status = entry.status;
    if (status !== 'passed' && status !== 'failed' && status !== 'skipped') {
      throw new Error(`Invalid delivery closure input: validations[${index}].status is invalid.`);
    }

    return {
      name: requiredString(entry.name, `validations[${index}].name`),
      status,
      evidenceRef: optionalString(entry.evidenceRef),
      decisionId: optionalString(entry.decisionId),
      details: optionalString(entry.details)
    };
  });
}

function parseDecisions(value: unknown): DeliveryDecision[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: decisions[${index}] must be an object.`);
    }

    const status = entry.status;
    if (status !== 'approved' && status !== 'pending' && status !== 'rejected') {
      throw new Error(`Invalid delivery closure input: decisions[${index}].status is invalid.`);
    }

    return {
      id: requiredString(entry.id, `decisions[${index}].id`),
      status,
      summary: sanitizeText(requiredString(entry.summary, `decisions[${index}].summary`))
    };
  });
}

function parseArtifacts(value: unknown): DeliveryArtifact[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: artifacts[${index}] must be an object.`);
    }

    const kind = entry.kind;
    if (
      kind !== 'architecture' &&
      kind !== 'runbook' &&
      kind !== 'monitoring' &&
      kind !== 'rollback' &&
      kind !== 'release-note' &&
      kind !== 'other'
    ) {
      throw new Error(`Invalid delivery closure input: artifacts[${index}].kind is invalid.`);
    }

    return {
      title: sanitizeText(requiredString(entry.title, `artifacts[${index}].title`)),
      path: optionalString(entry.path),
      url: optionalString(entry.url),
      kind,
      sensitive: optionalBoolean(entry.sensitive)
    };
  });
}

function parseVariables(value: unknown): DeliveryVariable[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: operations.variables[${index}] must be an object.`);
    }

    return {
      name: requiredString(entry.name, `operations.variables[${index}].name`),
      required: optionalBoolean(entry.required),
      description: optionalString(entry.description),
      sensitive: optionalBoolean(entry.sensitive),
      value: optionalString(entry.value)
    };
  });
}

function parseOperations(value: unknown): DeliveryOperations {
  if (!isRecord(value)) {
    return {};
  }

  return {
    architecture: optionalString(value.architecture),
    localRunbook: optionalString(value.localRunbook),
    deployment: optionalString(value.deployment),
    monitoring: optionalString(value.monitoring),
    rollback: optionalString(value.rollback),
    variables: parseVariables(value.variables)
  };
}

function parseBudgets(value: unknown): DeliveryBudgetEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: budgets[${index}] must be an object.`);
    }

    return {
      label: sanitizeText(requiredString(entry.label, `budgets[${index}].label`)),
      amount: optionalNumber(entry.amount),
      unit: optionalString(entry.unit),
      recurring: optionalBoolean(entry.recurring),
      note: optionalString(entry.note)
    };
  });
}

function parseEvidence(value: unknown): DeliveryEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delivery closure input: evidence[${index}] must be an object.`);
    }

    const kind = entry.kind;
    if (
      kind !== 'repository' &&
      kind !== 'branch' &&
      kind !== 'commit' &&
      kind !== 'pull-request' &&
      kind !== 'release' &&
      kind !== 'staging' &&
      kind !== 'production' &&
      kind !== 'validation' &&
      kind !== 'decision' &&
      kind !== 'budget' &&
      kind !== 'artifact'
    ) {
      throw new Error(`Invalid delivery closure input: evidence[${index}].kind is invalid.`);
    }

    return {
      id: requiredString(entry.id, `evidence[${index}].id`),
      kind,
      label: sanitizeText(requiredString(entry.label, `evidence[${index}].label`)),
      url: optionalString(entry.url),
      ref: optionalString(entry.ref),
      sensitive: optionalBoolean(entry.sensitive)
    };
  });
}

export function parseDeliveryClosureInput(value: unknown): DeliveryClosureInput {
  if (!isRecord(value)) {
    throw new Error('Invalid delivery closure input: root must be an object.');
  }

  if (value.schemaVersion !== DELIVERY_CLOSURE_SCHEMA_VERSION) {
    throw new Error(`Invalid delivery closure input: schemaVersion must be ${DELIVERY_CLOSURE_SCHEMA_VERSION}.`);
  }

  return {
    schemaVersion: DELIVERY_CLOSURE_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: requiredString(value.projectName, 'projectName'),
    repository: parseRepository(value.repository),
    staging: parseEnvironment(value.staging),
    production: parseEnvironment(value.production),
    validations: parseValidations(value.validations),
    decisions: parseDecisions(value.decisions),
    artifacts: parseArtifacts(value.artifacts),
    operations: parseOperations(value.operations),
    budgets: parseBudgets(value.budgets),
    risks: stringArray(value.risks).map(sanitizeText),
    manualActions: stringArray(value.manualActions).map(sanitizeText),
    evidence: parseEvidence(value.evidence)
  };
}

function safeArtifacts(artifacts: DeliveryArtifact[]): DeliveryArtifact[] {
  return artifacts
    .filter((artifact) => !artifact.sensitive && !isSensitiveLabel(artifact.title, artifact.path, artifact.url))
    .map((artifact) => ({
      ...artifact,
      title: sanitizeText(artifact.title),
      path: artifact.path ? sanitizeText(artifact.path) : undefined,
      url: artifact.url ? sanitizeText(artifact.url) : undefined
    }));
}

function safeVariables(variables: DeliveryVariable[] | undefined): DeliveryVariable[] {
  return (variables ?? []).map((variable) => ({
    name: variable.name,
    required: variable.required,
    description: variable.description ? sanitizeText(variable.description) : undefined,
    sensitive: variable.sensitive ?? isSensitiveLabel(variable.name),
    value: undefined
  }));
}

function safeOperations(operations: DeliveryOperations): DeliveryOperations {
  return {
    architecture: operations.architecture ? sanitizeText(operations.architecture) : undefined,
    localRunbook: operations.localRunbook ? sanitizeText(operations.localRunbook) : undefined,
    deployment: operations.deployment ? sanitizeText(operations.deployment) : undefined,
    monitoring: operations.monitoring ? sanitizeText(operations.monitoring) : undefined,
    rollback: operations.rollback ? sanitizeText(operations.rollback) : undefined,
    variables: safeVariables(operations.variables)
  };
}

function safeRepository(repository: DeliveryRepository): DeliveryRepository {
  return {
    url: repository.url ? sanitizeText(repository.url) : undefined,
    branch: repository.branch ? sanitizeText(repository.branch) : undefined,
    commit: repository.commit ? sanitizeText(repository.commit) : undefined,
    pullRequestUrl: repository.pullRequestUrl ? sanitizeText(repository.pullRequestUrl) : undefined,
    releaseUrl: repository.releaseUrl ? sanitizeText(repository.releaseUrl) : undefined,
    access: repository.access
  };
}

function safeEnvironment(environment: DeliveryEnvironment | undefined): DeliveryEnvironment | undefined {
  if (!environment) {
    return undefined;
  }

  return {
    url: environment.url ? sanitizeText(environment.url) : undefined,
    status: environment.status,
    decisionId: environment.decisionId ? sanitizeText(environment.decisionId) : undefined,
    exceptionReason: environment.exceptionReason ? sanitizeText(environment.exceptionReason) : undefined
  };
}

function safeValidations(validations: DeliveryValidation[]): DeliveryValidation[] {
  return validations.map((validation) => ({
    name: sanitizeText(validation.name),
    status: validation.status,
    evidenceRef: validation.evidenceRef ? sanitizeText(validation.evidenceRef) : undefined,
    decisionId: validation.decisionId ? sanitizeText(validation.decisionId) : undefined,
    details: validation.details ? sanitizeText(validation.details) : undefined
  }));
}

function safeDecisions(decisions: DeliveryDecision[]): DeliveryDecision[] {
  return decisions.map((decision) => ({
    id: sanitizeText(decision.id),
    status: decision.status,
    summary: sanitizeText(decision.summary)
  }));
}

function safeEvidence(evidence: DeliveryEvidence[]): DeliveryEvidence[] {
  return evidence
    .filter((entry) => !entry.sensitive && !isSensitiveLabel(entry.id, entry.label, entry.ref, entry.url))
    .map((entry) => ({
      ...entry,
      label: sanitizeText(entry.label),
      ref: entry.ref ? sanitizeText(entry.ref) : undefined,
      url: entry.url ? sanitizeText(entry.url) : undefined
    }));
}

function evaluateMissingEvidence(input: DeliveryClosureInput): string[] {
  const missing: string[] = [];
  const decisions = input.decisions ?? [];
  const repository = input.repository ?? {};
  const production = input.production;
  const validations = input.validations ?? [];
  const operations = input.operations ?? {};

  if (!repository.url) {
    missing.push('repository.url');
  }
  if (!repository.branch) {
    missing.push('repository.branch');
  }
  if (!repository.commit && !repository.pullRequestUrl && !repository.releaseUrl) {
    missing.push('repository.commit or repository.pullRequestUrl or repository.releaseUrl');
  }
  if (repository.access === 'missing' || repository.access === 'pending') {
    missing.push('repository.access verified');
  }

  const productionExceptionApproved =
    production?.status === 'exception' &&
    Boolean(production.exceptionReason) &&
    hasApprovedDecision(decisions, production.decisionId);

  if (!production) {
    missing.push('production evidence');
  } else if (production.status === 'validated') {
    if (!production.url) {
      missing.push('production.url');
    }
  } else if (!productionExceptionApproved) {
    missing.push('production validated or approved exception');
  }

  if (validations.length === 0) {
    missing.push('validation evidence');
  }

  for (const validation of validations) {
    const exceptionApproved = hasApprovedDecision(decisions, validation.decisionId);
    if (validation.status !== 'passed' && !exceptionApproved) {
      missing.push(`validation.${validation.name} passed or approved exception`);
    }
  }

  for (const decision of decisions) {
    if (decision.status === 'pending') {
      missing.push(`decision.${decision.id} approved or resolved`);
    }
  }

  if (!operations.architecture) {
    missing.push('operations.architecture');
  }
  if (!operations.localRunbook) {
    missing.push('operations.localRunbook');
  }
  if (!operations.deployment) {
    missing.push('operations.deployment');
  }
  if (!operations.monitoring) {
    missing.push('operations.monitoring');
  }
  if (!operations.rollback) {
    missing.push('operations.rollback');
  }

  return missing.map(sanitizeText);
}

function buildCompletedItems(input: DeliveryClosureInput): string[] {
  const items: string[] = [];
  const repository = input.repository ?? {};
  const production = input.production;

  if (repository.url) {
    items.push(`Repository: ${repository.url}`);
  }
  if (repository.branch) {
    items.push(`Branch: ${repository.branch}`);
  }
  if (repository.commit) {
    items.push(`Commit: ${repository.commit}`);
  }
  if (repository.pullRequestUrl) {
    items.push(`Pull request: ${repository.pullRequestUrl}`);
  }
  if (repository.releaseUrl) {
    items.push(`Release: ${repository.releaseUrl}`);
  }
  if (input.staging?.url) {
    items.push(`Staging: ${input.staging.url}`);
  }
  if (production?.status === 'validated' && production.url) {
    items.push(`Production: ${production.url}`);
  }
  if (production?.status === 'exception') {
    items.push(`Production exception: ${production.exceptionReason ?? 'approved exception'}`);
  }

  return items.map(sanitizeText);
}

function buildNextActions(missingEvidence: string[]): string[] {
  return missingEvidence.map((missing) => `Provide or approve: ${missing}`);
}

function renderList(values: string[], empty = 'none'): string[] {
  return values.length === 0 ? [`- ${empty}`] : values.map((value) => `- ${sanitizeText(value)}`);
}

function renderValidation(validation: DeliveryValidation): string {
  const suffix = validation.decisionId ? ` (decision: ${validation.decisionId})` : '';
  const evidence = validation.evidenceRef ? `, evidence: ${validation.evidenceRef}` : '';
  return `- ${validation.name}: ${validation.status}${evidence}${suffix}`;
}

function renderBudget(budget: DeliveryBudgetEntry): string {
  const amount = budget.amount !== undefined && budget.unit ? `: ${budget.amount} ${budget.unit}` : '';
  const recurring = budget.recurring ? ' recurring' : '';
  const note = budget.note ? ` - ${sanitizeText(budget.note)}` : '';
  return `- ${budget.label}${amount}${recurring}${note}`;
}

function renderVariable(variable: DeliveryVariable): string {
  const required = variable.required ? 'required' : 'optional';
  const sensitivity = variable.sensitive ? ', sensitive value masked' : ', value not rendered';
  const description = variable.description ? ` - ${variable.description}` : '';
  return `- ${variable.name}: ${required}${sensitivity}${description}`;
}

function buildNotification(
  input: DeliveryClosureInput,
  status: DeliveryClosureResult['status'],
  completedItems: string[],
  missingEvidence: string[],
  safeBudgets: DeliveryBudgetEntry[]
): string {
  const title = status === 'completed' ? 'Projet livre' : 'Run en attente';
  const lines = [
    title,
    `- Projet : ${sanitizeText(input.projectName)}`,
    `- Run : ${sanitizeText(input.runId)}`,
    `- Statut : ${status}`,
    '',
    'Termine',
    ...renderList(completedItems, 'aucune preuve complete pour le moment'),
    '',
    'Elements manuels restants',
    ...renderList(input.manualActions ?? [], missingEvidence.length === 0 ? 'aucun' : 'voir preuves manquantes'),
    '',
    'Preuves manquantes',
    ...renderList(missingEvidence),
    '',
    'Risques',
    ...renderList(input.risks ?? []),
    '',
    'Couts recurrents',
    ...(safeBudgets.filter((budget) => budget.recurring).length === 0
      ? ['- none']
      : safeBudgets.filter((budget) => budget.recurring).map(renderBudget))
  ];

  return `${lines.join('\n')}\n`;
}

function buildOpsDossier(
  input: DeliveryClosureInput,
  status: DeliveryClosureResult['status'],
  completedItems: string[],
  missingEvidence: string[],
  operations: DeliveryOperations,
  artifacts: DeliveryArtifact[],
  evidence: DeliveryEvidence[],
  budgets: DeliveryBudgetEntry[]
): string {
  const variables = operations.variables ?? [];
  const lines = [
    `# Delivery dossier - ${sanitizeText(input.projectName)}`,
    '',
    '## Summary',
    `- Run: ${sanitizeText(input.runId)}`,
    `- Status: ${status}`,
    ...renderList(completedItems, 'no completed delivery evidence'),
    '',
    '## Missing Evidence',
    ...renderList(missingEvidence),
    '',
    '## Repository',
    `- URL: ${safeLine(input.repository?.url)}`,
    `- Branch: ${safeLine(input.repository?.branch)}`,
    `- Commit: ${safeLine(input.repository?.commit)}`,
    `- Pull request: ${safeLine(input.repository?.pullRequestUrl)}`,
    `- Release: ${safeLine(input.repository?.releaseUrl)}`,
    '',
    '## Environments',
    `- Staging: ${safeLine(input.staging?.url)} (${input.staging?.status ?? 'not provided'})`,
    `- Production: ${safeLine(input.production?.url)} (${input.production?.status ?? 'not provided'})`,
    '',
    '## Validation',
    ...(input.validations?.length ? input.validations.map(renderValidation) : ['- none']),
    '',
    '## Operations',
    `- Architecture: ${safeLine(operations.architecture)}`,
    `- Local runbook: ${safeLine(operations.localRunbook)}`,
    `- Deployment: ${safeLine(operations.deployment)}`,
    `- Monitoring: ${safeLine(operations.monitoring)}`,
    `- Rollback: ${safeLine(operations.rollback)}`,
    '',
    '## Variables To Configure',
    ...(variables.length ? variables.map(renderVariable) : ['- none']),
    '',
    '## Artifacts',
    ...(artifacts.length
      ? artifacts.map((artifact) => `- ${artifact.title} (${artifact.kind}): ${artifact.path ?? artifact.url ?? 'no link'}`)
      : ['- none']),
    '',
    '## Evidence',
    ...(evidence.length
      ? evidence.map((entry) => `- ${entry.label} (${entry.kind}): ${entry.url ?? entry.ref ?? entry.id}`)
      : ['- none']),
    '',
    '## Risks',
    ...renderList(input.risks ?? []),
    '',
    '## Manual Actions',
    ...renderList(input.manualActions ?? []),
    '',
    '## Recurring Costs',
    ...(budgets.filter((budget) => budget.recurring).length === 0
      ? ['- none']
      : budgets.filter((budget) => budget.recurring).map(renderBudget))
  ];

  return `${lines.join('\n')}\n`;
}

export function closeDeliveryRun(input: DeliveryClosureInput, generatedAt = new Date().toISOString()): DeliveryClosureResult {
  const missingEvidence = evaluateMissingEvidence(input);
  const status = missingEvidence.length === 0 ? 'completed' : 'waiting';
  const completedItems = buildCompletedItems(input);
  const operations = safeOperations(input.operations ?? {});
  const repository = safeRepository(input.repository ?? {});
  const staging = safeEnvironment(input.staging);
  const production = safeEnvironment(input.production);
  const validations = safeValidations(input.validations ?? []);
  const decisions = safeDecisions(input.decisions ?? []);
  const artifacts = safeArtifacts(input.artifacts ?? []);
  const evidence = safeEvidence(input.evidence ?? []);
  const budgets = (input.budgets ?? []).map((budget) => ({
    ...budget,
    label: sanitizeText(budget.label),
    note: budget.note ? sanitizeText(budget.note) : undefined
  }));

  return {
    schemaVersion: DELIVERY_CLOSURE_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    status,
    completedItems,
    missingEvidence,
    nextActions: buildNextActions(missingEvidence),
    repository,
    staging,
    production,
    validations,
    decisions,
    artifacts,
    operations,
    budgets,
    risks: (input.risks ?? []).map(sanitizeText),
    manualActions: (input.manualActions ?? []).map(sanitizeText),
    evidence,
    notification: buildNotification(input, status, completedItems, missingEvidence, budgets),
    opsDossier: buildOpsDossier(input, status, completedItems, missingEvidence, operations, artifacts, evidence, budgets)
  };
}
