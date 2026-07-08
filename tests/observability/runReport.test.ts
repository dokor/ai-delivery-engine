import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { observeRun, parseObservableRunInput } from '../../src/observability/runReport.ts';
import {
  RUN_OBSERVABILITY_SCHEMA_VERSION,
  type ObservableRunInput
} from '../../src/observability/run.types.ts';

function baseInput(overrides: Partial<ObservableRunInput> = {}): ObservableRunInput {
  return {
    schemaVersion: RUN_OBSERVABILITY_SCHEMA_VERSION,
    runId: 'run-1',
    projectName: 'Demo run',
    budget: {
      tokenBudget: 10000,
      costBudget: 10,
      currency: 'EUR',
      alertThresholdPercent: 80,
      pauseOnThreshold: true
    },
    nodes: [
      {
        id: 'discover',
        title: 'Discover',
        role: 'po-pm',
        provider: 'deterministic',
        status: 'completed',
        cost: { tokensIn: 1000, tokensOut: 500, estimatedCost: 0 }
      },
      {
        id: 'build',
        title: 'Build',
        role: 'backend',
        provider: 'codex',
        status: 'ready',
        dependsOn: ['discover'],
        cost: { tokensIn: 2000, tokensOut: 1000, estimatedCost: 2.5 }
      }
    ],
    decisions: [],
    controls: [],
    ...overrides
  };
}

describe('observeRun', () => {
  it('exposes status, current node, next node and budget summary', () => {
    const report = observeRun(baseInput(), '2026-07-08T00:00:00.000Z');

    assert.equal(report.status, 'ready');
    assert.equal(report.currentNode, undefined);
    assert.equal(report.nextNode?.nodeId, 'build');
    assert.equal(report.budget.tokensUsed, 4500);
    assert.equal(report.budget.tokenPercent, 45);
    assert.match(report.markdown, /Next node: build/);
  });

  it('explains a pending human decision as the blocking reason', () => {
    const report = observeRun(
      baseInput({
        nodes: [
          { id: 'scope', title: 'Scope', role: 'po-pm', status: 'completed' },
          { id: 'payment', title: 'Choose payment provider', role: 'product-owner', status: 'waiting_decision' }
        ],
        decisions: [
          {
            id: 'payment-provider',
            nodeId: 'payment',
            question: 'Which provider?',
            status: 'pending'
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.status, 'waiting_decision');
    assert.equal(report.currentNode?.nodeId, 'payment');
    assert.match(report.blockedReason ?? '', /Decision pending/);
  });

  it('attaches costs by role and provider and recommends pause over threshold', () => {
    const report = observeRun(
      baseInput({
        budget: {
          tokenBudget: 5000,
          costBudget: 3,
          currency: 'EUR',
          alertThresholdPercent: 40,
          pauseOnThreshold: true
        }
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.budget.alert, true);
    assert.equal(report.budget.pauseRecommended, true);
    assert.deepEqual(
      report.budget.byProvider.map((entry) => entry.provider),
      ['codex', 'deterministic']
    );
  });

  it('keeps pause, retry, cancel and takeover actions auditable', () => {
    const report = observeRun(
      baseInput({
        controls: [
          { id: 'pause-1', type: 'pause', requestedBy: 'system', at: 't1', reason: 'budget', result: 'accepted' },
          { id: 'retry-1', type: 'retry', nodeId: 'build', requestedBy: 'human', at: 't2', reason: 'fix', result: 'accepted' },
          { id: 'cancel-1', type: 'cancel', requestedBy: 'human', at: 't3', reason: 'scope', result: 'rejected' },
          { id: 'takeover-1', type: 'takeover', nodeId: 'build', requestedBy: 'human', at: 't4', reason: 'manual', result: 'pending' }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.deepEqual(
      report.controls.map((control) => control.type),
      ['pause', 'retry', 'cancel', 'takeover']
    );
    assert.match(report.markdown, /Controls Audit/);
  });

  it('captures a completed retry after an error and marks resume expected', () => {
    const report = observeRun(
      baseInput({
        nodes: [
          {
            id: 'build',
            title: 'Build',
            role: 'backend',
            status: 'completed',
            attempts: [
              { attempt: 1, status: 'error', error: 'failed once' },
              { attempt: 2, status: 'completed', summary: 'retry passed' }
            ]
          }
        ],
        decisions: [
          { id: 'retry-build', nodeId: 'build', question: 'Retry?', status: 'resolved', selectedOption: 'yes' }
        ],
        controls: [
          { id: 'retry', type: 'retry', nodeId: 'build', requestedBy: 'human', at: 't1', reason: 'retry', result: 'accepted' },
          { id: 'resume', type: 'resume', nodeId: 'build', requestedBy: 'human', at: 't2', reason: 'continue', result: 'accepted' }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.status, 'completed');
    assert.equal(report.resumeExpected, true);
    assert.match(report.markdown, /attempt 1 error: failed once/);
    assert.match(report.markdown, /attempt 2: completed - retry passed/);
  });

  it('redacts secrets and excludes sensitive links from all outputs', () => {
    const report = observeRun(
      baseInput({
        nodes: [
          {
            id: 'build',
            title: 'Build',
            role: 'backend',
            status: 'error',
            logs: ['PAYMENT_TOKEN=tok_secret and sk-demo-secret should be hidden'],
            error: 'GITHUB_TOKEN=ghp_should_not_render',
            artifacts: [{ label: 'Secrets', path: 'ops/secrets.md', kind: 'artifact', sensitive: true }]
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.doesNotMatch(JSON.stringify(report), /tok_secret|sk-demo-secret|ghp_should_not_render|ops\/secrets/);
    assert.match(report.markdown, /PAYMENT_TOKEN=<masked>/);
    assert.match(report.markdown, /GITHUB_TOKEN=<masked>/);
  });
});

describe('parseObservableRunInput', () => {
  it('parses a valid observable run input', () => {
    const parsed = parseObservableRunInput(baseInput());

    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.nodes.length, 2);
  });

  it('rejects an unsupported schema version', () => {
    assert.throws(
      () => parseObservableRunInput({ ...baseInput(), schemaVersion: 2 }),
      /schemaVersion must be 1/
    );
  });
});
