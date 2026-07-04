import { access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { resolveConfig } from './config/loadConfig.ts';
import { defaultConfigJson } from './config/defaultConfig.ts';
import { checkContext } from './context/checkContext.ts';
import { collectProjectContext } from './context/collectContext.ts';
import { writeContext } from './context/renderContext.ts';

interface PlannedFix {
  id: string;
  description: string;
  apply: () => Promise<void>;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * `ade fix` — applies purely mechanical, safe fixes:
 *   - create a missing `ade.config.json`;
 *   - (re)generate a stale or absent project context.
 *
 * `--dry-run` prints the plan without changing anything.
 *
 * Usage: ade fix [--dry-run]
 * Exit:  0 ok (including nothing to do) · 1 error
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const dryRun = process.argv.slice(2).includes('--dry-run');

  const resolution = await resolveConfig({ cwd });
  const plan: PlannedFix[] = [];

  const configPath = resolve(cwd, 'ade.config.json');
  if (!(await fileExists(configPath))) {
    plan.push({
      id: 'create-config',
      description: 'create ade.config.json with default conventions',
      apply: () => writeFile(configPath, defaultConfigJson(), 'utf8')
    });
  }

  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(cwd, resolution.config, contextDir)).state;
  if (contextState !== 'up-to-date') {
    plan.push({
      id: 'refresh-context',
      description: `regenerate project context (currently ${contextState})`,
      apply: async () => {
        const context = await collectProjectContext(cwd, resolution.config);
        const formats = resolution.config.output.formats ?? ['json', 'markdown'];
        await writeContext(context, contextDir, cwd, formats);
      }
    });
  }

  if (plan.length === 0) {
    logLines(['ADE fix', '- nothing to fix.']);
    return;
  }

  if (dryRun) {
    logLines(['ADE fix (dry run)', ...plan.map((fix) => `- would ${fix.description}`)]);
    return;
  }

  for (const fix of plan) {
    await fix.apply();
  }
  logLines(['ADE fix', ...plan.map((fix) => `- ${fix.description}`)]);
}

main().catch((error: unknown) => {
  logFailure('Fix failed', error);
});
