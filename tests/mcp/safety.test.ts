import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { realpath, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  DEFAULT_LIMITS,
  McpBoundaryError,
  assertResultWithinBudget,
  resolveProjectRoot,
  toConfinedRelativePath,
  toConfinedRelativePaths,
  withTimeout
} from '../../src/mcp/safety.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

describe('resolveProjectRoot', () => {
  it('accepts an absolute existing directory', async () => {
    project = await createTempProject();
    const resolved = await resolveProjectRoot(project.dir, {});
    assert.equal(resolved, await realpath(project.dir));
  });

  it('falls back to ADE_PROJECT_ROOT when no argument is given', async () => {
    project = await createTempProject();
    const resolved = await resolveProjectRoot(undefined, { ADE_PROJECT_ROOT: project.dir });
    assert.equal(resolved, await realpath(project.dir));
  });

  it('never falls back to the working directory', async () => {
    await assert.rejects(
      () => resolveProjectRoot(undefined, {}),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /ADE_PROJECT_ROOT/);
        assert.match(error.message, /never used as a fallback/);
        return true;
      }
    );
  });

  it('refuses a relative path', async () => {
    await assert.rejects(
      () => resolveProjectRoot('./somewhere', {}),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /absolute path/);
        return true;
      }
    );
  });

  it('refuses a missing directory', async () => {
    await assert.rejects(
      () => resolveProjectRoot(join(tmpdir(), 'ade-does-not-exist-4a7f'), {}),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /does not exist/);
        return true;
      }
    );
  });

  it('refuses a file', async () => {
    project = await createTempProject();
    await project.write('a-file.txt', 'x');
    await assert.rejects(
      () => resolveProjectRoot(join(project!.dir, 'a-file.txt'), {}),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /not a directory/);
        return true;
      }
    );
  });
});

describe('toConfinedRelativePath', () => {
  it('returns a repo-relative path with forward slashes', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);
    await project.write('src/app/index.ts', 'export const x = 1;\n');

    assert.equal(await toConfinedRelativePath('src/app/index.ts', root), 'src/app/index.ts');
    assert.equal(
      await toConfinedRelativePath(join(root, 'src', 'app', 'index.ts'), root),
      'src/app/index.ts'
    );
  });

  it('accepts a path that does not exist yet, once confined', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);
    assert.equal(await toConfinedRelativePath('src/not-created.ts', root), 'src/not-created.ts');
  });

  it('refuses traversal out of the project root', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);

    for (const candidate of ['../outside.txt', '../../etc/passwd', 'src/../../outside.txt']) {
      await assert.rejects(
        () => toConfinedRelativePath(candidate, root),
        (error: unknown) => {
          assert.ok(error instanceof McpBoundaryError, `expected refusal for ${candidate}`);
          assert.match(error.message, /outside the project root/);
          return true;
        }
      );
    }
  });

  it('refuses an unrelated absolute path', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);
    await assert.rejects(
      () => toConfinedRelativePath('/etc/hosts', root),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        return true;
      }
    );
  });

  it('refuses a symlink pointing out of the project root', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);

    const outside = join(tmpdir(), `ade-outside-${process.pid}.txt`);
    await writeFile(outside, 'secret\n', 'utf8');
    await symlink(outside, join(root, 'escape.txt'));

    await assert.rejects(
      () => toConfinedRelativePath('escape.txt', root),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /outside the project root/);
        return true;
      }
    );
  });

  it('refuses an empty path', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);
    await assert.rejects(() => toConfinedRelativePath('   ', root), McpBoundaryError);
  });
});

describe('toConfinedRelativePaths', () => {
  it('refuses a list longer than the limit rather than truncating it', async () => {
    project = await createTempProject();
    const root = await realpath(project.dir);
    const files = Array.from({ length: 5 }, (_value, index) => `src/file-${index}.ts`);

    await assert.rejects(
      () => toConfinedRelativePaths(files, root, { ...DEFAULT_LIMITS, maxFilesPerCall: 4 }),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /Too many files: 5 requested, limit is 4/);
        return true;
      }
    );
  });
});

describe('assertResultWithinBudget', () => {
  it('passes a result under the limit through unchanged', () => {
    assert.equal(assertResultWithinBudget('hello', 'ade_doctor'), 'hello');
  });

  it('refuses an over-long result instead of truncating it', () => {
    const text = 'x'.repeat(100);
    assert.throws(
      () => assertResultWithinBudget(text, 'ade_review_files', { ...DEFAULT_LIMITS, maxResultBytes: 50 }),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /was not truncated/);
        return true;
      }
    );
  });
});

describe('withTimeout', () => {
  it('returns the value when the operation finishes in time', async () => {
    assert.equal(await withTimeout(Promise.resolve('ok'), 'ade_doctor'), 'ok');
  });

  it('interrupts an operation that exceeds its budget', async () => {
    const never = new Promise<string>(() => undefined);
    await assert.rejects(
      () => withTimeout(never, 'ade_review_files', { ...DEFAULT_LIMITS, toolTimeoutMs: 25 }),
      (error: unknown) => {
        assert.ok(error instanceof McpBoundaryError);
        assert.match(error.message, /exceeded its 25 ms budget/);
        return true;
      }
    );
  });
});
