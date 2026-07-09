import {
  GRAPH_EXECUTION_SCHEMA_VERSION,
  type GraphBlockedNode,
  type GraphDecisionStatus,
  type GraphExecutedNode,
  type GraphExecutedOutput,
  type GraphExecutionBudget,
  type GraphExecutionBudgetSummary,
  type GraphExecutionInput,
  type GraphExecutionReport,
  type GraphGate,
  type GraphGateStatus,
  type GraphHandoff,
  type GraphHumanDecision,
  type GraphNodeInput,
  type GraphNodePriority,
  type GraphProviderCapability,
  type GraphResumedNode
} from './graphExecution.types.ts';

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
    throw new Error(`Invalid graph execution input: "${field}" is required.`);
  }
  return stringValue;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
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

function sanitizeStringArray(values: string[]): string[] {
  return values
    .filter((value) => !SENSITIVE_NAME_PATTERN.test(value))
    .map(sanitizeText);
}

function parsePriority(value: unknown, field: string): GraphNodePriority {
  if (value !== 'high' && value !== 'medium' && value !== 'low') {
    throw new Error(`Invalid graph execution input: ${field} is invalid.`);
  }
  return value;
}

function parseGateStatus(value: unknown, field: string): GraphGateStatus {
  if (value !== 'passed' && value !== 'failed' && value !== 'pending' && value !== 'missing') {
    throw new Error(`Invalid graph execution input: ${field} is invalid.`);
  }
  return value;
}

function parseDecisionStatus(value: unknown, field: string): GraphDecisionStatus {
  if (value !== 'pending' && value !== 'approved' && value !== 'rejected') {
    throw new Error(`Invalid graph execution input: ${field} is invalid.`);
  }
  return value;
}

function parseProviders(value: unknown): GraphProviderCapability[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid graph execution input: "providers" must contain at least one provider.');
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid graph execution input: providers[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `providers[${index}].id`),
      name: sanitizeText(requiredString(entry.name, `providers[${index}].name`)),
      roles: stringArray(entry.roles),
      mock: optionalBoolean(entry.mock)
    };
  });
}

function parseGates(value: unknown): GraphGate[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid graph execution input: gates[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `gates[${index}].id`),
      status: parseGateStatus(entry.status, `gates[${index}].status`),
      summary: optionalString(entry.summary)
    };
  });
}

function parseDecisions(value: unknown): GraphHumanDecision[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid graph execution input: decisions[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `decisions[${index}].id`),
      status: parseDecisionStatus(entry.status, `decisions[${index}].status`),
      summary: sanitizeText(requiredString(entry.summary, `decisions[${index}].summary`))
    };
  });
}

function parseNode(value: unknown, index: number): GraphNodeInput {
  if (!isRecord(value)) {
    throw new Error(`Invalid graph execution input: nodes[${index}] must be an object.`);
  }
  return {
    id: requiredString(value.id, `nodes[${index}].id`),
    title: sanitizeText(requiredString(value.title, `nodes[${index}].title`)),
    role: requiredString(value.role, `nodes[${index}].role`),
    providerId: requiredString(value.providerId, `nodes[${index}].providerId`),
    priority: parsePriority(value.priority, `nodes[${index}].priority`),
    dependsOn: stringArray(value.dependsOn),
    requiredGateIds: stringArray(value.requiredGateIds),
    decisionIds: stringArray(value.decisionIds),
    inputRefs: stringArray(value.inputRefs),
    expectedOutputs: stringArray(value.expectedOutputs),
    mockOutput: sanitizeText(requiredString(value.mockOutput, `nodes[${index}].mockOutput`)),
    estimatedTokens: optionalNumber(value.estimatedTokens),
    estimatedCost: optionalNumber(value.estimatedCost)
  };
}

function parseBudget(value: unknown): GraphExecutionBudget {
  if (!isRecord(value)) return {};
  return {
    tokenBudget: optionalNumber(value.tokenBudget),
    costBudget: optionalNumber(value.costBudget),
    currency: optionalString(value.currency)
  };
}

function assertUniqueIds(values: Array<{ id: string }>, label: string): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      throw new Error(`Invalid graph execution input: duplicate ${label} id "${value.id}".`);
    }
    ids.add(value.id);
  }
}

export function parseGraphExecutionInput(value: unknown): GraphExecutionInput {
  if (!isRecord(value)) {
    throw new Error('Invalid graph execution input: root must be an object.');
  }
  if (value.schemaVersion !== GRAPH_EXECUTION_SCHEMA_VERSION) {
    throw new Error(`Invalid graph execution input: schemaVersion must be ${GRAPH_EXECUTION_SCHEMA_VERSION}.`);
  }
  const providers = parseProviders(value.providers);
  const gates = parseGates(value.gates);
  const decisions = parseDecisions(value.decisions);
  const nodes = Array.isArray(value.nodes) ? value.nodes.map(parseNode) : [];
  if (nodes.length === 0) {
    throw new Error('Invalid graph execution input: "nodes" must contain at least one node.');
  }
  assertUniqueIds(providers, 'provider');
  assertUniqueIds(gates, 'gate');
  assertUniqueIds(decisions, 'decision');
  assertUniqueIds(nodes, 'node');

  return {
    schemaVersion: GRAPH_EXECUTION_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: sanitizeText(requiredString(value.projectName, 'projectName')),
    blueprintVersion: sanitizeText(requiredString(value.blueprintVersion, 'blueprintVersion')),
    completedNodeIds: stringArray(value.completedNodeIds),
    providers,
    gates,
    decisions,
    nodes,
    budget: parseBudget(value.budget)
  };
}

function priorityRank(priority: GraphNodePriority): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function providerById(providers: GraphProviderCapability[]): Map<string, GraphProviderCapability> {
  return new Map(providers.map((provider) => [provider.id, provider]));
}

function gateById(gates: GraphGate[]): Map<string, GraphGate> {
  return new Map(gates.map((gate) => [gate.id, gate]));
}

function decisionById(decisions: GraphHumanDecision[]): Map<string, GraphHumanDecision> {
  return new Map(decisions.map((decision) => [decision.id, decision]));
}

function nodeReasons(
  node: GraphNodeInput,
  input: GraphExecutionInput,
  completed: Set<string>,
  tokensUsed: number,
  costUsed: number
): string[] {
  const providers = providerById(input.providers);
  const gates = gateById(input.gates);
  const decisions = decisionById(input.decisions);
  const provider = providers.get(node.providerId);
  const reasons: string[] = [];

  for (const dependency of node.dependsOn) {
    if (!completed.has(dependency)) {
      reasons.push(`Dependency "${dependency}" is not completed.`);
    }
  }
  for (const gateId of node.requiredGateIds) {
    const gate = gates.get(gateId);
    if (!gate) {
      reasons.push(`Required gate "${gateId}" is missing.`);
    } else if (gate.status !== 'passed') {
      reasons.push(`Required gate "${gateId}" is ${gate.status}${gate.summary ? ` - ${gate.summary}` : ''}.`);
    }
  }
  for (const decisionId of node.decisionIds) {
    const decision = decisions.get(decisionId);
    if (!decision) {
      reasons.push(`Required decision "${decisionId}" is missing.`);
    } else if (decision.status !== 'approved') {
      reasons.push(`Required decision "${decisionId}" is ${decision.status}: ${decision.summary}.`);
    }
  }
  if (!provider) {
    reasons.push(`Provider "${node.providerId}" is not available.`);
  } else if (!provider.roles.includes(node.role)) {
    reasons.push(`Provider "${node.providerId}" does not support role "${node.role}".`);
  }
  if (node.expectedOutputs.length === 0) {
    reasons.push('At least one expected output is required.');
  }
  if (input.budget?.tokenBudget !== undefined && tokensUsed + (node.estimatedTokens ?? 0) > input.budget.tokenBudget) {
    reasons.push(`Token budget would be exceeded (${tokensUsed + (node.estimatedTokens ?? 0)}/${input.budget.tokenBudget}).`);
  }
  if (input.budget?.costBudget !== undefined && costUsed + (node.estimatedCost ?? 0) > input.budget.costBudget) {
    reasons.push(`Cost budget would be exceeded (${costUsed + (node.estimatedCost ?? 0)}/${input.budget.costBudget}).`);
  }

  return reasons.map(sanitizeText);
}

function nextActionsForReasons(node: GraphNodeInput, reasons: string[]): string[] {
  return reasons.map((reason) => {
    if (reason.startsWith('Dependency')) return `Complete dependencies before re-running ${node.id}.`;
    if (reason.startsWith('Required gate')) return `Pass or override required gates for ${node.id}.`;
    if (reason.startsWith('Required decision')) return `Resolve human decisions for ${node.id}.`;
    if (reason.startsWith('Provider')) return `Register an interchangeable provider for role "${node.role}".`;
    if (reason.startsWith('Token') || reason.startsWith('Cost')) return `Increase budget or defer ${node.id}.`;
    return `Complete node metadata for ${node.id}.`;
  });
}

function outputsForNode(node: GraphNodeInput, input: GraphExecutionInput): GraphExecutedOutput[] {
  return sanitizeStringArray(node.expectedOutputs).map((label) => ({
    ref: `run:${input.runId}:blueprint:${input.blueprintVersion}:node:${node.id}:output:${label}`,
    label,
    runId: sanitizeText(input.runId),
    blueprintVersion: sanitizeText(input.blueprintVersion),
    nodeId: sanitizeText(node.id)
  }));
}

function toExecutedNode(node: GraphNodeInput, input: GraphExecutionInput, provider: GraphProviderCapability, order: number): GraphExecutedNode {
  return {
    order,
    id: sanitizeText(node.id),
    title: sanitizeText(node.title),
    role: sanitizeText(node.role),
    providerId: sanitizeText(provider.id),
    providerName: sanitizeText(provider.name),
    mock: provider.mock !== false,
    inputRefs: sanitizeStringArray(node.inputRefs),
    outputs: outputsForNode(node, input),
    estimatedTokens: node.estimatedTokens,
    estimatedCost: node.estimatedCost
  };
}

function toBlockedNode(node: GraphNodeInput, reasons: string[]): GraphBlockedNode {
  return {
    id: sanitizeText(node.id),
    title: sanitizeText(node.title),
    reasons,
    nextActions: [...new Set(nextActionsForReasons(node, reasons).map(sanitizeText))]
  };
}

function summarizeBudget(executedNodes: GraphExecutedNode[], budget: GraphExecutionBudget | undefined): GraphExecutionBudgetSummary {
  const tokensUsed = executedNodes.reduce((sum, node) => sum + (node.estimatedTokens ?? 0), 0);
  const estimatedCost = executedNodes.reduce((sum, node) => sum + (node.estimatedCost ?? 0), 0);
  const tokenBudget = budget?.tokenBudget;
  const costBudget = budget?.costBudget;

  return {
    tokensUsed,
    tokenBudget,
    tokenPercent: tokenBudget && tokenBudget > 0 ? Math.round((tokensUsed / tokenBudget) * 100) : undefined,
    estimatedCost: Number(estimatedCost.toFixed(6)),
    costBudget,
    costPercent: costBudget && costBudget > 0 ? Math.round((estimatedCost / costBudget) * 100) : undefined,
    currency: budget?.currency ?? 'USD'
  };
}

function buildHandoffs(executedNodes: GraphExecutedNode[], allNodes: GraphNodeInput[]): GraphHandoff[] {
  const executedById = new Map(executedNodes.map((node) => [node.id, node]));
  const handoffs: GraphHandoff[] = [];

  for (const node of allNodes) {
    for (const dependency of node.dependsOn) {
      const from = executedById.get(dependency);
      if (from) {
        handoffs.push({
          fromNodeId: from.id,
          toNodeId: sanitizeText(node.id),
          outputRefs: from.outputs.map((output) => output.ref),
          summary: `Outputs from ${from.id} are available to ${node.id}.`
        });
      }
    }
  }

  return handoffs.sort((left, right) => `${left.fromNodeId}:${left.toNodeId}`.localeCompare(`${right.fromNodeId}:${right.toNodeId}`));
}

function renderPercent(value: number | undefined): string {
  return value === undefined ? 'n/a' : `${value}%`;
}

function renderExecutedNode(node: GraphExecutedNode): string[] {
  return [
    `- ${node.order}. ${node.id} - ${node.title}`,
    `  - role/provider: ${node.role} via ${node.providerName}${node.mock ? ' (mock)' : ''}`,
    `  - inputs: ${node.inputRefs.length ? node.inputRefs.join(', ') : 'none'}`,
    `  - outputs: ${node.outputs.map((output) => output.ref).join(', ')}`
  ];
}

function renderBlockedNode(node: GraphBlockedNode): string[] {
  return [
    `- ${node.id} - ${node.title}`,
    ...node.reasons.map((reason) => `  - reason: ${reason}`),
    ...node.nextActions.map((action) => `  - next: ${action}`)
  ];
}

function renderMarkdown(report: Omit<GraphExecutionReport, 'markdown'>): string {
  const lines = [
    `# Graph execution - ${report.projectName}`,
    '',
    '## Summary',
    `- Run: ${report.runId}`,
    `- Blueprint: ${report.blueprintVersion}`,
    `- Executed nodes: ${report.executedNodeCount}`,
    `- Blocked nodes: ${report.blockedNodeCount}`,
    `- Resumed nodes: ${report.resumedNodeCount}`,
    `- Budget: ${report.budget.tokensUsed} tokens (${renderPercent(report.budget.tokenPercent)}), ${report.budget.estimatedCost.toFixed(4)} ${report.budget.currency} (${renderPercent(report.budget.costPercent)})`,
    '',
    '## Resumed Nodes',
    ...(report.resumedNodes.length ? report.resumedNodes.map((node) => `- ${node.id} - ${node.reason}`) : ['- none']),
    '',
    '## Executed Nodes',
    ...(report.executedNodes.length ? report.executedNodes.flatMap(renderExecutedNode) : ['- none']),
    '',
    '## Handoffs',
    ...(report.handoffs.length
      ? report.handoffs.map((handoff) => `- ${handoff.fromNodeId} -> ${handoff.toNodeId}: ${handoff.outputRefs.join(', ')}`)
      : ['- none']),
    '',
    '## Blocked Nodes',
    ...(report.blockedNodes.length ? report.blockedNodes.flatMap(renderBlockedNode) : ['- none']),
    '',
    '## Provider Trace',
    ...report.providerTrace.map((provider) => `- ${provider.id}: ${provider.name} (${provider.mock === false ? 'external' : 'mock'}) roles=${provider.roles.join(', ')}`),
    '',
    '## Next Actions',
    ...(report.nextActions.length ? report.nextActions.map((action) => `- ${action}`) : ['- none'])
  ];

  return `${lines.join('\n')}\n`;
}

export function executeGraph(input: GraphExecutionInput, generatedAt = new Date().toISOString()): GraphExecutionReport {
  const providers = providerById(input.providers);
  const completed = new Set(input.completedNodeIds);
  const resumedNodes: GraphResumedNode[] = input.nodes
    .filter((node) => completed.has(node.id))
    .map((node) => ({
      id: sanitizeText(node.id),
      title: sanitizeText(node.title),
      reason: 'Already completed before this execution; not replayed.'
    }));
  const executedNodes: GraphExecutedNode[] = [];
  const blockedNodes: GraphBlockedNode[] = [];
  const processed = new Set(input.completedNodeIds);
  const sortedNodes = [...input.nodes].sort((left, right) => {
    const byPriority = priorityRank(left.priority) - priorityRank(right.priority);
    return byPriority !== 0 ? byPriority : left.id.localeCompare(right.id);
  });
  let tokensUsed = 0;
  let costUsed = 0;

  while (processed.size < sortedNodes.length) {
    let progressed = false;

    for (const node of sortedNodes) {
      if (processed.has(node.id)) continue;
      const reasons = nodeReasons(node, input, completed, tokensUsed, costUsed);
      if (reasons.length === 0) {
        const provider = providers.get(node.providerId);
        if (!provider) continue;
        const executed = toExecutedNode(node, input, provider, executedNodes.length + 1);
        executedNodes.push(executed);
        processed.add(node.id);
        completed.add(node.id);
        tokensUsed += node.estimatedTokens ?? 0;
        costUsed += node.estimatedCost ?? 0;
        progressed = true;
      }
    }

    if (!progressed) {
      for (const node of sortedNodes) {
        if (processed.has(node.id)) continue;
        const reasons = nodeReasons(node, input, completed, tokensUsed, costUsed);
        blockedNodes.push(toBlockedNode(node, reasons.length ? reasons : ['Node could not be executed with the current graph state.']));
        processed.add(node.id);
      }
    }
  }

  const nextActions = [
    ...blockedNodes.flatMap((node) => node.nextActions),
    ...(executedNodes.length ? ['Attach the graph execution report to the Project Run before continuing orchestration.'] : [])
  ].map(sanitizeText);
  const reportWithoutMarkdown = {
    schemaVersion: GRAPH_EXECUTION_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    blueprintVersion: sanitizeText(input.blueprintVersion),
    executedNodeCount: executedNodes.length,
    blockedNodeCount: blockedNodes.length,
    resumedNodeCount: resumedNodes.length,
    executedNodes,
    blockedNodes,
    resumedNodes,
    handoffs: buildHandoffs(executedNodes, input.nodes),
    budget: summarizeBudget(executedNodes, input.budget),
    providerTrace: input.providers.map((provider) => ({
      id: sanitizeText(provider.id),
      name: sanitizeText(provider.name),
      roles: sanitizeStringArray(provider.roles),
      mock: provider.mock !== false
    })),
    nextActions: [...new Set(nextActions)]
  };

  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown)
  };
}
