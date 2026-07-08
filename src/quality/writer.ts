import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { QualityGateReport } from './gate.types.ts';

function toRelativePath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
}

export type QualityGateWrittenFiles = {
  jsonPath: string;
  markdownPath: string;
};

export async function writeQualityGateReport(
  report: QualityGateReport,
  outputDirectory: string,
  outputBaseName: string
): Promise<QualityGateWrittenFiles> {
  await mkdir(outputDirectory, { recursive: true });

  const jsonPath = join(outputDirectory, `${outputBaseName}.json`);
  const markdownPath = join(outputDirectory, `${outputBaseName}.md`);

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, report.markdown, 'utf8');

  return {
    jsonPath: toRelativePath(jsonPath),
    markdownPath: toRelativePath(markdownPath)
  };
}
