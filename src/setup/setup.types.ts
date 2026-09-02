/**
 * ADE project setup contract — the single versioned source of truth describing
 * what a repository needs in order to be fully configured for ADE.
 *
 * Two objects live here, deliberately kept apart because they have different
 * lifetimes. The **contract** states what ADE requires and is versioned with
 * ADE, so a consumer may cache it for as long as the ADE version is unchanged.
 * The **evaluation** states how one repository scores against that contract and
 * is recomputed on every call.
 *
 * ADE is local-first and has no GitHub access, and never mutates a repository
 * from this domain. Requirements it cannot observe locally — GitHub labels,
 * issue templates on the remote, branch protection — are still declared, and
 * reported as `unverifiable` rather than missing. Reporting a label as absent
 * when ADE merely could not look would make a consumer act on a false negative.
 */

export const PROJECT_SETUP_CONTRACT_VERSION = 'ade.project-setup/v1' as const;

export type ProjectSetupContractVersion = typeof PROJECT_SETUP_CONTRACT_VERSION;

/** How much a requirement matters. Only `required` can hold a repository back. */
export type RequirementCriticality = 'required' | 'recommended' | 'optional';

/** What kind of thing a requirement describes. */
export type RequirementKind =
  | 'config-file'
  | 'agent-instructions'
  | 'documentation'
  | 'project-context'
  | 'rule-packs'
  | 'github-label'
  | 'issue-template'
  | 'environment';

/**
 * Where the requirement can be checked from.
 *
 * `local` is verified by reading the working tree. `github` needs data ADE does
 * not have; a consumer may supply it, otherwise the requirement is reported as
 * `unverifiable`.
 */
export type RequirementScope = 'local' | 'github';

/** A reference to content ADE owns, so a consumer never copies defaults. */
export type RequirementTemplate = {
  /** Stable identifier, resolvable through `getSetupTemplate`. */
  id: string;
  /** Where the content lives inside the published ADE package, when it is a file. */
  packagePath?: string;
  description: string;
};

export type SetupRequirement = {
  /** Stable id. Consumers key on this; renaming one is a contract change. */
  id: string;
  kind: RequirementKind;
  scope: RequirementScope;
  criticality: RequirementCriticality;
  title: string;
  /** What ADE needs, and why it needs it. */
  description: string;
  /** Repository-relative path, for file-backed requirements. */
  path?: string;
  /** Label name, for GitHub label requirements. */
  label?: string;
  /** What a consumer should do to satisfy it. */
  remediation: string;
  /** ADE-owned content that satisfies the requirement, when ADE ships one. */
  template?: RequirementTemplate;
};

/**
 * The contract itself: what ADE requires, with no repository involved.
 *
 * `adeVersion` is informational — the contract's compatibility is carried by
 * `version`. A consumer caches on `version`, not on `adeVersion`.
 */
export type ProjectSetupContract = {
  version: ProjectSetupContractVersion;
  adeVersion: string;
  /** Every requirement ADE knows about, in a stable order. */
  requirements: SetupRequirement[];
  /** Rule packs shipped by this ADE version, selectable through `packs`. */
  availableRulePacks: Array<{ id: string; title: string; description: string; ruleCount: number }>;
  /** Workflow labels ADE's supported GitHub issue loop relies on. */
  githubLabels: Array<{ name: string; description: string; criticality: RequirementCriticality }>;
  /** Issue templates ADE expects a consuming repository to provide. */
  issueTemplates: Array<{ path: string; description: string; criticality: RequirementCriticality }>;
};

/** Outcome of checking one requirement against a repository. */
export type RequirementStatus = 'satisfied' | 'unsatisfied' | 'unverifiable';

export type RequirementEvaluation = {
  id: string;
  kind: RequirementKind;
  criticality: RequirementCriticality;
  status: RequirementStatus;
  /** Why the requirement landed in this status, in one sentence. */
  detail: string;
  /** Present when the requirement is not satisfied and ADE can help. */
  remediation?: string;
  /** Present when ADE ships content that would satisfy it. */
  template?: RequirementTemplate;
};

/**
 * Overall readiness.
 *
 * `invalid` outranks everything: when the ADE configuration itself fails
 * validation, readiness cannot be assessed at all, and reporting `incomplete`
 * would suggest the repository is merely missing a file.
 */
export type ProjectReadiness = 'ready' | 'incomplete' | 'invalid';

/** A read-only ADE operation that has been resolved against this checkout. */
export type ExecutionCapabilityEvaluation = {
  id: 'issue-plan' | 'issue-enrichment' | 'delivery-plan' | 'deterministic-review' | 'profile-invocations';
  status: 'available' | 'missing';
  detail: string;
};

export type ProjectSetupEvaluation = {
  version: ProjectSetupContractVersion;
  adeVersion: string;
  generatedAt: string;
  /** Repository-relative marker, so a report can be traced back to its project. */
  projectName: string;
  readiness: ProjectReadiness;
  /** Populated when `readiness` is `invalid`. */
  configurationErrors: string[];
  requirements: RequirementEvaluation[];
  /** Ids of unmet required requirements, in contract order. */
  missingRequiredIds: string[];
  /** Ids of unmet recommended or optional requirements. */
  missingOptionalIds: string[];
  /** Ids ADE could not check locally; a consumer may resolve these itself. */
  unverifiableIds: string[];
  /** Capability verdicts derived from the resolved repository configuration. */
  executionCapabilities: ExecutionCapabilityEvaluation[];
  /** Exact unavailable execution capability ids, safe to persist and display. */
  missingExecutionCapabilityIds: string[];
  summaryLines: string[];
  markdown: string;
};

export type ProjectSetupWrittenFiles = {
  jsonPath: string;
  markdownPath: string;
};

/**
 * Input to an evaluation.
 *
 * `observedGithubLabels` is how a consumer with GitHub access — Control Plane
 * through its GitHub App — turns `unverifiable` label requirements into real
 * verdicts without ADE ever calling GitHub.
 */
export type EvaluateProjectSetupOptions = {
  /** Absolute path to the repository to evaluate. */
  projectRoot: string;
  /** Label names observed on the remote repository, when the caller knows them. */
  observedGithubLabels?: string[];
  /** Injectable clock, so reports are reproducible in tests and demos. */
  generatedAt?: string;
};
