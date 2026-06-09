import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';

import type { ProjectStatusArtifact, ProjectStatusReport } from './projectStatus.types.ts';

function toRelativePath(filePath: string): string {
  const relativePath = relative(process.cwd(), filePath);
  return relativePath === '' ? '.' : relativePath.replace(/\\/g, '/');
}

async function listFiles(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(directory, entry.name));
  } catch {
    return [];
  }
}

async function findLatestFile(
  directory: string,
  matcher: (fileName: string) => boolean
): Promise<string | undefined> {
  const files = await listFiles(directory);
  const matchingFiles = files.filter((filePath) => matcher(basename(filePath)));

  if (matchingFiles.length === 0) {
    return undefined;
  }

  const filesWithStats = await Promise.all(
    matchingFiles.map(async (filePath) => ({
      filePath,
      modifiedAt: (await stat(filePath)).mtimeMs
    }))
  );

  filesWithStats.sort((left, right) => right.modifiedAt - left.modifiedAt);
  return filesWithStats[0]?.filePath;
}

async function readJsonFileSafely(filePath: string): Promise<unknown | undefined> {
  try {
    const content = await readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

function toArtifact(filePath: string | undefined): ProjectStatusArtifact {
  if (!filePath) {
    return { exists: false };
  }

  return {
    exists: true,
    path: toRelativePath(filePath)
  };
}

function getReviewFindingsCount(report: unknown): number | undefined {
  if (!report || typeof report !== 'object') {
    return undefined;
  }

  const summary = (report as { summary?: { totalFindings?: unknown } }).summary;
  return typeof summary?.totalFindings === 'number' ? summary.totalFindings : undefined;
}

function getManifestExportedItemCount(manifest: unknown): number | undefined {
  if (!manifest || typeof manifest !== 'object') {
    return undefined;
  }

  const exportedItemCount = (manifest as { exportedItemCount?: unknown }).exportedItemCount;
  return typeof exportedItemCount === 'number' ? exportedItemCount : undefined;
}

function buildSuggestedNextStep(status: ProjectStatusReport): string {
  if (!status.deterministicBacklogDraft.exists) {
    return 'Run pnpm backlog:run to generate a deterministic backlog draft.';
  }

  if (!status.poPmPrompt.exists) {
    return 'Run pnpm prompt:po to generate the manual PO/PM prompt.';
  }

  if (!status.normalizedBacklog.exists) {
    return 'Use the prompt manually, save the PO/PM JSON response locally, then run pnpm import:po.';
  }

  if (!status.backlogReview.exists) {
    return 'Run pnpm backlog:review to inspect backlog quality before export.';
  }

  if ((status.backlogReview.findingsCount ?? 0) > 0) {
    return 'Review the backlog findings and decide whether the backlog should be revised before implementation.';
  }

  if (!status.exportStatus.exportedMarkdownExists) {
    return 'Run pnpm backlog:export to generate Markdown backlog items.';
  }

  if (!status.exportStatus.manifest.exists) {
    return 'Run pnpm backlog:export again to generate outputs/exported-items/manifest.json.';
  }

  return 'Review the exported items and manifest, then decide what is ready for implementation.';
}

export async function collectProjectStatus(outputsDirectory: string): Promise<ProjectStatusReport> {
  const exportedItemsDirectory = join(outputsDirectory, 'exported-items');

  const deterministicBacklogDraftPath = await findLatestFile(
    outputsDirectory,
    (fileName) => fileName.endsWith('.backlog.json') && !fileName.endsWith('.normalized.backlog.json')
  );
  const poPmPromptPath = await findLatestFile(
    outputsDirectory,
    (fileName) => fileName.endsWith('.po-pm.prompt.md')
  );
  const normalizedBacklogPath = await findLatestFile(
    outputsDirectory,
    (fileName) => fileName.endsWith('.normalized.backlog.json')
  );
  const backlogReviewPath = await findLatestFile(
    outputsDirectory,
    (fileName) => fileName === 'backlog-review.json'
  );
  const manifestPath = await findLatestFile(
    exportedItemsDirectory,
    (fileName) => fileName === 'manifest.json'
  );

  const exportedFiles = await listFiles(exportedItemsDirectory);
  const exportedMarkdownFiles = exportedFiles.filter((filePath) => filePath.endsWith('.md'));

  const reviewReport = backlogReviewPath ? await readJsonFileSafely(backlogReviewPath) : undefined;
  const manifest = manifestPath ? await readJsonFileSafely(manifestPath) : undefined;

  const status: ProjectStatusReport = {
    generatedAt: new Date().toISOString(),
    outputsDirectory: toRelativePath(outputsDirectory),
    deterministicBacklogDraft: toArtifact(deterministicBacklogDraftPath),
    poPmPrompt: toArtifact(poPmPromptPath),
    normalizedBacklog: toArtifact(normalizedBacklogPath),
    backlogReview: {
      ...toArtifact(backlogReviewPath),
      findingsCount: getReviewFindingsCount(reviewReport)
    },
    exportStatus: {
      directory: toRelativePath(exportedItemsDirectory),
      exportedMarkdownExists: exportedMarkdownFiles.length > 0,
      exportedItemCount:
        getManifestExportedItemCount(manifest) ??
        (exportedMarkdownFiles.length > 0 ? exportedMarkdownFiles.length : undefined),
      manifest: toArtifact(manifestPath)
    },
    suggestedNextStep: ''
  };

  status.suggestedNextStep = buildSuggestedNextStep(status);
  return status;
}

export function renderProjectStatus(status: ProjectStatusReport): string[] {
  const formatPresence = (artifact: ProjectStatusArtifact): string =>
    artifact.exists ? `yes (${artifact.path})` : 'no';

  const reviewSummary = status.backlogReview.exists
    ? status.backlogReview.findingsCount !== undefined
      ? `yes (${status.backlogReview.findingsCount} findings)`
      : `yes (${status.backlogReview.path})`
    : 'no';

  const exportSummary = status.exportStatus.exportedMarkdownExists
    ? status.exportStatus.exportedItemCount !== undefined
      ? `yes (${status.exportStatus.exportedItemCount} files)`
      : `yes (${status.exportStatus.directory})`
    : 'no';

  return [
    'Project status',
    `- Outputs directory: ${status.outputsDirectory}`,
    `- Deterministic backlog draft: ${formatPresence(status.deterministicBacklogDraft)}`,
    `- PO/PM prompt: ${formatPresence(status.poPmPrompt)}`,
    `- Normalized backlog: ${formatPresence(status.normalizedBacklog)}`,
    `- Backlog review report: ${reviewSummary}`,
    `- Exported Markdown items: ${exportSummary}`,
    `- Export manifest: ${formatPresence(status.exportStatus.manifest)}`,
    `- Suggested next step: ${status.suggestedNextStep}`
  ];
}

export async function writeProjectStatus(
  status: ProjectStatusReport,
  outputsDirectory: string
): Promise<string> {
  await mkdir(outputsDirectory, { recursive: true });

  const statusPath = join(outputsDirectory, 'project-status.json');
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, 'utf8');

  return toRelativePath(statusPath);
}
