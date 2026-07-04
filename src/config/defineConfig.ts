import type { AdeConfig } from './config.types.ts';

/**
 * Identity helper that gives editors full type-checking and autocompletion
 * when authoring an `ade.config.ts`:
 *
 * ```ts
 * import { defineConfig } from '@alelouet/ai-delivery-engine';
 *
 * export default defineConfig({
 *   extends: ['./presets/typescript.json'],
 *   profiles: { ci: { mode: 'deterministic' } },
 *   ignore: ['.env*', 'dist/**'],
 * });
 * ```
 */
export function defineConfig(config: AdeConfig): AdeConfig {
  return config;
}
