import type {
  AgentDescriptor,
  AgentExecutionResult,
  AgentUsageRecord,
  HarnessPermissions,
  TaskSpecification,
  ValidationContract,
  WorkspaceContract
} from '../harness/execution.types.ts';

export const EXECUTION_LOOP_SCHEMA_VERSION = 1 as const;

export type ExecutionLoopSchemaVersion = typeof EXECUTION_LOOP_SCHEMA_VERSION;
export type ExecutionLoopType = 'framing' | 'design' | 'development' | 'review' | 'deployment';
export type ExecutionLoopTerminalStatus = 'success' | 'blocked' | 'failed' | 'cancelled';
export type ExecutionLoopAttemptStatus = 'succeeded' | 'needs_correction' | 'failed' | 'timed_out' | 'blocked';
export type ExecutionLoopStopReason =
  | 'goal_satisfied'
  | 'trigger_not_ready'
  | 'human_decision_required'
  | 'max_attempts_reached'
  | 'budget_exceeded'
  | 'timeout'
  | 'uncorrectable_failure'
  | 'cancelled';

export type ExecutionLoopTrigger = {
  ready: boolean;
  reason: string;
};

export type ExecutionLoopGoal = {
  summary: string;
  successCriteria: string[];
};

export type ExecutionLoopMemory = {
  contextRefs: string[];
  artifacts: string[];
  diagnostics: string[];
};

export type ExecutionLoopStopConditions = {
  timeoutMs: number;
  maxAttempts: number;
  maxToolCalls?: number;
  tokenBudget?: number;
  costBudget?: number;
};

export type ExecutionLoopCorrectionPolicy = {
  enabled: boolean;
  maxCorrections: number;
  requireTargetedDiagnostic: boolean;
};

export type ExecutionLoopValidationResultPlan = {
  tool: string;
  status: number;
  ok: boolean;
};

export type ExecutionLoopAttemptPlan = {
  id: string;
  summary: string;
  diagnostic?: string;
  agentDelayMs?: number;
  agentError?: string;
  usage?: AgentUsageRecord;
  validations: ExecutionLoopValidationResultPlan[];
};

export type ExecutionLoopInput = {
  schemaVersion: ExecutionLoopSchemaVersion;
  runId: string;
  projectName: string;
  loopId: string;
  nodeId: string;
  loopType: ExecutionLoopType;
  trigger: ExecutionLoopTrigger;
  goal: ExecutionLoopGoal;
  agent: AgentDescriptor;
  task: TaskSpecification;
  memory: ExecutionLoopMemory;
  permissions: HarnessPermissions;
  workspace: WorkspaceContract;
  stopConditions: ExecutionLoopStopConditions;
  validation: ValidationContract;
  correctionPolicy: ExecutionLoopCorrectionPolicy;
  attemptPlans: ExecutionLoopAttemptPlan[];
};

export type ExecutionLoopCorrection = {
  attempt: number;
  fromAttemptId: string;
  targetedTools: string[];
  diagnostic: string;
  contextRef: string;
};

export type ExecutionLoopAttempt = {
  attempt: number;
  id: string;
  status: ExecutionLoopAttemptStatus;
  summary: string;
  diagnostic?: string;
  targetedCorrection?: ExecutionLoopCorrection;
  harnessResult: AgentExecutionResult;
};

export type ExecutionLoopBudgetSummary = {
  tokensUsed: number;
  tokenBudget?: number;
  tokenPercent?: number;
  estimatedCost: number;
  costBudget?: number;
  costPercent?: number;
  currency: string;
};

export type ExecutionLoopHumanRequest = {
  nodeId: string;
  question: string;
  reason: string;
  options: string[];
};

export type ExecutionLoopProjectRunUpdate = {
  runId: string;
  nodeId: string;
  status: 'completed' | 'blocked' | 'failed' | 'cancelled';
  summary: string;
  attemptCount: number;
  nextAction: string;
};

export type ExecutionLoopReport = {
  schemaVersion: ExecutionLoopSchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  loopId: string;
  nodeId: string;
  loopType: ExecutionLoopType;
  status: ExecutionLoopTerminalStatus;
  stopReason: ExecutionLoopStopReason;
  goal: ExecutionLoopGoal;
  attempts: ExecutionLoopAttempt[];
  corrections: ExecutionLoopCorrection[];
  budget: ExecutionLoopBudgetSummary;
  humanRequest?: ExecutionLoopHumanRequest;
  projectRunUpdate: ExecutionLoopProjectRunUpdate;
  nextAction: string;
  markdown: string;
};
