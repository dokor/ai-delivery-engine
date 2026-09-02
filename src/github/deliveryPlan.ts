import type { AdeProfile, ResolvedAdeConfig } from '../config/config.types.ts';
import { planIssueLifecycle, type IssueLifecycleMetadata, type IssueLifecyclePlan } from './issueLifecycle.ts';
import type { GitHubIssue } from './github.types.ts';

/** The stable ADE-to-scheduler delivery-plan contract. */
export const DELIVERY_PLAN_CONTRACT_VERSION = 'ade.delivery-plan/v1' as const;

const DELIVERY_PLAN_CAPABILITIES = [
  'issue-lifecycle',
  'implementation-context',
  'deterministic-validation',
  'specialist-review',
  'correction-and-rereview',
  'human-publication-gate',
  'safe-provenance'
] as const;

export type DeliveryPlanCapability = typeof DELIVERY_PLAN_CAPABILITIES[number];

export interface DeliveryPlanNegotiation {
  /** Contract versions the caller can parse, in preference order. */
  acceptedVersions?: string[];
  /** Capabilities the caller needs ADE to supply. */
  requiredCapabilities?: string[];
}

export interface DeliveryPlanProvenance {
  configSources: string[];
  configKeys: string[];
  profileIds: string[];
  ruleIds: string[];
  packIds: string[];
}

export interface DeliveryPlan {
  lifecycle: Pick<IssueLifecyclePlan, 'stage' | 'action' | 'reason' | 'metadata'>;
  enrichment: { profile: string; reason: string } | null;
  implementation: { profile: string; mode: 'deterministic' | 'assisted'; context: 'compact' | 'full'; providerAllowed: boolean };
  validations: Array<{ ruleId: string; severity: 'info' | 'warn' | 'error'; appliesTo: string[] }>;
  reviews: Array<{ profile: string; mode: 'deterministic' | 'assisted'; providerAllowed: boolean; reason: string }>;
  correction: { maximumAttempts: number; reReview: boolean };
  humanGates: Array<{ id: 'accept-enrichment' | 'approve-specialist-review' | 'approve-publication'; required: boolean; reason: string }>;
  publication: { ready: boolean; reason: string };
  provenance: DeliveryPlanProvenance;
}

export interface DeliveryPlanSupportedResult {
  version: typeof DELIVERY_PLAN_CONTRACT_VERSION;
  status: 'supported';
  negotiation: { selectedVersion: typeof DELIVERY_PLAN_CONTRACT_VERSION; capabilities: readonly DeliveryPlanCapability[] };
  plan: DeliveryPlan;
}

export interface DeliveryPlanUnsupportedResult {
  version: typeof DELIVERY_PLAN_CONTRACT_VERSION;
  status: 'unsupported';
  negotiation: { selectedVersion: null; capabilities: readonly DeliveryPlanCapability[] };
  reason: { code: 'NO_MUTUAL_CONTRACT_VERSION' | 'MISSING_REQUIRED_CAPABILITY' | 'MISSING_DELIVERY_PLAN_POLICY' | 'UNKNOWN_PROFILE' | 'UNKNOWN_RULE'; message: string };
  plan: null;
}

export type DeliveryPlanResult = DeliveryPlanSupportedResult | DeliveryPlanUnsupportedResult;

export interface PlanDeliveryOptions {
  issue: GitHubIssue;
  metadata?: Partial<IssueLifecycleMetadata> | null;
  configuration: ResolvedAdeConfig;
  negotiation?: DeliveryPlanNegotiation;
  provenance?: Pick<DeliveryPlanProvenance, 'configSources' | 'configKeys'>;
}

/**
 * Produces ADE's bounded, provider-neutral delivery decision.  It deliberately
 * never scans issue text to choose implementation or review profiles: those
 * choices are made by the repository's `issueLifecycle.deliveryPlan` policy.
 */
export function planDelivery(options: PlanDeliveryOptions): DeliveryPlanResult {
  const incompatible = incompatibleNegotiation(options.negotiation);
  if (incompatible) return unsupported(incompatible.code, incompatible.message);

  const policy = options.configuration.issueLifecycle.deliveryPlan;
  if (!policy?.implementationProfile) {
    return unsupported('MISSING_DELIVERY_PLAN_POLICY', 'The repository must set issueLifecycle.deliveryPlan.implementationProfile before ADE can advertise a delivery plan.');
  }
  const implementation = options.configuration.profiles[policy.implementationProfile];
  if (!implementation) return unsupported('UNKNOWN_PROFILE', `The implementation profile "${policy.implementationProfile}" is not defined in profiles.`);

  const reviewProfileIds = policy.reviewProfiles ?? [];
  for (const profileId of reviewProfileIds) {
    if (!options.configuration.profiles[profileId]) return unsupported('UNKNOWN_PROFILE', `The review profile "${profileId}" is not defined in profiles.`);
  }

  const configuredRules = new Map(options.configuration.rules.map((rule) => [rule.id, rule]));
  const validationRuleIds = policy.validationRuleIds ?? options.configuration.rules.map((rule) => rule.id);
  for (const ruleId of validationRuleIds) {
    if (!configuredRules.has(ruleId)) return unsupported('UNKNOWN_RULE', `The validation rule "${ruleId}" is not defined in rules.`);
  }

  const lifecycle = planIssueLifecycle({ issue: options.issue, metadata: options.metadata, configuration: options.configuration.issueLifecycle });
  const enrichment = lifecycle.action === 'enrich' && lifecycle.enrichmentProfile
    ? { profile: lifecycle.enrichmentProfile, reason: lifecycle.reason }
    : null;
  const reviews = reviewProfileIds.map((profileId) => profileInvocation(profileId, options.configuration.profiles[profileId]!));
  const publicationReady = lifecycle.action === 'develop';
  const requireApproval = policy.requireHumanApprovalBeforePublish !== false;
  const provenance = buildProvenance(options, policy.implementationProfile, reviewProfileIds, validationRuleIds);

  return {
    version: DELIVERY_PLAN_CONTRACT_VERSION,
    status: 'supported',
    negotiation: { selectedVersion: DELIVERY_PLAN_CONTRACT_VERSION, capabilities: DELIVERY_PLAN_CAPABILITIES },
    plan: {
      lifecycle: { stage: lifecycle.stage, action: lifecycle.action, reason: lifecycle.reason, metadata: lifecycle.metadata },
      enrichment,
      implementation: implementationInvocation(policy.implementationProfile, implementation),
      validations: validationRuleIds.map((ruleId) => {
        const rule = configuredRules.get(ruleId)!;
        return { ruleId, severity: rule.severity ?? 'error', appliesTo: [...(rule.appliesTo ?? [])] };
      }),
      reviews,
      correction: { maximumAttempts: policy.maxCorrectionAttempts ?? 1, reReview: reviews.length > 0 },
      humanGates: [
        { id: 'accept-enrichment', required: lifecycle.action === 'enrich', reason: lifecycle.action === 'enrich' ? 'A human must accept issue enrichment before development.' : 'No enrichment is pending.' },
        { id: 'approve-specialist-review', required: reviews.length > 0, reason: reviews.length > 0 ? 'Specialist review output remains human-reviewed.' : 'No specialist review profiles are configured.' },
        { id: 'approve-publication', required: requireApproval, reason: requireApproval ? 'ADE never publishes generated work without an explicit human approval.' : 'Publication is still an external scheduler decision; ADE does not publish.' }
      ],
      publication: {
        ready: publicationReady && !requireApproval,
        reason: publicationReady
          ? (requireApproval ? 'Implementation may begin, but publication still requires human approval.' : 'Implementation context is ready; publication remains controlled by the caller.')
          : 'The issue is not admitted to development yet.'
      },
      provenance
    }
  };
}

function incompatibleNegotiation(negotiation: DeliveryPlanNegotiation | undefined): { code: 'NO_MUTUAL_CONTRACT_VERSION' | 'MISSING_REQUIRED_CAPABILITY'; message: string } | null {
  if (negotiation?.acceptedVersions && !negotiation.acceptedVersions.includes(DELIVERY_PLAN_CONTRACT_VERSION)) {
    return { code: 'NO_MUTUAL_CONTRACT_VERSION', message: `The caller does not accept ${DELIVERY_PLAN_CONTRACT_VERSION}.` };
  }
  const unsupportedCapability = negotiation?.requiredCapabilities?.find((capability) => !DELIVERY_PLAN_CAPABILITIES.includes(capability as DeliveryPlanCapability));
  if (unsupportedCapability) return { code: 'MISSING_REQUIRED_CAPABILITY', message: `ADE ${DELIVERY_PLAN_CONTRACT_VERSION} does not provide required capability "${unsupportedCapability}".` };
  return null;
}

function unsupported(code: DeliveryPlanUnsupportedResult['reason']['code'], message: string): DeliveryPlanUnsupportedResult {
  return { version: DELIVERY_PLAN_CONTRACT_VERSION, status: 'unsupported', negotiation: { selectedVersion: null, capabilities: DELIVERY_PLAN_CAPABILITIES }, reason: { code, message }, plan: null };
}

function implementationInvocation(profile: string, value: AdeProfile): DeliveryPlan['implementation'] {
  return { profile, mode: value.mode ?? 'deterministic', context: value.context ?? 'compact', providerAllowed: value.allowProvider === true };
}

function profileInvocation(profile: string, value: AdeProfile): DeliveryPlan['reviews'][number] {
  return { profile, mode: value.mode ?? 'deterministic', providerAllowed: value.allowProvider === true, reason: 'Selected by issueLifecycle.deliveryPlan.reviewProfiles.' };
}

function buildProvenance(options: PlanDeliveryOptions, implementationProfile: string, reviewProfileIds: string[], ruleIds: string[]): DeliveryPlanProvenance {
  return {
    configSources: [...(options.provenance?.configSources ?? [])],
    configKeys: [...(options.provenance?.configKeys ?? ['issueLifecycle.deliveryPlan'])],
    profileIds: [implementationProfile, ...reviewProfileIds],
    ruleIds: [...ruleIds],
    packIds: [...options.configuration.packs]
  };
}
