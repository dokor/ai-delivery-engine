import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseBrief } from '../src/briefs/briefParser.ts';

describe('parseBrief', () => {
  it('extracts the H1 title', () => {
    const md = `# My Project\n\n## Summary\n\nA test project.\n`;
    const result = parseBrief(md, 'fallback');
    assert.equal(result.title, 'My Project');
  });

  it('uses fallback title when no H1 is present', () => {
    const result = parseBrief('## Summary\n\nNo title here.\n', 'fallback-title');
    assert.equal(result.title, 'fallback-title');
  });

  it('parses summary section', () => {
    const md = `# Project\n\n## Summary\n\nThis is the summary.\n`;
    const result = parseBrief(md, 'fallback');
    assert.equal(result.summary, 'This is the summary.');
  });

  it('parses goals as a list', () => {
    const md = `# Project\n\n## Goals\n\n- Goal one\n- Goal two\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.goals, ['Goal one', 'Goal two']);
  });

  it('parses audience section', () => {
    const md = `# Project\n\n## Audience\n\n- Developers\n- Product managers\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.audience, ['Developers', 'Product managers']);
  });

  it('parses pages via "scope" alias', () => {
    const md = `# Project\n\n## Scope\n\n- Homepage\n- Dashboard\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.pages, ['Homepage', 'Dashboard']);
  });

  it('parses constraints section', () => {
    const md = `# Project\n\n## Constraints\n\n- Must ship in 4 weeks\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.constraints, ['Must ship in 4 weeks']);
  });

  it('parses success criteria section', () => {
    const md = `# Project\n\n## Success Criteria\n\n- 100 signups in first week\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.successCriteria, ['100 signups in first week']);
  });

  it('returns empty arrays for missing sections', () => {
    const result = parseBrief('# Bare project\n', 'fallback');
    assert.deepEqual(result.goals, []);
    assert.deepEqual(result.audience, []);
    assert.deepEqual(result.pages, []);
    assert.deepEqual(result.constraints, []);
    assert.deepEqual(result.successCriteria, []);
  });

  it('strips bullet markers from list items', () => {
    const md = `# Project\n\n## Goals\n\n* Bullet with asterisk\n- Bullet with dash\n`;
    const result = parseBrief(md, 'fallback');
    assert.deepEqual(result.goals, ['Bullet with asterisk', 'Bullet with dash']);
  });

  it('stores raw markdown', () => {
    const md = '# Project\n\n## Summary\n\nRaw content.\n';
    const result = parseBrief(md, 'fallback');
    assert.equal(result.raw, md);
  });
});
