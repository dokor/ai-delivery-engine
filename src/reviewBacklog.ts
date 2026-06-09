import { readBacklogDraftFile } from './cli/backlog.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { reviewBacklog } from './review/backlogReview.ts';
import { writeBacklogReviewReport } from './review/reviewWriter.ts';

const DEFAULT_INPUT_PATH = 'src/examples/sample-po-pm-output.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';
const DEFAULT_OUTPUT_BASE_NAME = 'backlog-review';

async function main(): Promise<void> {
  const [inputArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(inputArg, DEFAULT_INPUT_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const parsed = await readBacklogDraftFile(inputPath, {
    invalidJsonPrefix: 'Invalid backlog JSON',
    invalidShapePrefix: 'Invalid backlog draft for review'
  });

  const report = reviewBacklog(parsed, sourceInput);
  const writtenReport = await writeBacklogReviewReport(
    report,
    outputDirectory,
    DEFAULT_OUTPUT_BASE_NAME
  );

  logLines([
    `Backlog review completed for "${parsed.projectName}".`,
    `Markdown review report: ${writtenReport.markdownPath}`,
    `JSON review report: ${writtenReport.jsonPath}`,
    `Findings: ${report.summary.totalFindings}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Backlog review failed', error);
});
