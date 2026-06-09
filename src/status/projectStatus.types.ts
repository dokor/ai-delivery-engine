export type ProjectStatusArtifact = {
  exists: boolean;
  path?: string;
};

export type ProjectStatusReview = ProjectStatusArtifact & {
  findingsCount?: number;
};

export type ProjectStatusExport = {
  directory: string;
  exportedMarkdownExists: boolean;
  exportedItemCount?: number;
  manifest: ProjectStatusArtifact;
};

export type ProjectStatusReport = {
  generatedAt: string;
  outputsDirectory: string;
  deterministicBacklogDraft: ProjectStatusArtifact;
  poPmPrompt: ProjectStatusArtifact;
  normalizedBacklog: ProjectStatusArtifact;
  backlogReview: ProjectStatusReview;
  exportStatus: ProjectStatusExport;
  suggestedNextStep: string;
};
