import { mkdir, writeFile } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

import type {
  GeneratedSpecialistPromptEntry,
  SpecialistPromptBatchIndex
} from './specialistPromptBatch.types.ts';

type WriteSpecialistPromptBatchArtifactsInput = {
  outputDirectory: string;
  sourceManifestPath: string;
  manifestItemCount: number;
  generatedPromptCount: number;
  skippedItemCount: number;
  prompts: GeneratedSpecialistPromptEntry[];
};

type SpecialistPromptBatchArtifacts = {
  indexPath: string;
  readmePath: string;
  index: SpecialistPromptBatchIndex;
};

function toDisplayPath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  const displayPath =
    relativePath.length > 0 && !relativePath.startsWith('..') ? relativePath : filePath;

  return displayPath.replaceAll('\\', '/');
}

function buildMarkdown(index: SpecialistPromptBatchIndex): string {
  const lines: string[] = [
    '# Specialist Prompt Batch',
    '',
    '## Summary',
    '',
    `- Source manifest: \`${toDisplayPath(index.sourceManifestPath)}\``,
    `- Generated at: \`${index.generatedAt}\``,
    `- Manifest items read: ${index.manifestItemCount}`,
    `- Prompts generated: ${index.generatedPromptCount}`,
    `- Skipped items: ${index.skippedItemCount}`,
    ''
  ];

  if (index.prompts.length === 0) {
    lines.push('No specialist prompts were generated from this manifest.');
    return `${lines.join('\n').trim()}\n`;
  }

  lines.push('## Generated Prompts', '');

  for (const prompt of index.prompts) {
    const promptFileName = basename(prompt.promptFilePath);

    lines.push(`### ${prompt.itemId} -> ${prompt.specialistRole}`);
    lines.push('');
    lines.push(`- Title: ${prompt.itemTitle ?? 'Untitled item'}`);
    lines.push(`- Item type: ${prompt.itemType}`);
    lines.push(`- Owner role: ${prompt.ownerRole}`);
    lines.push(`- Specialist role: ${prompt.specialistRole}`);
    lines.push(`- Prompt file: [${promptFileName}](./${promptFileName})`);
    lines.push(`- Source backlog item: \`${toDisplayPath(prompt.sourceBacklogItemFilePath)}\``);
    lines.push('');
  }

  return `${lines.join('\n').trim()}\n`;
}

export async function writeSpecialistPromptBatchArtifacts({
  outputDirectory,
  sourceManifestPath,
  manifestItemCount,
  generatedPromptCount,
  skippedItemCount,
  prompts
}: WriteSpecialistPromptBatchArtifactsInput): Promise<SpecialistPromptBatchArtifacts> {
  await mkdir(outputDirectory, { recursive: true });

  const index: SpecialistPromptBatchIndex = {
    sourceManifestPath,
    generatedAt: new Date().toISOString(),
    manifestItemCount,
    generatedPromptCount,
    skippedItemCount,
    prompts
  };

  const indexPath = resolve(outputDirectory, 'index.json');
  const readmePath = resolve(outputDirectory, 'README.md');

  await writeFile(indexPath, `${JSON.stringify(index, null, 2)}\n`, 'utf8');
  await writeFile(readmePath, buildMarkdown(index), 'utf8');

  return {
    indexPath,
    readmePath,
    index
  };
}
