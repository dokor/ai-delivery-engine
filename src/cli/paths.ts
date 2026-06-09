import { basename, resolve } from 'node:path';

export function resolveInputPath(
  inputArg: string | undefined,
  defaultInputPath: string
): { sourceInput: string; inputPath: string } {
  const sourceInput = inputArg ?? defaultInputPath;

  return {
    sourceInput,
    inputPath: resolve(process.cwd(), sourceInput)
  };
}

export function resolveOutputDirectory(
  outputArg: string | undefined,
  defaultOutputDirectory: string
): string {
  return resolve(process.cwd(), outputArg ?? defaultOutputDirectory);
}

export function getFileStem(filePath: string): string {
  return basename(filePath).replace(/\.[^.]+$/, '');
}

export function deriveOutputBaseName(filePath: string, suffix: string): string {
  return `${getFileStem(filePath)}${suffix}`;
}
