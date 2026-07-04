import type { RulePack } from '../rulePack.types.ts';

export const backendJavaPack: RulePack = {
  id: 'backend/java',
  title: 'Java',
  description: 'Conventions for Java backends: layering, errors, transactions, validation.',
  rules: [
    {
      id: 'java/layering',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Keep a clear controller / service / repository separation.',
      rationale: 'Mixing layers couples transport, business logic and persistence, hurting testability.',
      suggestion: 'Move business logic to services and data access to repositories; keep controllers thin.',
      appliesTo: ['**/*.java']
    },
    {
      id: 'java/error-conventions',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Use consistent exception types; never silently swallow exceptions.',
      rationale: 'Swallowed errors hide failures and complicate debugging.',
      suggestion: 'Throw or wrap with meaningful exceptions; log with context instead of empty catch blocks.',
      appliesTo: ['**/*.java']
    },
    {
      id: 'java/transactions',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Manage transactions at the service boundary.',
      rationale: 'Transaction scope at the service layer keeps units of work coherent.',
      suggestion: 'Apply @Transactional at the service method that represents the unit of work.'
    },
    {
      id: 'java/input-validation',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Validate inputs at the boundaries.',
      rationale: 'Boundary validation prevents invalid state from propagating.',
      suggestion: 'Validate DTOs (e.g. Bean Validation) at controllers/service entry points.'
    }
  ]
};
