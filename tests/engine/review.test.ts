import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { emptyResolvedConfig } from '../../src/config/mergeConfig.ts';
import type { ConfigResolution } from '../../src/config/config.types.ts';
import { runReview, reviewExitCode } from '../../src/engine/review.ts';
import type { ReviewScope } from '../../src/engine/findings.types.ts';

const PROJECT_SCOPE: ReviewScope = { kind: 'project' };

function resolution(overrides: Partial<ConfigResolution> = {}): ConfigResolution {
  return {
    config: emptyResolvedConfig(),
    sources: [],
    provenance: [],
    issues: [],
    ...overrides
  };
}

describe('runReview', () => {
  it('produces no findings for a clean project with fresh context', () => {
    const result = runReview({
      resolution: resolution(),
      contextState: 'up-to-date',
      projectFiles: ['src/a.ts'],
      scope: PROJECT_SCOPE
    });
    assert.equal(result.findings.length, 0);
    assert.equal(reviewExitCode(result), 0);
  });

  it('maps config errors to error findings and warnings to warn findings', () => {
    const result = runReview({
      resolution: resolution({
        issues: [
          { code: 'UNKNOWN_KEY', severity: 'error', message: 'bad', path: 'x' },
          { code: 'CONFIG_NOT_FOUND', severity: 'warning', message: 'none' }
        ]
      }),
      projectFiles: [],
      scope: PROJECT_SCOPE
    });

    assert.ok(result.findings.some((f) => f.rule === 'config/UNKNOWN_KEY' && f.severity === 'error'));
    assert.ok(result.findings.some((f) => f.rule === 'config/CONFIG_NOT_FOUND' && f.severity === 'warn'));
    assert.equal(reviewExitCode(result), 1);
    assert.ok(result.findings.every((f) => f.origin === 'deterministic'));
  });

  it('flags stale and absent context', () => {
    const stale = runReview({ resolution: resolution(), contextState: 'stale', projectFiles: [], scope: PROJECT_SCOPE });
    assert.ok(stale.findings.some((f) => f.rule === 'context/staleness' && f.severity === 'warn'));

    const absent = runReview({ resolution: resolution(), contextState: 'absent', projectFiles: [], scope: PROJECT_SCOPE });
    assert.ok(absent.findings.some((f) => f.rule === 'context/absent' && f.severity === 'info'));
  });

  it('flags a project rule whose appliesTo matches no file', () => {
    const config = { ...emptyResolvedConfig(), rules: [{ id: 'r1', appliesTo: ['nonexistent/**'] }] };
    const result = runReview({
      resolution: resolution({ config }),
      contextState: 'up-to-date',
      projectFiles: ['src/a.ts'],
      scope: PROJECT_SCOPE
    });
    assert.ok(result.findings.some((f) => f.rule === 'rules/unmatched'));
  });

  it('does not flag a rule whose appliesTo matches a file', () => {
    const config = { ...emptyResolvedConfig(), rules: [{ id: 'r1', appliesTo: ['src/**'] }] };
    const result = runReview({
      resolution: resolution({ config }),
      contextState: 'up-to-date',
      projectFiles: ['src/a.ts'],
      scope: PROJECT_SCOPE
    });
    assert.ok(!result.findings.some((f) => f.rule === 'rules/unmatched'));
  });

  it('appends extra findings and counts them in the summary', () => {
    const result = runReview({
      resolution: resolution(),
      contextState: 'up-to-date',
      projectFiles: [],
      scope: PROJECT_SCOPE,
      extraFindings: [{ rule: 'tools/test', severity: 'error', message: 'failed', origin: 'deterministic' }]
    });
    assert.equal(result.summary.error, 1);
    assert.equal(reviewExitCode(result), 1);
  });
});
