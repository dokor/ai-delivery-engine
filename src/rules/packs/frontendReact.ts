import type { RulePack } from '../rulePack.types.ts';

export const frontendReactPack: RulePack = {
  id: 'frontend/react',
  title: 'React',
  description: 'Conventions for React component structure, design tokens and accessibility.',
  rules: [
    {
      id: 'react/component-conventions',
      severity: 'info',
      kind: 'guidance',
      explanation: 'One component per file, PascalCase names, typed props.',
      rationale: 'Predictable component structure improves readability and reuse.',
      suggestion: 'Split multiple components into separate files; type props explicitly.',
      appliesTo: ['**/*.tsx', '**/*.jsx']
    },
    {
      id: 'react/design-tokens',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Use design tokens instead of hardcoded colors, spacing or typography.',
      rationale: 'Tokens keep the UI consistent and themeable.',
      suggestion: 'Replace hardcoded values with the project design tokens.'
    },
    {
      id: 'react/hooks-rules',
      severity: 'error',
      kind: 'tool',
      explanation: 'Enforce the Rules of Hooks via eslint-plugin-react-hooks.',
      rationale: 'Hook misuse causes subtle runtime bugs that a linter catches reliably.',
      suggestion: 'Add eslint-plugin-react-hooks and configure ESLint as an ADE tool.',
      tool: 'eslint'
    },
    {
      id: 'react/accessibility',
      severity: 'warn',
      kind: 'tool',
      explanation: 'Check JSX accessibility via eslint-plugin-jsx-a11y.',
      rationale: 'Automated a11y checks catch common issues early.',
      suggestion: 'Add eslint-plugin-jsx-a11y and run it through ADE tool orchestration.',
      tool: 'eslint'
    }
  ]
};
