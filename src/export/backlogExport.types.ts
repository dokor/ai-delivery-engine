export type ExportedBacklogItemFile = {
  id: string;
  title: string;
  type: 'epic' | 'story' | 'task' | 'risk';
  priority: 'low' | 'medium' | 'high';
  status: 'draft' | 'review' | 'ready' | 'done';
  ownerRole?: 'po_pm' | 'ux_ui' | 'frontend' | 'backend' | 'qa' | 'tech_lead';
  parentId?: string;
  filePath: string;
  suggestedLabels: string[];
};

export type BacklogExportManifest = {
  sourceBacklogPath: string;
  exportedAt: string;
  exportedItemCount: number;
  files: ExportedBacklogItemFile[];
};

export type BacklogExportResult = {
  exportDirectory: string;
  manifestPath: string;
  files: ExportedBacklogItemFile[];
};
