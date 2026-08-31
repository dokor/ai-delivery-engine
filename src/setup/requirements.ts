import { getAdeVersion } from '../cli/packageInfo.ts';
import { defaultConfigJson } from '../config/defaultConfig.ts';
import { getAllPacks } from '../rules/registry.ts';
import {
  PROJECT_SETUP_CONTRACT_VERSION,
  type ProjectSetupContract,
  type RequirementCriticality,
  type SetupRequirement
} from './setup.types.ts';

/**
 * The catalogue of what ADE requires from a repository.
 *
 * This is the only place these requirements are written down. A consumer —
 * `ade-control-plane` in particular — reads them from here rather than
 * hard-coding filenames, labels and conventions, so the two cannot drift.
 *
 * Requirement ids are part of the public contract: renaming one is a breaking
 * change and must go through a contract version bump.
 */

/**
 * Labels the supported ADE GitHub issue workflow relies on.
 *
 * These are the workflow labels documented in CLAUDE.md, not this repository's
 * own taxonomy (`area:`, `type:`, `priority:`…). Declaring the latter would make
 * the contract inapplicable to consuming projects.
 */
const WORKFLOW_LABELS: Array<{
  name: string;
  description: string;
  criticality: RequirementCriticality;
}> = [
  {
    name: 'backlog-refined',
    description: 'Applied once an issue has an objective, acceptance criteria and technical context.',
    criticality: 'required'
  },
  {
    name: 'ready-for-dev',
    description: 'Applied to a refined, estimated issue that implementation may start from.',
    criticality: 'required'
  },
  {
    name: 'in-progress',
    description: 'Applied while a branch is open and implementation is under way.',
    criticality: 'required'
  },
  {
    name: 'pr-ready',
    description: 'Applied when a pull request is open, reviewed and awaiting human merge.',
    criticality: 'required'
  },
  {
    name: 'needs-info',
    description: 'Applied when refinement is blocked on information only a human can supply.',
    criticality: 'recommended'
  },
  {
    name: 'backend',
    description: 'Domain marker routing an issue to the backend specialist perspective.',
    criticality: 'recommended'
  },
  {
    name: 'frontend',
    description: 'Domain marker routing an issue to the front-end specialist perspective.',
    criticality: 'recommended'
  },
  {
    name: 'security',
    description: 'Domain marker routing an issue to the security specialist perspective.',
    criticality: 'recommended'
  },
  {
    name: 'devops',
    description: 'Domain marker routing an issue to the devops specialist perspective.',
    criticality: 'recommended'
  },
  {
    name: 'qa',
    description: 'Domain marker routing an issue to the QA specialist perspective.',
    criticality: 'recommended'
  },
  {
    name: 'legal-compliance',
    description: 'Domain marker routing an issue to the legal and compliance perspective.',
    criticality: 'recommended'
  },
  {
    name: 'good-first-issue',
    description: 'Marks an issue as self-contained enough for a first-time contributor.',
    criticality: 'optional'
  }
];

const ISSUE_TEMPLATES: Array<{
  path: string;
  description: string;
  criticality: RequirementCriticality;
}> = [
  {
    path: '.github/ISSUE_TEMPLATE/ade-feature.md',
    description:
      'Feature template carrying the fields the refinement loop expects: objective, acceptance criteria, technical context.',
    criticality: 'recommended'
  },
  {
    path: '.github/ISSUE_TEMPLATE/ade-bug.md',
    description: 'Bug template with reproduction steps and expected behaviour.',
    criticality: 'optional'
  }
];

/** Every requirement, in a stable order that consumers may rely on. */
export function getSetupRequirements(): SetupRequirement[] {
  const requirements: SetupRequirement[] = [
    {
      id: 'config.ade-config',
      kind: 'config-file',
      scope: 'local',
      criticality: 'required',
      title: 'ADE configuration file',
      description:
        'Declares ignore and sensitive globs, tools, rules, profiles and context locations. Without it ADE falls back to defaults and cannot honour project conventions.',
      path: 'ade.config.json',
      remediation: 'Run `ade init`, or write the ADE-provided default configuration to ade.config.json.',
      template: {
        id: 'ade.config.json',
        description: 'Default ADE configuration, identical to what `ade init` writes.'
      }
    },
    {
      id: 'config.valid',
      kind: 'config-file',
      scope: 'local',
      criticality: 'required',
      title: 'Configuration resolves without errors',
      description:
        'The resolved configuration must be free of validation errors: unknown keys, invalid enums, extends cycles or stored secrets.',
      remediation: 'Run `ade config validate` and fix the reported errors.'
    },
    {
      id: 'context.generated',
      kind: 'project-context',
      scope: 'local',
      criticality: 'required',
      title: 'Project context generated and fresh',
      description:
        'The deterministic project context — stack, modules, commands, conventions — must exist and match the current sources, otherwise every downstream prompt is built on stale facts.',
      remediation: 'Run `ade context generate`, then `ade context check` to confirm freshness.'
    },
    {
      id: 'agent.instructions',
      kind: 'agent-instructions',
      scope: 'local',
      criticality: 'recommended',
      title: 'Agent instruction file',
      description:
        'A CLAUDE.md or AGENTS.md at the repository root, describing the commands, workflows and gates an agent must respect.',
      path: 'CLAUDE.md',
      remediation: 'Add a CLAUDE.md (or AGENTS.md) describing available commands, workflows and human approval gates.'
    },
    {
      id: 'docs.readme',
      kind: 'documentation',
      scope: 'local',
      criticality: 'recommended',
      title: 'Project README',
      description: 'Entry point for both humans and agents: what the project is, and how to run it.',
      path: 'README.md',
      remediation: 'Add a README.md describing the project and its main commands.'
    },
    {
      id: 'docs.directory',
      kind: 'documentation',
      scope: 'local',
      criticality: 'recommended',
      title: 'Documentation directory',
      description:
        'The directory the resolved configuration points at for documentation, used when assembling project context.',
      remediation: 'Create the configured documentation directory, or point `context.docsDir` at an existing one.'
    },
    {
      id: 'docs.decisions',
      kind: 'documentation',
      scope: 'local',
      criticality: 'optional',
      title: 'Architecture decision records',
      description:
        'The configured ADR directory. ADRs give an agent the reasoning behind the architecture, not just its shape.',
      remediation: 'Create the configured ADR directory and record decisions as they are made.'
    },
    {
      id: 'rules.packs-selected',
      kind: 'rule-packs',
      scope: 'local',
      criticality: 'recommended',
      title: 'At least one rule pack enabled',
      description:
        'Rule packs carry the technical conventions ADE reviews against. With none enabled, `ade review` only checks configuration and context hygiene.',
      remediation:
        'Set `packs` in ade.config.json to one or more available pack ids, listed in this contract under availableRulePacks.'
    },
    {
      id: 'env.node-version',
      kind: 'environment',
      scope: 'local',
      criticality: 'required',
      title: 'Supported Node.js version',
      description: 'ADE requires Node.js 22 or later to run its commands.',
      remediation: 'Install Node.js 22 or later.'
    },
    {
      id: 'env.tools-available',
      kind: 'environment',
      scope: 'local',
      criticality: 'recommended',
      title: 'Configured tools are runnable',
      description:
        'Every entry of `tools` in the configuration must match an npm script, otherwise `ade review --run-tools` cannot orchestrate it.',
      remediation: 'Add the missing npm scripts, or remove them from `tools` in ade.config.json.'
    }
  ];

  for (const label of WORKFLOW_LABELS) {
    requirements.push({
      id: `github.label.${label.name}`,
      kind: 'github-label',
      scope: 'github',
      criticality: label.criticality,
      title: `GitHub label "${label.name}"`,
      description: label.description,
      label: label.name,
      remediation: `Create the "${label.name}" label on the repository.`
    });
  }

  for (const template of ISSUE_TEMPLATES) {
    requirements.push({
      id: `github.issue-template.${template.path.split('/').pop() ?? template.path}`,
      kind: 'issue-template',
      scope: 'local',
      criticality: template.criticality,
      title: `Issue template ${template.path}`,
      description: template.description,
      path: template.path,
      remediation: `Add ${template.path}, based on the ADE-provided template of the same id.`,
      template: {
        id: template.path,
        description: 'ADE-provided issue template body.'
      }
    });
  }

  return requirements;
}

/** ADE-owned content that satisfies a templated requirement, resolved by id. */
export function getSetupTemplate(templateId: string): string | undefined {
  if (templateId === 'ade.config.json') {
    return defaultConfigJson();
  }
  return SETUP_TEMPLATE_BODIES[templateId];
}

const SETUP_TEMPLATE_BODIES: Record<string, string> = {
  '.github/ISSUE_TEMPLATE/ade-feature.md': `---
name: Feature
about: A change ADE can refine and implement
labels: []
---

## Objective

<!-- One sentence: what should be true once this is done. -->

## Acceptance criteria

- [ ]
- [ ]
- [ ]

## Technical context

<!-- Files involved, dependencies, impact on tests. -->

## Risks

<!-- Regressions, breaking changes. -->
`,
  '.github/ISSUE_TEMPLATE/ade-bug.md': `---
name: Bug
about: Something behaves differently from what is documented
labels: []
---

## What happens

## What should happen

## Reproduction

1.
2.

## Environment

<!-- ADE version, Node version, operating system. -->
`
};

/** The full contract: what ADE requires, with no repository involved. */
export function getProjectSetupContract(): ProjectSetupContract {
  return {
    version: PROJECT_SETUP_CONTRACT_VERSION,
    adeVersion: getAdeVersion(),
    requirements: getSetupRequirements(),
    availableRulePacks: getAllPacks().map((pack) => ({
      id: pack.id,
      title: pack.title,
      description: pack.description,
      ruleCount: pack.rules.length
    })),
    githubLabels: WORKFLOW_LABELS,
    issueTemplates: ISSUE_TEMPLATES
  };
}

export function projectSetupContractToJson(contract: ProjectSetupContract): string {
  return `${JSON.stringify(contract, null, 2)}\n`;
}
