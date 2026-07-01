import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseBrief } from '../src/briefs/briefParser.ts';

describe('parseBrief — mode field', () => {
  it('parses ## Type: existing-iteration correctly', () => {
    const md = `# My Project\n\n## Type\n\nexisting-iteration\n\n## Summary\n\nAn existing app.`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'existing-iteration');
  });

  it('parses ## Mode: existing-iteration correctly (alias)', () => {
    const md = `# My Project\n\n## Mode\n\nexisting-iteration\n\n## Summary\n\nAn existing app.`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'existing-iteration');
  });

  it('defaults to new-product when no ## Type section is present', () => {
    const md = `# My Project\n\n## Summary\n\nA new product.`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'new-product');
  });

  it('defaults to new-product for unknown type values', () => {
    const md = `# My Project\n\n## Type\n\nunknown-value\n\n## Summary\n\nSomething.`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'new-product');
  });

  it('detects existing-iteration even with extra words', () => {
    const md = `# My Project\n\n## Type\n\nThis is an existing project iteration\n\n## Summary\n\nSomething.`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'existing-iteration');
  });

  it('does not affect Scope parsing — pages still populated correctly', () => {
    const md = `# My Project\n\n## Type\n\nexisting-iteration\n\n## Scope\n\n- Feature A\n- Feature B`;
    const brief = parseBrief(md, 'fallback');
    assert.equal(brief.mode, 'existing-iteration');
    assert.deepEqual(brief.pages, ['Feature A', 'Feature B']);
  });
});
