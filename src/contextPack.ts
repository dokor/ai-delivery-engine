import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { resolveInputPath, resolveOutputDirectory } from './cli/paths.ts';
import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { renderConfigResolution } from './config/renderConfig.ts';
import { collectProjectContext } from './context/collectContext.ts';
import { assembleContextItems } from './contextpack/assembleItems.ts';
import { buildContextPack } from './contextpack/buildContextPack.ts';
import { computeCacheKey, readCachedPack, writeCachedPack } from './contextpack/cache.ts';
import { DEFAULT_MODE, isModeName, resolveMode, type ModeName } from './contextpack/modes.ts';
import { renderPackSummary, writeContextPack } from './contextpack/renderPack.ts';

/**
 * `ade context:pack` — assembles a minimal, budgeted context pack for a single
 * LLM interaction and writes it with a transparent manifest. Never calls a
 * provider. Reuses the project context (#84) and config (#83), applies the
 * chosen mode's budget (chill/normal/expert), excludes sensitive files, and
 * caches the result by content + config fingerprint.
 *
 * Usage: ade context:pack [mode] [diffFile]
 *   mode     chill | normal | expert (default: normal)
 *   diffFile optional path to a diff / changed-files summary (required item)
 */
async function main(): Promise<void> {
  const cwd = process.cwd();

  let mode: ModeName = DEFAULT_MODE;
  let diffFile: string | undefined;
  for (const arg of process.argv.slice(2)) {
    if (isModeName(arg)) {
      mode = arg;
    } else {
      diffFile = arg;
    }
  }

  const resolution = await resolveConfig({ cwd });
  if (hasConfigErrors(resolution)) {
    logLines(renderConfigResolution(resolution));
    logFailure('Context pack aborted', new Error('configuration has errors'));
    return;
  }

  const modeSettings = resolveMode(mode, resolution.config);
  const context = await collectProjectContext(cwd, resolution.config);

  let diffContent: string | undefined;
  let diffRef: string | undefined;
  if (diffFile) {
    const { inputPath, sourceInput } = resolveInputPath(diffFile, diffFile);
    diffContent = await readFile(inputPath, 'utf8');
    diffRef = `diff:${sourceInput}`;
  }

  const items = assembleContextItems({
    context,
    config: resolution.config,
    mode: modeSettings,
    diffContent,
    diffRef
  });

  const configuredDir = resolution.config.context.outputDir ?? 'outputs/context';
  const outputDirectory = resolveOutputDirectory(undefined, configuredDir);
  const cacheDirectory = join(outputDirectory, 'cache');

  const cacheKey = computeCacheKey(items, context.fingerprint, modeSettings.name, modeSettings.tokenBudget);
  const cached = await readCachedPack(cacheDirectory, cacheKey);

  let pack;
  if (cached) {
    pack = { ...cached, manifest: { ...cached.manifest, cacheHit: true, cacheKey } };
  } else {
    pack = buildContextPack(items, {
      mode: modeSettings.name,
      budget: modeSettings.tokenBudget,
      sensitivePatterns: resolution.config.sensitive,
      cacheKey,
      cacheHit: false
    });
    await writeCachedPack(cacheDirectory, cacheKey, pack);
  }

  const written = await writeContextPack(pack, outputDirectory, cwd);

  logLines([
    ...renderPackSummary(pack),
    `- Pack: ${written.contentPath}`,
    `- Manifest: ${written.manifestPath}`
  ]);
}

main().catch((error: unknown) => {
  logFailure('Context pack failed', error);
});
