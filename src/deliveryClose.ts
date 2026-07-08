import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { closeDeliveryRun, parseDeliveryClosureInput } from './delivery/closure.ts';
import { writeDeliveryClosureResult } from './delivery/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-delivery-run.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/delivery';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid delivery closure JSON');
  const input = parseDeliveryClosureInput(rawInput);
  const result = closeDeliveryRun(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.delivery-closure');
  const written = await writeDeliveryClosureResult(result, outputDirectory, outputBaseName);

  logLines([
    'Delivery closure',
    `- Project: ${result.projectName}`,
    `- Run: ${result.runId}`,
    `- Status: ${result.status}`,
    `- Missing evidence: ${result.missingEvidence.length}`,
    `- JSON output: ${written.jsonPath}`,
    `- Dossier output: ${written.markdownPath}`,
    `- Notification output: ${written.notificationPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Delivery closure failed', error);
});
