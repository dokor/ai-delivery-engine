import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { reviewBacklog } from '../src/review/backlogReview.ts';
import type { BacklogDraft } from '../src/backlog/backlog.types.ts';

function makeDraft(overrides: Partial<BacklogDraft> = {}): BacklogDraft {
  return {
    projectName: 'Test Project',
    projectSummary: 'A test backlog draft for review.',
    generatedAt: '2025-01-01T00:00:00.000Z',
    sourceBrief: 'examples/demo-project/brief.md',
    assumptions: ['We assume the MVP is small.'],
    questions: ['What is the primary audience?'],
    items: [
      {
        id: 'epic-001',
        type: 'epic',
        title: 'Core epic',
        description: 'A useful description that is long enough.',
        priority: 'high',
        status: 'review'
      },
      {
        id: 'story-001',
        parentId: 'epic-001',
        type: 'story',
        title: 'Core story',
        description: 'A useful description that is long enough.',
        priority: 'high',
        status: 'review',
        acceptanceCriteria: ['Must pass all checks.']
      },
      {
        id: 'task-001',
        parentId: 'story-001',
        type: 'task',
        title: 'Core task',
        description: 'A useful description that is long enough.',
        priority: 'medium',
        status: 'review',
        ownerRole: 'frontend'
      },
      {
        id: 'risk-001',
        type: 'risk',
        title: 'A known risk',
        description: 'This is a real risk we are tracking here.',
        priority: 'medium',
        status: 'review'
      }
    ],
    ...overrides
  };
}

describe('reviewBacklog', () => {
  it('returns zero findings for a well-formed draft', () => {
    const report = reviewBacklog(makeDraft(), 'source.json');
    assert.equal(report.summary.totalFindings, 0);
  });

  it('warns when project-level assumptions are missing', () => {
    const report = reviewBacklog(makeDraft({ assumptions: [] }), 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('missing-project-assumptions'));
  });

  it('warns when open questions are missing', () => {
    const report = reviewBacklog(makeDraft({ questions: [] }), 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('missing-open-questions'));
  });

  it('reports info when no risk items are present', () => {
    const draft = makeDraft();
    draft.items = draft.items.filter((i) => i.type !== 'risk');
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('missing-risks'));
  });

  it('warns on weak description', () => {
    const draft = makeDraft();
    draft.items[0] = { ...draft.items[0], description: 'Short.' };
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('weak-description'));
  });

  it('warns on story without acceptance criteria', () => {
    const draft = makeDraft();
    draft.items[1] = { ...draft.items[1], acceptanceCriteria: [] };
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('missing-acceptance-criteria'));
  });

  it('warns on orphan story (no parent epic)', () => {
    const draft = makeDraft();
    draft.items[1] = { ...draft.items[1], parentId: undefined };
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('orphan-story'));
  });

  it('warns on task without ownerRole', () => {
    const draft = makeDraft();
    draft.items[2] = { ...draft.items[2], ownerRole: undefined };
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('missing-task-owner'));
  });

  it('warns on orphan task (no parent story)', () => {
    const draft = makeDraft();
    draft.items[2] = { ...draft.items[2], parentId: undefined };
    const report = reviewBacklog(draft, 'source.json');
    const ids = report.findings.map((f) => f.ruleId);
    assert.ok(ids.includes('orphan-task'));
  });

  it('sets correct summary counts', () => {
    const report = reviewBacklog(makeDraft({ assumptions: [], questions: [] }), 'source.json');
    assert.equal(report.summary.totalFindings, report.findings.length);
    assert.equal(report.summary.warnings, report.findings.filter((f) => f.severity === 'warning').length);
  });

  it('includes projectName and reviewedAt in the report', () => {
    const report = reviewBacklog(makeDraft(), 'source.json');
    assert.equal(report.projectName, 'Test Project');
    assert.ok(typeof report.reviewedAt === 'string');
  });
});
