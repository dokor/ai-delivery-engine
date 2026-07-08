export const RUN_OBSERVABILITY_SCHEMA_VERSION = 1 as const;

export type RunObservabilitySchemaVersion = typeof RUN_OBSERVABILITY_SCHEMA_VERSION;

export type RunNodeStatus =
  | 'completed'
  | 'ready'
  | 'running'
  | 'blocked'
  | 'waiting_decision'
  | 'error'
  | 'cancelled'
  | 'skipped';

export type ObservableRunStatus =
  | 'completed'
  | 'running'
  | 'ready'
  | 'blocked'
  | 'waiting_decision'
  | 'error'
  | 'cancelled';

export type RunControlActionType =
  | 'pause'
  | 'resume'
  | 'retry'
  | 'cancel'
  | 'request_review'
  | 'takeover';

export type RunDecisionStatus = 'pending' | 'resolved' | 'rejected';

export type RunLink = {
  label: string;
  url?: string;
  path?: string;
  kind: 'github' | 'pull-request' | 'staging' | 'production' | 'validation' | 'artifact' | 'other';
  sensitive?: boolean;
};

export type RunCost = {
  tokensIn?: number;
  tokensOut?: number;
  estimatedCost?: number;
  currency?: string;
};

export type RunNodeAttempt = {
  attempt: number;
  status: 'completed' | 'error' | 'cancelled';
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  summary?: string;
  logs?: string[];
  error?: string;
  cost?: RunCost;
};

export type RunNodeTrace = {
  id: string;
  title: string;
  role: string;
  provider?: string;
  status: RunNodeStatus;
  dependsOn?: string[];
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  summary?: string;
  logs?: string[];
  error?: string;
  artifacts?: RunLink[];
  links?: RunLink[];
  cost?: RunCost;
  attempts?: RunNodeAttempt[];
};

export type RunDecisionTrace = {
  id: string;
  nodeId: string;
  question: string;
  status: RunDecisionStatus;
  selectedOption?: string;
  resolvedAt?: string;
};

export type RunControlActionTrace = {
  id: string;
  type: RunControlActionType;
  nodeId?: string;
  requestedBy: 'system' | 'human';
  at: string;
  reason: string;
  result: 'accepted' | 'rejected' | 'pending';
};

export type RunBudgetPolicy = {
  tokenBudget?: number;
  costBudget?: number;
  currency?: string;
  alertThresholdPercent?: number;
  pauseOnThreshold?: boolean;
};

export type ObservableRunInput = {
  schemaVersion: RunObservabilitySchemaVersion;
  runId: string;
  projectName: string;
  generatedAt?: string;
  nodes: RunNodeTrace[];
  decisions?: RunDecisionTrace[];
  controls?: RunControlActionTrace[];
  budget?: RunBudgetPolicy;
};

export type RunTimelineEntry = {
  nodeId: string;
  title: string;
  role: string;
  provider?: string;
  status: RunNodeStatus;
  durationMs?: number;
  dependsOn: string[];
  summary?: string;
  logs: string[];
  error?: string;
  artifacts: RunLink[];
  links: RunLink[];
  attempts: RunNodeAttempt[];
  cost: Required<RunCost>;
};

export type RunBudgetSummary = {
  tokensUsed: number;
  tokenBudget?: number;
  tokenPercent?: number;
  estimatedCost: number;
  costBudget?: number;
  costPercent?: number;
  currency: string;
  alertThresholdPercent: number;
  alert: boolean;
  pauseRecommended: boolean;
  byRole: Array<{ role: string; tokensUsed: number; estimatedCost: number }>;
  byProvider: Array<{ provider: string; tokensUsed: number; estimatedCost: number }>;
};

export type ObservableRunReport = {
  schemaVersion: RunObservabilitySchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  status: ObservableRunStatus;
  currentNode?: RunTimelineEntry;
  nextNode?: RunTimelineEntry;
  blockedReason?: string;
  resumeExpected: boolean;
  timeline: RunTimelineEntry[];
  decisions: RunDecisionTrace[];
  controls: RunControlActionTrace[];
  budget: RunBudgetSummary;
  summaryLines: string[];
  markdown: string;
};
