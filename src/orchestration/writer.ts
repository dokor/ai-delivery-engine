import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { GraphExecutionReport } from './graphExecution.types.ts';

function toRelativePath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
}

export type GraphExecutionWrittenFiles = {
  jsonPath: string;
  markdownPath: string;
};

export async function writeGraphExecutionReport(
  report: GraphExecutionReport,
  outputDirectory: string,
  outputBaseName: string
): Promise<GraphExecutionWrittenFiles> {
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
