import assert from 'node:assert/strict';
import test from 'node:test';

import { planIssueLifecycle } from '../src/github/issueLifecycle.ts';

const issue = (body: string, labels: string[] = []) => ({ number: 42, title: 'Improve delivery', body, labels, state: 'open' as const, url: 'https://github.com/dokor/example/issues/42' });

test('requests ADE enrichment for an insufficient issue', () => {
  const plan = planIssueLifecycle({ issue: issue('Please improve this.') });
  assert.equal(plan.stage, 'enriching');
  assert.equal(plan.action, 'enrich');
  assert.equal(plan.enrichmentProfile, 'po-pm');
  assert.match(plan.enrichmentPrompt ?? '', /Return ONLY the improved issue body/);
});

test('admits an issue with an objective and enough acceptance criteria', () => {
  const plan = planIssueLifecycle({ issue: issue('## Objective\nShip it\n\n## Acceptance criteria\n- [ ] A\n- [ ] B\n- [ ] C') });
  assert.equal(plan.stage, 'ready-for-development');
  assert.equal(plan.action, 'develop');
  assert.deepEqual(plan.implementationHandoff?.acceptanceCriteria, ['A', 'B', 'C']);
  assert.equal(plan.implementationHandoff?.objective, 'Ship it');
  assert.equal(plan.implementationHandoff?.issue.number, 42);
});

test('preserves a durable waiting-human state without replaying work', () => {
  const plan = planIssueLifecycle({ issue: issue('## Objective\nShip it'), metadata: { state: 'waiting-human' } });
  assert.equal(plan.stage, 'waiting-human');
  assert.equal(plan.action, 'wait');
});
