import type { ResolvedAdeConfig } from '../config/config.types.ts';
import type { Finding } from '../engine/findings.types.ts';
import { activeRules } from './registry.ts';
import { DEFAULT_SERVICE_GLOBS, DEFAULT_SERVICE_MAX_LINES, checkServiceSize } from './serviceSize.ts';

export interface RunRulePacksInput {
  cwd: string;
  config: ResolvedAdeConfig;
  /** Repo-relative files (already ignore-pruned). */
  files: string[];
}

/**
 * Runs the *deterministic* rules of the config's active packs and returns their
 * findings. `tool` and `guidance` rules are not enforced here — they are
 * surfaced by `ade rules list` (and, for tools, orchestrated via `--run-tools`).
 *
 * Currently the deterministic handler is the service-size rule; new
 * deterministic rules plug in by matching their id here.
 */
export async function runDeterministicPackRules(input: RunRulePacksInput): Promise<Finding[]> {
  const rules = activeRules(input.config.packs);
  const findings: Finding[] = [];

  for (const rule of rules) {
    if (rule.kind !== 'deterministic') {
      continue;
    }
    if (rule.id === 'development/service-size') {
      const maxLines = input.config.thresholds.serviceMaxLines ?? DEFAULT_SERVICE_MAX_LINES;
      findings.push(
        ...(await checkServiceSize({
          cwd: input.cwd,
          files: input.files,
          appliesTo: rule.appliesTo ?? DEFAULT_SERVICE_GLOBS,
          maxLines,
          severity: rule.severity,
          ruleId: rule.id
        }))
      );
    }
  }

  return findings;
}
