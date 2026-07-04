import { isIgnored } from '../context/ignoreMatcher.ts';
import type { ConfigResolution } from '../config/config.types.ts';
import type { ContextFreshness } from '../context/context.types.ts';
import type { Finding, ReviewResult, ReviewScope } from './findings.types.ts';
import { summarizeFindings } from './findings.types.ts';

const SCHEMA_VERSION = 1;

export interface RunReviewInput {
  resolution: ConfigResolution;
  /** Freshness of the generated context, when known. */
  contextState?: ContextFreshness;
  /** Repo-relative files used for rule-hygiene checks. */
  projectFiles: string[];
  scope: ReviewScope;
  /** Additional findings (tool orchestration, provider), appended as-is. */
  extraFindings?: Finding[];
}

/** Maps config validation issues to deterministic findings. */
function configFindings(resolution: ConfigResolution): Finding[] {
  return resolution.issues.map((issue) => ({
    rule: `config/${issue.code}`,
    severity: issue.severity === 'error' ? 'error' : 'warn',
    message: issue.message,
    file: issue.path,
    origin: 'deterministic'
  }));
}

/** Flags context that is stale or absent. */
function contextFindings(contextState: ContextFreshness | undefined): Finding[] {
  if (contextState === 'stale') {
    return [
      {
        rule: 'context/staleness',
        severity: 'warn',
        message: 'Project context is stale: sources, rules or config changed since it was generated.',
        suggestion: 'Run `ade context generate` to refresh it.',
        origin: 'deterministic'
      }
    ];
  }
  if (contextState === 'absent') {
    return [
      {
        rule: 'context/absent',
        severity: 'info',
        message: 'No project context has been generated yet.',
        suggestion: 'Run `ade context generate` to create it.',
        origin: 'deterministic'
      }
    ];
  }
  return [];
}

/** Flags project rules whose `appliesTo` globs match no file (rule hygiene). */
function ruleHygieneFindings(resolution: ConfigResolution, projectFiles: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const rule of resolution.config.rules) {
    if (!rule.appliesTo || rule.appliesTo.length === 0) {
      continue;
    }
    const matches = projectFiles.some((file) => isIgnored(file, rule.appliesTo ?? []));
    if (!matches) {
      findings.push({
        rule: 'rules/unmatched',
        severity: 'warn',
        message: `Rule "${rule.id}" applies to ${JSON.stringify(rule.appliesTo)} but matches no file.`,
        suggestion: 'Update the rule\'s appliesTo globs or remove the rule.',
        origin: 'deterministic'
      });
    }
  }
  return findings;
}

/**
 * Runs ADE's deterministic review: configuration validity, context freshness,
 * and project-rule hygiene, plus any injected extra findings (tool
 * orchestration or a provider). Pure and CLI-independent — the caller supplies
 * the resolved config, context state and file list.
 */
export function runReview(input: RunReviewInput): ReviewResult {
  const findings: Finding[] = [
    ...configFindings(input.resolution),
    ...contextFindings(input.contextState),
    ...ruleHygieneFindings(input.resolution, input.projectFiles),
    ...(input.extraFindings ?? [])
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    scope: input.scope,
    findings,
    summary: summarizeFindings(findings)
  };
}

/** Exit code contract: 1 when any error finding exists, else 0. */
export function reviewExitCode(result: ReviewResult): number {
  return result.summary.error > 0 ? 1 : 0;
}
