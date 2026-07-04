import type { FindingSeverity } from '../engine/findings.types.ts';

/**
 * How a rule is enforced:
 * - `deterministic` — ADE checks it locally and can emit a finding;
 * - `tool` — ADE orchestrates or references an external tool (ESLint, tsc,
 *   phpcs, …) rather than reimplementing it;
 * - `guidance` — a project convention surfaced for humans and AI agents; ADE
 *   states it but does not mechanically enforce it.
 */
export type RuleKind = 'deterministic' | 'tool' | 'guidance';

export interface PackRule {
  /** Namespaced id, e.g. `development/service-size` or `next/client-server-boundary`. */
  id: string;
  severity: FindingSeverity;
  kind: RuleKind;
  /** What the rule expects (the "what"). */
  explanation: string;
  /** Why it matters (the "why"). */
  rationale: string;
  /** A concrete remediation example. */
  suggestion: string;
  /** Globs the rule applies to. */
  appliesTo?: string[];
  /** For `tool` rules: the external tool that covers this concern. */
  tool?: string;
}

export interface RulePack {
  /** Pack id used in `ade.config` `packs`, e.g. `frontend/next`. */
  id: string;
  title: string;
  description: string;
  rules: PackRule[];
}
