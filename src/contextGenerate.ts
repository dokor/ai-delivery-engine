import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { renderConfigResolution } from './config/renderConfig.ts';
import { collectProjectContext } from './context/collectContext.ts';
import { writeContext } from './context/renderContext.ts';

/**
 * `ade context:generate` — builds the deterministic project context from local
 * sources and writes Markdown + JSON artifacts. Fails fast on configuration
 * errors so context is never generated from an invalid config.
 *
 * Usage: ade context:generate [outputDir]
 */
async function main(): Promise<void> {
  const [outputArg] = process.argv.slice(2);
  const cwd = process.cwd();

  const resolution = await resolveConfig({ cwd });
  if (hasConfigErrors(resolution)) {
    logLines(renderConfigResolution(resolution));
    logFailure('Context generation aborted', new Error('configuration has errors'));
    return;
  }

  const configuredDir = resolution.config.context.outputDir ?? 'outputs/context';
  const outputDirectory = resolveOutputDirectory(outputArg, configuredDir);
  const formats = resolution.config.output.formats ?? ['json', 'markdown'];

  const context = await collectProjectContext(cwd, resolution.config);
  const written = await writeContext(context, outputDirectory, cwd, formats);

  logLines([
    'Context generated',
    `- Fingerprint: ${context.fingerprint}`,
    `- Modules: ${context.modules.length}`,
    `- Packages: ${context.packages.length}`,
    `- Commands: ${context.commands.length}`,
    `- ADRs: ${context.adrs.length}`,
    ...(written.jsonPath ? [`- JSON: ${written.jsonPath}`] : []),
    ...(written.markdownPath ? [`- Markdown: ${written.markdownPath}`] : [])
  ]);
}

main().catch((error: unknown) => {
  logFailure('Context generation failed', error);
});
