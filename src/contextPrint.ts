import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { resolveOutputDirectory } from './cli/paths.ts';
import { resolveConfig } from './config/loadConfig.ts';
import type { ProjectContext } from './context/context.types.ts';
import { renderContextMarkdown } from './context/renderContext.ts';

/**
 * `ade context:print` — prints the previously generated context as Markdown to
 * stdout. Read-only; if no context exists it points to `context:generate`.
 *
 * Usage: ade context:print [outputDir]
 */
async function main(): Promise<void> {
  const [outputArg] = process.argv.slice(2);
  const cwd = process.cwd();

  const resolution = await resolveConfig({ cwd });
  const configuredDir = resolution.config.context.outputDir ?? 'outputs/context';
  const outputDirectory = resolveOutputDirectory(outputArg, configuredDir);
  const contextPath = join(outputDirectory, 'context.json');

  let context: ProjectContext;
  try {
    context = JSON.parse(await readFile(contextPath, 'utf8')) as ProjectContext;
  } catch {
    logFailure(
      'Context print failed',
      new Error('no context found; run `ade context:generate` first')
    );
    return;
  }

  logLines([renderContextMarkdown(context).replace(/\n$/, '')]);
}

main().catch((error: unknown) => {
  logFailure('Context print failed', error);
});
