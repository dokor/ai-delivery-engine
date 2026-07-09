import assert from 'node:assert/strict';
import test from 'node:test';

import { executeGraph, parseGraphExecutionInput } from '../../src/orchestration/graphExecution.ts';
import type { GraphExecutionInput } from '../../src/orchestration/graphExecution.types.ts';

function baseInput(): GraphExecutionInput {
  return {
    schemaVersion: 1,
    runId: 'run-1',
    projectName: 'Demo',
    blueprintVersion: 'blueprint-v1',
    completedNodeIds: ['brief'],
    providers: [
      { id: 'mock-po', name: 'Mock PO', roles: ['po-pm'], mock: true },
      { id: 'mock-delivery', name: 'Mock Delivery', roles: ['qa', 'backend'], mock: true }
    ],
    gates: [
      { id: 'ready', status: 'passed' },
      { id: 'scope', status: 'pending', summary: 'Human approval required.' }
    ],
    decisions: [
      { id: 'priority', status: 'approved', summary: 'Proceed.' },
      { id: 'scope-decision', status: 'pending', summary: 'Waiting.' }
    ],
    budget: {
      tokenBudget: 30000,
      costBudget: 8,
      currency: 'USD'
    },
    nodes: [
      {
        id: 'brief',
        title: 'Brief intake',
        role: 'po-pm',
        providerId: 'mock-po',
        priority: 'high',
        dependsOn: [],
        requiredGateIds: ['ready'],
        decisionIds: [],
        inputRefs: ['brief.md'],
        expectedOutputs: ['brief.normalized'],
        mockOutput: 'Already done.',
        estimatedTokens: 1000,
        estimatedCost: 0.2
      },
      {
        id: 'backlog',
        title: 'Generate backlog',
        role: 'po-pm',
        providerId: 'mock-po',
        priority: 'high',
        dependsOn: ['brief'],
        requiredGateIds: ['ready'],
        decisionIds: ['priority'],
        inputRefs: ['brief.normalized'],
        expectedOutputs: ['backlog.json'],
        mockOutput: 'Generated backlog.',
        estimatedTokens: 8000,
        estimatedCost: 1.5
      },
      {
        id: 'qa',
        title: 'Review backlog',
        role: 'qa',
        providerId: 'mock-delivery',
        priority: 'medium',
        dependsOn: ['backlog'],
        requiredGateIds: ['ready'],
        decisionIds: [],
        inputRefs: ['backlog.json'],
        expectedOutputs: ['review.json'],
        mockOutput: 'Reviewed backlog.',
        estimatedTokens: 6000,
        estimatedCost: 1
      },
      {
        id: 'implementation',
        title: 'Plan implementation',
        role: 'backend',
        providerId: 'mock-delivery',
        priority: 'medium',
        dependsOn: ['qa'],
        requiredGateIds: ['scope'],
        decisionIds: ['scope-decision'],
        inputRefs: ['review.json'],
        expectedOutputs: ['plan.md'],
        mockOutput: 'Blocked pending scope.',
        estimatedTokens: 10000,
        estimatedCost: 2
      }
    ]
  };
}

test('executes ready graph nodes, creates handoffs and preserves resumed nodes', () => {
  const report = executeGraph(baseInput(), '2026-07-09T00:00:00.000Z');

  assert.deepEqual(
    report.executedNodes.map((node) => node.id),
    ['backlog', 'qa']
  );
  assert.deepEqual(
    report.resumedNodes.map((node) => node.id),
    ['brief']
  );
  assert.equal(report.blockedNodes[0]?.id, 'implementation');
  assert.match(report.blockedNodes[0]?.reasons.join('\n') ?? '', /gate "scope" is pending/);
  assert.match(report.blockedNodes[0]?.reasons.join('\n') ?? '', /decision "scope-decision" is pending/);
  assert.match(report.handoffs.map((handoff) => `${handoff.fromNodeId}->${handoff.toNodeId}`).join('\n'), /backlog->qa/);
  assert.match(report.executedNodes[0]?.outputs[0]?.ref ?? '', /run:run-1:blueprint:blueprint-v1:node:backlog/);
});

test('runs independent nodes without violating dependencies', () => {
  const input = baseInput();
  input.completedNodeIds = [];
  input.nodes = input.nodes.map((node) =>
    node.id === 'qa'
      ? { ...node, id: 'security', title: 'Security review', role: 'backend', dependsOn: ['brief'], expectedOutputs: ['security.md'] }
      : node
  );

  const report = executeGraph(input, '2026-07-09T00:00:00.000Z');

  const executedIds = report.executedNodes.map((node) => node.id);
  assert.deepEqual(new Set(executedIds), new Set(['brief', 'backlog', 'security']));
  assert.ok(executedIds.indexOf('brief') < executedIds.indexOf('backlog'));
  assert.ok(executedIds.indexOf('brief') < executedIds.indexOf('security'));
});

test('approved human decision lets the plan resume automatically', () => {
  const input = baseInput();
  input.gates = input.gates.map((gate) => (gate.id === 'scope' ? { ...gate, status: 'passed' } : gate));
  input.decisions = input.decisions.map((decision) =>
    decision.id === 'scope-decision' ? { ...decision, status: 'approved' } : decision
  );

  const report = executeGraph(input, '2026-07-09T00:00:00.000Z');

  assert.equal(report.blockedNodeCount, 0);
  assert.match(report.executedNodes.map((node) => node.id).join('\n'), /implementation/);
});

test('respects token budget and blocks nodes that would exceed it', () => {
  const input = baseInput();
  input.budget = { tokenBudget: 10000, currency: 'USD' };

  const report = executeGraph(input, '2026-07-09T00:00:00.000Z');

  assert.deepEqual(
    report.executedNodes.map((node) => node.id),
    ['backlog']
  );
  assert.match(report.blockedNodes.find((node) => node.id === 'qa')?.reasons.join('\n') ?? '', /Token budget/);
});

test('rejects duplicate node ids', () => {
  const input = baseInput();
  input.nodes = [input.nodes[0], { ...input.nodes[1], id: input.nodes[0].id }];

  assert.throws(() => parseGraphExecutionInput(input), /duplicate node id "brief"/);
});

test('redacts sensitive refs and token-like output text', () => {
  const input = baseInput();
  input.nodes[1] = {
    ...input.nodes[1],
    inputRefs: ['SECRET_TOKEN=should_not_render', 'ghp_should_not_render'],
    expectedOutputs: ['sk-demo_should_not_render']
  };

  const report = executeGraph(input, '2026-07-09T00:00:00.000Z');
  const serialized = JSON.stringify(report);

  assert.doesNotMatch(serialized, /should_not_render/);
  assert.doesNotMatch(serialized, /SECRET_TOKEN=/);
  assert.match(serialized, /<masked-token>/);
});
