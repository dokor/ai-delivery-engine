import { access, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { resolveConfig } from '../config/loadConfig.ts';
import { defaultConfigJson } from '../config/defaultConfig.ts';
import { checkContext } from '../context/checkContext.ts';
import { collectProjectContext } from '../context/collectContext.ts';
import { writeContext } from '../context/renderContext.ts';

/**
 * Mechanical-fix core behind `ade fix` and the `ade_suggest_fix` MCP tool.
 *
 * CLI-independent: takes an explicit project root and an explicit `dryRun`
 * flag, returns the plan and what was applied, and never reads `process.argv`
 * or writes to a stream.
 *
 * `dryRun: true` is guaranteed side-effect free — that guarantee is what lets
 * the MCP server expose this tool read-only by default.
 */

export interface PlannedFix {
  id: string;
  description: string;
}

interface ExecutableFix extends PlannedFix {
  apply: () => Promise<void>;
}

export interface FixReport {
  /** Everything that needed fixing, whether or not it was applied. */
  planned: PlannedFix[];
  /** Empty in dry-run mode. */
  applied: PlannedFix[];
  dryRun: boolean;
}

export interface RunFixOptions {
  /** Absolute path to the project to fix. Never defaulted to the cwd. */
  projectRoot: string;
  /** When true, nothing is written to disk. */
  dryRun: boolean;
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
 * Plans, and unless `dryRun`, applies purely mechanical fixes:
 *   - create a missing `ade.config.json`;
 *   - (re)generate a stale or absent project context.
 */
export async function runFix(options: RunFixOptions): Promise<FixReport> {
  const projectRoot = options.projectRoot;
  const resolution = await resolveConfig({ cwd: projectRoot });
  const plan: ExecutableFix[] = [];

  const configPath = resolve(projectRoot, 'ade.config.json');
  if (!(await fileExists(configPath))) {
    plan.push({
      id: 'create-config',
      description: 'create ade.config.json with default conventions',
      apply: () => writeFile(configPath, defaultConfigJson(), 'utf8')
    });
  }

  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(projectRoot, resolution.config, contextDir)).state;
  if (contextState !== 'up-to-date') {
    plan.push({
      id: 'refresh-context',
      description: `regenerate project context (currently ${contextState})`,
      apply: async () => {
        const context = await collectProjectContext(projectRoot, resolution.config);
        const formats = resolution.config.output.formats ?? ['json', 'markdown'];
        await writeContext(context, contextDir, projectRoot, formats);
      }
    });
  }

  const planned: PlannedFix[] = plan.map((fix) => ({ id: fix.id, description: fix.description }));

  if (options.dryRun || plan.length === 0) {
    return { planned, applied: [], dryRun: options.dryRun };
  }

  for (const fix of plan) {
    await fix.apply();
  }

  return { planned, applied: planned, dryRun: false };
}

/** Human-readable rendering, byte-for-byte identical to the historical CLI output. */
export function renderFixReport(report: FixReport): string[] {
  if (report.planned.length === 0) {
    return ['ADE fix', '- nothing to fix.'];
  }
  if (report.dryRun) {
    return ['ADE fix (dry run)', ...report.planned.map((fix) => `- would ${fix.description}`)];
  }
  return ['ADE fix', ...report.applied.map((fix) => `- ${fix.description}`)];
}
