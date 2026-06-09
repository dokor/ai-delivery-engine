export type AgentName = 'po' | 'ux' | 'frontend' | 'backend' | 'qa';

export type Priority = 'low' | 'medium' | 'high';

export type BacklogItemType = 'epic' | 'story' | 'task' | 'bug';

export type BacklogItemStatus = 'todo' | 'ready' | 'in_progress' | 'review' | 'done';

export type BacklogItem = {
  id: string;
  projectId: string;
  parentId?: string;
  type: BacklogItemType;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  priority: Priority;
  status: BacklogItemStatus;
  agentOwner?: AgentName;
  githubIssueUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  repositoryUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'done';
  createdAt: string;
  updatedAt: string;
};

export type AgentRunStatus = 'success' | 'error';

export type AgentRun<TOutput = unknown> = {
  id: string;
  projectId: string;
  agent: AgentName;
  input: string;
  output: TOutput;
  status: AgentRunStatus;
  createdAt: string;
};
