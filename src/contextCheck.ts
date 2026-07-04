import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { resolveConfig } from './config/loadConfig.ts';
import { checkContext } from './context/checkContext.ts';
import type { ContextFreshness } from './context/context.types.ts';

/** Exit codes let CI branch on freshness deterministically. */
const EXIT_CODE_BY_STATE: Record<ContextFreshness, number> = {
  'up-to-date': 0,
  stale: 1,
  absent: 2
};

/**
 * `ade context:check` — reports whether the generated context is absent,
 * up-to-date or stale, without writing anything. Exits 0 when up-to-date,
 * 1 when stale, 2 when absent.
 *
 * Usage: ade context:check [outputDir]
 */
async function main(): Promise<void> {
  const [outputArg] = process.argv.slice(2);
  const cwd = process.cwd();

  const resolution = await resolveConfig({ cwd });
  const configuredDir = resolution.config.context.outputDir ?? 'outputs/context';
  const outputDirectory = resolveOutputDirectory(outputArg, configuredDir);

  const result = await checkContext(cwd, resolution.config, outputDirectory);

  logLines([
    'Context check',
    `- State: ${result.state}`,
    `- Context file: ${result.contextPath}`,
    `- Current fingerprint: ${result.currentFingerprint}`,
    ...(result.storedFingerprint ? [`- Stored fingerprint:  ${result.storedFingerprint}`] : []),
    ...(result.state === 'stale'
      ? ['- Hint: run `ade context:generate` to refresh the context.']
      : []),
    ...(result.state === 'absent'
      ? ['- Hint: run `ade context:generate` to create the context.']
      : [])
  ]);

  process.exitCode = EXIT_CODE_BY_STATE[result.state];
}

main().catch((error: unknown) => {
  logFailure('Context check failed', error);
});
