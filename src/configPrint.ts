import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { renderConfigResolution, writeConfigResolution } from './config/renderConfig.ts';

const DEFAULT_OUTPUT_DIRECTORY = 'outputs';

/**
 * `ade config:print` — resolves the effective ADE configuration (merging all
 * `extends` presets with visible provenance), prints a human summary, writes a
 * machine-readable resolved config under `outputs/config/`, and exits non-zero
 * when the configuration has validation errors.
 *
 * Usage: ade config:print [configPath] [outputDir]
 */
async function main(): Promise<void> {
  const [configArg, outputArg] = process.argv.slice(2);
  const outputsDirectory = resolveOutputDirectory(outputArg, DEFAULT_OUTPUT_DIRECTORY);

  const resolution = await resolveConfig({
    cwd: process.cwd(),
    configPath: configArg
  });

  const outputPath = await writeConfigResolution(resolution, outputsDirectory);

  logLines([...renderConfigResolution(resolution), `- JSON output: ${outputPath}`]);

  if (hasConfigErrors(resolution)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  logFailure('Config print failed', error);
});
