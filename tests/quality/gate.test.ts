import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateQualityGate, parseQualityGateInput } from '../../src/quality/gate.ts';
import {
  QUALITY_GATE_SCHEMA_VERSION,
  type QualityGateInput
} from '../../src/quality/gate.types.ts';

function baseInput(overrides: Partial<QualityGateInput> = {}): QualityGateInput {
  return {
    schemaVersion: QUALITY_GATE_SCHEMA_VERSION,
    runId: 'run-1',
    projectName: 'Demo',
    target: 'staging',
    policy: {
      target: 'staging',
      requiredSignalIds: ['typecheck', 'tests'],
      requiredProfiles: ['backend', 'qa'],
      blockingSeverities: ['error', 'critical'],
      allowHumanOverride: true
    },
    profiles: [
      { role: 'backend', required: true, measured: true },
      { role: 'qa', required: true, measured: true }
    ],
    signals: [
      { id: 'typecheck', name: 'Typecheck', kind: 'tool', tool: 'pnpm typecheck', status: 'passed', executed: true },
      { id: 'tests', name: 'Tests', kind: 'tool', tool: 'pnpm test', status: 'passed', executed: true },
      { id: 'qa-check', name: 'QA specialist', kind: 'specialist-check', profile: 'qa', status: 'warning', severity: 'warning' },
      { id: 'ai-review', name: 'Optional AI review', kind: 'ai-review', provider: 'manual', status: 'warning', severity: 'warning' }
    ],
    overrides: [],
    revalidationCycles: [],
    ...overrides
  };
}

describe('evaluateQualityGate', () => {
  it('passes a gate with required deterministic checks and keeps AI results separate', () => {
    const report = evaluateQualityGate(baseInput(), '2026-07-08T00:00:00.000Z');

    assert.equal(report.verdict, 'pass');
    assert.deepEqual(report.executedTools, ['pnpm test', 'pnpm typecheck']);
    assert.equal(report.deterministicResults.length, 3);
    assert.equal(report.aiResults.length, 1);
    assert.match(report.markdown, /AI Assisted Results/);
  });

  it('requires an override for a blocking failure when policy allows it', () => {
    const report = evaluateQualityGate(
      baseInput({
        signals: [
          { id: 'typecheck', name: 'Typecheck', kind: 'tool', tool: 'pnpm typecheck', status: 'passed' },
          { id: 'tests', name: 'Tests', kind: 'tool', tool: 'pnpm test', status: 'failed', severity: 'error' }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.verdict, 'override-required');
    assert.ok(report.findings.some((finding) => finding.blocking && finding.signalId === 'tests'));
    assert.ok(report.nextActions.some((action) => action.includes('approved human override')));
  });

  it('fails a blocking gate when overrides are disabled', () => {
    const report = evaluateQualityGate(
      baseInput({
        policy: {
          target: 'staging',
          requiredSignalIds: ['typecheck', 'tests'],
          blockingSeverities: ['error'],
          allowHumanOverride: false
        },
        signals: [
          { id: 'typecheck', name: 'Typecheck', kind: 'tool', status: 'passed' },
          { id: 'tests', name: 'Tests', kind: 'tool', status: 'failed', severity: 'error' }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.verdict, 'fail');
    assert.ok(report.nextActions.some((action) => action.includes('targeted revalidation')));
  });

  it('passes with an audited human override that covers blocking findings', () => {
    const report = evaluateQualityGate(
      baseInput({
        signals: [
          { id: 'typecheck', name: 'Typecheck', kind: 'tool', status: 'passed' },
          { id: 'tests', name: 'Tests', kind: 'tool', status: 'failed', severity: 'error' }
        ],
        overrides: [
          {
            approved: true,
            by: 'owner',
            at: '2026-07-08T00:00:00.000Z',
            reason: 'Accepted for staging only.',
            appliesTo: ['tests:failed']
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.verdict, 'pass');
    assert.equal(report.overrideUsed, true);
    assert.match(report.markdown, /approved by owner/);
  });

  it('keeps unmeasured required profiles as recommendations rather than false blockers', () => {
    const report = evaluateQualityGate(
      baseInput({
        policy: {
          target: 'staging',
          requiredSignalIds: ['typecheck', 'tests'],
          requiredProfiles: ['finance-cost'],
          blockingSeverities: ['error'],
          allowHumanOverride: true
        },
        profiles: [{ role: 'finance-cost', required: true, measured: false }]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.verdict, 'pass');
    assert.ok(report.recommendations.some((item) => item.includes('finance-cost')));
  });

  it('tracks correction and targeted revalidation cycles', () => {
    const report = evaluateQualityGate(
      baseInput({
        signals: [
          { id: 'typecheck', name: 'Typecheck', kind: 'tool', status: 'passed' },
          { id: 'tests', name: 'Tests', kind: 'tool', status: 'failed', severity: 'error' }
        ],
        revalidationCycles: [
          {
            id: 'cycle-1',
            status: 'open',
            reason: 'Tests failed.',
            fixes: ['Fix failing unit test.'],
            revalidatedSignalIds: ['tests']
          }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.equal(report.verdict, 'override-required');
    assert.ok(report.nextActions.some((action) => action.includes('cycle-1')));
    assert.match(report.markdown, /cycle-1/);
  });

  it('redacts sensitive evidence from JSON and Markdown outputs', () => {
    const report = evaluateQualityGate(
      baseInput({
        signals: [
          {
            id: 'typecheck',
            name: 'Typecheck',
            kind: 'tool',
            status: 'passed',
            evidence: [{ label: 'raw log', log: 'SECRET_TOKEN=should_not_render', sensitive: true }]
          },
          { id: 'tests', name: 'Tests', kind: 'tool', status: 'passed' }
        ]
      }),
      '2026-07-08T00:00:00.000Z'
    );

    assert.doesNotMatch(JSON.stringify(report), /should_not_render|SECRET_TOKEN=/);
  });
});

describe('parseQualityGateInput', () => {
  it('parses a valid quality gate input', () => {
    const parsed = parseQualityGateInput(baseInput());

    assert.equal(parsed.schemaVersion, 1);
    assert.equal(parsed.policy.target, 'staging');
  });

  it('rejects an unsupported schema version', () => {
    assert.throws(() => parseQualityGateInput({ ...baseInput(), schemaVersion: 2 }), /schemaVersion must be 1/);
  });
});
