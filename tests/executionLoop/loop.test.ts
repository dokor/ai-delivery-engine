import assert from 'node:assert/strict';
import test from 'node:test';

import { parseExecutionLoopInput, runExecutionLoop } from '../../src/executionLoop/loop.ts';
import type { ExecutionLoopInput } from '../../src/executionLoop/loop.types.ts';

function baseInput(): ExecutionLoopInput {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    projectName: 'Demo',
    loopId: 'loop-dev',
    nodeId: 'node-dev',
    loopType: 'development',
    trigger: {
      ready: true,
      reason: 'ready'
    },
    goal: {
      summary: 'Reach green validations.',
      successCriteria: ['typecheck', 'test']
    },
    agent: {
      id: 'mock-implementer',
      provider: 'mock-implementer',
      role: 'back-end'
    },
    task: {
      id: 'task-1',
      title: 'Implement feature',
      acceptanceCriteria: ['works']
    },
    memory: {
      contextRefs: ['issue:120'],
      artifacts: [],
      diagnostics: []
    },
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
    stopConditions: {
      timeoutMs: 1000,
      maxAttempts: 3,
      maxToolCalls: 2,
      tokenBudget: 1000,
      costBudget: 0.05
    },
    validation: {
      commands: ['typecheck', 'test']
    },
    correctionPolicy: {
      enabled: true,
      maxCorrections: 2,
      requireTargetedDiagnostic: true
    },
    attemptPlans: [
      {
        id: 'first',
        summary: 'Typecheck failed.',
        diagnostic: 'typecheck failed on missing import.',
        usage: { provider: 'mock', inputTokens: 100, outputTokens: 50, costUsd: 0 },
        validations: [
          { tool: 'typecheck', status: 1, ok: false },
          { tool: 'test', status: 0, ok: true }
        ]
      },
      {
        id: 'second',
        summary: 'Correction passed.',
        usage: { provider: 'mock', inputTokens: 80, outputTokens: 40, costUsd: 0 },
        validations: [
          { tool: 'typecheck', status: 0, ok: true },
          { tool: 'test', status: 0, ok: true }
        ]
      }
    ]
  };
}

test('runs a development loop with targeted correction then succeeds', async () => {
  const report = await runExecutionLoop(baseInput(), '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'success');
  assert.equal(report.stopReason, 'goal_satisfied');
  assert.equal(report.attempts.length, 2);
  assert.equal(report.attempts[0]?.status, 'needs_correction');
  assert.equal(report.corrections[0]?.targetedTools[0], 'typecheck');
  assert.equal(report.projectRunUpdate.status, 'completed');
});

test('blocks before execution when trigger is not ready', async () => {
  const input = baseInput();
  input.trigger = { ready: false, reason: 'Gate is pending.' };

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'blocked');
  assert.equal(report.stopReason, 'trigger_not_ready');
  assert.equal(report.attempts.length, 0);
  assert.match(report.humanRequest?.reason ?? '', /Gate is pending/);
});

test('stops when max attempts are reached', async () => {
  const input = baseInput();
  input.stopConditions.maxAttempts = 1;

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'failed');
  assert.equal(report.stopReason, 'max_attempts_reached');
  assert.equal(report.attempts.length, 1);
});

test('stops when token budget is exceeded', async () => {
  const input = baseInput();
  input.stopConditions.tokenBudget = 10;

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'failed');
  assert.equal(report.stopReason, 'budget_exceeded');
  assert.equal(report.projectRunUpdate.status, 'failed');
});

test('stops on timeout and asks for a human decision', async () => {
  const input = baseInput();
  input.stopConditions.timeoutMs = 1;
  input.attemptPlans = [
    {
      id: 'slow',
      summary: 'Too slow.',
      agentDelayMs: 20,
      diagnostic: 'attempt exceeded timeout',
      validations: []
    }
  ];

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'failed');
  assert.equal(report.stopReason, 'timeout');
  assert.equal(report.humanRequest?.nodeId, 'node-dev');
});

test('blocks blind retry when no targeted diagnostic is available', async () => {
  const input = baseInput();
  input.attemptPlans[0].diagnostic = undefined;

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.status, 'blocked');
  assert.equal(report.stopReason, 'human_decision_required');
  assert.equal(report.corrections.length, 0);
});

test('redacts token-like values from durable outputs', async () => {
  const input = baseInput();
  input.goal.summary = 'Fix SECRET_TOKEN=should_not_render and ghp_should_not_render';
  input.attemptPlans[0].diagnostic = 'sk-demo_should_not_render';

  const report = await runExecutionLoop(input, '2026-07-09T00:00:00.000Z');
  const serialized = JSON.stringify(report);

  assert.doesNotMatch(serialized, /should_not_render/);
  assert.match(serialized, /SECRET_TOKEN=<masked>/);
  assert.match(serialized, /<masked-github-token>/);
  assert.match(serialized, /<masked-token>/);
});

test('rejects duplicate attempt ids through parsing', () => {
  const input = baseInput();
  input.attemptPlans = [input.attemptPlans[0], { ...input.attemptPlans[1], id: input.attemptPlans[0].id }];

  assert.throws(() => parseExecutionLoopInput(input), /duplicate attempt id "first"/);
});
