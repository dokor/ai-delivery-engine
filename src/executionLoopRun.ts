import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { parseExecutionLoopInput, runExecutionLoop } from './executionLoop/loop.ts';
import { writeExecutionLoopReport } from './executionLoop/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-execution-loop.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/execution-loop';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid execution loop JSON');
  const input = parseExecutionLoopInput(rawInput);
  const report = await runExecutionLoop(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.execution-loop');
  const written = await writeExecutionLoopReport(report, outputDirectory, outputBaseName);

  logLines([
    'Execution loop',
    `- Project: ${report.projectName}`,
    `- Loop: ${report.loopId}`,
    `- Node: ${report.nodeId}`,
    `- Status: ${report.status}`,
    `- Stop reason: ${report.stopReason}`,
    `- Attempts: ${report.attempts.length}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Execution loop failed', error);
});
