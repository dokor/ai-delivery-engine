import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildContextPack } from '../../src/contextpack/buildContextPack.ts';
import { AGENT_EXECUTION_SCHEMA_VERSION, type AgentExecutionRequest } from '../../src/harness/execution.types.ts';
import { mockImplementerAgent, mockReviewerAgent } from '../../src/harness/mockAgents.ts';
import { runAgentExecution, type HarnessAgent, type HarnessToolRunner } from '../../src/harness/runner.ts';

function request(overrides: Partial<AgentExecutionRequest> = {}): AgentExecutionRequest {
  const contextPack = buildContextPack(
    [
      { kind: 'context', ref: 'ctx', content: 'safe context', required: true },
      { kind: 'fragment', ref: 'secret', content: 'SECRET=1', path: '.env' }
    ],
    { mode: 'normal', budget: 10000, sensitivePatterns: ['.env*'] }
  );

  return {
    schemaVersion: AGENT_EXECUTION_SCHEMA_VERSION,
    runId: 'run-1',
    nodeId: 'node-1',
    agent: { id: 'mock-implementer', provider: 'mock-implementer', role: 'tech-lead' },
    task: {
      id: 'task-1',
      title: 'Delivery harness',
      acceptanceCriteria: ['contract', 'mock providers']
    },
    contextPack,
    permissions: {
      shell: true,
      network: false,
      github: false,
      allowedTools: ['typecheck', 'test']
    },
    workspace: {
      root: process.cwd(),
      isolation: 'current-worktree',
      writable: false
    },
    stopConditions: { timeoutMs: 1000 },
    validation: { commands: ['typecheck'] },
    ...overrides
  };
}

describe('runAgentExecution', () => {
  it('runs an interchangeable mock provider and returns a traceable result', async () => {
    const result = await runAgentExecution(request(), {
      agents: [mockImplementerAgent, mockReviewerAgent]
    });

    assert.equal(result.status, 'succeeded');
    assert.equal(result.schemaVersion, 1);
    assert.equal(result.commands[0]?.tool, 'typecheck');
    assert.equal(result.validations[0]?.status, 'passed');
    assert.ok(result.modifications.includes('attached traceable context manifest'));
    assert.ok(result.contextManifest.excluded.some((entry) => entry.ref === 'secret' && entry.reason === 'sensitive'));
  });

  it('can switch provider without changing the request contract', async () => {
    const result = await runAgentExecution(
      request({ agent: { id: 'mock-reviewer', provider: 'mock-reviewer', role: 'qa' } }),
      { agents: [mockImplementerAgent, mockReviewerAgent] }
    );

    assert.equal(result.status, 'succeeded');
    assert.match(result.summary, /Reviewed execution readiness/);
    assert.equal(result.nextAction, 'ready-for-human-review');
  });

  it('returns permission_denied when a validation tool is not allowed', async () => {
    const result = await runAgentExecution(
      request({
        permissions: { shell: true, network: false, github: false, allowedTools: ['test'] },
        validation: { commands: ['typecheck'] }
      }),
      { agents: [mockImplementerAgent] }
    );

    assert.equal(result.status, 'permission_denied');
    assert.match(result.summary, /not allowed/);
    assert.equal(result.validations[0]?.status, 'skipped');
  });

  it('returns tool_error when a validation command fails', async () => {
    const failingRunner: HarnessToolRunner = {
      async run(tool) {
        return { tool, status: 1, ok: false };
      }
    };

    const result = await runAgentExecution(request(), {
      agents: [mockImplementerAgent],
      toolRunner: failingRunner
    });

    assert.equal(result.status, 'tool_error');
    assert.equal(result.commands[0]?.status, 1);
    assert.equal(result.validations[0]?.status, 'failed');
  });

  it('returns tool_error when a validation runner throws', async () => {
    const throwingRunner: HarnessToolRunner = {
      async run() {
        throw new Error('spawn failed');
      }
    };

    const result = await runAgentExecution(request(), {
      agents: [mockImplementerAgent],
      toolRunner: throwingRunner
    });

    assert.equal(result.status, 'tool_error');
    assert.equal(result.commands[0]?.ok, false);
    assert.match(result.validations[0]?.detail ?? '', /spawn failed/);
  });

  it('refuses execution when validation commands exceed maxToolCalls', async () => {
    const result = await runAgentExecution(
      request({
        stopConditions: { timeoutMs: 1000, maxToolCalls: 1 },
        validation: { commands: ['typecheck', 'test'] }
      }),
      { agents: [mockImplementerAgent] }
    );

    assert.equal(result.status, 'permission_denied');
    assert.match(result.summary, /Tool call budget exceeded/);
  });

  it('returns timed_out when the provider exceeds the stop condition', async () => {
    const slowAgent: HarnessAgent = {
      provider: 'slow',
      async execute() {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return { summary: 'late' };
      }
    };

    const result = await runAgentExecution(
      request({
        agent: { id: 'slow', provider: 'slow' },
        stopConditions: { timeoutMs: 1 },
        validation: { commands: [] }
      }),
      { agents: [slowAgent] }
    );

    assert.equal(result.status, 'timed_out');
    assert.match(result.summary, /timed out/);
  });
});
