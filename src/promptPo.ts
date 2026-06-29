import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { parseBrief } from './briefs/briefParser.ts';
import { buildPoPmPrompt } from './prompts/poPmPromptBuilder.ts';
import { writePromptFile } from './prompts/promptWriter.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';

const DEFAULT_BRIEF_PATH = 'src/examples/sample-brief.md';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

async function main(): Promise<void> {
  const [briefArg, outputArg] = process.argv.slice(2);
  const { inputPath: briefPath } = resolveInputPath(briefArg, DEFAULT_BRIEF_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const markdown = await readFile(briefPath, 'utf8');
  const fallbackTitle = basename(briefPath).replace(/\.[^.]+$/, '');
  const brief = parseBrief(markdown, fallbackTitle);
  const promptMarkdown = buildPoPmPrompt(brief);
  const promptPath = await writePromptFile({
    briefPath,
    outputDirectory,
    promptMarkdown
  });

  logLines([
    `PO/PM manual prompt created for "${brief.title}".`,
    `Prompt output: ${promptPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Prompt generation failed', error);
});
