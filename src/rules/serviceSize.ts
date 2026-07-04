import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { isIgnored } from '../context/ignoreMatcher.ts';
import type { Finding, FindingSeverity } from '../engine/findings.types.ts';

/** Default globs considered "services" for the size rule. */
export const DEFAULT_SERVICE_GLOBS = ['**/*service*.*', '**/services/**/*.*'];

/** Default service line threshold (a recommendation, not a hard rule). */
export const DEFAULT_SERVICE_MAX_LINES = 250;

/** Counts lines in text (trailing newline does not add a phantom line). */
export function countLines(text: string): number {
  if (text === '') {
    return 0;
  }
  const normalized = text.endsWith('\n') ? text.slice(0, -1) : text;
  return normalized.split(/\r?\n/).length;
}

export interface ServiceSizeInput {
  cwd: string;
  /** Repo-relative candidate files (already ignore-pruned). */
  files: string[];
  appliesTo: string[];
  maxLines: number;
  severity: FindingSeverity;
  ruleId: string;
}

/**
 * Deterministic service-size check: flags files matching the service globs that
 * exceed the configurable line threshold. This is a *recommendation* to refactor
 * (a `warn`), not a blind architectural assertion — the threshold is
 * configurable via `thresholds.serviceMaxLines`.
 */
export async function checkServiceSize(input: ServiceSizeInput): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const file of input.files) {
    if (!isIgnored(file, input.appliesTo)) {
      continue;
    }
    let content: string;
    try {
      content = await readFile(join(input.cwd, file), 'utf8');
    } catch {
      continue;
    }
    const lines = countLines(content);
    if (lines > input.maxLines) {
      findings.push({
        rule: input.ruleId,
        severity: input.severity,
        message: `${file} has ${lines} lines, above the recommended ${input.maxLines} for a service.`,
        file,
        suggestion: 'Consider extracting cohesive responsibilities into smaller units. Adjust thresholds.serviceMaxLines if intentional.',
        origin: 'deterministic'
      });
    }
  }

  return findings;
}
