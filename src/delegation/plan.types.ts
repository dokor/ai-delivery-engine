export const DELEGATION_PLAN_SCHEMA_VERSION = 1 as const;

export type DelegationPlanSchemaVersion = typeof DELEGATION_PLAN_SCHEMA_VERSION;
export type DelegationPriority = 'high' | 'medium' | 'low';
export type DelegationGateStatus = 'passed' | 'failed' | 'pending' | 'missing';
export type DelegationFindingSeverity = 'info' | 'warning' | 'error';

export type DelegationGitPolicy = {
  defaultBranch: string;
  protectedBranches: string[];
  requirePullRequest: boolean;
  requireVisibleCommit: boolean;
  allowAutoMerge: boolean;
};

export type DelegationPermissions = {
  allowNetwork?: boolean;
  allowedShellCommands?: string[];
  writeScopes?: string[];
  secretRefs?: string[];
};

export type DelegationAgentCapability = {
  id: string;
  name: string;
  provider?: string;
  roles: string[];
  contextKinds: string[];
  maxConcurrentTasks?: number;
  permissions?: DelegationPermissions;
};

export type DelegationGate = {
  id: string;
  status: DelegationGateStatus;
  summary?: string;
};

export type DelegationTaskInput = {
  id: string;
  issueNumber: number;
  title: string;
  priority: DelegationPriority;
  role: string;
  dependsOn: string[];
  requiredGateIds: string[];
  branchName: string;
  workspacePath: string;
  contextRefs: string[];
  validationCommands: string[];
  expectedArtifacts: string[];
  estimatedTokens?: number;
  estimatedCost?: number;
};

export type DelegationBudget = {
  tokenBudget?: number;
  costBudget?: number;
  currency?: string;
};

export type DelegationPlanInput = {
  schemaVersion: DelegationPlanSchemaVersion;
  runId: string;
  projectName: string;
  completedTaskIds: string[];
  gitPolicy: DelegationGitPolicy;
  agents: DelegationAgentCapability[];
  gates: DelegationGate[];
  tasks: DelegationTaskInput[];
  budget?: DelegationBudget;
};

export type DelegationPolicyFinding = {
  id: string;
  severity: DelegationFindingSeverity;
  message: string;
};

export type DelegationPlannedTask = {
  order: number;
  id: string;
  issueNumber: number;
  title: string;
  role: string;
  priority: DelegationPriority;
  agentId: string;
  provider?: string;
  branchName: string;
  workspacePath: string;
  contextRefs: string[];
  validationCommands: string[];
  expectedArtifacts: string[];
  requiredGateIds: string[];
  estimatedTokens?: number;
  estimatedCost?: number;
};

export type DelegationBlockedTask = {
  id: string;
  issueNumber: number;
  title: string;
  reasons: string[];
  nextActions: string[];
};

export type DelegationBudgetSummary = {
  tokensPlanned: number;
  tokenBudget?: number;
  tokenPercent?: number;
  estimatedCost: number;
  costBudget?: number;
  costPercent?: number;
  currency: string;
};

export type DelegationAgentSummary = {
  id: string;
  name: string;
  provider?: string;
  roles: string[];
  contextKinds: string[];
  allowNetwork: boolean;
  allowedShellCommands: string[];
  writeScopes: string[];
  secretRefs: string[];
};

export type DelegationPlanReport = {
  schemaVersion: DelegationPlanSchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  readyTaskCount: number;
  blockedTaskCount: number;
  plannedTasks: DelegationPlannedTask[];
  blockedTasks: DelegationBlockedTask[];
  policyFindings: DelegationPolicyFinding[];
  agentCapabilities: DelegationAgentSummary[];
  budget: DelegationBudgetSummary;
  nextActions: string[];
  markdown: string;
};
