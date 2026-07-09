import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { parseDelegationPlanInput, planDelegation } from './delegation/plan.ts';
import { writeDelegationPlanReport } from './delegation/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-delegation-plan.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/delegation-plan';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid delegation plan JSON');
  const input = parseDelegationPlanInput(rawInput);
  const report = planDelegation(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.delegation-plan');
  const written = await writeDelegationPlanReport(report, outputDirectory, outputBaseName);

  logLines([
    'Delegation plan',
    `- Project: ${report.projectName}`,
    `- Run: ${report.runId}`,
    `- Ready tasks: ${report.readyTaskCount}`,
    `- Blocked tasks: ${report.blockedTaskCount}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Delegation plan failed', error);
});
