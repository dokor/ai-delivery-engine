import { access, stat } from 'node:fs/promises';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

import { getAdeVersion } from '../cli/packageInfo.ts';
import type { ConfigResolution } from '../config/config.types.ts';
import { resolveConfig } from '../config/loadConfig.ts';
import { checkContext } from '../context/checkContext.ts';
import { runDoctor, type DoctorReport } from '../doctor/runDoctor.ts';
import { getSetupRequirements } from './requirements.ts';
import {
  PROJECT_SETUP_CONTRACT_VERSION,
  SETUP_CAPABILITY_SNAPSHOT_VERSION,
  type DeclaredSkillEvaluation,
  type EvaluateProjectSetupOptions,
  type ExecutionCapabilityEvaluation,
  type ProjectReadiness,
  type ProjectSetupEvaluation,
  type RequirementEvaluation,
  type RequirementStatus,
  type SetupCapabilityEvaluation,
  type SetupCapabilitySnapshot,
  type SetupRequirement
} from './setup.types.ts';

/**
 * Evaluates a repository against the ADE project setup contract.
 *
 * Every environment and configuration check delegates to the command that
 * already owns it — `resolveConfig`, `checkContext`, `runDoctor` — so this
 * domain never becomes a second, diverging implementation of `ade doctor`.
 *
 * Nothing here writes to the evaluated repository or calls the network.
 */

async function pathExists(candidate: string): Promise<boolean> {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(candidate: string): Promise<boolean> {
  try {
    return (await stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

interface Verdict {
  status: RequirementStatus;
  detail: string;
}

function satisfied(detail: string): Verdict {
  return { status: 'satisfied', detail };
}

function unsatisfied(detail: string): Verdict {
  return { status: 'unsatisfied', detail };
}

function unverifiable(detail: string): Verdict {
  return { status: 'unverifiable', detail };
}

interface EvaluationContext {
  projectRoot: string;
  resolution: ConfigResolution;
  doctor: DoctorReport;
  contextState: string;
  observedGithubLabels?: string[];
}

/** Checks one requirement. Unknown ids are reported rather than silently passed. */
async function evaluateRequirement(
  requirement: SetupRequirement,
  context: EvaluationContext
): Promise<Verdict> {
  const { projectRoot, resolution, doctor } = context;

  switch (requirement.id) {
    case 'config.ade-config': {
      const present = await pathExists(resolve(projectRoot, 'ade.config.json'));
      return present
        ? satisfied('ade.config.json is present.')
        : unsatisfied('No ade.config.json at the repository root.');
    }

    case 'config.valid': {
      const errors = resolution.issues.filter((issue) => issue.severity === 'error');
      return errors.length === 0
        ? satisfied(`Configuration resolves cleanly from ${resolution.sources.length} source(s).`)
        : unsatisfied(`${errors.length} configuration error(s): ${errors.map((e) => e.code).join(', ')}.`);
    }

    case 'context.generated': {
      if (context.contextState === 'up-to-date') {
        return satisfied('Project context is generated and up to date.');
      }
      return unsatisfied(
        context.contextState === 'absent'
          ? 'No project context has been generated.'
          : 'Project context is stale: sources, rules or configuration changed since it was generated.'
      );
    }

    case 'agent.instructions': {
      for (const candidate of ['CLAUDE.md', 'AGENTS.md']) {
        if (await pathExists(resolve(projectRoot, candidate))) {
          return satisfied(`${candidate} is present.`);
        }
      }
      return unsatisfied('Neither CLAUDE.md nor AGENTS.md is present at the repository root.');
    }

    case 'docs.readme': {
      const present = await pathExists(resolve(projectRoot, 'README.md'));
      return present ? satisfied('README.md is present.') : unsatisfied('No README.md at the repository root.');
    }

    case 'docs.directory': {
      const docsDir = resolution.config.context.docsDir ?? 'docs';
      const present = await directoryExists(resolve(projectRoot, docsDir));
      return present
        ? satisfied(`Documentation directory "${docsDir}" exists.`)
        : unsatisfied(`Configured documentation directory "${docsDir}" does not exist.`);
    }

    case 'docs.decisions': {
      const adrDir = resolution.config.context.adrDir ?? 'docs/DECISIONS';
      const present = await directoryExists(resolve(projectRoot, adrDir));
      return present
        ? satisfied(`ADR directory "${adrDir}" exists.`)
        : unsatisfied(`Configured ADR directory "${adrDir}" does not exist.`);
    }

    case 'rules.packs-selected': {
      const packs = resolution.config.packs;
      return packs.length > 0
        ? satisfied(`${packs.length} rule pack(s) enabled: ${packs.join(', ')}.`)
        : unsatisfied('No rule pack is enabled in the configuration.');
    }

    case 'env.node-version': {
      const check = doctor.checks.find((candidate) => candidate.name === 'Node version');
      if (!check) {
        return unverifiable('Doctor did not report a Node version check.');
      }
      return check.status === 'fail' ? unsatisfied(check.detail) : satisfied(check.detail);
    }

    case 'env.tools-available': {
      const check = doctor.checks.find((candidate) => candidate.name === 'Tools');
      if (!check) {
        return unverifiable('Doctor did not report a tools check.');
      }
      return check.status === 'fail' ? unsatisfied(check.detail) : satisfied(check.detail);
    }

    default:
      break;
  }

  if (requirement.kind === 'github-label') {
    const label = requirement.label ?? '';
    if (!context.observedGithubLabels) {
      // ADE has no GitHub access. Saying "missing" here would be a false
      // negative and would have a consumer create labels that already exist.
      return unverifiable(
        `ADE cannot read repository labels. Supply observedGithubLabels to have "${label}" evaluated.`
      );
    }
    return context.observedGithubLabels.includes(label)
      ? satisfied(`Label "${label}" exists on the repository.`)
      : unsatisfied(`Label "${label}" is missing from the repository.`);
  }

  if (requirement.path) {
    const present = await pathExists(resolve(projectRoot, requirement.path));
    return present
      ? satisfied(`${requirement.path} is present.`)
      : unsatisfied(`${requirement.path} is missing.`);
  }

  return unverifiable(`No local check is defined for requirement "${requirement.id}".`);
}

function deriveReadiness(
  evaluations: RequirementEvaluation[],
  configurationErrors: string[]
): ProjectReadiness {
  // An unusable configuration outranks everything: readiness cannot be assessed
  // at all, and reporting `incomplete` would suggest a mere missing file.
  if (configurationErrors.length > 0) {
    return 'invalid';
  }

  const missingRequired = evaluations.some(
    (evaluation) => evaluation.criticality === 'required' && evaluation.status === 'unsatisfied'
  );
  return missingRequired ? 'incomplete' : 'ready';
}

function resolveExecutionCapabilities(resolution: ConfigResolution): ExecutionCapabilityEvaluation[] {
  const configured = resolution.issues.every((issue) => issue.severity !== 'error');
  const profiles = resolution.config.profiles;
  const lifecycle = resolution.config.issueLifecycle;
  const delivery = lifecycle.deliveryPlan;
  const implementationProfile = delivery?.implementationProfile;
  const deliveryPlanAvailable = configured && Boolean(implementationProfile && profiles[implementationProfile]);
  const enrichmentProfile = lifecycle.enrichment?.profile;
  const enrichmentAvailable = configured && lifecycle.enrichment?.enabled === true && Boolean(enrichmentProfile && profiles[enrichmentProfile]);
  return [
    { id: 'issue-plan', status: configured ? 'available' : 'missing', detail: configured ? 'ADE can resolve the repository issue lifecycle.' : 'Resolve ADE configuration errors before planning issues.' },
    { id: 'issue-enrichment', status: enrichmentAvailable ? 'available' : 'missing', detail: enrichmentAvailable ? 'The configured enrichment profile is resolvable.' : 'Configure issueLifecycle.enrichment with an existing profile to enable enrichment.' },
    { id: 'delivery-plan', status: deliveryPlanAvailable ? 'available' : 'missing', detail: deliveryPlanAvailable ? 'The configured implementation profile is resolvable.' : 'Configure issueLifecycle.deliveryPlan.implementationProfile with an existing profile.' },
    { id: 'deterministic-review', status: configured ? 'available' : 'missing', detail: configured ? 'ADE deterministic staged review is available.' : 'Resolve ADE configuration errors before deterministic review.' },
    { id: 'profile-invocations', status: deliveryPlanAvailable ? 'available' : 'missing', detail: deliveryPlanAvailable ? 'ADE can provide review and correction profile invocations.' : 'A delivery plan is required before profile invocations can be resolved.' }
  ];
}

function hasConfigurationErrors(resolution: ConfigResolution): boolean {
  return resolution.issues.some((issue) => issue.severity === 'error');
}

function isContainedBy(projectRoot: string, candidate: string): boolean {
  const pathFromRoot = relative(projectRoot, candidate);
  return pathFromRoot === '' || (!pathFromRoot.startsWith(`..${sep}`) && pathFromRoot !== '..' && !isAbsolute(pathFromRoot));
}

async function evaluateDeclaredSkills(
  projectRoot: string,
  skills: string[]
): Promise<DeclaredSkillEvaluation[]> {
  return Promise.all(
    skills.map(async (declaredPath) => {
      const candidate = resolve(projectRoot, declaredPath);
      if (!isContainedBy(projectRoot, candidate)) {
        return {
          path: declaredPath,
          status: 'invalid',
          detail: 'The declared skill path resolves outside the repository.',
          remediation: 'Use a repository-relative path that stays inside this checkout.'
        };
      }
      if (!(await pathExists(candidate))) {
        return {
          path: declaredPath,
          status: 'missing',
          detail: 'The declared skill path does not exist in the repository.',
          remediation: 'Create the local skill or remove its declaration from ade.config.json.'
        };
      }
      return { path: declaredPath, status: 'available', detail: 'The declared skill path exists in the repository.' };
    })
  );
}

function resolveSnapshotCapabilities(
  resolution: ConfigResolution,
  doctor: DoctorReport
): SetupCapabilityEvaluation[] {
  const configurationInvalid = hasConfigurationErrors(resolution);
  const node = doctor.checks.find((check) => check.name === 'Node version');
  const profiles = resolution.config.profiles;
  const lifecycle = resolution.config.issueLifecycle;
  const enrichment = lifecycle.enrichment;
  const delivery = lifecycle.deliveryPlan;
  const implementationProfile = delivery?.implementationProfile;
  const reviewProfiles = delivery?.reviewProfiles ?? [];
  const validationRuleIds = delivery?.validationRuleIds ?? [];
  const missingReviewProfiles = reviewProfiles.filter((id) => !profiles[id]);
  const ruleIds = new Set(resolution.config.rules.map((rule) => rule.id));
  const missingValidationRules = validationRuleIds.filter((id) => !ruleIds.has(id));

  const statusWhenConfigurationInvalid = (): 'invalid' | undefined =>
    configurationInvalid ? 'invalid' : undefined;
  const resolve = (
    id: Exclude<SetupCapabilityEvaluation['id'], 'runtime.node-version' | 'config.resolution'>,
    available: boolean,
    missingDetail: string,
    invalidDetail?: string
  ): SetupCapabilityEvaluation => {
    const invalid = statusWhenConfigurationInvalid();
    if (invalid) return { id, status: invalid, detail: 'ADE configuration has validation errors.' };
    if (invalidDetail) return { id, status: 'invalid', detail: invalidDetail };
    return available
      ? { id, status: 'available', detail: 'Resolved from the repository ADE configuration.' }
      : { id, status: 'missing', detail: missingDetail };
  };

  const enrichmentProfile = enrichment?.profile;
  const enrichmentInvalid = enrichment?.enabled === true && enrichmentProfile !== undefined && !profiles[enrichmentProfile];
  const deliveryInvalid = implementationProfile !== undefined && !profiles[implementationProfile];
  const invocationsInvalid = deliveryInvalid || missingReviewProfiles.length > 0 || missingValidationRules.length > 0;

  return [
    {
      id: 'runtime.node-version',
      status: node?.status === 'fail' ? 'unsupported' : 'available',
      detail: node?.detail ?? 'Doctor did not report a Node version check.'
    },
    {
      id: 'config.resolution',
      status: configurationInvalid ? 'invalid' : 'available',
      detail: configurationInvalid ? 'ADE configuration has validation errors.' : 'ADE configuration resolved successfully.'
    },
    resolve('issue-plan', true, 'No issue lifecycle is configured.'),
    resolve(
      'issue-enrichment',
      enrichment?.enabled === true && Boolean(enrichmentProfile && profiles[enrichmentProfile]),
      'Enable issueLifecycle.enrichment and select an existing profile.',
      enrichmentInvalid ? `Configured enrichment profile "${enrichmentProfile}" does not exist.` : undefined
    ),
    resolve(
      'delivery-plan',
      Boolean(implementationProfile && profiles[implementationProfile]),
      'Configure issueLifecycle.deliveryPlan.implementationProfile.',
      deliveryInvalid ? `Configured implementation profile "${implementationProfile}" does not exist.` : undefined
    ),
    resolve('deterministic-review', true, 'Resolve ADE configuration before deterministic review.'),
    resolve(
      'profile-invocations',
      Boolean(implementationProfile && profiles[implementationProfile]) && !invocationsInvalid,
      'Configure a delivery plan with an existing implementation profile.',
      invocationsInvalid
        ? `Unresolvable delivery references: ${[
            ...(deliveryInvalid ? [`profile:${implementationProfile}`] : []),
            ...missingReviewProfiles.map((id) => `profile:${id}`),
            ...missingValidationRules.map((id) => `rule:${id}`)
          ].join(', ')}.`
        : undefined
    )
  ];
}

async function buildCapabilitySnapshot(
  projectRoot: string,
  resolution: ConfigResolution,
  doctor: DoctorReport,
  nodeVersion: string
): Promise<SetupCapabilitySnapshot> {
  const capabilities = resolveSnapshotCapabilities(resolution, doctor);
  const node = doctor.checks.find((check) => check.name === 'Node version');
  return {
    version: SETUP_CAPABILITY_SNAPSHOT_VERSION,
    runtime: {
      adeVersion: getAdeVersion(),
      nodeVersion,
      status: node?.status === 'fail' ? 'unsupported' : 'available'
    },
    config: {
      status: hasConfigurationErrors(resolution) ? 'invalid' : 'available',
      sourceIds: [...resolution.sources].sort(),
      profileIds: Object.keys(resolution.config.profiles).sort(),
      ruleIds: resolution.config.rules.map((rule) => rule.id).sort()
    },
    declaredSkills: await evaluateDeclaredSkills(projectRoot, resolution.config.skills),
    capabilities,
    missingCapabilityIds: capabilities.filter((capability) => capability.status === 'missing').map((capability) => capability.id),
    invalidCapabilityIds: capabilities.filter((capability) => capability.status === 'invalid').map((capability) => capability.id),
    unsupportedCapabilityIds: capabilities.filter((capability) => capability.status === 'unsupported').map((capability) => capability.id)
  };
}

function renderMarkdown(evaluation: Omit<ProjectSetupEvaluation, 'markdown'>): string {
  const lines: string[] = [
    `# ADE project setup — ${evaluation.projectName}`,
    '',
    `- Contract: ${evaluation.version}`,
    `- ADE version: ${evaluation.adeVersion}`,
    `- Generated at: ${evaluation.generatedAt}`,
    `- Readiness: **${evaluation.readiness}**`,
    ''
  ];

  if (evaluation.configurationErrors.length > 0) {
    lines.push('## Configuration errors', '');
    for (const error of evaluation.configurationErrors) {
      lines.push(`- ${error}`);
    }
    lines.push('', 'Readiness cannot be assessed until these are fixed.', '');
  }

  const section = (title: string, statuses: RequirementStatus[]): void => {
    const rows = evaluation.requirements.filter((requirement) => statuses.includes(requirement.status));
    if (rows.length === 0) return;

    lines.push(`## ${title}`, '');
    for (const row of rows) {
      lines.push(`- \`${row.criticality}\` ${row.id} — ${row.detail}`);
      if (row.remediation) {
        lines.push(`  - fix: ${row.remediation}`);
      }
      if (row.template) {
        lines.push(`  - ADE ships a template for this: \`${row.template.id}\``);
      }
    }
    lines.push('');
  };

  section('Unsatisfied', ['unsatisfied']);
  section('Not verifiable locally', ['unverifiable']);
  section('Satisfied', ['satisfied']);

  return lines.join('\n');
}

/** Evaluates a repository and returns a report a consumer can act on. */
export async function evaluateProjectSetup(
  options: EvaluateProjectSetupOptions
): Promise<ProjectSetupEvaluation> {
  const projectRoot = options.projectRoot;
  const generatedAt = options.generatedAt ?? new Date().toISOString();

  const resolution = await resolveConfig({ cwd: projectRoot });
  const doctor = await runDoctor({ projectRoot, nodeVersion: options.nodeVersion });
  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(projectRoot, resolution.config, contextDir)).state;

  const context: EvaluationContext = {
    projectRoot,
    resolution,
    doctor,
    contextState,
    observedGithubLabels: options.observedGithubLabels
  };

  const requirements: RequirementEvaluation[] = [];
  for (const requirement of getSetupRequirements()) {
    const verdict = await evaluateRequirement(requirement, context);
    requirements.push({
      id: requirement.id,
      kind: requirement.kind,
      criticality: requirement.criticality,
      status: verdict.status,
      detail: verdict.detail,
      remediation: verdict.status === 'satisfied' ? undefined : requirement.remediation,
      template: verdict.status === 'satisfied' ? undefined : requirement.template
    });
  }

  const configurationErrors = resolution.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `${issue.code}: ${issue.message}`);

  const readiness = deriveReadiness(requirements, configurationErrors);

  const missingRequiredIds = requirements
    .filter((requirement) => requirement.criticality === 'required' && requirement.status === 'unsatisfied')
    .map((requirement) => requirement.id);
  const missingOptionalIds = requirements
    .filter((requirement) => requirement.criticality !== 'required' && requirement.status === 'unsatisfied')
    .map((requirement) => requirement.id);
  const unverifiableIds = requirements
    .filter((requirement) => requirement.status === 'unverifiable')
    .map((requirement) => requirement.id);

  const summaryLines = [
    `Readiness: ${readiness}`,
    `Missing required: ${missingRequiredIds.length > 0 ? missingRequiredIds.join(', ') : 'none'}`,
    `Missing optional: ${missingOptionalIds.length}`,
    `Not verifiable locally: ${unverifiableIds.length}`
  ];
  const executionCapabilities = resolveExecutionCapabilities(resolution);
  const missingExecutionCapabilityIds = executionCapabilities.filter((capability) => capability.status === 'missing').map((capability) => capability.id);
  const capabilitySnapshot = await buildCapabilitySnapshot(
    projectRoot,
    resolution,
    doctor,
    options.nodeVersion ?? process.versions.node
  );

  const withoutMarkdown: Omit<ProjectSetupEvaluation, 'markdown'> = {
    version: PROJECT_SETUP_CONTRACT_VERSION,
    adeVersion: getAdeVersion(),
    generatedAt,
    projectName: basename(projectRoot),
    readiness,
    configurationErrors,
    requirements,
    missingRequiredIds,
    missingOptionalIds,
    unverifiableIds,
    executionCapabilities,
    missingExecutionCapabilityIds,
    capabilitySnapshot,
    summaryLines
  };

  return { ...withoutMarkdown, markdown: renderMarkdown(withoutMarkdown) };
}
