import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { isIgnored } from '../context/ignoreMatcher.ts';
import type { ContextItem } from './contextPack.types.ts';

/** Extensions probed when resolving an extension-less local import. */
const RESOLVE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];

/** Cap on fragment content so a single neighbour cannot blow the budget. */
const DEFAULT_MAX_CHARS = 4000;

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}

/**
 * Extracts import/require specifiers from source text. Deterministic and
 * language-light: it recognizes ES `import`/`export … from`, bare `import` and
 * CommonJS `require()` — enough to find neighbours in JS/TS projects without a
 * full parser.
 */
export function extractImportSpecifiers(content: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bimport\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bexport\s+[^;]*?\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      specifiers.push(match[1]);
    }
  }
  return specifiers;
}

/**
 * Resolves a *relative* import specifier to an existing repo-relative file path,
 * staying within `cwd`. Non-relative (package) specifiers return undefined —
 * only local neighbours are considered.
 */
export function resolveLocalImport(
  fromFileRelative: string,
  specifier: string,
  cwd: string
): string | undefined {
  if (!specifier.startsWith('.')) {
    return undefined;
  }
  const fromAbs = resolve(cwd, fromFileRelative);
  const baseAbs = resolve(dirname(fromAbs), specifier);

  const candidates = [
    baseAbs,
    ...RESOLVE_EXTENSIONS.map((ext) => `${baseAbs}${ext}`),
    ...RESOLVE_EXTENSIONS.map((ext) => join(baseAbs, `index${ext}`))
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      const rel = toPosix(relative(cwd, candidate));
      if (rel.startsWith('..')) {
        return undefined; // outside the project
      }
      return rel;
    }
  }
  return undefined;
}

export interface ExtractFragmentsInput {
  cwd: string;
  /** Repo-relative seed files (e.g. the changed files of a diff). */
  seedFiles: string[];
  maxFragments: number;
  sensitivePatterns?: string[];
  ignore?: string[];
  maxCharsPerFragment?: number;
}

/**
 * Builds neighbour code fragments for a set of seed files: the local modules the
 * seeds import, ranked by how many seeds reference them, capped at
 * `maxFragments`. Fully deterministic and local-first — no LLM, no network.
 * Sensitive/ignored files and the seeds themselves are excluded; each fragment
 * is truncated to keep the budget bounded.
 */
export async function extractFragments(input: ExtractFragmentsInput): Promise<ContextItem[]> {
  if (input.maxFragments <= 0) {
    return [];
  }

  const seedSet = new Set(input.seedFiles.map(toPosix));
  const sensitive = input.sensitivePatterns ?? [];
  const ignore = input.ignore ?? [];
  const maxChars = input.maxCharsPerFragment ?? DEFAULT_MAX_CHARS;

  const referenceCount = new Map<string, number>();

  for (const seed of input.seedFiles) {
    const seedAbs = resolve(input.cwd, seed);
    if (!existsSync(seedAbs) || !statSync(seedAbs).isFile()) {
      continue;
    }
    let content: string;
    try {
      content = await readFile(seedAbs, 'utf8');
    } catch {
      continue;
    }
    const resolvedTargets = new Set<string>();
    for (const specifier of extractImportSpecifiers(content)) {
      const target = resolveLocalImport(seed, specifier, input.cwd);
      if (!target) {
        continue;
      }
      if (seedSet.has(target)) {
        continue; // a changed file is already in the diff item
      }
      if (isIgnored(target, sensitive) || isIgnored(target, ignore)) {
        continue;
      }
      resolvedTargets.add(target);
    }
    for (const target of resolvedTargets) {
      referenceCount.set(target, (referenceCount.get(target) ?? 0) + 1);
    }
  }

  const ranked = [...referenceCount.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, input.maxFragments);

  const fragments: ContextItem[] = [];
  for (const [path, count] of ranked) {
    let content: string;
    try {
      content = await readFile(resolve(input.cwd, path), 'utf8');
    } catch {
      continue;
    }
    const truncated = content.length > maxChars;
    fragments.push({
      kind: 'fragment',
      ref: path,
      path,
      content: truncated ? `${content.slice(0, maxChars)}\n/* …truncated… */` : content,
      reason: `imported by ${count} changed file${count > 1 ? 's' : ''}`
    });
  }

  return fragments;
}
