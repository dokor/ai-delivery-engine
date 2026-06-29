import { readFile, stat } from 'node:fs/promises';

/** 10 MB — well above any realistic brief or backlog file, guards against accidental large inputs. */
const MAX_JSON_BYTES = 10 * 1024 * 1024;

function buildInvalidJsonErrorMessage(prefix: string, error: unknown): string {
  if (error instanceof SyntaxError) {
    return `${prefix}: ${error.message}`;
  }
  return `${prefix}.`;
}

export async function readJsonFile(inputPath: string, invalidJsonPrefix: string): Promise<unknown> {
  let rawJson: string;

  try {
    const fileStat = await stat(inputPath);

    if (fileStat.size > MAX_JSON_BYTES) {
      throw new Error(
        `File is too large to process (${(fileStat.size / 1024 / 1024).toFixed(1)} MB, limit is 10 MB): "${inputPath}".`
      );
    }

    rawJson = await readFile(inputPath, 'utf8');
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`File not found: "${inputPath}".`);
    }
    throw error;
  }

  try {
    return JSON.parse(rawJson);
  } catch (error: unknown) {
    throw new Error(buildInvalidJsonErrorMessage(invalidJsonPrefix, error));
  }
}
