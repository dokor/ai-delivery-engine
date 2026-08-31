import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { evaluateProjectSetup } from './setup/evaluate.ts';
import { writeProjectSetupEvaluation } from './setup/writer.ts';

/**
 * `ade setup check` — evaluates the current repository against the ADE project
 * setup contract and reports `ready`, `incomplete` or `invalid`.
 *
 * `--json` writes the evaluation to stdout as stable JSON, which is the shape
 * `ade-control-plane` consumes. Without it, a human summary is printed and the
 * report is written under `outputs/setup/`.
 *
 * This command never writes to GitHub and never calls the network.
 *
 * Usage: ade setup check [out] [--json]
 * Exit:  0 ready · 1 incomplete or invalid
 */

const DEFAULT_OUTPUT_DIRECTORY = 'outputs/setup';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const outputArg = args.find((arg) => !arg.startsWith('--'));

  const evaluation = await evaluateProjectSetup({ projectRoot: process.cwd() });

  if (json) {
    process.stdout.write(`${JSON.stringify(evaluation, null, 2)}\n`);
  } else {
    const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
    const written = await writeProjectSetupEvaluation(evaluation, outputDirectory, 'ade.project-setup');

    logLines([
      'ADE setup check',
      `- Contract: ${evaluation.version}`,
      `- Readiness: ${evaluation.readiness}`,
      ...evaluation.configurationErrors.map((error) => `- Configuration error: ${error}`),
      `- Missing required: ${
        evaluation.missingRequiredIds.length > 0 ? evaluation.missingRequiredIds.join(', ') : 'none'
      }`,
      `- Missing optional: ${evaluation.missingOptionalIds.length}`,
      `- Not verifiable locally: ${evaluation.unverifiableIds.length}`,
      `- JSON output: ${written.jsonPath}`,
      `- Markdown output: ${written.markdownPath}`
    ]);
  }

  process.exitCode = evaluation.readiness === 'ready' ? 0 : 1;
}

main().catch((error: unknown) => {
  logFailure('Setup check failed', error);
});
