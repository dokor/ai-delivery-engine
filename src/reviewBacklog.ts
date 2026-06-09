import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { assertBacklogDraft } from './backlog/backlog.types.ts';
import { reviewBacklog } from './review/backlogReview.ts';
import { writeBacklogReviewReport } from './review/reviewWriter.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-po-pm-output.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';
const DEFAULT_OUTPUT_BASE_NAME = 'backlog-review';

function buildInvalidJsonErrorMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return `Invalid backlog JSON: ${error.message}`;
  }

  return 'Invalid backlog JSON.';
}

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const sourceInput = inputArg ?? DEFAULT_INPUT_PATH;
  const inputPath = resolve(process.cwd(), sourceInput);
  const outputDirectory = resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT_DIRECTORY);
  const rawJson = await readFile(inputPath, 'utf8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson);
  } catch (error: unknown) {
    throw new Error(buildInvalidJsonErrorMessage(error));
  }

  try {
    assertBacklogDraft(parsed);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid backlog shape.';
    throw new Error(`Invalid backlog draft for review:\n${message}`);
  }

  const report = reviewBacklog(parsed, sourceInput);
  const writtenReport = await writeBacklogReviewReport(
    report,
    outputDirectory,
    DEFAULT_OUTPUT_BASE_NAME
  );

  console.log(`Backlog review completed for "${parsed.projectName}".`);
  console.log(`Markdown review report: ${writtenReport.markdownPath}`);
  console.log(`JSON review report: ${writtenReport.jsonPath}`);
  console.log(`Findings: ${report.summary.totalFindings}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Backlog review failed: ${message}`);
  process.exitCode = 1;
});
