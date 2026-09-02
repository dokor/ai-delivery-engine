/**
 * Public programmatic API of AI Delivery Engine.
 *
 * Every function here takes an explicit project root, returns data and throws
 * on failure. Nothing in this module reads `process.argv`, defaults to
 * `process.cwd()`, writes to a stream or sets an exit code — those are
 * entrypoint concerns, and keeping them out is what allows the CLI, the CI and
 * the MCP server to share one implementation with identical results.
 *
 * No AI provider is ever called from this API. Reviews are deterministic.
 */

// --- Configuration -----------------------------------------------------------
export { findConfigFile, hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
export { defaultConfigJson } from './config/defaultConfig.ts';
export type {
  AdeConfig,
  ConfigIssue,
  ConfigIssueSeverity,
  ConfigProvenanceEntry,
  ConfigResolution,
  ResolvedAdeConfig
} from './config/config.types.ts';

// --- GitHub delivery planning ------------------------------------------------
export { DELIVERY_PLAN_CONTRACT_VERSION, planDelivery } from './github/deliveryPlan.ts';
export type {
  DeliveryPlan,
  DeliveryPlanCapability,
  DeliveryPlanNegotiation,
  DeliveryPlanResult,
  PlanDeliveryOptions
} from './github/deliveryPlan.ts';

// --- Project context ---------------------------------------------------------
export { collectProjectContext, toRelativePath } from './context/collectContext.ts';
export { checkContext } from './context/checkContext.ts';
export { contextToJson, renderContextMarkdown, writeContext } from './context/renderContext.ts';
export { isIgnored } from './context/ignoreMatcher.ts';
export type {
  ContextCheckResult,
  ContextFreshness,
  ProjectContext
} from './context/context.types.ts';

// --- Context packs -----------------------------------------------------------
export { buildContextPack } from './contextpack/buildContextPack.ts';
export { assembleContextItems } from './contextpack/assembleItems.ts';
export { resolveMode } from './contextpack/modes.ts';

// --- Rules -------------------------------------------------------------------
export {
  activeRules,
  getAllPacks,
  getPack,
  listPackIds,
  resolveActivePacks
} from './rules/registry.ts';
export {
  buildActiveRulesReport,
  renderRulesReport,
  rulesReportToJson
} from './rules/renderRules.ts';
export { runDeterministicPackRules } from './rules/runRulePacks.ts';
export type { ActiveRulesReport } from './rules/renderRules.ts';
export type { PackRule, RulePack } from './rules/rulePack.types.ts';

// --- Review ------------------------------------------------------------------
export { reviewExitCode, runReview } from './engine/review.ts';
export { DEFAULT_REVIEW_IGNORES, runProjectReview } from './review/runProjectReview.ts';
export { renderReviewHuman, reviewToJson } from './engine/renderFindings.ts';
export { getChangedFiles } from './engine/gitScope.ts';
export { listProjectFiles } from './engine/projectFiles.ts';
export { summarizeFindings } from './engine/findings.types.ts';
export type {
  ProjectReviewOutcome,
  RunProjectReviewOptions
} from './review/runProjectReview.ts';
export type {
  Finding,
  FindingOrigin,
  FindingSeverity,
  FindingSummary,
  ReviewResult,
  ReviewScope
} from './engine/findings.types.ts';

// --- Project setup contract --------------------------------------------------
// The versioned answer to "what does a repository need to be ADE-ready?", plus
// the evaluation of one repository against it. Consumed by ade-control-plane.
export {
  getProjectSetupContract,
  getSetupRequirements,
  getSetupTemplate,
  projectSetupContractToJson
} from './setup/requirements.ts';
export { evaluateProjectSetup } from './setup/evaluate.ts';
export { writeProjectSetupEvaluation } from './setup/writer.ts';
export { PROJECT_SETUP_CONTRACT_VERSION } from './setup/setup.types.ts';
export type {
  EvaluateProjectSetupOptions,
  ProjectReadiness,
  ProjectSetupContract,
  ProjectSetupContractVersion,
  ProjectSetupEvaluation,
  ProjectSetupWrittenFiles,
  RequirementCriticality,
  RequirementEvaluation,
  RequirementKind,
  RequirementScope,
  RequirementStatus,
  RequirementTemplate,
  SetupRequirement
} from './setup/setup.types.ts';

// --- Diagnostics -------------------------------------------------------------
export { doctorExitCode, renderDoctorReport, runDoctor } from './doctor/runDoctor.ts';
export type {
  DoctorCheck,
  DoctorCheckStatus,
  DoctorReport,
  RunDoctorOptions
} from './doctor/runDoctor.ts';

// --- Mechanical fixes --------------------------------------------------------
export { renderFixReport, runFix } from './fix/runFix.ts';
export type { FixReport, PlannedFix, RunFixOptions } from './fix/runFix.ts';

// --- Package metadata --------------------------------------------------------
export { getAdeVersion } from './cli/packageInfo.ts';
export { assertSafePath } from './cli/assertSafePath.ts';
