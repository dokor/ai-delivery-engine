import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { getTemplatesDir } from './cli/packagePaths.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import {
  buildSpecialistPrompt,
  getSpecialistRoles,
  isSpecialistRole
} from './prompts/specialistPromptBuilder.ts';
import { writePromptFile } from './prompts/promptWriter.ts';

const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

function getTemplatePath(role: string): string {
  return resolve(getTemplatesDir(), `${role}.md`);
}

function getOutputBaseName(backlogItemPath: string, role: string): string {
  const itemId = basename(backlogItemPath).replace(/\.[^.]+$/, '');
  return `${itemId}.${role}.prompt`;
}

async function main(): Promise<void> {
  const [roleArg, backlogItemArg, outputArg] = process.argv.slice(2);

  if (!roleArg) {
    throw new Error(
      `Missing role name. Supported roles: ${getSpecialistRoles().join(', ')}.`
    );
  }

  if (!isSpecialistRole(roleArg)) {
    throw new Error(
      `Unsupported role "${roleArg}". Supported roles: ${getSpecialistRoles().join(', ')}.`
    );
  }

  if (!backlogItemArg) {
    throw new Error('Missing backlog item Markdown file path.');
  }

  const templatePath = getTemplatePath(roleArg);
  const backlogItemPath = resolve(process.cwd(), backlogItemArg);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);

  const [roleTemplateMarkdown, backlogItemMarkdown] = await Promise.all([
    readFile(templatePath, 'utf8'),
    readFile(backlogItemPath, 'utf8')
  ]);

  const promptMarkdown = buildSpecialistPrompt(
    roleArg,
    roleTemplateMarkdown,
    backlogItemMarkdown,
    backlogItemArg
  );
  const promptPath = await writePromptFile({
    briefPath: backlogItemPath,
    outputDirectory,
    promptMarkdown,
    outputBaseName: getOutputBaseName(backlogItemPath, roleArg)
  });

  logLines([
    `Specialist prompt created for role "${roleArg}".`,
    `Backlog item input: ${backlogItemPath}`,
    `Prompt output: ${promptPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Specialist prompt generation failed', error);
});
