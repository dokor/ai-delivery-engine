import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';

import { assertSafePath } from '../src/cli/assertSafePath.ts';

const BASE = '/projects/myapp';

describe('assertSafePath', () => {
  it('does not throw for a path directly inside the base directory', () => {
    assert.doesNotThrow(() => assertSafePath(resolve(BASE, 'brief.md'), BASE));
  });

  it('does not throw for a nested path inside the base directory', () => {
    assert.doesNotThrow(() =>
      assertSafePath(resolve(BASE, 'outputs/exported-items/story-001.md'), BASE)
    );
  });

  it('does not throw when the target equals the base directory exactly', () => {
    assert.doesNotThrow(() => assertSafePath(BASE, BASE));
  });

  it('throws for a Unix-style path traversal (../../)', () => {
    assert.throws(
      () => assertSafePath(resolve(BASE, '../../etc/passwd'), BASE),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Path traversal detected'));
        return true;
      }
    );
  });

  it('throws for a path that escapes by one level (../)', () => {
    assert.throws(
      () => assertSafePath(resolve(BASE, '../sibling-project/secret.md'), BASE),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Path traversal detected'));
        return true;
      }
    );
  });

  it('throws for an absolute path outside the base directory', () => {
    assert.throws(
      () => assertSafePath('/etc/passwd', BASE),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Path traversal detected'));
        return true;
      }
    );
  });

  it('throws for a sibling directory that starts with the same prefix', () => {
    // /projects/myapp-evil should not pass a check for /projects/myapp
    assert.throws(
      () => assertSafePath('/projects/myapp-evil/secret.md', BASE),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes('Path traversal detected'));
        return true;
      }
    );
  });

  it('includes the offending path in the error message', () => {
    const offendingPath = '/etc/passwd';
    assert.throws(
      () => assertSafePath(offendingPath, BASE),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.ok(error.message.includes(offendingPath));
        return true;
      }
    );
  });
});
