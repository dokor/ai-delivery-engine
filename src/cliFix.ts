import { logFailure, logLines } from './cli/logger.ts';
import { renderFixReport, runFix } from './fix/runFix.ts';

/**
 * `ade fix` — applies purely mechanical, safe fixes:
 *   - create a missing `ade.config.json`;
 *   - (re)generate a stale or absent project context.
 *
 * `--dry-run` prints the plan without changing anything.
 *
 * Thin wrapper: the planning and application live in `fix/runFix.ts` so the
 * CLI and the MCP server share one implementation.
 *
 * Usage: ade fix [--dry-run]
 * Exit:  0 ok (including nothing to do) · 1 error
 */
async function main(): Promise<void> {
  const dryRun = process.argv.slice(2).includes('--dry-run');
  const report = await runFix({ projectRoot: process.cwd(), dryRun });

  logLines(renderFixReport(report));
}

main().catch((error: unknown) => {
  logFailure('Fix failed', error);
});
