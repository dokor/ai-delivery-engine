import { writeBacklogDraft } from './backlog/backlogWriter.ts';
import { readBacklogDraftFile } from './cli/backlog.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-po-pm-output.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';
const DEFAULT_OUTPUT_BASE_NAME = 'sample-po-pm-output.normalized';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const outputBaseName =
    inputArg === undefined ? DEFAULT_OUTPUT_BASE_NAME : deriveOutputBaseName(sourceInput, '.normalized');
  const parsed = await readBacklogDraftFile(inputPath, {
    invalidJsonPrefix: 'Invalid JSON in manual PO/PM response',
    invalidShapePrefix: 'Invalid manual PO/PM response shape'
  });

  const writtenDraft = await writeBacklogDraft({
    backlogDraft: parsed,
    briefPath: inputPath,
    outputDirectory,
    outputBaseName
  });

  logLines([
    `Imported PO/PM response for "${parsed.projectName}".`,
    `Normalized JSON output: ${writtenDraft.jsonPath}`,
    `Markdown summary output: ${writtenDraft.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('PO/PM import failed', error);
});
