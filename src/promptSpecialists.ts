import { access, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { readJsonFile } from './cli/readJson.ts';
import {
  assertBacklogExportManifest,
  type ExportedBacklogItemFile
} from './export/backlogExport.types.ts';
import {
  buildSpecialistPrompt,
  type SpecialistRole
} from './prompts/specialistPromptBuilder.ts';
import type { GeneratedSpecialistPromptEntry } from './prompts/specialistPromptBatch.types.ts';
import { writeSpecialistPromptBatchArtifacts } from './prompts/specialistPromptBatchWriter.ts';
import { writePromptFile } from './prompts/promptWriter.ts';

const DEFAULT_MANIFEST_PATH = 'outputs/exported-items/manifest.json';
const DEFAULT_OUTPUT_DIRECTORY = 'outputs/specialist-prompts';

const OWNER_ROLE_TEMPLATE_MAP: Partial<
  Record<NonNullable<ExportedBacklogItemFile['ownerRole']>, SpecialistRole>
> = {
  ux_ui: 'ux-ui',
  frontend: 'frontend',
  backend: 'backend',
  qa: 'qa',
  tech_lead: 'tech-lead',
  legal_compliance: 'legal-compliance',
  security: 'security',
  devops: 'devops',
  data_analytics: 'data-analytics',
  customer_success: 'customer-success'
};

function getTemplatePath(role: SpecialistRole): string {
  return resolve(process.cwd(), 'templates', `${role}.md`);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveManifestEntryPath(
  manifestPath: string,
  entryPath: string
): Promise<string> {
  if (isAbsolute(entryPath)) {
    return entryPath;
  }

  const cwdRelativePath = resolve(process.cwd(), entryPath);

  if (await pathExists(cwdRelativePath)) {
    return cwdRelativePath;
  }

  const manifestRelativePath = resolve(dirname(manifestPath), entryPath);

  if (await pathExists(manifestRelativePath)) {
    return manifestRelativePath;
  }

  throw new Error(
    `Unable to resolve exported backlog item path "${entryPath}". Tried "${cwdRelativePath}" and "${manifestRelativePath}".`
  );
}

function getOutputBaseName(itemId: string, role: SpecialistRole): string {
  return `${itemId}.${role}.prompt`;
}

async function main(): Promise<void> {
  const [manifestArg, outputArg] = process.argv.slice(2);
  const { inputPath: manifestPath } = resolveInputPath(manifestArg, DEFAULT_MANIFEST_PATH);
  const outputDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);
  const parsed = await readJsonFile(manifestPath, 'Invalid export manifest JSON');

  try {
    assertBacklogExportManifest(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Export manifest does not match the expected shape.';
    throw new Error(`Invalid export manifest:\n${message}`);
  }

  let generatedCount = 0;
  let skippedCount = 0;
  const generatedPrompts: GeneratedSpecialistPromptEntry[] = [];

  for (const entry of parsed.files) {
    const ownerRole = entry.ownerRole;
    const role = ownerRole ? OWNER_ROLE_TEMPLATE_MAP[ownerRole] : undefined;

    if (!ownerRole || !role) {
      skippedCount += 1;
      continue;
    }

    const templatePath = getTemplatePath(role);
    const backlogItemPath = await resolveManifestEntryPath(manifestPath, entry.filePath);
    const [roleTemplateMarkdown, backlogItemMarkdown] = await Promise.all([
      readFile(templatePath, 'utf8'),
      readFile(backlogItemPath, 'utf8')
    ]);

    const promptMarkdown = buildSpecialistPrompt(
      role,
      roleTemplateMarkdown,
      backlogItemMarkdown,
      backlogItemPath
    );

    const promptPath = await writePromptFile({
      briefPath: backlogItemPath,
      outputDirectory,
      promptMarkdown,
      outputBaseName: getOutputBaseName(entry.id, role)
    });

    generatedPrompts.push({
      itemId: entry.id,
      itemTitle: entry.title,
      itemType: entry.type,
      ownerRole,
      specialistRole: role,
      promptFilePath: promptPath,
      sourceBacklogItemFilePath: backlogItemPath
    });

    generatedCount += 1;
  }

  const batchArtifacts = await writeSpecialistPromptBatchArtifacts({
    outputDirectory,
    sourceManifestPath: manifestPath,
    manifestItemCount: parsed.files.length,
    generatedPromptCount: generatedCount,
    skippedItemCount: skippedCount,
    prompts: generatedPrompts
  });

  logLines([
    `Specialist prompt batch generation completed.`,
    `Manifest input: ${manifestPath}`,
    `Output directory: ${outputDirectory}`,
    `Items read: ${parsed.files.length}`,
    `Prompts generated: ${generatedCount}`,
    `Skipped items: ${skippedCount}`,
    `Prompt index: ${batchArtifacts.indexPath}`,
    `Prompt README: ${batchArtifacts.readmePath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Specialist prompt batch generation failed', error);
});
