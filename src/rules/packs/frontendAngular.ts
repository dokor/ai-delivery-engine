import type { RulePack } from '../rulePack.types.ts';

export const frontendAngularPack: RulePack = {
  id: 'frontend/angular',
  title: 'Angular',
  description: 'Conventions for Angular module structure and component responsibilities.',
  rules: [
    {
      id: 'angular/module-structure',
      severity: 'info',
      kind: 'guidance',
      explanation: 'Organize by feature modules; apply a consistent standalone-components policy.',
      rationale: 'Clear module boundaries keep large Angular apps navigable.',
      suggestion: 'Group a feature\'s components, services and routes; decide standalone vs NgModule consistently.'
    },
    {
      id: 'angular/smart-dumb-components',
      severity: 'info',
      kind: 'guidance',
      explanation: 'Separate container (smart) components from presentational (dumb) ones.',
      rationale: 'Separating data orchestration from rendering improves testability and reuse.',
      suggestion: 'Move data access to container components; keep presentational components input/output-driven.'
    },
    {
      id: 'angular/lint',
      severity: 'warn',
      kind: 'tool',
      explanation: 'Use angular-eslint rather than reimplementing Angular-specific lint rules.',
      rationale: 'angular-eslint already encodes Angular best practices.',
      suggestion: 'Configure angular-eslint and orchestrate it as an ADE tool.',
      tool: 'eslint'
    }
  ]
};
