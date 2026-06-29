import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateBacklogItem,
  validateBacklogDraft,
  assertBacklogDraft,
  isBacklogItem
} from '../src/backlog/backlog.types.ts';

// ---------------------------------------------------------------------------
// validateBacklogItem
// ---------------------------------------------------------------------------

const validItem = {
  id: 'story-001',
  type: 'story',
  title: 'A valid story',
  description: 'This story has a meaningful description.',
  priority: 'high',
  status: 'review',
  ownerRole: 'frontend',
  acceptanceCriteria: ['Criterion one', 'Criterion two']
};

describe('validateBacklogItem', () => {
  it('returns no errors for a valid item', () => {
    assert.deepEqual(validateBacklogItem(validItem), []);
  });

  it('returns error for non-object input', () => {
    const errors = validateBacklogItem(null);
    assert.ok(errors.length > 0);
    assert.match(errors[0], /must be an object/);
  });

  it('returns error for missing id', () => {
    const errors = validateBacklogItem({ ...validItem, id: 42 });
    assert.ok(errors.some((e) => e.includes('id')));
  });

  it('returns error for invalid type', () => {
    const errors = validateBacklogItem({ ...validItem, type: 'feature' });
    assert.ok(errors.some((e) => e.includes('type')));
  });

  it('returns error for invalid priority', () => {
    const errors = validateBacklogItem({ ...validItem, priority: 'urgent' });
    assert.ok(errors.some((e) => e.includes('priority')));
  });

  it('returns error for invalid status', () => {
    const errors = validateBacklogItem({ ...validItem, status: 'in_progress' });
    assert.ok(errors.some((e) => e.includes('status')));
  });

  it('returns error for invalid ownerRole', () => {
    const errors = validateBacklogItem({ ...validItem, ownerRole: 'designer' });
    assert.ok(errors.some((e) => e.includes('ownerRole')));
  });

  it('returns error for acceptanceCriteria with non-string entries', () => {
    const errors = validateBacklogItem({ ...validItem, acceptanceCriteria: [1, 2] });
    assert.ok(errors.some((e) => e.includes('acceptanceCriteria')));
  });

  it('accepts item without optional fields', () => {
    const minimal = {
      id: 'task-001',
      type: 'task',
      title: 'Minimal task',
      description: 'Just enough.',
      priority: 'low',
      status: 'draft'
    };
    assert.deepEqual(validateBacklogItem(minimal), []);
  });

  it('accepts risk type', () => {
    const risk = { ...validItem, id: 'risk-001', type: 'risk' };
    assert.deepEqual(validateBacklogItem(risk), []);
  });
});

describe('isBacklogItem', () => {
  it('returns true for a valid item', () => {
    assert.ok(isBacklogItem(validItem));
  });

  it('returns false for an invalid item', () => {
    assert.ok(!isBacklogItem({ ...validItem, type: 'unknown' }));
  });
});

// ---------------------------------------------------------------------------
// validateBacklogDraft
// ---------------------------------------------------------------------------

const validDraft = {
  projectName: 'Test Project',
  projectSummary: 'A test backlog draft.',
  generatedAt: '2025-01-01T00:00:00.000Z',
  sourceBrief: 'src/examples/sample-brief.md',
  assumptions: ['Assumption one'],
  questions: ['Open question one'],
  items: [validItem]
};

describe('validateBacklogDraft', () => {
  it('returns no errors for a valid draft', () => {
    assert.deepEqual(validateBacklogDraft(validDraft), []);
  });

  it('returns error for missing projectName', () => {
    const errors = validateBacklogDraft({ ...validDraft, projectName: 42 });
    assert.ok(errors.some((e) => e.includes('projectName')));
  });

  it('returns error for non-array items', () => {
    const errors = validateBacklogDraft({ ...validDraft, items: 'not-an-array' });
    assert.ok(errors.some((e) => e.includes('items')));
  });

  it('returns error for assumptions that is not a string array', () => {
    const errors = validateBacklogDraft({ ...validDraft, assumptions: [1, 2] });
    assert.ok(errors.some((e) => e.includes('assumptions')));
  });

  it('propagates item-level errors', () => {
    const errors = validateBacklogDraft({
      ...validDraft,
      items: [{ ...validItem, type: 'invalid' }]
    });
    assert.ok(errors.some((e) => e.includes('type')));
  });
});

describe('assertBacklogDraft', () => {
  it('does not throw for a valid draft', () => {
    assert.doesNotThrow(() => assertBacklogDraft(validDraft));
  });

  it('throws for an invalid draft', () => {
    assert.throws(
      () => assertBacklogDraft({ ...validDraft, projectName: 123 }),
      /projectName must be a string/
    );
  });
});
