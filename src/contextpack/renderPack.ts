import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { ContextPack } from './contextPack.types.ts';

function toRelativePath(filePath: string, cwd: string): string {
  const rel = relative(cwd, filePath);
  return rel === '' ? '.' : rel.replace(/\\/g, '/');
}

export interface WrittenPackPaths {
  contentPath: string;
  manifestPath: string;
}

/** Writes the assembled pack content and its manifest to `outputDirectory`. */
export async function writeContextPack(
  pack: ContextPack,
  outputDirectory: string,
  cwd: string
): Promise<WrittenPackPaths> {
  await mkdir(outputDirectory, { recursive: true });

  const contentPath = join(outputDirectory, 'context-pack.md');
  const manifestPath = join(outputDirectory, 'context-pack.manifest.json');

  await writeFile(contentPath, `${pack.content.replace(/\n*$/, '')}\n`, 'utf8');
  await writeFile(manifestPath, `${JSON.stringify(pack.manifest, null, 2)}\n`, 'utf8');

  return {
    contentPath: toRelativePath(contentPath, cwd),
    manifestPath: toRelativePath(manifestPath, cwd)
  };
}

/** Human-readable summary of a pack manifest for terminal output. */
export function renderPackSummary(pack: ContextPack): string[] {
  const { manifest } = pack;
  const lines = [
    'Context pack',
    `- Mode: ${manifest.mode}`,
    `- Budget: ${manifest.budget} tokens`,
    `- Estimated tokens: ~${manifest.estimatedTokens} (indicative)`,
    `- Included: ${manifest.included.length} (${manifest.included.map((i) => i.kind).join(', ') || 'none'})`,
    `- Excluded: ${manifest.excluded.length}`,
    `- Cache: ${manifest.cacheHit ? 'hit' : 'miss'}`
  ];

  if (manifest.reductionsApplied.length > 0) {
    lines.push(`- Reductions applied: ${manifest.reductionsApplied.length}`);
    for (const reduction of manifest.reductionsApplied) {
      lines.push(`    ${reduction}`);
    }
  }

  if (manifest.overBudget) {
    lines.push('- WARNING: required items exceed the budget; nothing was silently truncated.');
  }

  return lines;
}
