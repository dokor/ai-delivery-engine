import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BacklogDraft, BacklogItem } from '../backlog/backlog.types.ts';
import type { ExportedBacklogItemFile } from './backlogExport.types.ts';

function buildSuggestedLabels(item: BacklogItem): string[] {
  const labels = [`type:${item.type}`, `priority:${item.priority}`, `status:${item.status}`];

  if (item.ownerRole) {
    labels.push(`owner:${item.ownerRole}`);
  }

  return labels;
}

function renderList(items: string[] | undefined, emptyFallback?: string): string[] {
  if (!items || items.length === 0) {
    return emptyFallback ? [`- ${emptyFallback}`] : [];
  }

  return items.map((item) => `- ${item}`);
}

function buildMarkdown(item: BacklogItem): string {
  const lines: string[] = [
    `# ${item.title}`,
    '',
    '## Metadata',
    '',
    `- ID: ${item.id}`,
    `- Type: ${item.type}`,
    `- Priority: ${item.priority}`,
    `- Status: ${item.status}`
  ];

  if (item.ownerRole) {
    lines.push(`- Owner Role: ${item.ownerRole}`);
  }

  if (item.parentId) {
    lines.push(`- Parent ID: ${item.parentId}`);
  }

  lines.push('', '## Description', '', item.description);

  if (item.type === 'story') {
    lines.push('', '## Acceptance Criteria', '');
    lines.push(...renderList(item.acceptanceCriteria, 'No acceptance criteria provided.'));
  } else if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
    lines.push('', '## Acceptance Criteria', '');
    lines.push(...renderList(item.acceptanceCriteria));
  }

  if (item.assumptions && item.assumptions.length > 0) {
    lines.push('', '## Assumptions', '');
    lines.push(...renderList(item.assumptions));
  }

  if (item.notes && item.notes.length > 0) {
    lines.push('', '## Notes', '');
    lines.push(...renderList(item.notes));
  }

  lines.push('', '## Suggested Labels', '');
  lines.push(...renderList(buildSuggestedLabels(item)));

  return `${lines.join('\n').trim()}\n`;
}

export async function exportBacklogItems(
  backlogDraft: BacklogDraft,
  outputDirectory: string
): Promise<ExportedBacklogItemFile[]> {
  await mkdir(outputDirectory, { recursive: true });

  const exportedFiles: ExportedBacklogItemFile[] = [];

  for (const item of backlogDraft.items) {
    const itemPath = join(outputDirectory, `${item.id}.md`);
    await writeFile(itemPath, buildMarkdown(item), 'utf8');
    exportedFiles.push({
      itemId: item.id,
      path: itemPath
    });
  }

  return exportedFiles;
}
