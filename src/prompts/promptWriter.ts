import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

type WritePromptInput = {
  briefPath: string;
  outputDirectory: string;
  promptMarkdown: string;
  outputBaseName?: string;
};

export async function writePromptFile({
  briefPath,
  outputDirectory,
  promptMarkdown,
  outputBaseName
}: WritePromptInput): Promise<string> {
  await mkdir(outputDirectory, { recursive: true });

  const baseName = outputBaseName ?? basename(briefPath).replace(/\.[^.]+$/, '');
  const promptPath = join(
    outputDirectory,
    outputBaseName ? `${baseName}.md` : `${baseName}.po-pm.prompt.md`
  );

  await writeFile(promptPath, `${promptMarkdown.trim()}\n`, 'utf8');

  return promptPath;
}
