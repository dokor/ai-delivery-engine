import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { runPoPmAgent } from '../src/agents/poPmAgent.ts';
import type { ParsedBrief } from '../src/briefs/brief.types.ts';

function makeIterationBrief(overrides: Partial<ParsedBrief> = {}): ParsedBrief {
  return {
    title: 'My Existing Project — Next Iteration',
    summary: 'Iteration on an existing production service.',
    goals: ['Add rate limiting', 'Improve scheduler resilience'],
    audience: ['developers', 'tech leads'],
    pages: [
      'Rate limiting on POST /api/audits',
      'Scheduler timeout and retry',
      'Export PDF from report page',
      'Comparaison view between two audits'
    ],
    constraints: ['No breaking API changes', 'Fixed tech stack'],
    successCriteria: ['Rate limit blocks abusive IPs', 'PDF export works without regression'],
    mode: 'existing-iteration',
    raw: '# My Existing Project',
    ...overrides
  };
}

function makeNewProductBrief(overrides: Partial<ParsedBrief> = {}): ParsedBrief {
  return {
    title: 'New Product',
    summary: 'A brand new product.',
    goals: ['Launch MVP'],
    audience: ['end users'],
    pages: ['homepage', 'dashboard'],
    constraints: [],
    successCriteria: [],
    mode: 'new-product',
    raw: '# New Product',
    ...overrides
  };
}

describe('runPoPmAgent — existing-iteration mode', () => {
  it('uses "Implement X" story titles instead of "Define and deliver X experience"', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const storyTitles = draft.items
      .filter((i) => i.type === 'story')
      .map((i) => i.title);

    const implementTitles = storyTitles.filter((t) => t.startsWith('Implement '));
    const experienceTitles = storyTitles.filter((t) => t.includes('experience'));

    assert.ok(implementTitles.length > 0, 'Should have at least one "Implement X" story title');
    assert.equal(experienceTitles.length, 0, 'Should have no "experience" story titles in iteration mode');
  });

  it('uses "Deliver the planned scope" as the experience epic title', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const epics = draft.items.filter((i) => i.type === 'epic');
    const hasIterationEpic = epics.some((e) => e.title === 'Deliver the planned scope');
    assert.ok(hasIterationEpic, 'Should have "Deliver the planned scope" epic');
    const hasJourneyEpic = epics.some((e) => e.title === 'Design the core user journey');
    assert.equal(hasJourneyEpic, false, 'Should NOT have "Design the core user journey" epic');
  });

  it('skips UX/UI follow-up tasks for non-UI scope items', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const tasks = draft.items.filter((i) => i.type === 'task');

    // "Rate limiting on POST /api/audits" is not UI-facing — should have no UX/UI task
    const uxTaskForRateLimit = tasks.find(
      (t) => t.ownerRole === 'ux_ui' && t.title.toLowerCase().includes('rate limiting')
    );
    assert.equal(uxTaskForRateLimit, undefined, 'Should not generate UX/UI task for rate limiting scope item');

    // "Scheduler timeout and retry" is not UI-facing — should have no UX/UI task
    const uxTaskForScheduler = tasks.find(
      (t) => t.ownerRole === 'ux_ui' && t.title.toLowerCase().includes('scheduler')
    );
    assert.equal(uxTaskForScheduler, undefined, 'Should not generate UX/UI task for scheduler scope item');
  });

  it('keeps UX/UI follow-up tasks for UI-facing scope items', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const tasks = draft.items.filter((i) => i.type === 'task');

    // "Export PDF from report page" is UI-facing — should have UX/UI task
    const uxTaskForPdf = tasks.find(
      (t) => t.ownerRole === 'ux_ui' && t.title.toLowerCase().includes('export pdf')
    );
    assert.ok(uxTaskForPdf, 'Should generate UX/UI task for PDF export scope item');

    // "Comparaison view between two audits" is UI-facing — should have UX/UI task
    const uxTaskForComparison = tasks.find(
      (t) => t.ownerRole === 'ux_ui' && t.title.toLowerCase().includes('comparaison')
    );
    assert.ok(uxTaskForComparison, 'Should generate UX/UI task for comparaison view scope item');
  });

  it('uses iteration-framed assumption (no regression)', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const hasIterationAssumption = draft.assumptions.some((a) =>
      a.includes('regressions') || a.includes('API contracts')
    );
    assert.ok(hasIterationAssumption, 'Should have iteration-specific assumption about regressions');
  });

  it('does not use visitor/audience framing in story descriptions', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const iterationStories = draft.items.filter(
      (i) => i.type === 'story' && i.title.startsWith('Implement ')
    );
    for (const story of iterationStories) {
      assert.ok(
        !story.description.includes('target visitor'),
        `Story "${story.title}" should not use visitor framing`
      );
    }
  });

  it('still generates all non-UX follow-up tasks for non-UI scope items', () => {
    const draft = runPoPmAgent(makeIterationBrief(), 'briefs/argos.md');
    const tasks = draft.items.filter((i) => i.type === 'task');

    // Rate limiting should still have frontend, backend, qa tasks
    const frontendForRateLimit = tasks.find(
      (t) => t.ownerRole === 'frontend' && t.title.toLowerCase().includes('rate limiting')
    );
    const backendForRateLimit = tasks.find(
      (t) => t.ownerRole === 'backend' && t.title.toLowerCase().includes('rate limiting')
    );
    const qaForRateLimit = tasks.find(
      (t) => t.ownerRole === 'qa' && t.title.toLowerCase().includes('rate limiting')
    );
    assert.ok(frontendForRateLimit, 'Should generate Front-end task for rate limiting');
    assert.ok(backendForRateLimit, 'Should generate Back-end task for rate limiting');
    assert.ok(qaForRateLimit, 'Should generate QA task for rate limiting');
  });
});

describe('runPoPmAgent — new-product mode', () => {
  it('uses "Define and deliver X experience" story titles', () => {
    const draft = runPoPmAgent(makeNewProductBrief(), 'briefs/new.md');
    const storyTitles = draft.items
      .filter((i) => i.type === 'story')
      .map((i) => i.title);

    const experienceTitles = storyTitles.filter((t) => t.includes('experience'));
    assert.ok(experienceTitles.length > 0, 'Should have at least one "experience" story title in new-product mode');
  });

  it('uses "Design the core user journey" as the experience epic title', () => {
    const draft = runPoPmAgent(makeNewProductBrief(), 'briefs/new.md');
    const epics = draft.items.filter((i) => i.type === 'epic');
    const hasJourneyEpic = epics.some((e) => e.title === 'Design the core user journey');
    assert.ok(hasJourneyEpic, 'Should have "Design the core user journey" epic in new-product mode');
  });

  it('always generates UX/UI tasks in new-product mode regardless of item content', () => {
    const draft = runPoPmAgent(
      makeNewProductBrief({ pages: ['rate limiting module', 'scheduler resilience'] }),
      'briefs/new.md'
    );
    const tasks = draft.items.filter((i) => i.type === 'task' && i.ownerRole === 'ux_ui');
    // Should have UX tasks even for non-UI looking scope items in new-product mode
    assert.ok(tasks.length >= 2, 'Should generate UX/UI tasks for all scope items in new-product mode');
  });
});

describe('runPoPmAgent — mode defaults', () => {
  it('defaults to new-product behavior when mode is undefined', () => {
    const brief: ParsedBrief = {
      title: 'No Mode Brief',
      summary: 'A brief without mode.',
      goals: [],
      audience: [],
      pages: ['homepage'],
      constraints: [],
      successCriteria: [],
      raw: '# No Mode'
    };
    const draft = runPoPmAgent(brief, 'briefs/no-mode.md');
    const storyTitles = draft.items.filter((i) => i.type === 'story').map((i) => i.title);
    const hasExperience = storyTitles.some((t) => t.includes('experience'));
    assert.ok(hasExperience, 'Undefined mode should default to new-product behavior');
  });
});
