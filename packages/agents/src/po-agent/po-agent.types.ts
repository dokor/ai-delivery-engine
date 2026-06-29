import type { BacklogOwnerRole, BacklogPriority } from '@ade/shared';

/** Task recommendation produced by the PO/PM agent for a specialist role. */
export type PoAgentTaskOutput = {
  title: string;
  description: string;
  ownerRole: Exclude<BacklogOwnerRole, 'po_pm'>;
};

export type PoAgentStoryOutput = {
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string[];
  priority: BacklogPriority;
  tasks: PoAgentTaskOutput[];
};

export type PoAgentEpicOutput = {
  title: string;
  description: string;
  priority: BacklogPriority;
  stories: PoAgentStoryOutput[];
};

export type PoAgentOutput = {
  projectSummary: string;
  assumptions: string[];
  questions: string[];
  epics: PoAgentEpicOutput[];
};
