import { logFailure, logLines } from './cli/logger.ts';
import { resolveConfig } from './config/loadConfig.ts';
import { getAllPacks, listPackIds } from './rules/registry.ts';
import { buildActiveRulesReport, renderRulesReport, rulesReportToJson } from './rules/renderRules.ts';

/**
 * `ade rules list` — lists the rules of the active packs (from `packs` in
 * ade.config), with id, severity, kind, explanation, rationale and suggestion.
 * `ade rules available` lists all built-in packs. `--json` emits machine output.
 *
 * Usage: ade rules [list|available] [--json]
 * Exit:  0 ok · 1 an activated pack does not exist · 2 usage error
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const action = args.find((a) => !a.startsWith('--')) ?? 'list';

  if (action !== 'list' && action !== 'available') {
    logFailure('Rules usage error', new Error(`unknown action "${action}" (expected list|available)`));
    process.exitCode = 2;
    return;
  }

  if (action === 'available') {
    const packs = getAllPacks().map((pack) => ({
      id: pack.id,
      title: pack.title,
      description: pack.description,
      ruleCount: pack.rules.length
    }));
    if (json) {
      process.stdout.write(`${JSON.stringify({ packs }, null, 2)}\n`);
    } else {
      logLines(['ADE rule packs available', ...packs.map((p) => `- ${p.id} — ${p.title} (${p.ruleCount} rules)`)]);
    }
    return;
  }

  const resolution = await resolveConfig({ cwd: process.cwd() });
  const report = buildActiveRulesReport(resolution.config.packs);

  if (json) {
    process.stdout.write(rulesReportToJson(report));
  } else {
    logLines(renderRulesReport(report));
    if (report.activePacks.length === 0) {
      logLines([`(available packs: ${listPackIds().join(', ')})`]);
    }
  }

  if (report.missingPacks.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  logFailure('Rules failed', error);
});
