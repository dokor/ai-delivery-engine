import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { BacklogDraft, BacklogItem } from './backlog.types.ts';

type WriteBacklogDraftInput = {
  backlogDraft: BacklogDraft;
  briefPath: string;
  outputDirectory: string;
};

export type WrittenBacklogDraft = {
  jsonPath: string;
  markdownPath: string;
};

function buildMarkdown(backlogDraft: BacklogDraft): string {
  const epics = backlogDraft.items.filter((item) => item.type === 'epic');

  const lines: string[] = [
    `# ${backlogDraft.projectName} Backlog Draft`,
    '',
    `Generated at: ${backlogDraft.generatedAt}`,
    '',
    '## Project Summary',
    '',
    backlogDraft.projectSummary,
    '',
    '## Assumptions',
    ''
  ];

  if (backlogDraft.assumptions.length === 0) {
    lines.push('- No explicit assumptions captured.');
  } else {
    lines.push(...backlogDraft.assumptions.map((assumption) => `- ${assumption}`));
  }

  lines.push('', '## Open Questions', '');

  if (backlogDraft.questions.length === 0) {
    lines.push('- No open questions captured.');
  } else {
    lines.push(...backlogDraft.questions.map((question) => `- ${question}`));
  }

  lines.push('', '## Backlog', '');

  for (const epic of epics) {
    lines.push(`### ${epic.title}`);
    lines.push('');
    lines.push(`Priority: ${epic.priority}`);
    lines.push(`Status: ${epic.status}`);
    lines.push('');
    lines.push(epic.description);
    lines.push('');

    const stories = backlogDraft.items.filter(
      (item) => item.type === 'story' && item.parentId === epic.id
    );

    for (const story of stories) {
      lines.push(`- Story: ${story.title} [${story.priority} | ${story.status}]`);
      lines.push(`  Description: ${story.description}`);

      for (const criterion of story.acceptanceCriteria ?? []) {
        lines.push(`  Acceptance: ${criterion}`);
      }

      const tasks = backlogDraft.items.filter(
        (item) => item.type === 'task' && item.parentId === story.id
      );

      for (const task of tasks) {
        lines.push(
          `  Task: ${task.title} [${task.ownerRole ?? 'unassigned'} | ${task.priority} | ${task.status}]`
        );
        lines.push(`  Notes: ${task.description}`);
      }

      lines.push('');
    }
  }

  const risks = backlogDraft.items.filter((item) => item.type === 'risk');

  if (risks.length > 0) {
    lines.push('## Risks', '');

    for (const risk of risks) {
      lines.push(`- ${risk.title}: ${risk.description}`);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

function hasRequiredBacklogShape(items: BacklogItem[]): boolean {
  return (
    items.some((item) => item.type === 'epic') &&
    items.some((item) => item.type === 'story') &&
    items.some((item) => item.type === 'task')
  );
}

export async function writeBacklogDraft({
  backlogDraft,
  briefPath,
  outputDirectory
}: WriteBacklogDraftInput): Promise<WrittenBacklogDraft> {
  if (!hasRequiredBacklogShape(backlogDraft.items)) {
    throw new Error('Backlog draft must contain at least one epic, one story, and one task.');
  }

  await mkdir(outputDirectory, { recursive: true });

  const baseName = basename(briefPath).replace(/\.[^.]+$/, '');
  const jsonPath = join(outputDirectory, `${baseName}.backlog.json`);
  const markdownPath = join(outputDirectory, `${baseName}.backlog.md`);

  await writeFile(jsonPath, `${JSON.stringify(backlogDraft, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, buildMarkdown(backlogDraft), 'utf8');

  return { jsonPath, markdownPath };
}
