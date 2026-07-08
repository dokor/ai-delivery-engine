import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { parseBrief } from './briefs/briefParser.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { compileDeliveryPlan } from './blueprint/compiler.ts';
import { writeDeliveryPlan } from './blueprint/writer.ts';

const DEFAULT_BRIEF_PATH = 'src/examples/sample-brief.md';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/blueprints';

async function main(): Promise<void> {
  const [briefArg, outputArg] = process.argv.slice(2);
  const { sourceInput, inputPath } = resolveInputPath(briefArg, DEFAULT_BRIEF_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const markdown = await readFile(inputPath, 'utf8');
  const fallbackTitle = basename(inputPath).replace(/\.[^.]+$/, '');
  const brief = parseBrief(markdown, fallbackTitle);
  const plan = compileDeliveryPlan(brief, sourceInput);
  const written = await writeDeliveryPlan({ plan, briefPath: inputPath, outputDirectory });

  logLines([
    `Delivery plan compiled for "${plan.projectName}".`,
    `Blueprint: ${plan.selectedBlueprint.id}`,
    `Graph nodes: ${plan.graph.length}`,
    `Graph valid: ${plan.validation.valid ? 'yes' : 'no'}`,
    `JSON output: ${written.jsonPath}`,
    `Markdown output: ${written.markdownPath}`
  ]);

  if (!plan.validation.valid) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  logFailure('Blueprint compilation failed', error);
});

