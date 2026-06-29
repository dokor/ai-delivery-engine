import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runPoPmAgent } from '../src/agents/poPmAgent.ts';
import type { ParsedBrief } from '../src/briefs/brief.types.ts';

function makeFullBrief(overrides: Partial<ParsedBrief> = {}): ParsedBrief {
  return {
    title: 'My Test Project',
    summary: 'A project to test things.',
    goals: ['Ship a useful MVP', 'Validate with real users'],
    audience: ['developers', 'product managers'],
    pages: ['homepage', 'dashboard'],
    constraints: ['No external APIs', 'Must ship in 4 weeks'],
    successCriteria: ['First user signs up within 1 week of launch'],
    raw: '# My Test Project\n\nA project to test things.',
    ...overrides
  };
}

function makeMinimalBrief(): ParsedBrief {
  return {
    title: 'Minimal Brief',
    summary: '',
    goals: [],
    audience: [],
    pages: [],
    constraints: [],
    successCriteria: [],
    raw: '# Minimal Brief'
  };
}

describe('runPoPmAgent', () => {
  it('returns a BacklogDraft with the correct shape', () => {
    const brief = makeFullBrief();
    const draft = runPoPmAgent(brief, 'briefs/test.md');

    assert.equal(draft.projectName, brief.title);
    assert.equal(typeof draft.projectSummary, 'string');
    assert.equal(typeof draft.generatedAt, 'string');
    assert.equal(draft.sourceBrief, 'briefs/test.md');
    assert.ok(Array.isArray(draft.assumptions));
    assert.ok(Array.isArray(draft.questions));
    assert.ok(Array.isArray(draft.items));
  });

  it('always generates at least one epic, one story, and one task', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');

    const epics = draft.items.filter((i) => i.type === 'epic');
    const stories = draft.items.filter((i) => i.type === 'story');
    const tasks = draft.items.filter((i) => i.type === 'task');

    assert.ok(epics.length >= 1, 'Should have at least one epic');
    assert.ok(stories.length >= 1, 'Should have at least one story');
    assert.ok(tasks.length >= 1, 'Should have at least one task');
  });

  it('generates a risk item when constraints are present in the brief', () => {
    const brief = makeFullBrief({ constraints: ['Must comply with GDPR'] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    const risks = draft.items.filter((i) => i.type === 'risk');
    assert.ok(risks.length >= 1, 'Should generate at least one risk when constraints are present');
  });

  it('does not generate a risk item when no constraints are present', () => {
    const brief = makeFullBrief({ constraints: [] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    const risks = draft.items.filter((i) => i.type === 'risk');
    assert.equal(risks.length, 0);
  });

  it('assigns sequential IDs with zero-padded three-digit suffixes', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');

    for (const item of draft.items) {
      assert.match(
        item.id,
        /^(epic|story|task|risk)-\d{3}$/,
        `ID "${item.id}" does not match expected format`
      );
    }
  });

  it('all item IDs are unique within a draft', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');
    const ids = draft.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, ids.length, 'Duplicate IDs found');
  });

  it('all stories and tasks with a parentId reference an existing item ID', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');
    const allIds = new Set(draft.items.map((i) => i.id));

    for (const item of draft.items) {
      if (item.parentId) {
        assert.ok(
          allIds.has(item.parentId),
          `Item "${item.id}" has parentId "${item.parentId}" that does not exist`
        );
      }
    }
  });

  it('uses pages from the brief to generate experience stories', () => {
    const brief = makeFullBrief({ pages: ['landing', 'pricing', 'contact'] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');

    const storyTitles = draft.items
      .filter((i) => i.type === 'story')
      .map((i) => i.title.toLowerCase());

    for (const page of brief.pages) {
      assert.ok(
        storyTitles.some((t) => t.includes(page.toLowerCase())),
        `Expected a story mentioning page "${page}"`
      );
    }
  });

  it('falls back to default pages when pages array is empty', () => {
    const brief = makeMinimalBrief();
    const draft = runPoPmAgent(brief, 'briefs/test.md');

    const stories = draft.items.filter((i) => i.type === 'story');
    assert.ok(stories.length >= 1, 'Should still generate stories even with empty pages');
  });

  it('generates open questions when audience is missing', () => {
    const brief = makeFullBrief({ audience: [] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    const hasAudienceQuestion = draft.questions.some((q) =>
      q.toLowerCase().includes('audience')
    );
    assert.ok(hasAudienceQuestion);
  });

  it('generates open questions when successCriteria is missing', () => {
    const brief = makeFullBrief({ successCriteria: [] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    const hasSuccessQuestion = draft.questions.some((q) =>
      q.toLowerCase().includes('success') || q.toLowerCase().includes('judge')
    );
    assert.ok(hasSuccessQuestion);
  });

  it('does not generate audience or success questions when brief is complete', () => {
    const brief = makeFullBrief();
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    assert.ok(draft.questions.length < 4, 'Complete brief should produce fewer open questions');
  });

  it('captures constraints in project-level assumptions', () => {
    const brief = makeFullBrief({ constraints: ['No external APIs'] });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    const hasConstraintAssumption = draft.assumptions.some((a) =>
      a.includes('No external APIs')
    );
    assert.ok(hasConstraintAssumption);
  });

  it('uses the brief summary as projectSummary when present', () => {
    const brief = makeFullBrief({ summary: 'A very specific summary.' });
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    assert.equal(draft.projectSummary, 'A very specific summary.');
  });

  it('falls back to a generated summary when brief summary is empty', () => {
    const brief = makeMinimalBrief();
    const draft = runPoPmAgent(brief, 'briefs/test.md');
    assert.equal(typeof draft.projectSummary, 'string');
    assert.ok(draft.projectSummary.length > 0);
  });

  it('generatedAt is a valid ISO-8601 date string', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');
    const date = new Date(draft.generatedAt);
    assert.ok(!isNaN(date.getTime()), `"${draft.generatedAt}" is not a valid date`);
  });

  it('all items have a valid priority (low | medium | high)', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');
    const validPriorities = new Set(['low', 'medium', 'high']);
    for (const item of draft.items) {
      assert.ok(
        validPriorities.has(item.priority),
        `Item "${item.id}" has invalid priority "${item.priority}"`
      );
    }
  });

  it('all items have status "review"', () => {
    const draft = runPoPmAgent(makeFullBrief(), 'briefs/test.md');
    for (const item of draft.items) {
      assert.equal(item.status, 'review', `Item "${item.id}" should have status "review"`);
    }
  });

  it('is fully deterministic — two calls with the same brief produce the same IDs', () => {
    const brief = makeFullBrief();
    const draft1 = runPoPmAgent(brief, 'briefs/test.md');
    const draft2 = runPoPmAgent(brief, 'briefs/test.md');

    const ids1 = draft1.items.map((i) => i.id);
    const ids2 = draft2.items.map((i) => i.id);

    assert.deepEqual(ids1, ids2);
  });
});
