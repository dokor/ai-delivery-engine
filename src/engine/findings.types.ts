/**
 * Normalized result model shared by every ADE workflow, independent of the CLI.
 *
 * A finding always states its origin: `deterministic` (produced by ADE's own
 * local checks and tool orchestration) or `provider` (produced by an optional
 * AI provider). ADE never calls a provider implicitly, so by default every
 * finding is deterministic.
 */

export type FindingSeverity = 'info' | 'warn' | 'error';

export type FindingOrigin = 'deterministic' | 'provider';

export interface FindingLocation {
  line?: number;
  column?: number;
}

export interface Finding {
  /** Stable rule identifier, e.g. `config/UNKNOWN_KEY` or `context/staleness`. */
  rule: string;
  severity: FindingSeverity;
  /** Human explanation of the problem. */
  message: string;
  /** Repo-relative file the finding refers to, when applicable. */
  file?: string;
  location?: FindingLocation;
  /** Actionable suggestion, when available. */
  suggestion?: string;
  origin: FindingOrigin;
}

export interface FindingSummary {
  error: number;
  warn: number;
  info: number;
  total: number;
}

export interface ReviewScope {
  /** How the change set was determined: whole project, staged, or a base ref. */
  kind: 'project' | 'staged' | 'base';
  base?: string;
  /** Changed files when scoped to a diff (undefined for whole-project). */
  changedFiles?: string[];
}

export interface ReviewResult {
  schemaVersion: number;
  scope: ReviewScope;
  findings: Finding[];
  summary: FindingSummary;
}

export function summarizeFindings(findings: Finding[]): FindingSummary {
  const summary: FindingSummary = { error: 0, warn: 0, info: 0, total: findings.length };
  for (const finding of findings) {
    summary[finding.severity] += 1;
  }
  return summary;
}
