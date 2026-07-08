import {
  RUN_OBSERVABILITY_SCHEMA_VERSION,
  type ObservableRunInput,
  type ObservableRunReport,
  type ObservableRunStatus,
  type RunBudgetSummary,
  type RunControlActionTrace,
  type RunCost,
  type RunDecisionTrace,
  type RunLink,
  type RunNodeAttempt,
  type RunNodeStatus,
  type RunNodeTrace,
  type RunTimelineEntry
} from './run.types.ts';

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
    throw new Error(`Invalid observable run input: "${field}" is required.`);
  }
  return stringValue;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
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

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
}

function parseCost(value: unknown): RunCost {
  if (!isRecord(value)) {
    return {};
  }

  return {
    tokensIn: optionalNumber(value.tokensIn),
    tokensOut: optionalNumber(value.tokensOut),
    estimatedCost: optionalNumber(value.estimatedCost),
    currency: optionalString(value.currency)
  };
}

function parseLink(value: unknown, field: string): RunLink {
  if (!isRecord(value)) {
    throw new Error(`Invalid observable run input: ${field} must be an object.`);
  }

  const kind = value.kind;
  if (
    kind !== 'github' &&
    kind !== 'pull-request' &&
    kind !== 'staging' &&
    kind !== 'production' &&
    kind !== 'validation' &&
    kind !== 'artifact' &&
    kind !== 'other'
  ) {
    throw new Error(`Invalid observable run input: ${field}.kind is invalid.`);
  }

  return {
    label: sanitizeText(requiredString(value.label, `${field}.label`)),
    url: optionalString(value.url),
    path: optionalString(value.path),
    kind,
    sensitive: optionalBoolean(value.sensitive)
  };
}

function parseLinks(value: unknown, field: string): RunLink[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry, index) => parseLink(entry, `${field}[${index}]`));
}

function parseAttempt(value: unknown, field: string): RunNodeAttempt {
  if (!isRecord(value)) {
    throw new Error(`Invalid observable run input: ${field} must be an object.`);
  }

  const status = value.status;
  if (status !== 'completed' && status !== 'error' && status !== 'cancelled') {
    throw new Error(`Invalid observable run input: ${field}.status is invalid.`);
  }

  return {
    attempt: optionalNumber(value.attempt) ?? 1,
    status,
    startedAt: optionalString(value.startedAt),
    endedAt: optionalString(value.endedAt),
    durationMs: optionalNumber(value.durationMs),
    summary: optionalString(value.summary),
    logs: stringArray(value.logs),
    error: optionalString(value.error),
    cost: parseCost(value.cost)
  };
}

function parseAttempts(value: unknown, field: string): RunNodeAttempt[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry, index) => parseAttempt(entry, `${field}[${index}]`));
}

function parseStatus(value: unknown, field: string): RunNodeStatus {
  if (
    value !== 'completed' &&
    value !== 'ready' &&
    value !== 'running' &&
    value !== 'blocked' &&
    value !== 'waiting_decision' &&
    value !== 'error' &&
    value !== 'cancelled' &&
    value !== 'skipped'
  ) {
    throw new Error(`Invalid observable run input: ${field} is invalid.`);
  }
  return value;
}

function parseNodes(value: unknown): RunNodeTrace[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid observable run input: "nodes" must contain at least one node.');
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid observable run input: nodes[${index}] must be an object.`);
    }

    return {
      id: requiredString(entry.id, `nodes[${index}].id`),
      title: requiredString(entry.title, `nodes[${index}].title`),
      role: requiredString(entry.role, `nodes[${index}].role`),
      provider: optionalString(entry.provider),
      status: parseStatus(entry.status, `nodes[${index}].status`),
      dependsOn: stringArray(entry.dependsOn),
      startedAt: optionalString(entry.startedAt),
      endedAt: optionalString(entry.endedAt),
      durationMs: optionalNumber(entry.durationMs),
      summary: optionalString(entry.summary),
      logs: stringArray(entry.logs),
      error: optionalString(entry.error),
      artifacts: parseLinks(entry.artifacts, `nodes[${index}].artifacts`),
      links: parseLinks(entry.links, `nodes[${index}].links`),
      cost: parseCost(entry.cost),
      attempts: parseAttempts(entry.attempts, `nodes[${index}].attempts`)
    };
  });
}

function parseDecisions(value: unknown): RunDecisionTrace[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid observable run input: decisions[${index}] must be an object.`);
    }

    const status = entry.status;
    if (status !== 'pending' && status !== 'resolved' && status !== 'rejected') {
      throw new Error(`Invalid observable run input: decisions[${index}].status is invalid.`);
    }

    return {
      id: requiredString(entry.id, `decisions[${index}].id`),
      nodeId: requiredString(entry.nodeId, `decisions[${index}].nodeId`),
      question: sanitizeText(requiredString(entry.question, `decisions[${index}].question`)),
      status,
      selectedOption: optionalString(entry.selectedOption),
      resolvedAt: optionalString(entry.resolvedAt)
    };
  });
}

function parseControls(value: unknown): RunControlActionTrace[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid observable run input: controls[${index}] must be an object.`);
    }

    const type = entry.type;
    if (
      type !== 'pause' &&
      type !== 'resume' &&
      type !== 'retry' &&
      type !== 'cancel' &&
      type !== 'request_review' &&
      type !== 'takeover'
    ) {
      throw new Error(`Invalid observable run input: controls[${index}].type is invalid.`);
    }

    const requestedBy = entry.requestedBy;
    if (requestedBy !== 'system' && requestedBy !== 'human') {
      throw new Error(`Invalid observable run input: controls[${index}].requestedBy is invalid.`);
    }

    const result = entry.result;
    if (result !== 'accepted' && result !== 'rejected' && result !== 'pending') {
      throw new Error(`Invalid observable run input: controls[${index}].result is invalid.`);
    }

    return {
      id: requiredString(entry.id, `controls[${index}].id`),
      type,
      nodeId: optionalString(entry.nodeId),
      requestedBy,
      at: requiredString(entry.at, `controls[${index}].at`),
      reason: sanitizeText(requiredString(entry.reason, `controls[${index}].reason`)),
      result
    };
  });
}

function parseBudget(value: unknown): ObservableRunInput['budget'] {
  if (!isRecord(value)) {
    return {};
  }

  return {
    tokenBudget: optionalNumber(value.tokenBudget),
    costBudget: optionalNumber(value.costBudget),
    currency: optionalString(value.currency),
    alertThresholdPercent: optionalNumber(value.alertThresholdPercent),
    pauseOnThreshold: optionalBoolean(value.pauseOnThreshold)
  };
}

export function parseObservableRunInput(value: unknown): ObservableRunInput {
  if (!isRecord(value)) {
    throw new Error('Invalid observable run input: root must be an object.');
  }

  if (value.schemaVersion !== RUN_OBSERVABILITY_SCHEMA_VERSION) {
    throw new Error(`Invalid observable run input: schemaVersion must be ${RUN_OBSERVABILITY_SCHEMA_VERSION}.`);
  }

  return {
    schemaVersion: RUN_OBSERVABILITY_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: requiredString(value.projectName, 'projectName'),
    generatedAt: optionalString(value.generatedAt),
    nodes: parseNodes(value.nodes),
    decisions: parseDecisions(value.decisions),
    controls: parseControls(value.controls),
    budget: parseBudget(value.budget)
  };
}

function totalTokens(cost: RunCost | undefined): number {
  return (cost?.tokensIn ?? 0) + (cost?.tokensOut ?? 0);
}

function emptyCost(currency = 'USD'): Required<RunCost> {
  return { tokensIn: 0, tokensOut: 0, estimatedCost: 0, currency };
}

function addCost(left: Required<RunCost>, right: RunCost | undefined): Required<RunCost> {
  return {
    tokensIn: left.tokensIn + (right?.tokensIn ?? 0),
    tokensOut: left.tokensOut + (right?.tokensOut ?? 0),
    estimatedCost: left.estimatedCost + (right?.estimatedCost ?? 0),
    currency: right?.currency ?? left.currency
  };
}

function safeLinks(links: RunLink[]): RunLink[] {
  return links
    .filter((link) => !link.sensitive && !isSensitiveLabel(link.label, link.url, link.path))
    .map((link) => ({
      label: sanitizeText(link.label),
      url: link.url ? sanitizeText(link.url) : undefined,
      path: link.path ? sanitizeText(link.path) : undefined,
      kind: link.kind
    }));
}

function safeAttempts(attempts: RunNodeAttempt[], currency: string): RunNodeAttempt[] {
  return attempts.map((attempt) => ({
    attempt: attempt.attempt,
    status: attempt.status,
    startedAt: attempt.startedAt,
    endedAt: attempt.endedAt,
    durationMs: attempt.durationMs,
    summary: attempt.summary ? sanitizeText(attempt.summary) : undefined,
    logs: (attempt.logs ?? []).map(sanitizeText),
    error: attempt.error ? sanitizeText(attempt.error) : undefined,
    cost: { ...emptyCost(currency), ...attempt.cost, currency: attempt.cost?.currency ?? currency }
  }));
}

function toTimelineEntry(node: RunNodeTrace, currency: string): RunTimelineEntry {
  const attempts = safeAttempts(node.attempts ?? [], currency);
  const cost = attempts.reduce((sum, attempt) => addCost(sum, attempt.cost), {
    ...emptyCost(currency),
    ...node.cost,
    currency: node.cost?.currency ?? currency
  });

  return {
    nodeId: sanitizeText(node.id),
    title: sanitizeText(node.title),
    role: sanitizeText(node.role),
    provider: node.provider ? sanitizeText(node.provider) : undefined,
    status: node.status,
    durationMs: node.durationMs,
    dependsOn: (node.dependsOn ?? []).map(sanitizeText),
    summary: node.summary ? sanitizeText(node.summary) : undefined,
    logs: (node.logs ?? []).map(sanitizeText),
    error: node.error ? sanitizeText(node.error) : undefined,
    artifacts: safeLinks(node.artifacts ?? []),
    links: safeLinks(node.links ?? []),
    attempts,
    cost
  };
}

function percent(used: number, budget: number | undefined): number | undefined {
  if (!budget || budget <= 0) {
    return undefined;
  }
  return Math.round((used / budget) * 100);
}

function summarizeBudget(timeline: RunTimelineEntry[], input: ObservableRunInput): RunBudgetSummary {
  const currency = input.budget?.currency ?? 'USD';
  const totals = timeline.reduce((sum, node) => addCost(sum, node.cost), emptyCost(currency));
  const tokensUsed = totalTokens(totals);
  const alertThresholdPercent = input.budget?.alertThresholdPercent ?? 80;
  const tokenPercent = percent(tokensUsed, input.budget?.tokenBudget);
  const costPercent = percent(totals.estimatedCost, input.budget?.costBudget);
  const highestPercent = Math.max(tokenPercent ?? 0, costPercent ?? 0);
  const alert = highestPercent >= alertThresholdPercent;

  const byRole = new Map<string, { role: string; tokensUsed: number; estimatedCost: number }>();
  const byProvider = new Map<string, { provider: string; tokensUsed: number; estimatedCost: number }>();

  for (const node of timeline) {
    const role = byRole.get(node.role) ?? { role: node.role, tokensUsed: 0, estimatedCost: 0 };
    role.tokensUsed += totalTokens(node.cost);
    role.estimatedCost += node.cost.estimatedCost;
    byRole.set(node.role, role);

    const providerName = node.provider ?? 'unknown';
    const provider = byProvider.get(providerName) ?? { provider: providerName, tokensUsed: 0, estimatedCost: 0 };
    provider.tokensUsed += totalTokens(node.cost);
    provider.estimatedCost += node.cost.estimatedCost;
    byProvider.set(providerName, provider);
  }

  return {
    tokensUsed,
    tokenBudget: input.budget?.tokenBudget,
    tokenPercent,
    estimatedCost: Number(totals.estimatedCost.toFixed(6)),
    costBudget: input.budget?.costBudget,
    costPercent,
    currency,
    alertThresholdPercent,
    alert,
    pauseRecommended: alert && Boolean(input.budget?.pauseOnThreshold),
    byRole: [...byRole.values()].sort((left, right) => left.role.localeCompare(right.role)),
    byProvider: [...byProvider.values()].sort((left, right) => left.provider.localeCompare(right.provider))
  };
}

function firstByStatus(timeline: RunTimelineEntry[], statuses: RunNodeStatus[]): RunTimelineEntry | undefined {
  return timeline.find((node) => statuses.includes(node.status));
}

function hasAcceptedRetry(controls: RunControlActionTrace[], nodeId: string): boolean {
  return controls.some((control) => control.type === 'retry' && control.nodeId === nodeId && control.result === 'accepted');
}

function findPendingDecision(decisions: RunDecisionTrace[], nodeId: string): RunDecisionTrace | undefined {
  return decisions.find((decision) => decision.nodeId === nodeId && decision.status === 'pending');
}

function computeStatus(timeline: RunTimelineEntry[], decisions: RunDecisionTrace[]): ObservableRunStatus {
  if (timeline.some((node) => node.status === 'cancelled')) return 'cancelled';
  if (timeline.some((node) => node.status === 'error')) return 'error';
  if (timeline.some((node) => node.status === 'blocked')) return 'blocked';
  if (timeline.some((node) => node.status === 'waiting_decision') || decisions.some((decision) => decision.status === 'pending')) {
    return 'waiting_decision';
  }
  if (timeline.some((node) => node.status === 'running')) return 'running';
  if (timeline.some((node) => node.status === 'ready')) return 'ready';
  return 'completed';
}

function blockedReason(
  status: ObservableRunStatus,
  timeline: RunTimelineEntry[],
  decisions: RunDecisionTrace[],
  controls: RunControlActionTrace[]
): string | undefined {
  const decisionNode = firstByStatus(timeline, ['waiting_decision']);
  const pendingDecision = decisionNode ? findPendingDecision(decisions, decisionNode.nodeId) : decisions.find((decision) => decision.status === 'pending');
  if (pendingDecision) {
    return `Decision pending on ${pendingDecision.nodeId}: ${pendingDecision.question}`;
  }

  const blockedNode = firstByStatus(timeline, ['blocked']);
  if (blockedNode) {
    return `Blocked on ${blockedNode.nodeId}: ${blockedNode.summary ?? blockedNode.error ?? 'no reason provided'}`;
  }

  const errorNode = firstByStatus(timeline, ['error']);
  if (errorNode) {
    const retry = hasAcceptedRetry(controls, errorNode.nodeId) ? ' Retry has been accepted.' : '';
    return `Error on ${errorNode.nodeId}: ${errorNode.error ?? 'no error detail provided'}.${retry}`;
  }

  if (status === 'cancelled') {
    return 'Run contains a cancelled node.';
  }

  return undefined;
}

function computeCurrentNode(timeline: RunTimelineEntry[]): RunTimelineEntry | undefined {
  return firstByStatus(timeline, ['running', 'waiting_decision', 'error', 'blocked']);
}

function computeNextNode(timeline: RunTimelineEntry[]): RunTimelineEntry | undefined {
  return firstByStatus(timeline, ['ready']) ?? firstByStatus(timeline, ['waiting_decision']);
}

function sanitizeDecisions(decisions: RunDecisionTrace[]): RunDecisionTrace[] {
  return decisions.map((decision) => ({
    id: sanitizeText(decision.id),
    nodeId: sanitizeText(decision.nodeId),
    question: sanitizeText(decision.question),
    status: decision.status,
    selectedOption: decision.selectedOption ? sanitizeText(decision.selectedOption) : undefined,
    resolvedAt: decision.resolvedAt
  }));
}

function sanitizeControls(controls: RunControlActionTrace[]): RunControlActionTrace[] {
  return controls.map((control) => ({
    id: sanitizeText(control.id),
    type: control.type,
    nodeId: control.nodeId ? sanitizeText(control.nodeId) : undefined,
    requestedBy: control.requestedBy,
    at: control.at,
    reason: sanitizeText(control.reason),
    result: control.result
  }));
}

function renderNodeLine(node: RunTimelineEntry): string {
  const provider = node.provider ? ` via ${node.provider}` : '';
  const cost = node.cost.estimatedCost > 0 ? `, cost ${node.cost.estimatedCost.toFixed(4)} ${node.cost.currency}` : '';
  return `- ${node.status}: ${node.nodeId} - ${node.title} (${node.role}${provider}${cost})`;
}

function renderPercent(value: number | undefined): string {
  return value === undefined ? 'n/a' : `${value}%`;
}

function buildSummaryLines(
  input: ObservableRunInput,
  status: ObservableRunStatus,
  currentNode: RunTimelineEntry | undefined,
  nextNode: RunTimelineEntry | undefined,
  blocked: string | undefined,
  budget: RunBudgetSummary
): string[] {
  return [
    `Run ${input.runId} - ${input.projectName}`,
    `- Status: ${status}`,
    `- Current node: ${currentNode ? `${currentNode.nodeId} (${currentNode.status})` : 'none'}`,
    `- Next node: ${nextNode ? `${nextNode.nodeId} (${nextNode.status})` : 'none'}`,
    `- Blocked reason: ${blocked ?? 'none'}`,
    `- Budget: ${renderPercent(budget.tokenPercent)} tokens, ${renderPercent(budget.costPercent)} cost`,
    `- Budget alert: ${budget.alert ? `yes (threshold ${budget.alertThresholdPercent}%)` : 'no'}`,
    `- Pause recommended: ${budget.pauseRecommended ? 'yes' : 'no'}`
  ].map(sanitizeText);
}

function renderMarkdown(report: Omit<ObservableRunReport, 'markdown'>): string {
  const lines = [
    `# Run observability - ${report.projectName}`,
    '',
    '## Summary',
    ...report.summaryLines,
    '',
    '## Timeline',
    ...report.timeline.map(renderNodeLine),
    '',
    '## Decisions',
    ...(report.decisions.length
      ? report.decisions.map((decision) => `- ${decision.status}: ${decision.id} on ${decision.nodeId} - ${decision.question}`)
      : ['- none']),
    '',
    '## Controls Audit',
    ...(report.controls.length
      ? report.controls.map(
          (control) =>
            `- ${control.at}: ${control.type} ${control.nodeId ? `on ${control.nodeId}` : ''} by ${control.requestedBy} (${control.result}) - ${control.reason}`
        )
      : ['- none']),
    '',
    '## Budget By Role',
    ...report.budget.byRole.map(
      (entry) => `- ${entry.role}: ${entry.tokensUsed} tokens, ${entry.estimatedCost.toFixed(4)} ${report.budget.currency}`
    ),
    '',
    '## Budget By Provider',
    ...report.budget.byProvider.map(
      (entry) => `- ${entry.provider}: ${entry.tokensUsed} tokens, ${entry.estimatedCost.toFixed(4)} ${report.budget.currency}`
    ),
    '',
    '## Logs And Errors',
    ...report.timeline.flatMap((node) => {
      const linesForNode = [`- ${node.nodeId}`];
      for (const log of node.logs) linesForNode.push(`  - log: ${log}`);
      if (node.error) linesForNode.push(`  - error: ${node.error}`);
      for (const attempt of node.attempts) {
        if (attempt.summary) linesForNode.push(`  - attempt ${attempt.attempt}: ${attempt.status} - ${attempt.summary}`);
        if (attempt.error) linesForNode.push(`  - attempt ${attempt.attempt} error: ${attempt.error}`);
      }
      return linesForNode;
    }),
    '',
    '## Links And Artifacts',
    ...report.timeline.flatMap((node) => [
      `- ${node.nodeId}`,
      ...(node.links.length ? node.links.map((link) => `  - ${link.label}: ${link.url ?? link.path ?? 'no target'}`) : ['  - links: none']),
      ...(node.artifacts.length
        ? node.artifacts.map((artifact) => `  - artifact ${artifact.label}: ${artifact.url ?? artifact.path ?? 'no target'}`)
        : ['  - artifacts: none'])
    ])
  ];

  return `${lines.join('\n')}\n`;
}

export function observeRun(input: ObservableRunInput, generatedAt = new Date().toISOString()): ObservableRunReport {
  const currency = input.budget?.currency ?? 'USD';
  const timeline = input.nodes.map((node) => toTimelineEntry(node, currency));
  const decisions = sanitizeDecisions(input.decisions ?? []);
  const controls = sanitizeControls(input.controls ?? []);
  const status = computeStatus(timeline, decisions);
  const currentNode = computeCurrentNode(timeline);
  const nextNode = computeNextNode(timeline);
  const budget = summarizeBudget(timeline, input);
  const reason = blockedReason(status, timeline, decisions, controls);
  const resumeExpected =
    decisions.some((decision) => decision.status === 'resolved') &&
    controls.some((control) => control.type === 'resume' && control.result === 'accepted');
  const summaryLines = buildSummaryLines(input, status, currentNode, nextNode, reason, budget);
  const reportWithoutMarkdown = {
    schemaVersion: RUN_OBSERVABILITY_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    status,
    currentNode,
    nextNode,
    blockedReason: reason,
    resumeExpected,
    timeline,
    decisions,
    controls,
    budget,
    summaryLines
  };

  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown)
  };
}
