import type { ContextPack } from '../contextpack/contextPack.types.ts';

export const AGENT_EXECUTION_SCHEMA_VERSION = 1;

export type AgentExecutionStatus =
  | 'succeeded'
  | 'timed_out'
  | 'tool_error'
  | 'permission_denied'
  | 'agent_error';

export interface AgentDescriptor {
  id: string;
  provider: string;
  role?: string;
}

export interface TaskSpecification {
  id: string;
  title: string;
  acceptanceCriteria: string[];
}

export interface HarnessPermissions {
  shell: boolean;
  network: boolean;
  github: boolean;
  allowedTools: string[];
}

export interface WorkspaceContract {
  root: string;
  isolation: 'current-worktree' | 'dedicated-worktree' | 'temporary-copy';
  writable: boolean;
}

export interface StopConditions {
  timeoutMs: number;
  maxToolCalls?: number;
}

export interface ValidationContract {
  commands: string[];
  requiredArtifacts?: string[];
}

export interface AgentExecutionRequest {
  schemaVersion: typeof AGENT_EXECUTION_SCHEMA_VERSION;
  runId: string;
  nodeId: string;
  agent: AgentDescriptor;
  task: TaskSpecification;
  contextPack: ContextPack;
  permissions: HarnessPermissions;
  workspace: WorkspaceContract;
  stopConditions: StopConditions;
  validation: ValidationContract;
}

export interface AgentCommandRecord {
  tool: string;
  status: number;
  ok: boolean;
}

export interface AgentValidationRecord {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  detail: string;
}

export interface AgentArtifactRecord {
  path: string;
  kind: 'context-pack' | 'log' | 'diff' | 'result' | 'other';
  description?: string;
}

export interface AgentUsageRecord {
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}

export interface AgentExecutionResult {
  schemaVersion: typeof AGENT_EXECUTION_SCHEMA_VERSION;
  runId: string;
  nodeId: string;
  agent: AgentDescriptor;
  status: AgentExecutionStatus;
  summary: string;
  modifications: string[];
  commands: AgentCommandRecord[];
  validations: AgentValidationRecord[];
  artifacts: AgentArtifactRecord[];
  usage?: AgentUsageRecord;
  blockers: string[];
  nextAction: string;
  contextManifest: ContextPack['manifest'];
}

export interface AgentDraftResult {
  summary: string;
  modifications?: string[];
  artifacts?: AgentArtifactRecord[];
  usage?: AgentUsageRecord;
  nextAction?: string;
}
