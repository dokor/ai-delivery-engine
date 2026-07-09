import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDelegationPlanInput, planDelegation } from '../../src/delegation/plan.ts';
import type { DelegationPlanInput } from '../../src/delegation/plan.types.ts';

function baseInput(): DelegationPlanInput {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    projectName: 'Demo project',
    completedTaskIds: ['blueprint-128'],
    gitPolicy: {
      defaultBranch: 'main',
      protectedBranches: ['main'],
      requirePullRequest: true,
      requireVisibleCommit: true,
      allowAutoMerge: false
    },
    agents: [
      {
        id: 'codex-local',
        name: 'Codex local',
        provider: 'local-cli',
        roles: ['backend'],
        contextKinds: ['issue'],
        permissions: {
          allowNetwork: false,
          allowedShellCommands: ['pnpm test'],
          writeScopes: ['workspace'],
          secretRefs: ['GITHUB_TOKEN']
        }
      }
    ],
    gates: [
      { id: 'ready', status: 'passed' },
      { id: 'quality', status: 'passed' },
      { id: 'review', status: 'pending', summary: 'Human review required.' }
    ],
    budget: {
      tokenBudget: 50000,
      costBudget: 10,
      currency: 'USD'
    },
    tasks: [
      {
        id: 'issue-121',
        issueNumber: 121,
        title: 'First task',
        priority: 'high',
        role: 'backend',
        dependsOn: ['blueprint-128'],
        requiredGateIds: ['ready', 'quality'],
        branchName: 'feat/issue-121',
        workspacePath: '.worktrees/issue-121',
        contextRefs: ['issues/121'],
        validationCommands: ['pnpm test'],
        expectedArtifacts: ['outputs/issue-121.json'],
        estimatedTokens: 10000,
        estimatedCost: 2
      },
      {
        id: 'issue-122',
        issueNumber: 122,
        title: 'Second task',
        priority: 'high',
        role: 'backend',
        dependsOn: ['issue-121'],
        requiredGateIds: ['ready', 'quality'],
        branchName: 'feat/issue-122',
        workspacePath: '.worktrees/issue-122',
        contextRefs: ['issues/122'],
        validationCommands: ['pnpm test'],
        expectedArtifacts: ['outputs/issue-122.json'],
        estimatedTokens: 12000,
        estimatedCost: 2.5
      },
      {
        id: 'issue-123',
        issueNumber: 123,
        title: 'Blocked task',
        priority: 'medium',
        role: 'backend',
        dependsOn: ['missing-task'],
        requiredGateIds: ['review'],
        branchName: 'main',
        workspacePath: '.worktrees/issue-123',
        contextRefs: ['issues/123'],
        validationCommands: ['pnpm test'],
        expectedArtifacts: ['outputs/issue-123.json'],
        estimatedTokens: 9000,
        estimatedCost: 1.5
      }
    ]
  };
}

test('plans ready tasks in dependency order and blocks unsafe tasks', () => {
  const report = planDelegation(baseInput(), '2026-07-09T00:00:00.000Z');

  assert.deepEqual(
    report.plannedTasks.map((task) => task.id),
    ['issue-121', 'issue-122']
  );
  assert.equal(report.readyTaskCount, 2);
  assert.equal(report.blockedTaskCount, 1);
  assert.equal(report.blockedTasks[0]?.id, 'issue-123');
  assert.match(report.blockedTasks[0]?.reasons.join('\n') ?? '', /Dependency "missing-task"/);
  assert.match(report.blockedTasks[0]?.reasons.join('\n') ?? '', /Required gate "review" is pending/);
  assert.match(report.blockedTasks[0]?.reasons.join('\n') ?? '', /protected branch/);
  assert.equal(report.agentCapabilities[0]?.allowNetwork, false);
  assert.deepEqual(report.agentCapabilities[0]?.secretRefs, ['GITHUB_TOKEN']);
  assert.match(report.markdown, /Agent Capabilities And Permissions/);
  assert.match(report.markdown, /#121 issue-121/);
  assert.match(report.markdown, /#122 issue-122/);
});

test('rejects unsupported schema versions', () => {
  assert.throws(
    () => parseDelegationPlanInput({ ...baseInput(), schemaVersion: 99 }),
    /schemaVersion must be 1/
  );
});

test('rejects duplicate task ids', () => {
  const input = baseInput();
  input.tasks = [input.tasks[0], { ...input.tasks[1], id: input.tasks[0].id }];

  assert.throws(() => parseDelegationPlanInput(input), /duplicate task id "issue-121"/);
});

test('blocks all tasks when Git policy allows invisible or merged work', () => {
  const input = baseInput();
  input.gitPolicy.requirePullRequest = false;
  input.gitPolicy.allowAutoMerge = true;

  const report = planDelegation(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.readyTaskCount, 0);
  assert.equal(report.blockedTaskCount, 3);
  assert.match(report.policyFindings.map((finding) => finding.id).join('\n'), /git:pull-request-required/);
  assert.match(report.policyFindings.map((finding) => finding.id).join('\n'), /git:auto-merge-disabled/);
});

test('respects token budgets before scheduling a task', () => {
  const input = baseInput();
  input.budget = { tokenBudget: 15000, currency: 'USD' };

  const report = planDelegation(input, '2026-07-09T00:00:00.000Z');

  assert.deepEqual(
    report.plannedTasks.map((task) => task.id),
    ['issue-121']
  );
  assert.match(report.blockedTasks.find((task) => task.id === 'issue-122')?.reasons.join('\n') ?? '', /Token budget/);
});

test('redacts token-like values from outputs', () => {
  const input = baseInput();
  input.tasks[0] = {
    ...input.tasks[0],
    contextRefs: ['SECRET_TOKEN=should_not_render', 'ghp_should_not_render']
  };

  const report = planDelegation(input, '2026-07-09T00:00:00.000Z');
  const serialized = JSON.stringify(report);

  assert.doesNotMatch(serialized, /should_not_render/);
  assert.match(serialized, /SECRET_TOKEN=<masked>/);
  assert.match(serialized, /<masked-github-token>/);
});
