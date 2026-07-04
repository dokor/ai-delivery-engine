import { DEFAULT_SERVICE_GLOBS } from '../serviceSize.ts';
import type { RulePack } from '../rulePack.types.ts';

/** Cross-cutting rules that apply regardless of the stack. */
export const developmentPack: RulePack = {
  id: 'development',
  title: 'Cross-cutting development',
  description: 'Stack-agnostic project conventions for file split, dependencies, tests and documentation.',
  rules: [
    {
      id: 'development/service-size',
      severity: 'warn',
      kind: 'deterministic',
      explanation: 'Service files should stay under a configurable line threshold (default 250).',
      rationale: 'Oversized services concentrate too many responsibilities, making them hard to test and change.',
      suggestion: 'Extract cohesive responsibilities into smaller units; raise `thresholds.serviceMaxLines` if the size is intentional.',
      appliesTo: DEFAULT_SERVICE_GLOBS
    },
    {
      id: 'development/forbidden-dependencies',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Do not import dependencies the project marks as forbidden or sensitive.',
      rationale: 'Some packages are banned for licensing, security or architectural reasons.',
      suggestion: 'Use the project-approved alternative, or document an explicit exception.'
    },
    {
      id: 'development/test-conventions',
      severity: 'info',
      kind: 'guidance',
      explanation: 'Follow the project test conventions (location and naming).',
      rationale: 'Consistent test placement keeps the suite discoverable and maintainable.',
      suggestion: 'Co-locate or place tests per the project convention; name them consistently.'
    },
    {
      id: 'development/doc-conventions',
      severity: 'info',
      kind: 'guidance',
      explanation: 'Document public modules and non-obvious decisions.',
      rationale: 'Documentation lowers onboarding cost and preserves intent.',
      suggestion: 'Add a short doc comment or ADR for public APIs and non-obvious choices.'
    }
  ]
};
