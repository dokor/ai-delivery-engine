import { logFailure, logLines } from './cli/logger.ts';
import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { renderConfigResolution } from './config/renderConfig.ts';

/**
 * `ade config validate` — resolves and validates the configuration without
 * writing anything. Exits 1 when the configuration has errors, else 0.
 *
 * Usage: ade config validate [configPath]
 */
async function main(): Promise<void> {
  const [configArg] = process.argv.slice(2);
  const resolution = await resolveConfig({ cwd: process.cwd(), configPath: configArg });

  logLines(renderConfigResolution(resolution));

  if (hasConfigErrors(resolution)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  logFailure('Config validate failed', error);
});
