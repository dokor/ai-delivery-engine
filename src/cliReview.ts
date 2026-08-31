import { logFailure, logLines } from './cli/logger.ts';
import { resolveConfig } from './config/loadConfig.ts';
import { collectProjectContext } from './context/collectContext.ts';
import { assembleContextItems } from './contextpack/assembleItems.ts';
import { buildContextPack } from './contextpack/buildContextPack.ts';
import { extractFragments } from './contextpack/fragments.ts';
import { resolveMode } from './contextpack/modes.ts';
import { writeContextPack } from './contextpack/renderPack.ts';
import type { Finding } from './engine/findings.types.ts';
import { getChangedFiles } from './engine/gitScope.ts';
import { getProviderAdapter } from './engine/provider.types.ts';
import { renderReviewHuman, reviewToJson } from './engine/renderFindings.ts';
import { runTool, toolResultsToFindings } from './engine/tools.ts';
import { DEFAULT_REVIEW_IGNORES, runProjectReview } from './review/runProjectReview.ts';

interface ReviewArgs {
  staged: boolean;
  base?: string;
  provider?: string;
  json: boolean;
  runTools: boolean;
  usageError?: string;
}

function parseArgs(argv: string[]): ReviewArgs {
  const args: ReviewArgs = { staged: false, json: false, runTools: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--staged':
        args.staged = true;
        break;
      case '--json':
        args.json = true;
        break;
      case '--run-tools':
        args.runTools = true;
        break;
      case '--base':
        args.base = argv[i + 1];
        i += 1;
        if (!args.base) {
          args.usageError = '--base requires a git ref';
        }
        break;
      case '--provider':
        args.provider = argv[i + 1];
        i += 1;
        if (!args.provider) {
          args.usageError = '--provider requires a provider name';
        }
        break;
      default:
        args.usageError = `unknown argument "${arg}"`;
    }
  }
  return args;
}

/**
 * `ade review` — runs ADE's deterministic review (config validity, context
 * freshness, rule hygiene) over the whole project or a diff scope, optionally
 * orchestrating configured tools. `--provider <name>` prepares a budgeted
 * review pack (never calling a provider unless an adapter is registered).
 *
 * The deterministic core lives in `review/runProjectReview.ts`, shared with the
 * MCP server. Tool orchestration and provider packs stay here: they are opt-in
 * CLI concerns and are injected as `extraFindings`.
 *
 * Usage: ade review [--staged | --base <ref>] [--run-tools] [--provider <name>] [--json]
 * Exit:  0 no error findings · 1 error findings · 2 usage error
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  if (args.usageError) {
    logFailure('Review usage error', new Error(args.usageError));
    process.exitCode = 2;
    return;
  }

  const resolution = await resolveConfig({ cwd });
  const ignore = [...DEFAULT_REVIEW_IGNORES, ...resolution.config.ignore];
  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';

  const changedFiles = args.staged || args.base
    ? getChangedFiles({ cwd, staged: args.staged, base: args.base })
    : undefined;

  const extraFindings: Finding[] = [];

  // Optional tool orchestration.
  if (args.runTools && resolution.config.tools.length > 0) {
    const results = resolution.config.tools.map((tool) => runTool(tool, cwd));
    extraFindings.push(...toolResultsToFindings(results));
  }

  // Optional provider: prepare a pack; call only if an adapter is registered.
  if (args.provider) {
    const context = await collectProjectContext(cwd, resolution.config);
    const mode = resolveMode('normal', resolution.config);
    const diffContent = changedFiles
      ? `Changed files:\n${changedFiles.map((f) => `- ${f}`).join('\n')}`
      : undefined;

    // Neighbour fragments: the local modules the changed files import, ranked
    // and capped by the mode — the last "targeted context" lever of #102.
    const fragments = changedFiles && changedFiles.length > 0
      ? await extractFragments({
          cwd,
          seedFiles: changedFiles,
          maxFragments: mode.maxFragments,
          sensitivePatterns: resolution.config.sensitive,
          ignore
        })
      : [];

    const items = assembleContextItems({ context, config: resolution.config, mode, diffContent, diffRef: 'diff:scope', fragments });
    const pack = buildContextPack(items, {
      mode: mode.name,
      budget: mode.tokenBudget,
      sensitivePatterns: resolution.config.sensitive
    });
    const written = await writeContextPack(pack, contextDir, cwd);

    const adapter = getProviderAdapter(args.provider);
    if (adapter) {
      extraFindings.push(...(await adapter.reviewFromPack({ pack, provider: args.provider })));
    } else if (!args.json) {
      logLines([
        `Provider "${args.provider}" has no registered adapter.`,
        `Prepared review pack written to ${written.contentPath} (no provider called, no key required).`
      ]);
    }
  }

  const outcome = await runProjectReview({
    projectRoot: cwd,
    staged: args.staged,
    base: args.base,
    resolution,
    extraFindings
  });

  if (args.json) {
    process.stdout.write(reviewToJson(outcome.result));
  } else {
    logLines(renderReviewHuman(outcome.result));
  }

  process.exitCode = outcome.exitCode;
}

main().catch((error: unknown) => {
  logFailure('Review failed', error);
});
