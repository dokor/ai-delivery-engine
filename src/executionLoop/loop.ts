import { buildContextPack } from '../contextpack/buildContextPack.ts';
import type { ContextItem } from '../contextpack/contextPack.types.ts';
import {
  AGENT_EXECUTION_SCHEMA_VERSION,
  type AgentExecutionRequest,
  type AgentUsageRecord,
  type WorkspaceContract
} from '../harness/execution.types.ts';
import { runAgentExecution, type HarnessAgent, type HarnessToolRunner } from '../harness/runner.ts';
import {
  EXECUTION_LOOP_SCHEMA_VERSION,
  type ExecutionLoopAttempt,
  type ExecutionLoopAttemptPlan,
  type ExecutionLoopBudgetSummary,
  type ExecutionLoopCorrection,
  type ExecutionLoopCorrectionPolicy,
  type ExecutionLoopGoal,
  type ExecutionLoopHumanRequest,
  type ExecutionLoopInput,
  type ExecutionLoopProjectRunUpdate,
  type ExecutionLoopReport,
  type ExecutionLoopStopConditions,
  type ExecutionLoopTerminalStatus,
  type ExecutionLoopType
} from './loop.types.ts';

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
    throw new Error(`Invalid execution loop input: "${field}" is required.`);
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

function sanitizeArray(values: string[]): string[] {
  return values.map(sanitizeText);
}

function parseLoopType(value: unknown, field: string): ExecutionLoopType {
  if (value !== 'framing' && value !== 'design' && value !== 'development' && value !== 'review' && value !== 'deployment') {
    throw new Error(`Invalid execution loop input: ${field} is invalid.`);
  }
  return value;
}

function parseGoal(value: unknown): ExecutionLoopGoal {
  if (!isRecord(value)) {
    throw new Error('Invalid execution loop input: "goal" is required.');
  }
  return {
    summary: sanitizeText(requiredString(value.summary, 'goal.summary')),
    successCriteria: sanitizeArray(stringArray(value.successCriteria))
  };
}

function parseStopConditions(value: unknown): ExecutionLoopStopConditions {
  if (!isRecord(value)) {
    throw new Error('Invalid execution loop input: "stopConditions" is required.');
  }
  const timeoutMs = optionalNumber(value.timeoutMs);
  const maxAttempts = optionalNumber(value.maxAttempts);
  if (!timeoutMs || timeoutMs <= 0) {
    throw new Error('Invalid execution loop input: stopConditions.timeoutMs must be positive.');
  }
  if (!maxAttempts || maxAttempts <= 0) {
    throw new Error('Invalid execution loop input: stopConditions.maxAttempts must be positive.');
  }
  return {
    timeoutMs,
    maxAttempts,
    maxToolCalls: optionalNumber(value.maxToolCalls),
    tokenBudget: optionalNumber(value.tokenBudget),
    costBudget: optionalNumber(value.costBudget)
  };
}

function parseCorrectionPolicy(value: unknown): ExecutionLoopCorrectionPolicy {
  if (!isRecord(value)) {
    throw new Error('Invalid execution loop input: "correctionPolicy" is required.');
  }
  return {
    enabled: optionalBoolean(value.enabled) ?? false,
    maxCorrections: optionalNumber(value.maxCorrections) ?? 0,
    requireTargetedDiagnostic: optionalBoolean(value.requireTargetedDiagnostic) ?? true
  };
}

function parseAttemptPlans(value: unknown): ExecutionLoopAttemptPlan[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Invalid execution loop input: "attemptPlans" must contain at least one attempt.');
  }
  const plans = value.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`Invalid execution loop input: attemptPlans[${index}] must be an object.`);
    }
    const validations = Array.isArray(entry.validations)
      ? entry.validations.map((validation, validationIndex) => {
          if (!isRecord(validation)) {
            throw new Error(`Invalid execution loop input: attemptPlans[${index}].validations[${validationIndex}] must be an object.`);
          }
          return {
            tool: requiredString(validation.tool, `attemptPlans[${index}].validations[${validationIndex}].tool`),
            status: optionalNumber(validation.status) ?? 0,
            ok: optionalBoolean(validation.ok) ?? false
          };
        })
      : [];

    return {
      id: requiredString(entry.id, `attemptPlans[${index}].id`),
      summary: sanitizeText(requiredString(entry.summary, `attemptPlans[${index}].summary`)),
      diagnostic: optionalString(entry.diagnostic),
      agentDelayMs: optionalNumber(entry.agentDelayMs),
      agentError: optionalString(entry.agentError),
      usage: isRecord(entry.usage)
        ? {
            provider: optionalString(entry.usage.provider) ?? 'mock-loop',
            model: optionalString(entry.usage.model),
            inputTokens: optionalNumber(entry.usage.inputTokens),
            outputTokens: optionalNumber(entry.usage.outputTokens),
            costUsd: optionalNumber(entry.usage.costUsd)
          }
        : undefined,
      validations
    };
  });
  const ids = new Set<string>();
  for (const plan of plans) {
    if (ids.has(plan.id)) {
      throw new Error(`Invalid execution loop input: duplicate attempt id "${plan.id}".`);
    }
    ids.add(plan.id);
  }
  return plans;
}

export function parseExecutionLoopInput(value: unknown): ExecutionLoopInput {
  if (!isRecord(value)) {
    throw new Error('Invalid execution loop input: root must be an object.');
  }
  if (value.schemaVersion !== EXECUTION_LOOP_SCHEMA_VERSION) {
    throw new Error(`Invalid execution loop input: schemaVersion must be ${EXECUTION_LOOP_SCHEMA_VERSION}.`);
  }
  const trigger = isRecord(value.trigger)
    ? { ready: optionalBoolean(value.trigger.ready) ?? false, reason: sanitizeText(requiredString(value.trigger.reason, 'trigger.reason')) }
    : undefined;
  if (!trigger) {
    throw new Error('Invalid execution loop input: "trigger" is required.');
  }
  const agent = isRecord(value.agent)
    ? {
        id: requiredString(value.agent.id, 'agent.id'),
        provider: requiredString(value.agent.provider, 'agent.provider'),
        role: optionalString(value.agent.role)
      }
    : undefined;
  const task = isRecord(value.task)
    ? {
        id: requiredString(value.task.id, 'task.id'),
        title: sanitizeText(requiredString(value.task.title, 'task.title')),
        acceptanceCriteria: sanitizeArray(stringArray(value.task.acceptanceCriteria))
      }
    : undefined;
  const permissions = isRecord(value.permissions)
    ? {
        shell: optionalBoolean(value.permissions.shell) ?? false,
        network: optionalBoolean(value.permissions.network) ?? false,
        github: optionalBoolean(value.permissions.github) ?? false,
        allowedTools: stringArray(value.permissions.allowedTools)
      }
    : undefined;
  const workspaceIsolation: WorkspaceContract['isolation'] =
    isRecord(value.workspace) && (value.workspace.isolation === 'dedicated-worktree' || value.workspace.isolation === 'temporary-copy')
      ? value.workspace.isolation
      : 'current-worktree';
  const workspace = isRecord(value.workspace)
    ? {
        root: requiredString(value.workspace.root, 'workspace.root'),
        isolation: workspaceIsolation,
        writable: optionalBoolean(value.workspace.writable) ?? false
      }
    : undefined;
  const validation = isRecord(value.validation) ? { commands: stringArray(value.validation.commands) } : undefined;
  const memory = isRecord(value.memory)
    ? {
        contextRefs: sanitizeArray(stringArray(value.memory.contextRefs)),
        artifacts: sanitizeArray(stringArray(value.memory.artifacts)),
        diagnostics: sanitizeArray(stringArray(value.memory.diagnostics))
      }
    : { contextRefs: [], artifacts: [], diagnostics: [] };

  if (!agent || !task || !permissions || !workspace || !validation) {
    throw new Error('Invalid execution loop input: agent, task, permissions, workspace and validation are required.');
  }

  return {
    schemaVersion: EXECUTION_LOOP_SCHEMA_VERSION,
    runId: requiredString(value.runId, 'runId'),
    projectName: sanitizeText(requiredString(value.projectName, 'projectName')),
    loopId: requiredString(value.loopId, 'loopId'),
    nodeId: requiredString(value.nodeId, 'nodeId'),
    loopType: parseLoopType(value.loopType, 'loopType'),
    trigger,
    goal: parseGoal(value.goal),
    agent,
    task,
    memory,
    permissions,
    workspace,
    stopConditions: parseStopConditions(value.stopConditions),
    validation,
    correctionPolicy: parseCorrectionPolicy(value.correctionPolicy),
    attemptPlans: parseAttemptPlans(value.attemptPlans)
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function agentForPlan(input: ExecutionLoopInput, plan: ExecutionLoopAttemptPlan): HarnessAgent {
  return {
    provider: input.agent.provider,
    async execute() {
      if (plan.agentDelayMs && plan.agentDelayMs > 0) {
        await delay(plan.agentDelayMs);
      }
      if (plan.agentError) {
        throw new Error(sanitizeText(plan.agentError));
      }
      return {
        summary: sanitizeText(plan.summary),
        modifications: [`attempt:${sanitizeText(plan.id)}`],
        usage: plan.usage,
        nextAction: 'verify-loop-attempt'
      };
    }
  };
}

function toolRunnerForPlan(plan: ExecutionLoopAttemptPlan): HarnessToolRunner {
  return {
    async run(tool) {
      const planned = plan.validations.find((validation) => validation.tool === tool);
      return planned ? { tool, status: planned.status, ok: planned.ok } : { tool, status: 0, ok: true };
    }
  };
}

function contextItems(input: ExecutionLoopInput, corrections: ExecutionLoopCorrection[]): ContextItem[] {
  const baseItems: ContextItem[] = [
    {
      kind: 'context',
      ref: `loop:${input.loopId}:goal`,
      content: [input.goal.summary, ...input.goal.successCriteria].join('\n'),
      required: true
    },
    ...input.memory.contextRefs.map((ref) => ({ kind: 'fragment' as const, ref, content: ref })),
    ...input.memory.diagnostics.map((diagnostic, index) => ({
      kind: 'rules' as const,
      ref: `diagnostic:${index + 1}`,
      content: diagnostic
    })),
    ...corrections.map((correction) => ({
      kind: 'rules' as const,
      ref: correction.contextRef,
      content: `${correction.diagnostic}\nTargeted tools: ${correction.targetedTools.join(', ')}`
    }))
  ];
  return baseItems.map((item) => ({ ...item, content: sanitizeText(item.content), ref: sanitizeText(item.ref) }));
}

function requestForAttempt(input: ExecutionLoopInput, corrections: ExecutionLoopCorrection[]): AgentExecutionRequest {
  return {
    schemaVersion: AGENT_EXECUTION_SCHEMA_VERSION,
    runId: input.runId,
    nodeId: input.nodeId,
    agent: input.agent,
    task: input.task,
    contextPack: buildContextPack(contextItems(input, corrections), {
      mode: corrections.length ? 'chill' : 'normal',
      budget: 12000,
      sensitivePatterns: ['.env*', '**/*.pem', '**/*.key', '**/secrets.*']
    }),
    permissions: input.permissions,
    workspace: input.workspace,
    stopConditions: {
      timeoutMs: input.stopConditions.timeoutMs,
      maxToolCalls: input.stopConditions.maxToolCalls
    },
    validation: input.validation
  };
}

function usageTokens(usage: AgentUsageRecord | undefined): number {
  return (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
}

function percent(used: number, budget: number | undefined): number | undefined {
  return budget && budget > 0 ? Math.round((used / budget) * 100) : undefined;
}

function budgetSummary(tokensUsed: number, costUsed: number, stopConditions: ExecutionLoopStopConditions): ExecutionLoopBudgetSummary {
  return {
    tokensUsed,
    tokenBudget: stopConditions.tokenBudget,
    tokenPercent: percent(tokensUsed, stopConditions.tokenBudget),
    estimatedCost: Number(costUsed.toFixed(6)),
    costBudget: stopConditions.costBudget,
    costPercent: percent(costUsed, stopConditions.costBudget),
    currency: 'USD'
  };
}

function budgetExceeded(tokensUsed: number, costUsed: number, stopConditions: ExecutionLoopStopConditions): boolean {
  return (
    (stopConditions.tokenBudget !== undefined && tokensUsed > stopConditions.tokenBudget) ||
    (stopConditions.costBudget !== undefined && costUsed > stopConditions.costBudget)
  );
}

function failedTools(plan: ExecutionLoopAttemptPlan): string[] {
  return plan.validations.filter((validation) => !validation.ok).map((validation) => validation.tool);
}

function correctionFor(
  attemptNumber: number,
  plan: ExecutionLoopAttemptPlan,
  policy: ExecutionLoopCorrectionPolicy
): ExecutionLoopCorrection | undefined {
  const targetedTools = failedTools(plan);
  const diagnostic = plan.diagnostic ? sanitizeText(plan.diagnostic) : undefined;
  if (!policy.enabled) return undefined;
  if (policy.requireTargetedDiagnostic && (!diagnostic || targetedTools.length === 0)) return undefined;
  return {
    attempt: attemptNumber + 1,
    fromAttemptId: sanitizeText(plan.id),
    targetedTools: targetedTools.map(sanitizeText),
    diagnostic: diagnostic ?? 'Retry requested without a diagnostic.',
    contextRef: `correction:${attemptNumber + 1}:${sanitizeText(plan.id)}`
  };
}

function humanRequest(input: ExecutionLoopInput, reason: string): ExecutionLoopHumanRequest {
  return {
    nodeId: sanitizeText(input.nodeId),
    question: `How should loop ${sanitizeText(input.loopId)} continue?`,
    reason: sanitizeText(reason),
    options: ['revise-loop-input', 'increase-budget-or-attempts', 'cancel-node']
  };
}

function projectRunUpdate(
  input: ExecutionLoopInput,
  status: ExecutionLoopTerminalStatus,
  attemptCount: number,
  nextAction: string
): ExecutionLoopProjectRunUpdate {
  const nodeStatus = status === 'success' ? 'completed' : status === 'cancelled' ? 'cancelled' : status === 'blocked' ? 'blocked' : 'failed';
  return {
    runId: sanitizeText(input.runId),
    nodeId: sanitizeText(input.nodeId),
    status: nodeStatus,
    summary: `Loop ${sanitizeText(input.loopId)} finished with ${status}.`,
    attemptCount,
    nextAction: sanitizeText(nextAction)
  };
}

function renderAttempt(attempt: ExecutionLoopAttempt): string[] {
  return [
    `- ${attempt.attempt}. ${attempt.id} - ${attempt.status}`,
    `  - summary: ${attempt.summary}`,
    ...(attempt.diagnostic ? [`  - diagnostic: ${attempt.diagnostic}`] : []),
    ...attempt.harnessResult.validations.map((validation) => `  - validation ${validation.name}: ${validation.status}`)
  ];
}

function renderMarkdown(report: Omit<ExecutionLoopReport, 'markdown'>): string {
  const lines = [
    `# Execution loop - ${report.projectName}`,
    '',
    '## Summary',
    `- Run: ${report.runId}`,
    `- Loop: ${report.loopId}`,
    `- Node: ${report.nodeId}`,
    `- Type: ${report.loopType}`,
    `- Status: ${report.status}`,
    `- Stop reason: ${report.stopReason}`,
    `- Next action: ${report.nextAction}`,
    `- Budget: ${report.budget.tokensUsed} tokens, ${report.budget.estimatedCost.toFixed(4)} ${report.budget.currency}`,
    '',
    '## Goal',
    `- ${report.goal.summary}`,
    ...report.goal.successCriteria.map((criterion) => `- ${criterion}`),
    '',
    '## Attempts',
    ...(report.attempts.length ? report.attempts.flatMap(renderAttempt) : ['- none']),
    '',
    '## Corrections',
    ...(report.corrections.length
      ? report.corrections.map(
          (correction) => `- attempt ${correction.attempt}: ${correction.diagnostic} (${correction.targetedTools.join(', ')})`
        )
      : ['- none']),
    '',
    '## Human Request',
    report.humanRequest ? `- ${report.humanRequest.question}: ${report.humanRequest.reason}` : '- none',
    '',
    '## Project Run Update',
    `- ${report.projectRunUpdate.nodeId}: ${report.projectRunUpdate.status}`,
    `- next: ${report.projectRunUpdate.nextAction}`
  ];
  return `${lines.join('\n')}\n`;
}

function report(
  input: ExecutionLoopInput,
  generatedAt: string,
  status: ExecutionLoopTerminalStatus,
  stopReason: ExecutionLoopReport['stopReason'],
  attempts: ExecutionLoopAttempt[],
  corrections: ExecutionLoopCorrection[],
  tokensUsed: number,
  costUsed: number,
  nextAction: string,
  request?: ExecutionLoopHumanRequest
): ExecutionLoopReport {
  const reportWithoutMarkdown = {
    schemaVersion: EXECUTION_LOOP_SCHEMA_VERSION,
    generatedAt,
    runId: sanitizeText(input.runId),
    projectName: sanitizeText(input.projectName),
    loopId: sanitizeText(input.loopId),
    nodeId: sanitizeText(input.nodeId),
    loopType: input.loopType,
    status,
    stopReason,
    goal: {
      summary: sanitizeText(input.goal.summary),
      successCriteria: sanitizeArray(input.goal.successCriteria)
    },
    attempts,
    corrections,
    budget: budgetSummary(tokensUsed, costUsed, input.stopConditions),
    humanRequest: request,
    projectRunUpdate: projectRunUpdate(input, status, attempts.length, nextAction),
    nextAction: sanitizeText(nextAction)
  };
  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown)
  };
}

export async function runExecutionLoop(input: ExecutionLoopInput, generatedAt = new Date().toISOString()): Promise<ExecutionLoopReport> {
  if (!input.trigger.ready) {
    const nextAction = 'Resolve trigger conditions before launching this loop.';
    return report(
      input,
      generatedAt,
      'blocked',
      'trigger_not_ready',
      [],
      [],
      0,
      0,
      nextAction,
      humanRequest(input, input.trigger.reason)
    );
  }

  const attempts: ExecutionLoopAttempt[] = [];
  const corrections: ExecutionLoopCorrection[] = [];
  let tokensUsed = 0;
  let costUsed = 0;

  for (let index = 0; index < input.stopConditions.maxAttempts; index += 1) {
    const plan = input.attemptPlans[index];
    if (!plan) break;
    const harnessResult = await runAgentExecution(requestForAttempt(input, corrections), {
      agents: [agentForPlan(input, plan)],
      toolRunner: toolRunnerForPlan(plan)
    });
    tokensUsed += usageTokens(harnessResult.usage);
    costUsed += harnessResult.usage?.costUsd ?? 0;

    if (budgetExceeded(tokensUsed, costUsed, input.stopConditions)) {
      attempts.push({
        attempt: index + 1,
        id: sanitizeText(plan.id),
        status: 'failed',
        summary: sanitizeText(harnessResult.summary),
        diagnostic: 'Budget exceeded after this attempt.',
        harnessResult
      });
      const nextAction = 'Request a larger budget, reduce context or split the node.';
      return report(input, generatedAt, 'failed', 'budget_exceeded', attempts, corrections, tokensUsed, costUsed, nextAction, humanRequest(input, nextAction));
    }

    if (harnessResult.status === 'succeeded') {
      attempts.push({
        attempt: index + 1,
        id: sanitizeText(plan.id),
        status: 'succeeded',
        summary: sanitizeText(harnessResult.summary),
        harnessResult
      });
      return report(input, generatedAt, 'success', 'goal_satisfied', attempts, corrections, tokensUsed, costUsed, 'Attach loop evidence to the Project Run.');
    }

    if (harnessResult.status === 'timed_out') {
      attempts.push({
        attempt: index + 1,
        id: sanitizeText(plan.id),
        status: 'timed_out',
        summary: sanitizeText(harnessResult.summary),
        diagnostic: plan.diagnostic ? sanitizeText(plan.diagnostic) : 'Attempt timed out.',
        harnessResult
      });
      const nextAction = 'Reduce context, raise timeout or request human intervention.';
      return report(input, generatedAt, 'failed', 'timeout', attempts, corrections, tokensUsed, costUsed, nextAction, humanRequest(input, nextAction));
    }

    const correction = correctionFor(index + 1, plan, input.correctionPolicy);
    if (!correction || corrections.length >= input.correctionPolicy.maxCorrections) {
      attempts.push({
        attempt: index + 1,
        id: sanitizeText(plan.id),
        status: 'blocked',
        summary: sanitizeText(harnessResult.summary),
        diagnostic: plan.diagnostic ? sanitizeText(plan.diagnostic) : 'No targeted diagnostic was available.',
        harnessResult
      });
      const nextAction = 'Ask a human to revise loop strategy before retrying.';
      return report(
        input,
        generatedAt,
        'blocked',
        'human_decision_required',
        attempts,
        corrections,
        tokensUsed,
        costUsed,
        nextAction,
        humanRequest(input, plan.diagnostic ?? 'No targeted diagnostic was available.')
      );
    }

    corrections.push(correction);
    attempts.push({
      attempt: index + 1,
      id: sanitizeText(plan.id),
      status: 'needs_correction',
      summary: sanitizeText(harnessResult.summary),
      diagnostic: correction.diagnostic,
      targetedCorrection: correction,
      harnessResult
    });
  }

  const nextAction = 'Maximum attempts reached; request human decision before continuing.';
  return report(input, generatedAt, 'failed', 'max_attempts_reached', attempts, corrections, tokensUsed, costUsed, nextAction, humanRequest(input, nextAction));
}
