import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { advanceProjectRun, parseProjectRunSnapshot } from './projectRun/advance.ts';
import { writeProjectRunReport } from './projectRun/writer.ts';

/**
 * `ade run advance` — applies the requested actions of a Project Run snapshot,
 * recomputes the run state and writes an auditable JSON + Markdown report.
 *
 * Launches no agent, touches no repository, bypasses no gate.
 *
 * Usage: ade run advance [input] [out]
 * Exit:  0 ok · 1 error
 */

const DEFAULT_INPUT_PATH = 'src/examples/sample-project-run.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/project-run';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid project run JSON');
  const snapshot = parseProjectRunSnapshot(rawInput);
  const report = advanceProjectRun(snapshot);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.project-run');
  const written = await writeProjectRunReport(report, outputDirectory, outputBaseName);

  logLines([
    'Project run',
    `- Project: ${report.projectName}`,
    `- Run: ${report.runId}`,
    `- Status: ${report.previousStatus} -> ${report.status}`,
    `- Next node: ${report.nextNode ? report.nextNode.id : 'none'}`,
    `- Blocker: ${report.blocker.kind} - ${report.blocker.message}`,
    `- Actions: ${report.acceptedActionIds.length} accepted, ${report.refusedActionIds.length} refused`,
    `- Preserved nodes: ${report.preservedNodeIds.length}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Project run failed', error);
});
