import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ProjectContext } from './context.types.ts';
import { toRelativePath } from './collectContext.ts';

/** Renders a section only when it is enabled in `context.sections`. */
function ifSection(context: ProjectContext, section: string, lines: string[]): string[] {
  return context.sections.includes(section) ? lines : [];
}

/** Human-readable Markdown rendering of the project context. */
export function renderContextMarkdown(context: ProjectContext): string {
  const lines: string[] = [
    '# Project Context',
    '',
    '> Generated deterministically by `ade context generate` from local sources.',
    '> No secrets, environment values or file contents are included.',
    '',
    `- Schema version: ${context.schemaVersion}`,
    `- Fingerprint: \`${context.fingerprint}\``,
    ''
  ];

  lines.push(
    ...ifSection(context, 'stack', [
      '## Stack',
      '',
      `- Name: ${context.stack.name ?? 'n/a'}`,
      `- Version: ${context.stack.version ?? 'n/a'}`,
      `- Module type: ${context.stack.moduleType ?? 'n/a'}`,
      `- Package manager: ${context.stack.packageManager ?? 'n/a'}`,
      `- Engines: ${Object.entries(context.stack.engines).map(([k, v]) => `${k} ${v}`).join(', ') || 'n/a'}`,
      `- Dependencies (${context.stack.dependencies.length}): ${context.stack.dependencies.join(', ') || 'none'}`,
      `- Dev dependencies (${context.stack.devDependencies.length}): ${context.stack.devDependencies.join(', ') || 'none'}`,
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'packages', [
      '## Packages',
      '',
      ...(context.packages.length > 0
        ? context.packages.map((pkg) => `- \`${pkg.path}\` — ${pkg.name}`)
        : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'modules', [
      '## Modules',
      '',
      ...(context.modules.length > 0 ? context.modules.map((m) => `- \`${m}\``) : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'commands', [
      '## Commands',
      '',
      ...(context.commands.length > 0
        ? context.commands.map((cmd) => `- \`${cmd.name}\`: \`${cmd.script}\``)
        : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'conventions', [
      '## Conventions',
      '',
      ...(context.conventions.length > 0
        ? context.conventions.map(
            (c) => `- \`${c.id}\`${c.severity ? ` (${c.severity})` : ''}: ${c.description ?? ''}`.trimEnd()
          )
        : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'entryPoints', [
      '## Entry Points',
      '',
      ...(context.entryPoints.length > 0 ? context.entryPoints.map((e) => `- \`${e}\``) : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'sensitiveZones', [
      '## Sensitive Zones (declared, excluded from context)',
      '',
      ...(context.sensitiveZones.length > 0 ? context.sensitiveZones.map((z) => `- \`${z}\``) : ['- none']),
      ''
    ])
  );

  lines.push(
    ...ifSection(context, 'adrs', [
      '## Architecture Decision Records',
      '',
      ...(context.adrs.length > 0 ? context.adrs.map((a) => `- ${a}`) : ['- none']),
      ''
    ])
  );

  return `${lines.join('\n').replace(/\n+$/, '')}\n`;
}

export function contextToJson(context: ProjectContext): string {
  return `${JSON.stringify(context, null, 2)}\n`;
}

export interface WrittenContextPaths {
  jsonPath?: string;
  markdownPath?: string;
}

/**
 * Writes the context artifacts to `outputDirectory`, honouring the requested
 * `formats` (defaults to both JSON and Markdown). Returns the written paths.
 */
export async function writeContext(
  context: ProjectContext,
  outputDirectory: string,
  cwd: string,
  formats: Array<'markdown' | 'json'> = ['json', 'markdown']
): Promise<WrittenContextPaths> {
  await mkdir(outputDirectory, { recursive: true });
  const written: WrittenContextPaths = {};

  if (formats.includes('json')) {
    const jsonPath = join(outputDirectory, 'context.json');
    await writeFile(jsonPath, contextToJson(context), 'utf8');
    written.jsonPath = toRelativePath(jsonPath, cwd);
  }

  if (formats.includes('markdown')) {
    const markdownPath = join(outputDirectory, 'context.md');
    await writeFile(markdownPath, renderContextMarkdown(context), 'utf8');
    written.markdownPath = toRelativePath(markdownPath, cwd);
  }

  return written;
}
