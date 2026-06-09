import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { assertBacklogDraft } from './backlog/backlog.types.ts';
import { writeBacklogDraft } from './backlog/backlogWriter.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-po-pm-output.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';
const DEFAULT_OUTPUT_BASE_NAME = 'sample-po-pm-output.normalized';

function buildInvalidJsonErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `Invalid JSON in manual PO/PM response: ${error.message}`;
  }

  return 'Invalid JSON in manual PO/PM response.';
}

function deriveOutputBaseName(inputPath: string): string {
  const normalized = inputPath.replace(/\\/g, '/');
  const fileName = normalized.split('/').pop() ?? normalized;
  return fileName.replace(/\.[^.]+$/, '') + '.normalized';
}

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const sourceInput = inputArg ?? DEFAULT_INPUT_PATH;
  const inputPath = resolve(process.cwd(), sourceInput);
  const outputDirectory = resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT_DIRECTORY);
  const outputBaseName =
    inputArg === undefined ? DEFAULT_OUTPUT_BASE_NAME : deriveOutputBaseName(sourceInput);

  const rawJson = await readFile(inputPath, 'utf8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    throw new Error(buildInvalidJsonErrorMessage(error));
  }

  try {
    assertBacklogDraft(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid backlog shape.';
    throw new Error(`Invalid manual PO/PM response shape:\n${message}`);
  }

  const writtenDraft = await writeBacklogDraft({
    backlogDraft: parsed,
    briefPath: inputPath,
    outputDirectory,
    outputBaseName
  });

  console.log(`Imported PO/PM response for "${parsed.projectName}".`);
  console.log(`Normalized JSON output: ${writtenDraft.jsonPath}`);
  console.log(`Markdown summary output: ${writtenDraft.markdownPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`PO/PM import failed: ${message}`);
  process.exitCode = 1;
});
