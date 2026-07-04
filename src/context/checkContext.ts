import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ResolvedAdeConfig } from '../config/config.types.ts';
import { collectProjectContext, toRelativePath } from './collectContext.ts';
import type { ContextCheckResult } from './context.types.ts';

/**
 * Checks the freshness of a previously generated context without writing
 * anything. Recomputes the current fingerprint and compares it to the stored
 * one:
 *
 * - `absent`      — no context.json found;
 * - `up-to-date`  — stored fingerprint matches the current sources/config;
 * - `stale`       — sources, rules or config changed since generation.
 */
export async function checkContext(
  cwd: string,
  config: ResolvedAdeConfig,
  outputDirectory: string
): Promise<ContextCheckResult> {
  const contextPath = join(outputDirectory, 'context.json');
  const relativeContextPath = toRelativePath(contextPath, cwd);

  const current = await collectProjectContext(cwd, config);

  let storedFingerprint: string | undefined;
  try {
    const raw = await readFile(contextPath, 'utf8');
    const parsed = JSON.parse(raw) as { fingerprint?: unknown };
    storedFingerprint = typeof parsed.fingerprint === 'string' ? parsed.fingerprint : undefined;
  } catch {
    storedFingerprint = undefined;
  }

  if (storedFingerprint === undefined) {
    return {
      state: 'absent',
      contextPath: relativeContextPath,
      currentFingerprint: current.fingerprint
    };
  }

  return {
    state: storedFingerprint === current.fingerprint ? 'up-to-date' : 'stale',
    contextPath: relativeContextPath,
    currentFingerprint: current.fingerprint,
    storedFingerprint
  };
}
