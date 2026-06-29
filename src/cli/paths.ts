import { basename, resolve } from 'node:path';

import { assertSafePath } from './assertSafePath.ts';

export function resolveInputPath(
  inputArg: string | undefined,
  defaultInputPath: string
): { sourceInput: string; inputPath: string } {
  const sourceInput = inputArg ?? defaultInputPath;
  const inputPath = resolve(process.cwd(), sourceInput);

  assertSafePath(inputPath, process.cwd());

  return { sourceInput, inputPath };
}

export function resolveOutputDirectory(
  outputArg: string | undefined,
  defaultOutputDirectory: string
): string {
  const outputDirectory = resolve(process.cwd(), outputArg ?? defaultOutputDirectory);

  assertSafePath(outputDirectory, process.cwd());

  return outputDirectory;
}

export function getFileStem(filePath: string): string {
  return basename(filePath).replace(/\.[^.]+$/, '');
}

export function deriveOutputBaseName(filePath: string, suffix: string): string {
  return `${getFileStem(filePath)}${suffix}`;
}
