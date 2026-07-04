import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { isIgnored } from '../context/ignoreMatcher.ts';

/** Safety cap so a huge tree never blocks a deterministic check. */
const MAX_FILES = 5000;

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

/**
 * Lists repo-relative file paths under `cwd`, pruning ignored directories and
 * files (via the same glob matcher used for context). Bounded by `MAX_FILES`
 * so it stays cheap on large repos.
 */
export async function listProjectFiles(cwd: string, ignore: string[]): Promise<string[]> {
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    if (files.length >= MAX_FILES) {
      return;
    }
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_FILES) {
        return;
      }
      const absolute = join(directory, entry.name);
      const rel = toPosix(relative(cwd, absolute));
      if (isIgnored(rel, ignore)) {
        continue;
      }
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(rel);
      }
    }
  }

  await walk(cwd);
  return files.sort((left, right) => left.localeCompare(right));
}
