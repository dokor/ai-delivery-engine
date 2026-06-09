import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BacklogReviewReport } from './backlogReview.types.ts';

export type WrittenBacklogReviewReport = {
  markdownPath: string;
  jsonPath: string;
};

function buildMarkdown(report: BacklogReviewReport): string {
  const lines: string[] = [
    `# ${report.projectName} Backlog Review`,
    '',
    `Reviewed at: ${report.reviewedAt}`,
    `Source backlog: ${report.sourceBacklog}`,
    '',
    '## Summary',
    '',
    `- Total findings: ${report.summary.totalFindings}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Info: ${report.summary.infos}`,
    '',
    '## Findings',
    ''
  ];

  if (report.findings.length === 0) {
    lines.push('- No findings. The deterministic review did not detect any quality issues.');
  } else {
    for (const finding of report.findings) {
      const itemContext =
        finding.itemId && finding.itemTitle
          ? ` (${finding.itemId}: ${finding.itemTitle})`
          : finding.itemId
            ? ` (${finding.itemId})`
            : '';

      lines.push(`- [${finding.severity}] ${finding.ruleId}${itemContext}: ${finding.message}`);
    }
  }

  return `${lines.join('\n').trim()}\n`;
}

export async function writeBacklogReviewReport(
  report: BacklogReviewReport,
  outputDirectory: string,
  outputBaseName: string
): Promise<WrittenBacklogReviewReport> {
  await mkdir(outputDirectory, { recursive: true });

  const markdownPath = join(outputDirectory, `${outputBaseName}.md`);
  const jsonPath = join(outputDirectory, `${outputBaseName}.json`);

  await writeFile(markdownPath, buildMarkdown(report), 'utf8');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return { markdownPath, jsonPath };
}
