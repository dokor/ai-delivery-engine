import type {
  AgentCommandRecord,
  AgentDraftResult,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentExecutionStatus,
  AgentValidationRecord
} from './execution.types.ts';

export interface HarnessAgent {
  provider: string;
  execute(request: AgentExecutionRequest): Promise<AgentDraftResult>;
}

export interface HarnessToolRunner {
  run(tool: string, cwd: string): Promise<AgentCommandRecord>;
}

export interface RunAgentExecutionOptions {
  agents: HarnessAgent[];
  toolRunner?: HarnessToolRunner;
}

function resultFrom(
  request: AgentExecutionRequest,
  status: AgentExecutionStatus,
  summary: string,
  overrides: Partial<AgentExecutionResult> = {}
): AgentExecutionResult {
  return {
    schemaVersion: request.schemaVersion,
    runId: request.runId,
    nodeId: request.nodeId,
    agent: request.agent,
    status,
    summary,
    modifications: [],
    commands: [],
    validations: [],
    artifacts: [],
    blockers: [],
    nextAction: status === 'succeeded' ? 'handoff-to-orchestrator' : 'inspect-run-result',
    contextManifest: request.contextPack.manifest,
    ...overrides
  };
}

function permissionDenied(
  request: AgentExecutionRequest,
  detail: string,
  validations: AgentValidationRecord[] = []
): AgentExecutionResult {
  return resultFrom(request, 'permission_denied', detail, {
    validations,
    blockers: [detail],
    nextAction: 'adjust-permissions-or-task-scope'
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | 'timeout'> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(() => resolve('timeout'), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function validatePermissions(request: AgentExecutionRequest): AgentExecutionResult | undefined {
  if (request.validation.commands.length > 0 && !request.permissions.shell) {
    return permissionDenied(request, 'Shell access is disabled but validation commands were requested.');
  }

  for (const command of request.validation.commands) {
    if (!request.permissions.allowedTools.includes(command)) {
      return permissionDenied(request, `Tool "${command}" is not allowed for this execution.`, [
        { name: command, status: 'skipped', detail: 'permission denied' }
      ]);
    }
  }

  return undefined;
}

function defaultToolRunner(): HarnessToolRunner {
  return {
    async run(tool: string): Promise<AgentCommandRecord> {
      return { tool, status: 0, ok: true };
    }
  };
}

export async function runAgentExecution(
  request: AgentExecutionRequest,
  options: RunAgentExecutionOptions
): Promise<AgentExecutionResult> {
  const permissionResult = validatePermissions(request);
  if (permissionResult) {
    return permissionResult;
  }

  const agent = options.agents.find((candidate) => candidate.provider === request.agent.provider);
  if (!agent) {
    return resultFrom(request, 'agent_error', `No agent provider registered for "${request.agent.provider}".`, {
      blockers: [`Unknown provider: ${request.agent.provider}`],
      nextAction: 'register-agent-provider'
    });
  }

  let draft: AgentDraftResult;
  try {
    const timed = await withTimeout(agent.execute(request), request.stopConditions.timeoutMs);
    if (timed === 'timeout') {
      return resultFrom(request, 'timed_out', `Agent timed out after ${request.stopConditions.timeoutMs}ms.`, {
        blockers: ['timeout'],
        nextAction: 'retry-with-smaller-context-or-longer-timeout'
      });
    }
    draft = timed;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown agent error';
    return resultFrom(request, 'agent_error', message, {
      blockers: [message],
      nextAction: 'inspect-agent-error'
    });
  }

  const runner = options.toolRunner ?? defaultToolRunner();
  const commands: AgentCommandRecord[] = [];
  const validations: AgentValidationRecord[] = [];
  const maxToolCalls = request.stopConditions.maxToolCalls;

  if (maxToolCalls !== undefined && request.validation.commands.length > maxToolCalls) {
    return resultFrom(request, 'permission_denied', `Tool call budget exceeded: ${request.validation.commands.length}/${maxToolCalls}.`, {
      modifications: draft.modifications ?? [],
      artifacts: draft.artifacts ?? [],
      usage: draft.usage,
      blockers: ['tool-call-budget-exceeded'],
      nextAction: 'reduce-validation-commands-or-raise-tool-budget'
    });
  }

  for (const command of request.validation.commands) {
    let record: AgentCommandRecord;
    try {
      record = await runner.run(command, request.workspace.root);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown tool error';
      record = { tool: command, status: 1, ok: false };
      commands.push(record);
      validations.push({ name: command, status: 'failed', detail: message });
      return resultFrom(request, 'tool_error', `Validation command "${command}" errored.`, {
        modifications: draft.modifications ?? [],
        commands,
        validations,
        artifacts: draft.artifacts ?? [],
        usage: draft.usage,
        blockers: [message],
        nextAction: 'fix-validation-runner-error'
      });
    }
    commands.push(record);
    validations.push({
      name: command,
      status: record.ok ? 'passed' : 'failed',
      detail: record.ok ? 'command passed' : `command exited with ${record.status}`
    });
    if (!record.ok) {
      return resultFrom(request, 'tool_error', `Validation command "${command}" failed.`, {
        modifications: draft.modifications ?? [],
        commands,
        validations,
        artifacts: draft.artifacts ?? [],
        usage: draft.usage,
        blockers: [`Tool failed: ${command}`],
        nextAction: 'fix-validation-failure'
      });
    }
  }

  return resultFrom(request, 'succeeded', draft.summary, {
    modifications: draft.modifications ?? [],
    commands,
    validations,
    artifacts: draft.artifacts ?? [],
    usage: draft.usage,
    nextAction: draft.nextAction ?? 'handoff-to-orchestrator'
  });
}
