export const QUALITY_GATE_SCHEMA_VERSION = 1 as const;

export type QualityGateSchemaVersion = typeof QUALITY_GATE_SCHEMA_VERSION;

export type QualityGateTarget = 'staging' | 'production';
export type QualityGateVerdict = 'pass' | 'fail' | 'override-required';
export type QualitySignalKind = 'tool' | 'ade-rule' | 'specialist-check' | 'ai-review';
export type QualitySignalStatus = 'passed' | 'failed' | 'warning' | 'skipped';
export type QualitySeverity = 'info' | 'warning' | 'error' | 'critical';

export type QualityProfile = {
  role: string;
  required?: boolean;
  measured?: boolean;
  note?: string;
};

export type QualityEvidence = {
  label: string;
  url?: string;
  path?: string;
  log?: string;
  sensitive?: boolean;
};

export type QualitySignal = {
  id: string;
  name: string;
  kind: QualitySignalKind;
  status: QualitySignalStatus;
  severity?: QualitySeverity;
  profile?: string;
  tool?: string;
  provider?: string;
  executed?: boolean;
  blocking?: boolean;
  summary?: string;
  evidence?: QualityEvidence[];
};

export type QualityGatePolicy = {
  target: QualityGateTarget;
  requiredSignalIds?: string[];
  requiredProfiles?: string[];
  blockingSeverities?: QualitySeverity[];
  allowHumanOverride?: boolean;
};

export type QualityGateOverride = {
  approved: boolean;
  by: string;
  at: string;
  reason: string;
  appliesTo: string[];
};

export type QualityRevalidationCycle = {
  id: string;
  status: 'open' | 'revalidated';
  rejectedAt?: string;
  reason: string;
  fixes?: string[];
  revalidatedSignalIds?: string[];
};

export type QualityGateInput = {
  schemaVersion: QualityGateSchemaVersion;
  runId: string;
  projectName: string;
  target: QualityGateTarget;
  generatedAt?: string;
  policy: QualityGatePolicy;
  profiles: QualityProfile[];
  signals: QualitySignal[];
  overrides?: QualityGateOverride[];
  revalidationCycles?: QualityRevalidationCycle[];
};

export type QualityGateFinding = {
  id: string;
  signalId?: string;
  severity: QualitySeverity;
  blocking: boolean;
  origin: 'deterministic' | 'ai';
  message: string;
};

export type QualityGateReport = {
  schemaVersion: QualityGateSchemaVersion;
  generatedAt: string;
  runId: string;
  projectName: string;
  target: QualityGateTarget;
  verdict: QualityGateVerdict;
  overrideUsed: boolean;
  profiles: QualityProfile[];
  executedTools: string[];
  deterministicResults: QualitySignal[];
  aiResults: QualitySignal[];
  findings: QualityGateFinding[];
  recommendations: string[];
  nextActions: string[];
  overrides: QualityGateOverride[];
  revalidationCycles: QualityRevalidationCycle[];
  markdown: string;
};
