import type { AgentName, Priority } from '@ade/shared';

export type PoAgentTaskOutput = {
  title: string;
  description: string;
  agentOwner: Exclude<AgentName, 'po'>;
};

export type PoAgentStoryOutput = {
  title: string;
  userStory: string;
  description: string;
  acceptanceCriteria: string[];
  priority: Priority;
  tasks: PoAgentTaskOutput[];
};

export type PoAgentEpicOutput = {
  title: string;
  description: string;
  priority: Priority;
  stories: PoAgentStoryOutput[];
};

export type PoAgentOutput = {
  projectSummary: string;
  assumptions: string[];
  questions: string[];
  epics: PoAgentEpicOutput[];
};
