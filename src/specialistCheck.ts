import { readFile } from 'node:fs/promises';

import { logFailure, logLines } from './cli/logger.ts';
import { deriveOutputBaseName, resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { checkSpecialistResponse } from './specialist/specialistCheck.ts';
import { writeSpecialistCheckReport } from './specialist/specialistCheckWriter.ts';

const DEFAULT_INPUT_PATH = 'examples/specialist-responses/frontend-story-002.md';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const markdown = await readFile(inputPath, 'utf8');
  const report = checkSpecialistResponse(markdown, inputPath);
  const writtenReport = await writeSpecialistCheckReport(
    report,
    outputDirectory,
    deriveOutputBaseName(inputPath, '.specialist-check')
  );

  logLines([
    `Specialist response check completed.`,
    `Source file: ${inputPath}`,
    `Detected role: ${report.detectedRole ?? 'Not detected'}`,
    `Findings: ${report.findingsCount}`,
    `Markdown report: ${writtenReport.markdownPath}`,
    `JSON report: ${writtenReport.jsonPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Specialist response check failed', error);
});
