import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { parseBrief } from './briefs/briefParser.ts';
import { buildPoPmPrompt } from './prompts/poPmPromptBuilder.ts';
import { writePromptFile } from './prompts/promptWriter.ts';

const DEFAULT_BRIEF_PATH = 'src/examples/sample-brief.md';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

async function main(): Promise<void> {
  const [briefArg, outputArg] = process.argv.slice(2);
  const sourceBrief = briefArg ?? DEFAULT_BRIEF_PATH;
  const briefPath = resolve(process.cwd(), sourceBrief);
  const outputDirectory = resolve(process.cwd(), outputArg ?? DEFAULT_OUTPUT_DIRECTORY);
  const markdown = await readFile(briefPath, 'utf8');
  const fallbackTitle = basename(briefPath).replace(/\.[^.]+$/, '');
  const brief = parseBrief(markdown, fallbackTitle);
  const promptMarkdown = buildPoPmPrompt(brief);
  const promptPath = await writePromptFile({
    briefPath,
    outputDirectory,
    promptMarkdown
  });

  console.log(`PO/PM manual prompt created for "${brief.title}".`);
  console.log(`Prompt output: ${promptPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Prompt generation failed: ${message}`);
  process.exitCode = 1;
});
