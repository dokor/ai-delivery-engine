import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { executeGraph, parseGraphExecutionInput } from './orchestration/graphExecution.ts';
import { writeGraphExecutionReport } from './orchestration/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-graph-execution.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/graph-execution';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid graph execution JSON');
  const input = parseGraphExecutionInput(rawInput);
  const report = executeGraph(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.graph-execution');
  const written = await writeGraphExecutionReport(report, outputDirectory, outputBaseName);

  logLines([
    'Graph execution',
    `- Project: ${report.projectName}`,
    `- Run: ${report.runId}`,
    `- Blueprint: ${report.blueprintVersion}`,
    `- Executed nodes: ${report.executedNodeCount}`,
    `- Blocked nodes: ${report.blockedNodeCount}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Graph execution failed', error);
});
