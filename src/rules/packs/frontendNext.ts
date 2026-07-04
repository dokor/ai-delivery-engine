import type { RulePack } from '../rulePack.types.ts';

export const frontendNextPack: RulePack = {
  id: 'frontend/next',
  title: 'Next.js',
  description: 'Conventions for Next.js apps: client/server boundaries, data access, feature structure.',
  rules: [
    {
      id: 'next/client-server-boundary',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Keep server-only code out of client components; use `"use client"` deliberately.',
      rationale: 'Leaking server code (secrets, DB access) into client bundles is a security and correctness risk.',
      suggestion: 'Move server logic to server components, route handlers or server actions; add `"use client"` only where interactivity is needed.',
      appliesTo: ['app/**', 'src/app/**', 'components/**']
    },
    {
      id: 'next/data-access-policy',
      severity: 'warn',
      kind: 'guidance',
      explanation: 'Access data through server actions or route handlers, not directly from client components.',
      rationale: 'Centralizing data access keeps credentials server-side and requests auditable.',
      suggestion: 'Call a server action or `app/api/**` route handler instead of fetching protected resources from the client.'
    },
    {
      id: 'next/feature-structure',
      severity: 'info',
      kind: 'guidance',
      explanation: 'Organize code by feature under the app directory.',
      rationale: 'Feature-based structure keeps related UI, data and logic together.',
      suggestion: 'Group route, components and data of a feature in one folder.'
    },
    {
      id: 'next/lint',
      severity: 'warn',
      kind: 'tool',
      explanation: 'Run the Next.js ESLint config (core-web-vitals) rather than reimplementing its rules.',
      rationale: 'ESLint + eslint-config-next already covers many Next.js pitfalls.',
      suggestion: 'Add `next lint` (or eslint-config-next) to the project and configure it as an ADE tool.',
      tool: 'next lint'
    }
  ]
};
