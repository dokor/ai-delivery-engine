// =============================================================================
// V1 CANONICAL TYPES
// These types mirror src/backlog/backlog.types.ts and are the source of truth
// for V2 packages. Any change to the V1 contract should be reflected here.
// =============================================================================

export const BACKLOG_ITEM_TYPES = ['epic', 'story', 'task', 'risk'] as const;
export const BACKLOG_PRIORITIES = ['low', 'medium', 'high'] as const;
export const BACKLOG_STATUSES = ['draft', 'review', 'ready', 'done'] as const;
export const BACKLOG_OWNER_ROLES = [
  'po_pm',
  'ux_ui',
  'frontend',
  'backend',
  'qa',
  'tech_lead',
  'legal_compliance',
  'security',
  'devops',
  'data_analytics',
  'customer_success'
] as const;

export type BacklogItemType = (typeof BACKLOG_ITEM_TYPES)[number];
export type BacklogPriority = (typeof BACKLOG_PRIORITIES)[number];
export type BacklogStatus = (typeof BACKLOG_STATUSES)[number];
export type BacklogOwnerRole = (typeof BACKLOG_OWNER_ROLES)[number];

/** Backlog item as used throughout the V1 local workflow. */
export type BacklogItem = {
  id: string;
  parentId?: string;
  type: BacklogItemType;
  title: string;
  description: string;
  priority: BacklogPriority;
  status: BacklogStatus;
  ownerRole?: BacklogOwnerRole;
  acceptanceCriteria?: string[];
  assumptions?: string[];
  notes?: string[];
};

/** Full backlog produced by the PO/PM agent or imported from a manual response. */
export type BacklogDraft = {
  projectName: string;
  projectSummary: string;
  generatedAt: string;
  sourceBrief: string;
  assumptions: string[];
  questions: string[];
  items: BacklogItem[];
};

// =============================================================================
// V2 TYPES (not yet used — reserved for the next major iteration)
// These extend the V1 model with persistence, GitHub integration, and
// multi-project support. Do not use in src/ until V2 development starts.
// =============================================================================

/**
 * @v2 A persistent project record, separate from the local BacklogDraft.
 * Introduces projectId, repositoryUrl, and lifecycle status for multi-project support.
 */
export type Project = {
  id: string;
  name: string;
  description: string;
  repositoryUrl?: string;
  status: 'draft' | 'active' | 'paused' | 'done';
  createdAt: string;
  updatedAt: string;
};

/** @v2 Persisted backlog item linked to a Project and optionally to a GitHub issue. */
export type PersistedBacklogItem = BacklogItem & {
  projectId: string;
  githubIssueUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type AgentRunStatus = 'success' | 'error';

/**
 * @v2 Record of a single agent execution, stored for audit and replay.
 * Uses BacklogOwnerRole as the agent identifier (replaces the old AgentName).
 */
export type AgentRun<TOutput = unknown> = {
  id: string;
  projectId: string;
  agent: BacklogOwnerRole;
  input: string;
  output: TOutput;
  status: AgentRunStatus;
  createdAt: string;
};
