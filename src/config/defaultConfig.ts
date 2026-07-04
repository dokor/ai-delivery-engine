/** The default `ade.config.json` written by `ade init` / `ade fix`. */
export const DEFAULT_ADE_CONFIG = {
  ignore: ['.env*', 'dist/**', 'node_modules/**', 'outputs/**'],
  sensitive: ['.env*', '**/*.pem', '**/*.key', '**/secrets.*'],
  tools: [],
  profiles: {
    ci: { mode: 'deterministic' },
    local: { mode: 'deterministic' },
    chill: { context: 'compact', tokenBudget: 4000 },
    normal: { context: 'compact', tokenBudget: 12000 },
    expert: { context: 'full', tokenBudget: 32000 }
  },
  context: {
    docsDir: 'docs',
    adrDir: 'docs/DECISIONS',
    outputDir: 'outputs/context'
  },
  output: { formats: ['markdown', 'json'] }
} as const;

export function defaultConfigJson(): string {
  return `${JSON.stringify(DEFAULT_ADE_CONFIG, null, 2)}\n`;
}
