import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ContextItem, ContextPack } from './contextPack.types.ts';

/**
 * Content-addressed cache for assembled context packs.
 *
 * The cache key is a hash of the candidate items (kind + ref + content), the
 * mode, the budget and the project fingerprint (sources + resolved config,
 * from `ade context`). Because every input that could change the pack is folded
 * into the key, a stale read is impossible by construction: any change to
 * config, rules or sources produces a different key and therefore a miss —
 * automatic invalidation.
 */
export function computeCacheKey(
  items: ContextItem[],
  configFingerprint: string,
  mode: string,
  budget: number
): string {
  const hash = createHash('sha256');
  hash.update(`mode:${mode}\nbudget:${budget}\n`);

  const sorted = [...items].sort((left, right) =>
    `${left.kind}:${left.ref}`.localeCompare(`${right.kind}:${right.ref}`)
  );
  for (const item of sorted) {
    hash.update(item.kind);
    hash.update('|');
    hash.update(item.ref);
    hash.update('|');
    hash.update(item.content);
    hash.update('\n');
  }

  hash.update(`fingerprint:${configFingerprint}`);
  return `sha256:${hash.digest('hex')}`;
}

function cacheFilePath(cacheDirectory: string, cacheKey: string): string {
  const safeName = cacheKey.replace('sha256:', '').slice(0, 64);
  return join(cacheDirectory, `${safeName}.json`);
}

/** Returns a cached pack for `cacheKey`, or undefined on miss. */
export async function readCachedPack(
  cacheDirectory: string,
  cacheKey: string
): Promise<ContextPack | undefined> {
  try {
    const raw = await readFile(cacheFilePath(cacheDirectory, cacheKey), 'utf8');
    return JSON.parse(raw) as ContextPack;
  } catch {
    return undefined;
  }
}

/** Persists a built pack under its cache key. */
export async function writeCachedPack(
  cacheDirectory: string,
  cacheKey: string,
  pack: ContextPack
): Promise<void> {
  await mkdir(cacheDirectory, { recursive: true });
  await writeFile(
    cacheFilePath(cacheDirectory, cacheKey),
    `${JSON.stringify(pack, null, 2)}\n`,
    'utf8'
  );
}
