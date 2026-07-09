import {
  DELEGATION_PLAN_SCHEMA_VERSION,
  type DelegationAgentCapability,
  type DelegationAgentSummary,
  type DelegationBlockedTask,
  type DelegationBudget,
  type DelegationBudgetSummary,
  type DelegationFindingSeverity,
  type DelegationGate,
  type DelegationGateStatus,
  type DelegationGitPolicy,
  type DelegationPermissions,
  type DelegationPlanInput,
  type DelegationPlanReport,
  type DelegationPlannedTask,
  type DelegationPolicyFinding,
  type DelegationPriority,
  type DelegationTaskInput
} from './plan.types.ts';

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
    throw new Error(`Invalid delegation plan input: "${field}" is required.`);
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
  return values.map(sanitizeText);
}

function parsePriority(value: unknown, field: string): DelegationPriority {
  if (value !== 'high' && value !== 'medium' && value !== 'low') {
    throw new Error(`Invalid delegation plan input: ${field} is invalid.`);
  }
  return value;
}

function parseGateStatus(value: unknown, field: string): DelegationGateStatus {
  if (value !== 'passed' && value !== 'failed' && value !== 'pending' && value !== 'missing') {
    throw new Error(`Invalid delegation plan input: ${field} is invalid.`);
  }
  return value;
}

function parseGitPolicy(value: unknown): DelegationGitPolicy {
  if (!isRecord(value)) {
    throw new Error('Invalid delegation plan input: "gitPolicy" is required.');
  }
  return {
    defaultBranch: requiredString(value.defaultBranch, 'gitPolicy.defaultBranch'),
    protectedBranches: stringArray(value.protectedBranches),
    requirePullRequest: Boolean(value.requirePullRequest),
    requireVisibleCommit: Boolean(value.requireVisibleCommit),
    allowAutoMerge: Boolean(value.allowAutoMerge)
  };
}

function parsePermissions(value: unknown): DelegationPermissions {
  if (!isRecord(value)) return {};
  return {
    allowNetwork: optionalBoolean(value.allowNetwork),
    allowedShellCommands: stringArray(value.allowedShellCommands),
    writeScopes: stringArray(value.writeScopes),
    secretRefs: stringArray(value.secretRefs)
  };
}

function parseAgents(value: unknown): DelegationAgentCapability[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid delegation plan input: "agents" must contain at least one agent.');
  }
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delegation plan input: agents[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `agents[${index}].id`),
      name: sanitizeText(requiredString(entry.name, `agents[${index}].name`)),
      provider: optionalString(entry.provider),
      roles: stringArray(entry.roles),
      contextKinds: stringArray(entry.contextKinds),
      maxConcurrentTasks: optionalNumber(entry.maxConcurrentTasks),
      permissions: parsePermissions(entry.permissions)
    };
  });
}

function parseGates(value: unknown): DelegationGate[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid delegation plan input: gates[${index}] must be an object.`);
    }
    return {
      id: requiredString(entry.id, `gates[${index}].id`),
      status: parseGateStatus(entry.status, `gates[${index}].status`),
      summary: optionalString(entry.summary)
    };
  });
}

function parseTask(value: unknown, index: number): DelegationTaskInput {
  if (!isRecord(value)) {
    throw new Error(`Invalid delegation plan input: tasks[${index}] must be an object.`);
  }
  const issueNumberValue = optionalNumber(value.issueNumber);
  if (!Number.isInteger(issueNumberValue) || issueNumberValue === undefined || issueNumberValue <= 0) {
    throw new Error(`Invalid delegation plan input: tasks[${index}].issueNumber must be a positive integer.`);
  }
  return {
    id: requiredString(value.id, `tasks[${index}].id`),
    issueNumber: issueNumberValue,
    title: sanitizeText(requiredString(value.title, `tasks[${index}].title`)),
    priority: parsePriority(value.priority, `tasks[${index}].priority`),
    role: requiredString(value.role, `tasks[${index}].role`),
    dependsOn: stringArray(value.dependsOn),
    requiredGateIds: stringArray(value.requiredGateIds),
    branchName: requiredString(value.branchName, `tasks[${index}].branchName`),
    workspacePath: requiredString(value.workspacePath, `tasks[${index}].workspacePath`),
    contextRefs: stringArray(value.contextRefs),
    validationCommands: stringArray(value.validationCommands),
    expectedArtifacts: stringArray(value.expectedArtifacts),
    estimatedTokens: optionalNumber(value.estimatedTokens),
    estimatedCost: optionalNumber(value.estimatedCost)
  };
}

function parseBudget(value: unknown): DelegationBudget {
  if (!isRecord(value)) return {};
  return {
    tokenBudget: optionalNumber(value.tokenBudget),
    costBudget: optionalNumber(value.costBudget),
    currency: optionalString(value.currency)
  };
}

export function parseDelegationPlanInput(value: unknown): DelegationPlanInput {
  if (!isRecord(value)) {
    throw new Error('Invalid delegation plan input: root must be an object.');
  }
  if (value.schemaVersion !== DELEGATION_PLAN_SCHEMA_VERSION) {
    throw new Error(`Invalid delegation plan input: schemaVersion must be ${DELEGATION_PLAN_SCHEMA_VERSION}.`);
  }
  const tasks = Array.isArray(value.tasks) ? value.tasks.map(parseTask) : [];
  if (tasks.length === 0) {
    throw new Error('Invalid delegation plan input: "tasks" must contain at least one task.');
  }
  return {
    schemaVersion: DELEGATION_PLAN_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: sanitizeText(requiredString(value.projectName, 'projectName')),
    completedTaskIds: stringArray(value.completedTaskIds),
    gitPolicy: parseGitPolicy(value.gitPolicy),
    agents: parseAgents(value.agents),
    gates: parseGates(value.gates),
    tasks,
    budget: parseBudget(value.budget)
  };
}

function priorityRank(priority: DelegationPriority): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function findAgent(task: DelegationTaskInput, agents: DelegationAgentCapability[]): DelegationAgentCapability | undefined {
  return agents.find((agent) => agent.roles.includes(task.role));
}

function gateById(gates: DelegationGate[]): Map<string, DelegationGate> {
  return new Map(gates.map((gate) => [gate.id, gate]));
}

function basePolicyFindings(policy: DelegationGitPolicy): DelegationPolicyFinding[] {
  const findings: DelegationPolicyFinding[] = [];
  if (!policy.requirePullRequest) {
    findings.push({
      id: 'git:pull-request-required',
      severity: 'error',
      message: 'Git policy must require a pull request before integration.'
    });
  }
  if (!policy.requireVisibleCommit) {
    findings.push({
      id: 'git:visible-commit-required',
      severity: 'error',
      message: 'Git policy must require visible commits; invisible changes are not allowed.'
    });
  }
  if (policy.allowAutoMerge) {
    findings.push({
      id: 'git:auto-merge-disabled',
      severity: 'error',
      message: 'Git policy must keep automatic merge disabled.'
    });
  }
  if (!policy.protectedBranches.includes(policy.defaultBranch)) {
    findings.push({
      id: 'git:default-branch-protected',
      severity: 'warning',
      message: `Default branch "${policy.defaultBranch}" should be listed as protected.`
    });
  }
  return findings;
}

function taskReasons(
  task: DelegationTaskInput,
  input: DelegationPlanInput,
  plannedOrCompleted: Set<string>,
  tokensPlanned: number,
  costPlanned: number
): string[] {
  const gates = gateById(input.gates);
  const agent = findAgent(task, input.agents);
  const reasons: string[] = [];
  const protectedBranches = new Set([input.gitPolicy.defaultBranch, ...input.gitPolicy.protectedBranches]);

  for (const dependency of task.dependsOn) {
    if (!plannedOrCompleted.has(dependency)) {
      reasons.push(`Dependency "${dependency}" is not completed or planned yet.`);
    }
  }
  for (const gateId of task.requiredGateIds) {
    const gate = gates.get(gateId);
    if (!gate) {
      reasons.push(`Required gate "${gateId}" is missing.`);
    } else if (gate.status !== 'passed') {
      reasons.push(`Required gate "${gateId}" is ${gate.status}${gate.summary ? ` - ${gate.summary}` : ''}.`);
    }
  }
  if (!agent) {
    reasons.push(`No compatible agent capability is available for role "${task.role}".`);
  }
  if (protectedBranches.has(task.branchName)) {
    reasons.push(`Branch "${task.branchName}" targets a protected branch.`);
  }
  if (!task.workspacePath || task.workspacePath === '.' || task.workspacePath === './') {
    reasons.push('Workspace path must be isolated from the repository root.');
  }
  if (task.contextRefs.length === 0) {
    reasons.push('At least one context reference is required.');
  }
  if (task.validationCommands.length === 0) {
    reasons.push('At least one validation command is required.');
  }
  if (task.expectedArtifacts.length === 0) {
    reasons.push('At least one expected artifact is required.');
  }
  if (input.budget?.tokenBudget !== undefined && tokensPlanned + (task.estimatedTokens ?? 0) > input.budget.tokenBudget) {
    reasons.push(`Token budget would be exceeded (${tokensPlanned + (task.estimatedTokens ?? 0)}/${input.budget.tokenBudget}).`);
  }
  if (input.budget?.costBudget !== undefined && costPlanned + (task.estimatedCost ?? 0) > input.budget.costBudget) {
    reasons.push(`Cost budget would be exceeded (${costPlanned + (task.estimatedCost ?? 0)}/${input.budget.costBudget}).`);
  }

  return reasons.map(sanitizeText);
}

function nextActionsForReasons(task: DelegationTaskInput, reasons: string[]): string[] {
  return reasons.map((reason) => {
    if (reason.startsWith('Dependency')) return `Complete or re-plan dependencies for ${task.id}.`;
    if (reason.startsWith('Required gate')) return `Pass or override required gates for ${task.id}.`;
    if (reason.startsWith('No compatible agent')) return `Register an agent capability for role "${task.role}".`;
    if (reason.startsWith('Branch')) return `Choose a non-protected branch for issue #${task.issueNumber}.`;
    if (reason.startsWith('Workspace')) return `Assign an isolated workspace path for issue #${task.issueNumber}.`;
    if (reason.startsWith('Token') || reason.startsWith('Cost')) return `Increase budget or defer issue #${task.issueNumber}.`;
    return `Complete delegation metadata for issue #${task.issueNumber}.`;
  });
}

function toPlannedTask(task: DelegationTaskInput, agent: DelegationAgentCapability, order: number): DelegationPlannedTask {
  return {
    order,
    id: sanitizeText(task.id),
    issueNumber: task.issueNumber,
    title: sanitizeText(task.title),
    role: sanitizeText(task.role),
    priority: task.priority,
    agentId: sanitizeText(agent.id),
    provider: agent.provider ? sanitizeText(agent.provider) : undefined,
    branchName: sanitizeText(task.branchName),
    workspacePath: sanitizeText(task.workspacePath),
    contextRefs: sanitizeStringArray(task.contextRefs),
    validationCommands: sanitizeStringArray(task.validationCommands),
    expectedArtifacts: sanitizeStringArray(task.expectedArtifacts),
    requiredGateIds: sanitizeStringArray(task.requiredGateIds),
    estimatedTokens: task.estimatedTokens,
    estimatedCost: task.estimatedCost
  };
}

function toBlockedTask(task: DelegationTaskInput, reasons: string[]): DelegationBlockedTask {
  return {
    id: sanitizeText(task.id),
    issueNumber: task.issueNumber,
    title: sanitizeText(task.title),
    reasons,
    nextActions: [...new Set(nextActionsForReasons(task, reasons).map(sanitizeText))]
  };
}

function summarizeBudget(plannedTasks: DelegationPlannedTask[], budget: DelegationBudget | undefined): DelegationBudgetSummary {
  const tokensPlanned = plannedTasks.reduce((sum, task) => sum + (task.estimatedTokens ?? 0), 0);
  const estimatedCost = plannedTasks.reduce((sum, task) => sum + (task.estimatedCost ?? 0), 0);
  const tokenBudget = budget?.tokenBudget;
  const costBudget = budget?.costBudget;

  return {
    tokensPlanned,
    tokenBudget,
    tokenPercent: tokenBudget && tokenBudget > 0 ? Math.round((tokensPlanned / tokenBudget) * 100) : undefined,
    estimatedCost: Number(estimatedCost.toFixed(6)),
    costBudget,
    costPercent: costBudget && costBudget > 0 ? Math.round((estimatedCost / costBudget) * 100) : undefined,
    currency: budget?.currency ?? 'USD'
  };
}

function summarizeAgents(agents: DelegationAgentCapability[]): DelegationAgentSummary[] {
  return agents
    .map((agent) => ({
      id: sanitizeText(agent.id),
      name: sanitizeText(agent.name),
      provider: agent.provider ? sanitizeText(agent.provider) : undefined,
      roles: sanitizeStringArray(agent.roles),
      contextKinds: sanitizeStringArray(agent.contextKinds),
      allowNetwork: Boolean(agent.permissions?.allowNetwork),
      allowedShellCommands: sanitizeStringArray(agent.permissions?.allowedShellCommands ?? []),
      writeScopes: sanitizeStringArray(agent.permissions?.writeScopes ?? []),
      secretRefs: sanitizeStringArray(agent.permissions?.secretRefs ?? [])
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function renderPercent(value: number | undefined): string {
  return value === undefined ? 'n/a' : `${value}%`;
}

function renderPolicyFinding(finding: DelegationPolicyFinding): string {
  return `- ${finding.severity}: ${finding.id} - ${finding.message}`;
}

function renderPlannedTask(task: DelegationPlannedTask): string[] {
  return [
    `- ${task.order}. #${task.issueNumber} ${task.id} - ${task.title}`,
    `  - agent: ${task.agentId}${task.provider ? ` (${task.provider})` : ''}`,
    `  - branch: ${task.branchName}`,
    `  - workspace: ${task.workspacePath}`,
    `  - context: ${task.contextRefs.join(', ')}`,
    `  - validations: ${task.validationCommands.join(', ')}`,
    `  - artifacts: ${task.expectedArtifacts.join(', ')}`
  ];
}

function renderBlockedTask(task: DelegationBlockedTask): string[] {
  return [
    `- #${task.issueNumber} ${task.id} - ${task.title}`,
    ...task.reasons.map((reason) => `  - reason: ${reason}`),
    ...task.nextActions.map((action) => `  - next: ${action}`)
  ];
}

function renderAgent(agent: DelegationAgentSummary): string[] {
  return [
    `- ${agent.id} - ${agent.name}${agent.provider ? ` (${agent.provider})` : ''}`,
    `  - roles: ${agent.roles.length ? agent.roles.join(', ') : 'none'}`,
    `  - context: ${agent.contextKinds.length ? agent.contextKinds.join(', ') : 'none'}`,
    `  - network: ${agent.allowNetwork ? 'allowed' : 'blocked'}`,
    `  - shell: ${agent.allowedShellCommands.length ? agent.allowedShellCommands.join(', ') : 'none'}`,
    `  - write scopes: ${agent.writeScopes.length ? agent.writeScopes.join(', ') : 'none'}`,
    `  - secret refs: ${agent.secretRefs.length ? agent.secretRefs.join(', ') : 'none'}`
  ];
}

function renderMarkdown(report: Omit<DelegationPlanReport, 'markdown'>): string {
  const lines = [
    `# Delegation plan - ${report.projectName}`,
    '',
    '## Summary',
    `- Run: ${report.runId}`,
    `- Ready tasks: ${report.readyTaskCount}`,
    `- Blocked tasks: ${report.blockedTaskCount}`,
    `- Budget: ${report.budget.tokensPlanned} tokens (${renderPercent(report.budget.tokenPercent)}), ${report.budget.estimatedCost.toFixed(4)} ${report.budget.currency} (${renderPercent(report.budget.costPercent)})`,
    '',
    '## Git And PR Guardrails',
    ...(report.policyFindings.length ? report.policyFindings.map(renderPolicyFinding) : ['- ok: pull request, visible commit and no auto-merge policies are enforced.']),
    '',
    '## Planned Tasks',
    ...(report.plannedTasks.length ? report.plannedTasks.flatMap(renderPlannedTask) : ['- none']),
    '',
    '## Blocked Tasks',
    ...(report.blockedTasks.length ? report.blockedTasks.flatMap(renderBlockedTask) : ['- none']),
    '',
    '## Agent Capabilities And Permissions',
    ...(report.agentCapabilities.length ? report.agentCapabilities.flatMap(renderAgent) : ['- none']),
    '',
    '## Next Actions',
    ...(report.nextActions.length ? report.nextActions.map((action) => `- ${action}`) : ['- none'])
  ];

  return `${lines.join('\n')}\n`;
}

function severityRank(severity: DelegationFindingSeverity): number {
  if (severity === 'error') return 0;
  if (severity === 'warning') return 1;
  return 2;
}

export function planDelegation(input: DelegationPlanInput, generatedAt = new Date().toISOString()): DelegationPlanReport {
  const policyFindings = basePolicyFindings(input.gitPolicy).sort((left, right) => severityRank(left.severity) - severityRank(right.severity));
  const hasBlockingPolicy = policyFindings.some((finding) => finding.severity === 'error');
  const plannedTasks: DelegationPlannedTask[] = [];
  const blockedTasks: DelegationBlockedTask[] = [];
  const processed = new Set<string>();
  const plannedOrCompleted = new Set(input.completedTaskIds);
  const sortedTasks = [...input.tasks].sort((left, right) => {
    const byPriority = priorityRank(left.priority) - priorityRank(right.priority);
    return byPriority !== 0 ? byPriority : left.issueNumber - right.issueNumber;
  });
  let tokensPlanned = 0;
  let costPlanned = 0;

  while (processed.size < sortedTasks.length) {
    let progressed = false;

    for (const task of sortedTasks) {
      if (processed.has(task.id)) continue;
      const reasons = hasBlockingPolicy
        ? ['Git policy has blocking errors; delegation cannot start.']
        : taskReasons(task, input, plannedOrCompleted, tokensPlanned, costPlanned);

      if (reasons.length === 0) {
        const agent = findAgent(task, input.agents);
        if (!agent) continue;
        const planned = toPlannedTask(task, agent, plannedTasks.length + 1);
        plannedTasks.push(planned);
        processed.add(task.id);
        plannedOrCompleted.add(task.id);
        tokensPlanned += task.estimatedTokens ?? 0;
        costPlanned += task.estimatedCost ?? 0;
        progressed = true;
      }
    }

    if (!progressed) {
      for (const task of sortedTasks) {
        if (processed.has(task.id)) continue;
        const reasons = hasBlockingPolicy
          ? ['Git policy has blocking errors; delegation cannot start.']
          : taskReasons(task, input, plannedOrCompleted, tokensPlanned, costPlanned);
        blockedTasks.push(toBlockedTask(task, reasons.length ? reasons : ['Task could not be scheduled with the current dependency graph.']));
        processed.add(task.id);
      }
    }
  }

  const budget = summarizeBudget(plannedTasks, input.budget);
  const nextActions = [
    ...policyFindings.filter((finding) => finding.severity === 'error').map((finding) => finding.message),
    ...blockedTasks.flatMap((task) => task.nextActions),
    ...(plannedTasks.length ? ['Review the planned workspace, branch and validation commands before launching any external agent.'] : [])
  ].map(sanitizeText);
  const reportWithoutMarkdown = {
    schemaVersion: DELEGATION_PLAN_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    readyTaskCount: plannedTasks.length,
    blockedTaskCount: blockedTasks.length,
    plannedTasks,
    blockedTasks,
    policyFindings: policyFindings.map((finding) => ({ ...finding, message: sanitizeText(finding.message) })),
    agentCapabilities: summarizeAgents(input.agents),
    budget,
    nextActions: [...new Set(nextActions)]
  };

  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown)
  };
}
