import { assertBacklogDraft, type BacklogDraft } from '../backlog/backlog.types.ts';

import { readJsonFile } from './readJson.ts';

type ReadBacklogDraftOptions = {
  invalidJsonPrefix: string;
  invalidShapePrefix: string;
};

export async function readBacklogDraftFile(
  inputPath: string,
  options: ReadBacklogDraftOptions
): Promise<BacklogDraft> {
  const parsed = await readJsonFile(inputPath, options.invalidJsonPrefix);

  try {
    assertBacklogDraft(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid backlog shape.';
    throw new Error(`${options.invalidShapePrefix}:\n${message}`);
  }

  return parsed;
}
