import type { ParsedBrief } from '../briefs/brief.types.ts';

export const DELIVERY_PLAN_SCHEMA_VERSION = 1;

export type BlueprintProjectKind = 'marketing-site' | 'web-saas';
export type DeliveryNodeKind =
  | 'discovery'
  | 'architecture'
  | 'implementation'
  | 'validation'
  | 'release';

export interface DeliveryBlueprint {
  id: string;
  name: string;
  projectKind: BlueprintProjectKind;
  description: string;
  profiles: string[];
  defaultGates: string[];
  defaultArtifacts: string[];
}

export interface DeliveryGate {
  id: string;
  title: string;
  required: boolean;
}

export interface DeliveryGraphNode {
  id: string;
  title: string;
  kind: DeliveryNodeKind;
  role: string;
  dependsOn: string[];
  inputs: string[];
  outputs: string[];
  artifacts: string[];
  permissions: string[];
  gate?: DeliveryGate;
}

export interface DeliveryDecision {
  id: string;
  question: string;
  options: string[];
  recommendation: string;
  status: 'pending' | 'accepted';
  selectedOption?: string;
}

export interface HumanPlanDecision {
  decisionId: string;
  selectedOption: string;
}

export interface DeliveryBacklogTrace {
  nodeId: string;
  suggestedIssueTitle: string;
  ownerRole: string;
  dependsOn: string[];
}

export interface DeliveryGraphValidation {
  valid: boolean;
  errors: string[];
}

export interface DeliveryPlan {
  schemaVersion: typeof DELIVERY_PLAN_SCHEMA_VERSION;
  projectName: string;
  sourceBrief: string;
  normalizedBrief: Pick<
    ParsedBrief,
    'title' | 'summary' | 'goals' | 'audience' | 'pages' | 'constraints' | 'successCriteria' | 'mode'
  >;
  selectedBlueprint: DeliveryBlueprint;
  alternatives: DeliveryBlueprint[];
  assumptions: string[];
  risks: string[];
  decisions: DeliveryDecision[];
  graph: DeliveryGraphNode[];
  deliveryOrder: string[];
  backlogTrace: DeliveryBacklogTrace[];
  validation: DeliveryGraphValidation;
  validationPlan: string[];
}

