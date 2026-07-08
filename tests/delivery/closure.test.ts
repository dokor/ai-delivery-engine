import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { closeDeliveryRun, parseDeliveryClosureInput } from '../../src/delivery/closure.ts';
import {
  DELIVERY_CLOSURE_SCHEMA_VERSION,
  type DeliveryClosureInput
} from '../../src/delivery/closure.types.ts';

function baseInput(overrides: Partial<DeliveryClosureInput> = {}): DeliveryClosureInput {
  return {
    schemaVersion: DELIVERY_CLOSURE_SCHEMA_VERSION,
    runId: 'run-1',
    projectName: 'Demo',
    repository: {
      url: 'https://github.com/example/demo',
      branch: 'main',
      commit: 'abc123',
      pullRequestUrl: 'https://github.com/example/demo/pull/1',
      access: 'verified'
    },
    production: {
      url: 'https://demo.example.test',
      status: 'validated'
    },
    validations: [
      { name: 'typecheck', status: 'passed', evidenceRef: 'typecheck' },
      { name: 'tests', status: 'passed', evidenceRef: 'tests' }
    ],
    decisions: [],
    artifacts: [],
    operations: {
      architecture: 'Node.js CLI package.',
      localRunbook: 'Run pnpm demo:validate.',
      deployment: 'Publish after approval.',
      monitoring: 'Inspect CI and smoke tests.',
      rollback: 'Redeploy previous package version.'
    },
    budgets: [],
    risks: [],
    manualActions: [],
    evidence: [],
    ...overrides
  };
}

describe('closeDeliveryRun', () => {
  it('marks a run completed when repository, production and validations are proven', () => {
    const result = closeDeliveryRun(baseInput(), '2026-07-08T00:00:00.000Z');

    assert.equal(result.status, 'completed');
    assert.deepEqual(result.missingEvidence, []);
    assert.match(result.notification, /Projet livre/);
    assert.match(result.opsDossier, /Production: https:\/\/demo.example.test/);
  });

  it('keeps the run waiting with concrete next actions when production is missing', () => {
    const result = closeDeliveryRun(
      baseInput({ production: { status: 'missing' } }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(result.status, 'waiting');
    assert.ok(result.missingEvidence.includes('production validated or approved exception'));
    assert.ok(result.nextActions.some((action) => action.includes('production validated')));
  });

  it('accepts a production exception only when the decision is approved', () => {
    const result = closeDeliveryRun(
      baseInput({
        production: {
          status: 'exception',
          exceptionReason: 'Customer accepted manual production handoff.',
          decisionId: 'decision-prod-exception'
        },
        decisions: [
          {
            id: 'decision-prod-exception',
            status: 'approved',
            summary: 'Manual handoff accepted.'
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(result.status, 'completed');
    assert.match(result.notification, /Production exception/);
  });

  it('excludes sensitive artifacts, evidence and variable values from generated outputs', () => {
    const result = closeDeliveryRun(
      baseInput({
        operations: {
          variables: [
            { name: 'GITHUB_TOKEN', value: 'ghp_should_not_render', sensitive: true },
            { name: 'NODE_ENV', value: 'production' }
          ]
        },
        artifacts: [
          { title: 'Runbook', path: 'docs/runbook.md', kind: 'runbook' },
          { title: 'Secrets', path: 'ops/secrets.md', kind: 'runbook', sensitive: true }
        ],
        evidence: [
          { id: 'safe', kind: 'validation', label: 'Safe evidence', url: 'https://example.test' },
          {
            id: 'secret',
            kind: 'artifact',
            label: 'SECRET=super-secret',
            ref: 'SECRET=super-secret',
            sensitive: true
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(result.artifacts.length, 1);
    assert.equal(result.evidence.length, 1);
    assert.doesNotMatch(JSON.stringify(result), /super-secret|ghp_should_not_render|ops\/secrets/);
    assert.doesNotMatch(result.opsDossier, /super-secret|ghp_should_not_render|ops\/secrets/);
    assert.match(result.opsDossier, /GITHUB_TOKEN: optional, sensitive value masked/);
    assert.match(result.opsDossier, /NODE_ENV: optional, value not rendered/);
  });

  it('renders manual actions, risks and recurring costs distinctly', () => {
    const result = closeDeliveryRun(
      baseInput({
        manualActions: ['Assign support owner'],
        risks: ['Smoke tests are shallow'],
        budgets: [{ label: 'Hosting', amount: 15, unit: 'EUR/month', recurring: true }]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.match(result.notification, /Elements manuels restants\n- Assign support owner/);
    assert.match(result.notification, /Risques\n- Smoke tests are shallow/);
    assert.match(result.notification, /Couts recurrents\n- Hosting: 15 EUR\/month recurring/);
  });
});

describe('parseDeliveryClosureInput', () => {
  it('parses a valid raw delivery closure input', () => {
    const parsed = parseDeliveryClosureInput(baseInput());

    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.runId, 'run-1');
  });

  it('rejects an unsupported schema version', () => {
    assert.throws(
      () => parseDeliveryClosureInput({ ...baseInput(), schemaVersion: 2 }),
      /schemaVersion must be 1/
    );
  });
});
