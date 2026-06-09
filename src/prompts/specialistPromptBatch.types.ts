import type { ExportedBacklogItemFile } from '../export/backlogExport.types.ts';
import type { SpecialistRole } from './specialistPromptBuilder.ts';

export type GeneratedSpecialistPromptEntry = {
  itemId: string;
  itemTitle?: string;
  itemType: ExportedBacklogItemFile['type'];
  ownerRole: NonNullable<ExportedBacklogItemFile['ownerRole']>;
  specialistRole: SpecialistRole;
  promptFilePath: string;
  sourceBacklogItemFilePath: string;
};

export type SpecialistPromptBatchIndex = {
  sourceManifestPath: string;
  generatedAt: string;
  manifestItemCount: number;
  generatedPromptCount: number;
  skippedItemCount: number;
  prompts: GeneratedSpecialistPromptEntry[];
};
