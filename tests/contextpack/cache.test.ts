import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { computeCacheKey, readCachedPack, writeCachedPack } from '../../src/contextpack/cache.ts';
import { buildContextPack } from '../../src/contextpack/buildContextPack.ts';
import type { ContextItem } from '../../src/contextpack/contextPack.types.ts';
import { createTempProject, type TempProject } from '../helpers/tempProject.ts';

const ITEMS: ContextItem[] = [
  { kind: 'context', ref: 'ctx', content: 'project context' },
  { kind: 'diff', ref: 'diff', content: 'a diff', required: true }
];

let project: TempProject | undefined;

afterEach(async () => {
  if (project) {
    await project.cleanup();
    project = undefined;
  }
});

describe('computeCacheKey', () => {
  it('is stable for identical inputs', () => {
    assert.equal(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000)
    );
  });

  it('changes when item content changes (invalidation)', () => {
    const changed: ContextItem[] = [{ ...ITEMS[0], content: 'different' }, ITEMS[1]];
    assert.notEqual(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey(changed, 'fp1', 'normal', 12000)
    );
  });

  it('changes when the project/config fingerprint changes', () => {
    assert.notEqual(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey(ITEMS, 'fp2', 'normal', 12000)
    );
  });

  it('changes when the mode or budget changes', () => {
    assert.notEqual(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey(ITEMS, 'fp1', 'chill', 12000)
    );
    assert.notEqual(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey(ITEMS, 'fp1', 'normal', 4000)
    );
  });

  it('is order-independent across item reordering', () => {
    assert.equal(
      computeCacheKey(ITEMS, 'fp1', 'normal', 12000),
      computeCacheKey([ITEMS[1], ITEMS[0]], 'fp1', 'normal', 12000)
    );
  });
});

describe('pack cache read/write', () => {
  it('round-trips a written pack and misses on an unknown key', async () => {
    project = await createTempProject();
    const cacheDir = join(project.dir, 'cache');
    const key = computeCacheKey(ITEMS, 'fp1', 'normal', 12000);
    const pack = buildContextPack(ITEMS, { mode: 'normal', budget: 12000, cacheKey: key });

    assert.equal(await readCachedPack(cacheDir, key), undefined);
    await writeCachedPack(cacheDir, key, pack);

    const loaded = await readCachedPack(cacheDir, key);
    assert.deepEqual(loaded, pack);
    assert.equal(await readCachedPack(cacheDir, 'sha256:unknown'), undefined);
  });
});
