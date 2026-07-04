import { logFailure, logLines } from './cli/logger.ts';
import { hasConfigErrors, resolveConfig } from './config/loadConfig.ts';
import { checkContext } from './context/checkContext.ts';
import { collectProjectContext } from './context/collectContext.ts';
import { assembleContextItems } from './contextpack/assembleItems.ts';
import { buildContextPack } from './contextpack/buildContextPack.ts';
import { resolveMode } from './contextpack/modes.ts';
import { writeContextPack } from './contextpack/renderPack.ts';
import type { Finding, ReviewScope } from './engine/findings.types.ts';
import { getChangedFiles } from './engine/gitScope.ts';
import { listProjectFiles } from './engine/projectFiles.ts';
import { getProviderAdapter } from './engine/provider.types.ts';
import { renderReviewHuman, reviewToJson } from './engine/renderFindings.ts';
import { reviewExitCode, runReview } from './engine/review.ts';
import { runTool, toolResultsToFindings } from './engine/tools.ts';
import { runDeterministicPackRules } from './rules/runRulePacks.ts';

const DEFAULT_IGNORES = ['node_modules/**', '.git/**', 'dist/**', 'outputs/**'];

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
  const ignore = [...DEFAULT_IGNORES, ...resolution.config.ignore];

  // Determine scope.
  const changedFiles = args.staged || args.base
    ? getChangedFiles({ cwd, staged: args.staged, base: args.base })
    : undefined;
  const scope: ReviewScope = {
    kind: args.staged ? 'staged' : args.base ? 'base' : 'project',
    base: args.base,
    changedFiles
  };

  const projectFiles = await listProjectFiles(cwd, ignore);
  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(cwd, resolution.config, contextDir)).state;

  const extraFindings: Finding[] = [];

  // Deterministic rules from the active rule packs (e.g. service size).
  extraFindings.push(...(await runDeterministicPackRules({ cwd, config: resolution.config, files: projectFiles })));

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
    const items = assembleContextItems({ context, config: resolution.config, mode, diffContent, diffRef: 'diff:scope' });
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

  const result = runReview({ resolution, contextState, projectFiles, scope, extraFindings });

  if (args.json) {
    process.stdout.write(reviewToJson(result));
  } else {
    logLines(renderReviewHuman(result));
  }

  // Config errors always fail the review, independent of finding severity mapping.
  process.exitCode = hasConfigErrors(resolution) ? 1 : reviewExitCode(result);
}

main().catch((error: unknown) => {
  logFailure('Review failed', error);
});
