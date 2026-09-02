import { access, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { getAdeVersion } from '../cli/packageInfo.ts';
import type { ConfigResolution } from '../config/config.types.ts';
import { resolveConfig } from '../config/loadConfig.ts';
import { checkContext } from '../context/checkContext.ts';
import { runDoctor, type DoctorReport } from '../doctor/runDoctor.ts';
import { getSetupRequirements } from './requirements.ts';
import {
  PROJECT_SETUP_CONTRACT_VERSION,
  type EvaluateProjectSetupOptions,
  type ExecutionCapabilityEvaluation,
  type ProjectReadiness,
  type ProjectSetupEvaluation,
  type RequirementEvaluation,
  type RequirementStatus,
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
  const doctor = await runDoctor({ projectRoot });
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
    summaryLines
  };

  return { ...withoutMarkdown, markdown: renderMarkdown(withoutMarkdown) };
}
