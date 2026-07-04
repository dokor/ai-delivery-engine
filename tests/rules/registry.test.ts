import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { activeRules, getAllPacks, getPack, resolveActivePacks } from '../../src/rules/registry.ts';

describe('rule pack registry', () => {
  it('ships the initial V1 packs', () => {
    const ids = getAllPacks().map((p) => p.id);
    for (const expected of ['development', 'frontend/next', 'frontend/react', 'frontend/angular', 'frontend/wordpress', 'backend/java']) {
      assert.ok(ids.includes(expected), `missing pack ${expected}`);
    }
  });

  it('every rule has explanation, rationale and suggestion', () => {
    for (const pack of getAllPacks()) {
      for (const rule of pack.rules) {
        assert.ok(rule.explanation.length > 0, `${rule.id} explanation`);
        assert.ok(rule.rationale.length > 0, `${rule.id} rationale`);
        assert.ok(rule.suggestion.length > 0, `${rule.id} suggestion`);
        assert.ok(['deterministic', 'tool', 'guidance'].includes(rule.kind));
      }
    }
  });

  it('the development pack has a configurable deterministic service-size rule', () => {
    const pack = getPack('development');
    const rule = pack?.rules.find((r) => r.id === 'development/service-size');
    assert.ok(rule);
    assert.equal(rule?.kind, 'deterministic');
  });

  it('resolves active packs and reports unknown ids', () => {
    const { packs, missing } = resolveActivePacks(['development', 'frontend/vue']);
    assert.deepEqual(packs.map((p) => p.id), ['development']);
    assert.deepEqual(missing, ['frontend/vue']);
  });

  it('expands a profile namespace to its packs', () => {
    const backend = resolveActivePacks(['backend']);
    assert.deepEqual(backend.packs.map((p) => p.id), ['backend/java']);
    assert.equal(backend.missing.length, 0);

    const frontend = resolveActivePacks(['frontend']);
    assert.ok(frontend.packs.map((p) => p.id).includes('frontend/next'));
    assert.ok(frontend.packs.length >= 4);
  });

  it('flattens and de-duplicates active rules', () => {
    const rules = activeRules(['development', 'backend/java']);
    const ids = rules.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes('development/service-size'));
    assert.ok(ids.includes('java/layering'));
  });
});
