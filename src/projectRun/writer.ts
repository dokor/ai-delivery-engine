import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { ProjectRunReport, ProjectRunWrittenFiles } from './projectRun.types.ts';

function toRelativePath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
}

export async function writeProjectRunReport(
  report: ProjectRunReport,
  outputDirectory: string,
  outputBaseName: string
): Promise<ProjectRunWrittenFiles> {
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
