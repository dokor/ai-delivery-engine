import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { runPoPmAgent } from './agents/poPmAgent.ts';
import { parseBrief } from './briefs/briefParser.ts';
import { assertBacklogDraft } from './backlog/backlog.types.ts';
import { writeBacklogDraft } from './backlog/backlogWriter.ts';

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
  const backlogDraft = runPoPmAgent(brief, sourceBrief);

  assertBacklogDraft(backlogDraft);

  const writtenDraft = await writeBacklogDraft({
    backlogDraft,
    briefPath,
    outputDirectory
  });

  const epicCount = backlogDraft.items.filter((item) => item.type === 'epic').length;
  const storyCount = backlogDraft.items.filter((item) => item.type === 'story').length;
  const taskCount = backlogDraft.items.filter((item) => item.type === 'task').length;

  console.log(`PO/PM backlog draft created for "${backlogDraft.projectName}".`);
  console.log(`Epics: ${epicCount}, stories: ${storyCount}, tasks: ${taskCount}`);
  console.log(`JSON output: ${writtenDraft.jsonPath}`);
  console.log(`Markdown output: ${writtenDraft.markdownPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`Backlog runner failed: ${message}`);
  process.exitCode = 1;
});
