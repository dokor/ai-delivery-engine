import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import { evaluateQualityGate, parseQualityGateInput } from './quality/gate.ts';
import { writeQualityGateReport } from './quality/writer.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-quality-gate.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/quality-gate';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const rawInput = await readJsonFile(inputPath, 'Invalid quality gate JSON');
  const input = parseQualityGateInput(rawInput);
  const report = evaluateQualityGate(input);
  const outputBaseName = deriveOutputBaseName(sourceInput, '.quality-gate');
  const written = await writeQualityGateReport(report, outputDirectory, outputBaseName);

  logLines([
    'Quality gate',
    `- Project: ${report.projectName}`,
    `- Run: ${report.runId}`,
    `- Target: ${report.target}`,
    `- Verdict: ${report.verdict}`,
    `- Blocking findings: ${report.findings.filter((finding) => finding.blocking).length}`,
    `- JSON output: ${written.jsonPath}`,
    `- Markdown output: ${written.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Quality gate failed', error);
});
