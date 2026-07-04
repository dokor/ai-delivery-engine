import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { emptyResolvedConfig } from '../../src/config/mergeConfig.ts';
import { isModeName, listModeNames, resolveMode } from '../../src/contextpack/modes.ts';

describe('modes', () => {
  it('recognizes the three mode names', () => {
    assert.equal(isModeName('chill'), true);
    assert.equal(isModeName('normal'), true);
    assert.equal(isModeName('expert'), true);
    assert.equal(isModeName('turbo'), false);
    assert.deepEqual(listModeNames(), ['chill', 'normal', 'expert']);
  });

  it('orders presets by increasing budget and precision', () => {
    const config = emptyResolvedConfig();
    const chill = resolveMode('chill', config);
    const normal = resolveMode('normal', config);
    const expert = resolveMode('expert', config);

    assert.ok(chill.tokenBudget < normal.tokenBudget);
    assert.ok(normal.tokenBudget < expert.tokenBudget);
    assert.equal(chill.includeDocs, false);
    assert.equal(expert.includeDocs, true);
    assert.equal(chill.maxFragments, 0);
    assert.ok(expert.maxFragments > normal.maxFragments);
  });

  it('lets a same-named config profile override the token budget', () => {
    const config = { ...emptyResolvedConfig(), profiles: { chill: { tokenBudget: 999 } } };
    const chill = resolveMode('chill', config);
    assert.equal(chill.tokenBudget, 999);
  });

  it('maps a profile context granularity onto the mode', () => {
    const config = { ...emptyResolvedConfig(), profiles: { normal: { context: 'full' as const } } };
    assert.equal(resolveMode('normal', config).contextGranularity, 'full');
  });

  it('ignores a non-positive profile budget and keeps the preset', () => {
    const config = { ...emptyResolvedConfig(), profiles: { normal: { tokenBudget: 0 } } };
    assert.equal(resolveMode('normal', config).tokenBudget, 12000);
  });
});
