import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { ConfigResolution } from './config.types.ts';

function toRelativePath(filePath: string): string {
  const rel = relative(process.cwd(), filePath);
  return rel === '' ? '.' : rel.replace(/\\/g, '/');
}

/** Human-readable summary of a resolved configuration for terminal output. */
export function renderConfigResolution(resolution: ConfigResolution): string[] {
  const lines: string[] = ['ADE configuration'];

  lines.push(
    resolution.sources.length > 0
      ? `- Sources (applied in order): ${resolution.sources.join(' -> ')}`
      : '- Sources: none (built-in defaults)'
  );

  const { config } = resolution;
  lines.push(`- Profiles: ${Object.keys(config.profiles).length > 0 ? Object.keys(config.profiles).join(', ') : 'none'}`);
  lines.push(`- Rules: ${config.rules.length}`);
  lines.push(`- Tools: ${config.tools.length > 0 ? config.tools.join(', ') : 'none'}`);
  lines.push(`- Ignore patterns: ${config.ignore.length}`);
  lines.push(`- Sensitive patterns: ${config.sensitive.length}`);

  if (resolution.provenance.length > 0) {
    lines.push('- Provenance:');
    for (const entry of resolution.provenance) {
      lines.push(`    ${entry.key}: ${entry.sources.join(', ')}`);
    }
  }

  const errors = resolution.issues.filter((issue) => issue.severity === 'error');
  const warnings = resolution.issues.filter((issue) => issue.severity === 'warning');

  if (warnings.length > 0) {
    lines.push(`- Warnings (${warnings.length}):`);
    for (const issue of warnings) {
      lines.push(`    [${issue.code}] ${issue.message}`);
    }
  }

  if (errors.length > 0) {
    lines.push(`- Errors (${errors.length}):`);
    for (const issue of errors) {
      lines.push(`    [${issue.code}] ${issue.message}${issue.path ? ` (${issue.path})` : ''}`);
    }
  } else {
    lines.push('- Errors: none');
  }

  return lines;
}

/** Writes the resolved configuration + provenance to a stable JSON artifact. */
export async function writeConfigResolution(
  resolution: ConfigResolution,
  outputsDirectory: string
): Promise<string> {
  const directory = join(outputsDirectory, 'config');
  await mkdir(directory, { recursive: true });

  const outputPath = join(directory, 'ade.config.resolved.json');
  await writeFile(outputPath, `${JSON.stringify(resolution, null, 2)}\n`, 'utf8');

  return toRelativePath(outputPath);
}
