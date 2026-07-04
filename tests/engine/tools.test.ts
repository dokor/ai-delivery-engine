import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { toolResultsToFindings } from '../../src/engine/tools.ts';

describe('toolResultsToFindings', () => {
  it('produces an error finding per failing tool and none for passing tools', () => {
    const findings = toolResultsToFindings([
      { tool: 'typecheck', status: 0, ok: true },
      { tool: 'test', status: 1, ok: false }
    ]);

    assert.equal(findings.length, 1);
    assert.equal(findings[0].rule, 'tools/test');
    assert.equal(findings[0].severity, 'error');
    assert.equal(findings[0].origin, 'deterministic');
  });

  it('returns no findings when all tools pass', () => {
    const findings = toolResultsToFindings([{ tool: 'typecheck', status: 0, ok: true }]);
    assert.equal(findings.length, 0);
  });
});
