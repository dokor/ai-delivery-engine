import { readFile } from 'node:fs/promises';

function buildInvalidJsonErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof SyntaxError) {
    return `${prefix}: ${error.message}`;
  }

  return `${prefix}.`;
}

export async function readJsonFile(inputPath: string, invalidJsonPrefix: string): Promise<unknown> {
  const rawJson = await readFile(inputPath, 'utf8');

  try {
    return JSON.parse(rawJson);
  } catch (error: unknown) {
    throw new Error(buildInvalidJsonErrorMessage(invalidJsonPrefix, error));
  }
}
