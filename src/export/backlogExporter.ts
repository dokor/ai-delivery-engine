import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BacklogDraft, BacklogItem } from '../backlog/backlog.types.ts';
import type {
  BacklogExportManifest,
  BacklogExportResult,
  ExportedBacklogItemFile
} from './backlogExport.types.ts';

function buildSuggestedLabels(item: BacklogItem): string[] {
  const labels = [`type:${item.type}`, `priority:${item.priority}`, `status:${item.status}`];

  if (item.ownerRole) {
    labels.push(`owner:${item.ownerRole}`);
  }

  return labels;
}

function buildManifest(
  sourceBacklogPath: string,
  exportedFiles: ExportedBacklogItemFile[]
): BacklogExportManifest {
  return {
    sourceBacklogPath,
    exportedAt: new Date().toISOString(),
    exportedItemCount: exportedFiles.length,
    files: exportedFiles
  };
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
  sourceBacklogPath: string,
  outputDirectory: string
): Promise<BacklogExportResult> {
  await mkdir(outputDirectory, { recursive: true });

  // Write all item files in parallel — each file is independent.
  const exportedFiles = await Promise.all(
    backlogDraft.items.map(async (item): Promise<ExportedBacklogItemFile> => {
      const itemPath = join(outputDirectory, `${item.id}.md`);
      const suggestedLabels = buildSuggestedLabels(item);

      await writeFile(itemPath, buildMarkdown(item), 'utf8');

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        priority: item.priority,
        status: item.status,
        ownerRole: item.ownerRole,
        parentId: item.parentId,
        filePath: itemPath,
        suggestedLabels
      };
    })
  );

  const manifestPath = join(outputDirectory, 'manifest.json');
  const manifest = buildManifest(sourceBacklogPath, exportedFiles);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return { exportDirectory: outputDirectory, manifestPath, files: exportedFiles };
}
