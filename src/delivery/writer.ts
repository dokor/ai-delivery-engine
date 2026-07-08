import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import type { DeliveryClosureResult } from './closure.types.ts';

function toRelativePath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
}

export type DeliveryClosureWrittenFiles = {
  jsonPath: string;
  markdownPath: string;
  notificationPath: string;
};

export async function writeDeliveryClosureResult(
  result: DeliveryClosureResult,
  outputDirectory: string,
  outputBaseName: string
): Promise<DeliveryClosureWrittenFiles> {
  await mkdir(outputDirectory, { recursive: true });

  const jsonPath = join(outputDirectory, `${outputBaseName}.json`);
  const markdownPath = join(outputDirectory, `${outputBaseName}.md`);
  const notificationPath = join(outputDirectory, `${outputBaseName}.notification.md`);

  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  await writeFile(markdownPath, result.opsDossier, 'utf8');
  await writeFile(notificationPath, result.notification, 'utf8');

  return {
    jsonPath: toRelativePath(jsonPath),
    markdownPath: toRelativePath(markdownPath),
    notificationPath: toRelativePath(notificationPath)
  };
}
