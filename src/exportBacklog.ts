import { readBacklogDraftFile } from './cli/backlog.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { exportBacklogItems } from './export/backlogExporter.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-po-pm-output.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/exported-items';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const parsed = await readBacklogDraftFile(inputPath, {
    invalidJsonPrefix: 'Invalid backlog JSON',
    invalidShapePrefix: 'Invalid backlog draft for export'
  });

  const exportResult = await exportBacklogItems(parsed, inputPath, outputDirectory);

  logLines([
    `Backlog export completed for "${parsed.projectName}".`,
    `Export directory: ${outputDirectory}`,
    `Exported item files: ${exportResult.files.length}`,
    `Manifest output: ${exportResult.manifestPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Backlog export failed', error);
});
