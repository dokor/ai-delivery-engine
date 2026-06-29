import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { checkSpecialistResponse } from '../src/specialist/specialistCheck.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidResponse(overrides: Partial<Record<string, string>> = {}): string {
  const sections: Record<string, string> = {
    Role: 'frontend',
    Scope: 'This review covers the login form component and its state management.',
    'Item Notes': 'The current acceptance criteria do not cover error state rendering.',
    Assumptions: 'The component uses React with controlled inputs.',
    'Open Questions': 'Is there a shared error boundary already in the codebase?',
    Risks: 'CSS regression risk if global styles are changed alongside this component.',
    'Suggested Backlog Updates': 'Add task: handle empty-field validation on blur for story-002.',
    ...overrides
  };

  const body = Object.entries(sections)
    .map(([title, content]) => `## ${title}\n\n${content}`)
    .join('\n\n');

  return `# Specialist Response\n\n${body}\n`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('checkSpecialistResponse', () => {
  it('returns no errors for a fully valid response', () => {
    const report = checkSpecialistResponse(makeValidResponse(), 'test.md');
    const errors = report.findings.filter((f) => f.severity === 'error');
    assert.equal(errors.length, 0, `Unexpected errors: ${errors.map((e) => e.code).join(', ')}`);
  });

  it('detects missing top-level title', () => {
    const md = makeValidResponse().replace('# Specialist Response\n\n', '');
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'MISSING_TITLE'));
  });

  it('detects missing required section', () => {
    const md = makeValidResponse().replace(/## Role[\s\S]*?(?=## )/, '');
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'MISSING_SECTION' && f.section === 'Role'));
  });

  it('detects unsupported role value', () => {
    const md = makeValidResponse({ Role: 'designer' });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'UNSUPPORTED_ROLE'));
  });

  it('detects missing backlog item reference', () => {
    // Remove story-002 from suggested updates
    const md = makeValidResponse({ 'Suggested Backlog Updates': 'No references to any item here.' });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'MISSING_BACKLOG_ITEM_REFERENCE'));
  });

  it('detects placeholder text', () => {
    const md = makeValidResponse({ 'Item Notes': 'TBD — fill in later.' });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'PLACEHOLDER_TEXT'));
  });

  it('detects suspicious "already deployed" claim', () => {
    const md = makeValidResponse({ 'Item Notes': 'This feature is already deployed to production for story-002.' });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'FORBIDDEN_CLAIM_DEPLOYED'));
  });

  it('detects suspicious automatic approval claim', () => {
    const md = makeValidResponse({ 'Item Notes': 'This has been approved by QA for story-002.' });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'FORBIDDEN_CLAIM_APPROVED'));
  });

  it('does NOT flag "merged" used in a non-git context', () => {
    const md = makeValidResponse({
      'Item Notes': 'The two user flows were merged into one approach for story-002.'
    });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(!report.findings.some((f) => f.code === 'FORBIDDEN_CLAIM_MERGED'));
  });

  it('flags "PR merged" as a suspicious git claim', () => {
    const md = makeValidResponse({
      'Item Notes': 'The PR merged yesterday for story-002.'
    });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'FORBIDDEN_CLAIM_MERGED'));
  });

  it('detects very short response', () => {
    const short = '# Specialist Response\n\n## Role\n\nfrontend\n\n## Scope\n\nOk.\n\n## Item Notes\n\ntask-001\n';
    const report = checkSpecialistResponse(short, 'test.md');
    assert.ok(report.findings.some((f) => f.code === 'VERY_SHORT_RESPONSE'));
  });

  it('extracts backlog item IDs correctly', () => {
    const md = makeValidResponse({
      'Suggested Backlog Updates': '- Add task for epic-001\n- Revise story-002\n- Check task-003'
    });
    const report = checkSpecialistResponse(md, 'test.md');
    assert.ok(report.backlogItemIds.includes('epic-001'));
    assert.ok(report.backlogItemIds.includes('story-002'));
    assert.ok(report.backlogItemIds.includes('task-003'));
  });

  it('detects the role correctly', () => {
    const report = checkSpecialistResponse(makeValidResponse(), 'test.md');
    assert.equal(report.detectedRole, 'frontend');
  });

  it('sets findingsCount to match findings array length', () => {
    const report = checkSpecialistResponse(makeValidResponse(), 'test.md');
    assert.equal(report.findingsCount, report.findings.length);
  });
});
