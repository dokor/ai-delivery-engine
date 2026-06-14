import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { SpecialistCheckReport, SpecialistCheckSeverity } from './specialistCheck.types.ts';

export type WrittenSpecialistCheckReport = {
  markdownPath: string;
  jsonPath: string;
};

function buildSeveritySection(
  report: SpecialistCheckReport,
  severity: SpecialistCheckSeverity,
  title: string
): string[] {
  const findings = report.findings.filter((finding) => finding.severity === severity);
  const lines: string[] = [title, ''];

  if (findings.length === 0) {
    lines.push('- None.');
  } else {
    for (const finding of findings) {
      const sectionContext = finding.section ? ` (${finding.section})` : '';
      lines.push(`- [${finding.code}]${sectionContext} ${finding.message}`);
    }
  }

  lines.push('');
  return lines;
}

function buildMarkdown(report: SpecialistCheckReport): string {
  const lines: string[] = [
    '# Specialist Response Check',
    '',
    `Source file: ${report.sourceFile}`,
    `Checked at: ${report.checkedAt}`,
    `Detected role: ${report.detectedRole ?? 'Not detected'}`,
    '',
    '## Summary',
    '',
    `- Findings: ${report.findingsCount}`,
    `- Errors: ${report.findings.filter((finding) => finding.severity === 'error').length}`,
    `- Warnings: ${report.findings.filter((finding) => finding.severity === 'warning').length}`,
    `- Info: ${report.findings.filter((finding) => finding.severity === 'info').length}`,
    '',
    '## Backlog Item References',
    ''
  ];

  if (report.backlogItemIds.length === 0) {
    lines.push('- None detected.');
  } else {
    for (const itemId of report.backlogItemIds) {
      lines.push(`- ${itemId}`);
    }
  }

  lines.push('');
  lines.push(...buildSeveritySection(report, 'error', '## Errors'));
  lines.push(...buildSeveritySection(report, 'warning', '## Warnings'));
  lines.push(...buildSeveritySection(report, 'info', '## Info'));

  return `${lines.join('\n').trim()}\n`;
}

export async function writeSpecialistCheckReport(
  report: SpecialistCheckReport,
  outputDirectory: string,
  outputBaseName: string
): Promise<WrittenSpecialistCheckReport> {
  await mkdir(outputDirectory, { recursive: true });

  const markdownPath = join(outputDirectory, `${outputBaseName}.md`);
  const jsonPath = join(outputDirectory, `${outputBaseName}.json`);

  await writeFile(markdownPath, buildMarkdown(report), 'utf8');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  return {
    markdownPath,
    jsonPath
  };
}
