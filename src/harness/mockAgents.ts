import type { AgentDraftResult, AgentExecutionRequest } from './execution.types.ts';
import type { HarnessAgent } from './runner.ts';

export const mockImplementerAgent: HarnessAgent = {
  provider: 'mock-implementer',
  async execute(request: AgentExecutionRequest): Promise<AgentDraftResult> {
    return {
      summary: `Prepared implementation plan for ${request.task.id}.`,
      modifications: [
        'normalized task specification',
        'attached traceable context manifest',
        'recorded validation contract'
      ],
      artifacts: [
        {
          path: 'outputs/harness/agent-execution-result.json',
          kind: 'result',
          description: 'structured mock implementation result'
        }
      ],
      usage: {
        provider: 'mock-implementer',
        model: 'deterministic-mock',
        inputTokens: request.contextPack.manifest.estimatedTokens,
        outputTokens: 0,
        costUsd: 0
      }
    };
  }
};

export const mockReviewerAgent: HarnessAgent = {
  provider: 'mock-reviewer',
  async execute(request: AgentExecutionRequest): Promise<AgentDraftResult> {
    return {
      summary: `Reviewed execution readiness for ${request.task.id}.`,
      modifications: ['checked acceptance criteria', 'checked permission envelope'],
      usage: {
        provider: 'mock-reviewer',
        model: 'deterministic-mock',
        inputTokens: request.contextPack.manifest.estimatedTokens,
        outputTokens: 0,
        costUsd: 0
      },
      nextAction: 'ready-for-human-review'
    };
  }
};

export const DEFAULT_MOCK_HARNESS_AGENTS = [mockImplementerAgent, mockReviewerAgent];
