import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

type WritePromptInput = {
  briefPath: string;
  outputDirectory: string;
  promptMarkdown: string;
};

export async function writePromptFile({
  briefPath,
  outputDirectory,
  promptMarkdown
}: WritePromptInput): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });

  const baseName = basename(briefPath).replace(/\.[^.]+$/, '');
  const promptPath = join(outputDirectory, `${baseName}.po-pm.prompt.md`);

  await writeFile(promptPath, `${promptMarkdown.trim()}\n`, 'utf8');

  return promptPath;
}
