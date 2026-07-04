import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isIgnored } from '../../src/context/ignoreMatcher.ts';

describe('isIgnored', () => {
  it('matches a directory glob and the bare directory entry', () => {
    assert.equal(isIgnored('dist/index.js', ['dist/**']), true);
    assert.equal(isIgnored('dist', ['dist/**']), true);
  });

  it('matches slash-less patterns against basenames anywhere', () => {
    assert.equal(isIgnored('config/.env.local', ['.env*']), true);
    assert.equal(isIgnored('.env', ['.env*']), true);
  });

  it('matches nested paths with **', () => {
    assert.equal(isIgnored('packages/a/node_modules/x', ['**/node_modules/**']), true);
  });

  it('does not match unrelated paths', () => {
    assert.equal(isIgnored('src/index.ts', ['dist/**', 'node_modules/**']), false);
  });

  it('honours single-segment * without crossing slashes', () => {
    assert.equal(isIgnored('src/a.ts', ['src/*']), true);
    assert.equal(isIgnored('src/nested/a.ts', ['src/*']), false);
  });

  it('ignores blank and comment patterns', () => {
    assert.equal(isIgnored('src/index.ts', ['', '# a comment']), false);
  });
});
