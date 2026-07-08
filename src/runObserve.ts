import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { observeRun, parseObservableRunInput } from './observability/runReport.ts';
import { writeObservableRunReport } from './observability/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-observable-run.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/run-observability';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid observable run JSON');
  const input = parseObservableRunInput(rawInput);
  const report = observeRun(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.run-observability');
  const written = await writeObservableRunReport(report, outputDirectory, outputBaseName);

  logLines([
    'Run observability',
    `- Project: ${report.projectName}`,
    `- Run: ${report.runId}`,
    `- Status: ${report.status}`,
    `- Current node: ${report.currentNode?.nodeId ?? 'none'}`,
    `- Next node: ${report.nextNode?.nodeId ?? 'none'}`,
    `- Budget alert: ${report.budget.alert ? 'yes' : 'no'}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Run observability failed', error);
});
