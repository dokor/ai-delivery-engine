import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildContextPack } from '../../src/contextpack/buildContextPack.ts';
import { estimateTokens } from '../../src/contextpack/estimateTokens.ts';
import type { ContextItem } from '../../src/contextpack/contextPack.types.ts';

function item(overrides: Partial<ContextItem> & Pick<ContextItem, 'kind' | 'ref' | 'content'>): ContextItem {
  return overrides;
}

describe('estimateTokens', () => {
  it('is zero for empty text and ceil(len/4) otherwise', () => {
    assert.equal(estimateTokens(''), 0);
    assert.equal(estimateTokens('abcd'), 1);
    assert.equal(estimateTokens('abcde'), 2);
  });
});

describe('buildContextPack', () => {
  it('excludes sensitive items by path (fail-safe)', () => {
    const pack = buildContextPack(
      [
        item({ kind: 'context', ref: 'ctx', content: 'safe' }),
        item({ kind: 'fragment', ref: 'env', content: 'SECRET=1', path: '.env' })
      ],
      { mode: 'normal', budget: 10000, sensitivePatterns: ['.env*'] }
    );

    assert.ok(!pack.content.includes('SECRET=1'));
    assert.ok(pack.manifest.excluded.some((e) => e.ref === 'env' && e.reason === 'sensitive'));
    assert.ok(pack.manifest.included.some((i) => i.ref === 'ctx'));
  });

  it('includes everything and applies no reduction when under budget', () => {
    const pack = buildContextPack(
      [item({ kind: 'context', ref: 'ctx', content: 'hello world' })],
      { mode: 'normal', budget: 10000 }
    );

    assert.equal(pack.manifest.reductionsApplied.length, 0);
    assert.equal(pack.manifest.overBudget, false);
    assert.equal(pack.manifest.included.length, 1);
  });

  it('drops the lowest-priority non-required item first when over budget', () => {
    const big = 'x'.repeat(400); // ~100 tokens each
    const pack = buildContextPack(
      [
        item({ kind: 'diff', ref: 'diff', content: big, required: true }),
        item({ kind: 'context', ref: 'ctx', content: big }),
        item({ kind: 'docs', ref: 'docs', content: big })
      ],
      { mode: 'chill', budget: 210 }
    );

    // docs has the lowest default priority → dropped first
    assert.ok(pack.manifest.excluded.some((e) => e.ref === 'docs' && e.reason.startsWith('dropped-to-fit-budget')));
    assert.ok(pack.manifest.included.some((i) => i.ref === 'diff'));
    assert.ok(pack.manifest.reductionsApplied.some((r) => r.includes('docs')));
  });

  it('never drops required items and flags overBudget instead of truncating', () => {
    const big = 'x'.repeat(4000); // ~1000 tokens
    const pack = buildContextPack(
      [item({ kind: 'diff', ref: 'diff', content: big, required: true })],
      { mode: 'chill', budget: 100 }
    );

    assert.equal(pack.manifest.overBudget, true);
    assert.ok(pack.manifest.included.some((i) => i.ref === 'diff'));
    assert.ok(pack.manifest.reductionsApplied.some((r) => r.startsWith('over-budget')));
  });

  it('emits deterministic content ordered by priority then ref', () => {
    const items = [
      item({ kind: 'docs', ref: 'd', content: 'docs' }),
      item({ kind: 'diff', ref: 'a', content: 'diff' }),
      item({ kind: 'rules', ref: 'r', content: 'rules' })
    ];
    const first = buildContextPack(items, { mode: 'normal', budget: 10000 });
    const second = buildContextPack(items, { mode: 'normal', budget: 10000 });

    assert.equal(first.content, second.content);
    // diff (100) before rules (60) before docs (20)
    assert.ok(first.content.indexOf('[diff]') < first.content.indexOf('[rules]'));
    assert.ok(first.content.indexOf('[rules]') < first.content.indexOf('[docs]'));
  });

  it('marks token estimates as indicative in the manifest', () => {
    const pack = buildContextPack([item({ kind: 'context', ref: 'c', content: 'x' })], {
      mode: 'normal',
      budget: 10000
    });
    assert.equal(pack.manifest.estimateIsIndicative, true);
    assert.equal(pack.manifest.estimateMethod, 'heuristic-chars-per-token');
  });
});
