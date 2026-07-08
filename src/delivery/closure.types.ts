export const DELIVERY_CLOSURE_SCHEMA_VERSION = 1 as const;

export type DeliveryClosureSchemaVersion = typeof DELIVERY_CLOSURE_SCHEMA_VERSION;

export type DeliveryClosureStatus = 'completed' | 'waiting';

export type DeliveryEnvironmentStatus = 'validated' | 'pending' | 'missing' | 'exception';

export type DeliveryValidationStatus = 'passed' | 'failed' | 'skipped';

export type DeliveryDecisionStatus = 'approved' | 'pending' | 'rejected';

export type DeliveryEvidenceKind =
  | 'repository'
  | 'branch'
  | 'commit'
  | 'pull-request'
  | 'release'
  | 'staging'
  | 'production'
  | 'validation'
  | 'decision'
  | 'budget'
  | 'artifact';

export type DeliveryRepository = {
  url?: string;
  branch?: string;
  commit?: string;
  pullRequestUrl?: string;
  releaseUrl?: string;
  access?: 'verified' | 'pending' | 'missing';
};

export type DeliveryEnvironment = {
  url?: string;
  status: DeliveryEnvironmentStatus;
  decisionId?: string;
  exceptionReason?: string;
};

export type DeliveryValidation = {
  name: string;
  status: DeliveryValidationStatus;
  evidenceRef?: string;
  decisionId?: string;
  details?: string;
};

export type DeliveryDecision = {
  id: string;
  status: DeliveryDecisionStatus;
  summary: string;
};

export type DeliveryArtifact = {
  title: string;
  path?: string;
  url?: string;
  kind: 'architecture' | 'runbook' | 'monitoring' | 'rollback' | 'release-note' | 'other';
  sensitive?: boolean;
};

export type DeliveryVariable = {
  name: string;
  required?: boolean;
  description?: string;
  sensitive?: boolean;
  value?: string;
};

export type DeliveryBudgetEntry = {
  label: string;
  amount?: number;
  unit?: string;
  recurring?: boolean;
  note?: string;
};

export type DeliveryEvidence = {
  id: string;
  kind: DeliveryEvidenceKind;
  label: string;
  url?: string;
  ref?: string;
  sensitive?: boolean;
};

export type DeliveryOperations = {
  architecture?: string;
  localRunbook?: string;
  deployment?: string;
  monitoring?: string;
  rollback?: string;
  variables?: DeliveryVariable[];
};

export type DeliveryClosureInput = {
  schemaVersion: DeliveryClosureSchemaVersion;
  runId: string;
  projectName: string;
  repository?: DeliveryRepository;
  staging?: DeliveryEnvironment;
  production?: DeliveryEnvironment;
  validations?: DeliveryValidation[];
  decisions?: DeliveryDecision[];
  artifacts?: DeliveryArtifact[];
  operations?: DeliveryOperations;
  budgets?: DeliveryBudgetEntry[];
  risks?: string[];
  manualActions?: string[];
  evidence?: DeliveryEvidence[];
};

export type DeliveryClosureResult = {
  schemaVersion: DeliveryClosureSchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  status: DeliveryClosureStatus;
  completedItems: string[];
  missingEvidence: string[];
  nextActions: string[];
  repository: DeliveryRepository;
  staging?: DeliveryEnvironment;
  production?: DeliveryEnvironment;
  validations: DeliveryValidation[];
  decisions: DeliveryDecision[];
  artifacts: DeliveryArtifact[];
  operations: DeliveryOperations;
  budgets: DeliveryBudgetEntry[];
  risks: string[];
  manualActions: string[];
  evidence: DeliveryEvidence[];
  notification: string;
  opsDossier: string;
};
