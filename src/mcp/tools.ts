import { resolveConfig } from '../config/loadConfig.ts';
import { collectProjectContext } from '../context/collectContext.ts';
import { contextToJson, renderContextMarkdown } from '../context/renderContext.ts';
import { renderReviewHuman } from '../engine/renderFindings.ts';
import { doctorExitCode, renderDoctorReport, runDoctor } from '../doctor/runDoctor.ts';
import { renderFixReport, runFix } from '../fix/runFix.ts';
import { runProjectReview } from '../review/runProjectReview.ts';
import { evaluateProjectSetup } from '../setup/evaluate.ts';
import { getProjectSetupContract, projectSetupContractToJson } from '../setup/requirements.ts';
import { buildActiveRulesReport, renderRulesReport } from '../rules/renderRules.ts';
import { getAllPacks, listPackIds } from '../rules/registry.ts';
import type { PackRule } from '../rules/rulePack.types.ts';
import {
  McpBoundaryError,
  resolveProjectRoot,
  toConfinedRelativePaths,
  type McpLimits
} from './safety.ts';

/**
 * The tools of the ADE MCP server.
 *
 * Every tool delegates to the shared programmatic core, so a tool result is by
 * construction the same as the corresponding CLI command's result. No tool
 * calls an AI provider, opens a network connection or orchestrates external
 * processes — the one exception being read-only `git diff`, used to determine a
 * review scope.
 */

export interface ToolContext {
  /** Whether the server was started with writes enabled. */
  allowWrite: boolean;
  limits: McpLimits;
  env: NodeJS.ProcessEnv;
  /** Diagnostics sink. Always stderr: stdout carries JSON-RPC only. */
  log: (message: string) => void;
}

export interface JsonSchemaProperty {
  type: string | string[];
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, JsonSchemaProperty>;
  required?: string[];
  additionalProperties: false;
}

export interface McpToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
  annotations: McpToolAnnotations;
  handler: (args: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

const PROJECT_ROOT_PROPERTY: JsonSchemaProperty = {
  type: 'string',
  description:
    'Absolute path to the project. Optional when the server was started with ADE_PROJECT_ROOT. The working directory is never used as a fallback.'
};

// --- Argument reading --------------------------------------------------------

function readOptionalString(
  args: Record<string, unknown>,
  key: string
): string | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new McpBoundaryError(`Argument "${key}" must be a string.`);
  }
  return value;
}

function readRequiredString(args: Record<string, unknown>, key: string): string {
  const value = readOptionalString(args, key);
  if (value === undefined || value.trim() === '') {
    throw new McpBoundaryError(`Argument "${key}" is required.`);
  }
  return value;
}

function readOptionalBoolean(
  args: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'boolean') {
    throw new McpBoundaryError(`Argument "${key}" must be a boolean.`);
  }
  return value;
}

function readOptionalStringArray(
  args: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new McpBoundaryError(`Argument "${key}" must be an array of strings.`);
  }
  return value as string[];
}

function readEnum<T extends string>(
  args: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  const value = readOptionalString(args, key);
  if (value === undefined) {
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    throw new McpBoundaryError(
      `Argument "${key}" must be one of: ${allowed.join(', ')}.`
    );
  }
  return value as T;
}

function describeRule(rule: PackRule & { pack: string }, active: boolean | undefined): string {
  const lines = [
    `Rule ${rule.id}`,
    `- pack: ${rule.pack}`,
    `- severity: ${rule.severity}`,
    `- kind: ${rule.kind}`,
    `- what: ${rule.explanation}`,
    `- why: ${rule.rationale}`,
    `- fix: ${rule.suggestion}`
  ];
  if (rule.tool) {
    lines.push(`- tool: ${rule.tool}`);
  }
  if (active !== undefined) {
    lines.push(
      `- active in this project: ${active ? 'yes' : `no (enable pack "${rule.pack}" via \`packs\` in ade.config)`}`
    );
  }
  return lines.join('\n');
}

/** Collects every built-in rule, annotated with its pack. */
function allRules(): Array<PackRule & { pack: string }> {
  return getAllPacks().flatMap((pack) => pack.rules.map((rule) => ({ ...rule, pack: pack.id })));
}

// --- Tools -------------------------------------------------------------------

export const TOOLS: McpToolDefinition[] = [
  {
    name: 'ade_get_project_context',
    description:
      "Returns ADE's deterministic project context: detected stack, packages, commands, conventions and ADRs. Read-only, no AI call. Use it before reasoning about an unfamiliar project.",
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY,
        format: {
          type: 'string',
          description: 'Output format. "markdown" is compact and readable; "json" is exact.',
          enum: ['markdown', 'json']
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Get project context',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const format = readEnum(args, 'format', ['markdown', 'json'] as const, 'markdown');
      const resolution = await resolveConfig({ cwd: projectRoot });
      const projectContext = await collectProjectContext(projectRoot, resolution.config);

      return format === 'json'
        ? contextToJson(projectContext)
        : renderContextMarkdown(projectContext);
    }
  },

  {
    name: 'ade_list_rules',
    description:
      'Lists ADE rules. "active" lists the rules enabled for this project by its configuration; "available" lists every built-in rule pack. Read-only, no AI call.',
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY,
        scope: {
          type: 'string',
          description:
            'Which rules to list. "active" needs a project root; "available" works without one.',
          enum: ['active', 'available']
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'List rules',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const scope = readEnum(args, 'scope', ['active', 'available'] as const, 'active');

      if (scope === 'available') {
        const packs = getAllPacks().map(
          (pack) => `- ${pack.id} — ${pack.title} (${pack.rules.length} rules): ${pack.description}`
        );
        return ['ADE rule packs available', ...packs].join('\n');
      }

      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const resolution = await resolveConfig({ cwd: projectRoot });
      const report = buildActiveRulesReport(resolution.config.packs);
      const lines = renderRulesReport(report);

      if (report.activePacks.length === 0) {
        lines.push(`(available packs: ${listPackIds().join(', ')})`);
      }
      return lines.join('\n');
    }
  },

  {
    name: 'ade_explain_rule',
    description:
      'Explains one ADE rule by id: what it checks, why it matters, how to fix it, and whether it is active in this project. Read-only, no AI call.',
    inputSchema: {
      type: 'object',
      properties: {
        ruleId: {
          type: 'string',
          description: 'Rule identifier, as listed by ade_list_rules.'
        },
        projectRoot: PROJECT_ROOT_PROPERTY
      },
      required: ['ruleId'],
      additionalProperties: false
    },
    annotations: {
      title: 'Explain a rule',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const ruleId = readRequiredString(args, 'ruleId');
      const rule = allRules().find((candidate) => candidate.id === ruleId);

      if (!rule) {
        const known = allRules()
          .map((candidate) => candidate.id)
          .slice(0, 40)
          .join(', ');
        throw new McpBoundaryError(
          `Unknown rule "${ruleId}". Known rules include: ${known}. Use ade_list_rules for the full list.`
        );
      }

      // Activation is extra information, not the point of the tool: report it
      // when a project root is available, stay useful when it is not.
      let active: boolean | undefined;
      try {
        const projectRoot = await resolveProjectRoot(
          readOptionalString(args, 'projectRoot'),
          context.env
        );
        const resolution = await resolveConfig({ cwd: projectRoot });
        active = resolution.config.packs.includes(rule.pack);
      } catch (error) {
        if (!(error instanceof McpBoundaryError)) {
          throw error;
        }
      }

      return describeRule(rule, active);
    }
  },

  {
    name: 'ade_review_files',
    description:
      "Runs ADE's deterministic review over the project, optionally narrowed to given files: configuration validity, context freshness, rule hygiene and the active rule packs. Same result as `ade review`. No AI call, no provider, nothing written.",
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY,
        files: {
          type: 'array',
          description:
            'Repo-relative files to narrow the rule checks to. Omit to review the whole project.',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Review files',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const requested = readOptionalStringArray(args, 'files');
      const files = requested
        ? await toConfinedRelativePaths(requested, projectRoot, context.limits)
        : undefined;

      const outcome = await runProjectReview({ projectRoot, files });
      return renderReviewHuman(outcome.result).join('\n');
    }
  },

  {
    name: 'ade_review_git_diff',
    description:
      "Runs ADE's deterministic review scoped to a git diff — the staged changes or `<base>...HEAD`. Same result as `ade review --staged` / `--base`. Read-only: runs `git diff --name-only` and nothing else.",
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY,
        staged: {
          type: 'boolean',
          description: 'Review the staged changes.'
        },
        base: {
          type: 'string',
          description: 'Git ref to compare against, reviewing `<base>...HEAD`.'
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Review a git diff',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const staged = readOptionalBoolean(args, 'staged');
      const base = readOptionalString(args, 'base');

      if (staged === true && base !== undefined) {
        throw new McpBoundaryError('Pass either "staged" or "base", not both.');
      }
      if (staged !== true && base === undefined) {
        throw new McpBoundaryError(
          'Pass "staged": true or a "base" ref. For a whole-project review, use ade_review_files.'
        );
      }

      const outcome = await runProjectReview({ projectRoot, staged, base });
      const lines = renderReviewHuman(outcome.result);

      if (outcome.result.scope.changedFiles === undefined) {
        lines.push(
          '- Note: no diff could be determined (not a git repository, or git unavailable). The review covers the whole project.'
        );
      }
      return lines.join('\n');
    }
  },

  {
    name: 'ade_doctor',
    description:
      "Diagnoses the ADE setup of a project: Node version, configuration validity, configured tools and project-context freshness. Same result as `ade doctor`. Read-only, no AI call.",
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Diagnose the setup',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const report = await runDoctor({ projectRoot });
      const lines = renderDoctorReport(report);
      lines.push(`- Exit code an equivalent CLI run would return: ${doctorExitCode(report)}`);
      return lines.join('\n');
    }
  },

  {
    name: 'ade_project_setup',
    description:
      "Answers what a repository needs to be fully configured for ADE. mode \"contract\" returns the versioned requirement catalogue with no project involved; mode \"check\" evaluates a repository as ready, incomplete or invalid. Read-only, no AI call, no GitHub access — label requirements come back as unverifiable unless you pass observedGithubLabels.",
    inputSchema: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description:
            'What to return. "check" (default) evaluates a repository; "contract" returns the requirement catalogue and needs no project root.',
          enum: ['check', 'contract']
        },
        projectRoot: PROJECT_ROOT_PROPERTY,
        observedGithubLabels: {
          type: 'array',
          description:
            'Label names observed on the remote repository. Supply them to have GitHub label requirements evaluated instead of reported as unverifiable.',
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Project setup contract',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const mode = readEnum(args, 'mode', ['check', 'contract'] as const, 'check');

      if (mode === 'contract') {
        return projectSetupContractToJson(getProjectSetupContract());
      }

      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const observedGithubLabels = readOptionalStringArray(args, 'observedGithubLabels');
      const evaluation = await evaluateProjectSetup({ projectRoot, observedGithubLabels });

      return evaluation.markdown;
    }
  },

  {
    name: 'ade_suggest_fix',
    description:
      "Lists the mechanical fixes ADE can apply to a project — creating a missing ade.config.json, regenerating a stale project context. Plans only by default and writes nothing; pass apply: true only if the server was started with writes enabled.",
    inputSchema: {
      type: 'object',
      properties: {
        projectRoot: PROJECT_ROOT_PROPERTY,
        apply: {
          type: 'boolean',
          description:
            'Actually write the fixes. Refused unless the server was started with --allow-write.'
        }
      },
      additionalProperties: false
    },
    annotations: {
      title: 'Suggest mechanical fixes',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    },
    handler: async (args, context) => {
      const projectRoot = await resolveProjectRoot(
        readOptionalString(args, 'projectRoot'),
        context.env
      );
      const apply = readOptionalBoolean(args, 'apply') ?? false;

      if (apply && !context.allowWrite) {
        throw new McpBoundaryError(
          'Writes are disabled on this server. Restart it with --allow-write to let ade_suggest_fix apply fixes, ' +
            'or run `ade fix` yourself. The plan below was not applied.'
        );
      }

      const dryRun = !apply;
      const report = await runFix({ projectRoot, dryRun });

      if (!dryRun && report.applied.length > 0) {
        for (const fix of report.applied) {
          context.log(`write applied: ${fix.id} — ${fix.description} (${projectRoot})`);
        }
      }

      const lines = renderFixReport(report);
      if (dryRun && report.planned.length > 0) {
        lines.push('- Nothing was written. Run `ade fix` locally, or call again with apply: true on a write-enabled server.');
      }
      return lines.join('\n');
    }
  }
];

/** Public tool descriptors, as returned by `tools/list` (handlers stripped). */
export function toolDescriptors(): Array<Omit<McpToolDefinition, 'handler'>> {
  return TOOLS.map(({ handler: _handler, ...descriptor }) => descriptor);
}

export function findTool(name: string): McpToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}
