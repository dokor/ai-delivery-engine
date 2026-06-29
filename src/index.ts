import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { runPoPmAgent } from './agents/poPmAgent.ts';
import { parseBrief } from './briefs/briefParser.ts';
import { assertBacklogDraft } from './backlog/backlog.types.ts';
import { writeBacklogDraft } from './backlog/backlogWriter.ts';
import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';

const DEFAULT_BRIEF_PATH = 'src/examples/sample-brief.md';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

async function main(): Promise<void> {
  const [briefArg, outputArg] = process.argv.slice(2);
  const { sourceInput: sourceBrief, inputPath: briefPath } = resolveInputPath(briefArg, DEFAULT_BRIEF_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
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

  logLines([
    `PO/PM backlog draft created for "${backlogDraft.projectName}".`,
    `Epics: ${epicCount}, stories: ${storyCount}, tasks: ${taskCount}`,
    `JSON output: ${writtenDraft.jsonPath}`,
    `Markdown output: ${writtenDraft.markdownPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Backlog runner failed', error);
});
