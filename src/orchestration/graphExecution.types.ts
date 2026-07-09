export const GRAPH_EXECUTION_SCHEMA_VERSION = 1 as const;

export type GraphExecutionSchemaVersion = typeof GRAPH_EXECUTION_SCHEMA_VERSION;
export type GraphNodePriority = 'high' | 'medium' | 'low';
export type GraphGateStatus = 'passed' | 'failed' | 'pending' | 'missing';
export type GraphDecisionStatus = 'pending' | 'approved' | 'rejected';

export type GraphExecutionBudget = {
  tokenBudget?: number;
  costBudget?: number;
  currency?: string;
};

export type GraphProviderCapability = {
  id: string;
  name: string;
  roles: string[];
  mock?: boolean;
};

export type GraphGate = {
  id: string;
  status: GraphGateStatus;
  summary?: string;
};

export type GraphHumanDecision = {
  id: string;
  status: GraphDecisionStatus;
  summary: string;
};

export type GraphNodeInput = {
  id: string;
  title: string;
  role: string;
  providerId: string;
  priority: GraphNodePriority;
  dependsOn: string[];
  requiredGateIds: string[];
  decisionIds: string[];
  inputRefs: string[];
  expectedOutputs: string[];
  mockOutput: string;
  estimatedTokens?: number;
  estimatedCost?: number;
};

export type GraphExecutionInput = {
  schemaVersion: GraphExecutionSchemaVersion;
  runId: string;
  projectName: string;
  blueprintVersion: string;
  completedNodeIds: string[];
  providers: GraphProviderCapability[];
  gates: GraphGate[];
  decisions: GraphHumanDecision[];
  nodes: GraphNodeInput[];
  budget?: GraphExecutionBudget;
};

export type GraphExecutedOutput = {
  ref: string;
  label: string;
  runId: string;
  blueprintVersion: string;
  nodeId: string;
};

export type GraphExecutedNode = {
  order: number;
  id: string;
  title: string;
  role: string;
  providerId: string;
  providerName: string;
  mock: boolean;
  inputRefs: string[];
  outputs: GraphExecutedOutput[];
  estimatedTokens?: number;
  estimatedCost?: number;
};

export type GraphBlockedNode = {
  id: string;
  title: string;
  reasons: string[];
  nextActions: string[];
};

export type GraphResumedNode = {
  id: string;
  title: string;
  reason: string;
};

export type GraphHandoff = {
  fromNodeId: string;
  toNodeId: string;
  outputRefs: string[];
  summary: string;
};

export type GraphExecutionBudgetSummary = {
  tokensUsed: number;
  tokenBudget?: number;
  tokenPercent?: number;
  estimatedCost: number;
  costBudget?: number;
  costPercent?: number;
  currency: string;
};

export type GraphExecutionReport = {
  schemaVersion: GraphExecutionSchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  blueprintVersion: string;
  executedNodeCount: number;
  blockedNodeCount: number;
  resumedNodeCount: number;
  executedNodes: GraphExecutedNode[];
  blockedNodes: GraphBlockedNode[];
  resumedNodes: GraphResumedNode[];
  handoffs: GraphHandoff[];
  budget: GraphExecutionBudgetSummary;
  providerTrace: GraphProviderCapability[];
  nextActions: string[];
  markdown: string;
};
