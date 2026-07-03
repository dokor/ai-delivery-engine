import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildSpecialistPrompt,
  getSpecialistRoles,
  isSpecialistRole
} from '../src/prompts/specialistPromptBuilder.ts';

describe('isSpecialistRole', () => {
  it('returns true for all valid specialist roles', () => {
    const roles = [
      'ux-ui', 'frontend', 'backend', 'qa', 'tech-lead',
      'legal-compliance', 'security', 'devops', 'data-analytics', 'customer-success', 'seo'
    ];
    for (const role of roles) {
      assert.equal(isSpecialistRole(role), true, `Expected "${role}" to be a valid specialist role`);
    }
  });

  it('returns false for an unknown role string', () => {
    assert.equal(isSpecialistRole('po-pm'), false);
    assert.equal(isSpecialistRole('designer'), false);
    assert.equal(isSpecialistRole(''), false);
    assert.equal(isSpecialistRole('FRONTEND'), false);
  });

  it('is case-sensitive', () => {
    assert.equal(isSpecialistRole('Frontend'), false);
    assert.equal(isSpecialistRole('QA'), false);
  });
});

describe('getSpecialistRoles', () => {
  it('returns a non-empty readonly array', () => {
    const roles = getSpecialistRoles();
    assert.ok(roles.length > 0);
  });

  it('contains all expected V1 specialist roles', () => {
    const roles = getSpecialistRoles();
    const expected = [
      'ux-ui', 'frontend', 'backend', 'qa', 'tech-lead',
      'legal-compliance', 'security', 'devops', 'data-analytics', 'customer-success', 'seo'
    ];
    for (const role of expected) {
      assert.ok(roles.includes(role as never), `Expected role "${role}" in getSpecialistRoles()`);
    }
  });

  it('every role returned passes isSpecialistRole', () => {
    for (const role of getSpecialistRoles()) {
      assert.equal(isSpecialistRole(role), true);
    }
  });
});

describe('buildSpecialistPrompt', () => {
  const ROLE = 'frontend';
  const TEMPLATE = '## Role\nFront-end specialist template content.';
  const BACKLOG_ITEM = '# story-001\n\nBuild the login form.';
  const ITEM_PATH = 'outputs/exported-items/story-001.md';

  it('returns a non-empty string', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(typeof prompt === 'string');
    assert.ok(prompt.length > 0);
  });

  it('includes the selected role', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(prompt.includes(ROLE), 'Prompt should include the role name');
  });

  it('includes the role template content', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(
      prompt.includes('Front-end specialist template content.'),
      'Prompt should include template content'
    );
  });

  it('includes the backlog item content', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(prompt.includes('Build the login form.'), 'Prompt should include backlog item content');
  });

  it('includes the backlog item source path', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(prompt.includes(ITEM_PATH), 'Prompt should include the source file path');
  });

  it('includes a top-level heading', () => {
    const prompt = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.ok(prompt.startsWith('# '), 'Prompt should start with a Markdown H1');
  });

  it('works for every supported specialist role without throwing', () => {
    for (const role of getSpecialistRoles()) {
      assert.doesNotThrow(() =>
        buildSpecialistPrompt(role, TEMPLATE, BACKLOG_ITEM, ITEM_PATH)
      );
    }
  });

  it('trims leading/trailing whitespace from template and backlog item', () => {
    const promptWithSpaces = buildSpecialistPrompt(
      ROLE,
      `\n\n  ${TEMPLATE}  \n\n`,
      `\n  ${BACKLOG_ITEM}  \n`,
      ITEM_PATH
    );
    const promptNormal = buildSpecialistPrompt(ROLE, TEMPLATE, BACKLOG_ITEM, ITEM_PATH);
    assert.equal(promptWithSpaces, promptNormal);
  });
});
