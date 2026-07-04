import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { logFailure, logLines } from './cli/logger.ts';
import { getAdeVersion } from './cli/packageInfo.ts';
import { resolveConfig } from './config/loadConfig.ts';
import { checkContext } from './context/checkContext.ts';

const MIN_NODE_MAJOR = 22;

type CheckStatus = 'ok' | 'warn' | 'fail';

interface DoctorCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}

const STATUS_MARK: Record<CheckStatus, string> = { ok: 'OK', warn: 'WARN', fail: 'FAIL' };

async function readScripts(cwd: string): Promise<Record<string, string>> {
  try {
    const pkg = JSON.parse(await readFile(join(cwd, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/**
 * `ade doctor` — diagnoses the local setup: Node version, configuration
 * validity, presets, configured tools, and context freshness. Exits 1 if any
 * check fails (warnings do not fail).
 *
 * Usage: ade doctor
 */
async function main(): Promise<void> {
  const cwd = process.cwd();
  const checks: DoctorCheck[] = [];

  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({
    name: 'Node version',
    status: nodeMajor >= MIN_NODE_MAJOR ? 'ok' : 'fail',
    detail: `${process.versions.node} (requires >=${MIN_NODE_MAJOR})`
  });

  const resolution = await resolveConfig({ cwd });
  const errors = resolution.issues.filter((i) => i.severity === 'error');
  const warnings = resolution.issues.filter((i) => i.severity === 'warning');
  checks.push({
    name: 'Configuration',
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'ok',
    detail:
      errors.length > 0
        ? `${errors.length} error(s): ${errors.map((e) => e.code).join(', ')}`
        : warnings.length > 0
          ? `${warnings.length} warning(s): ${warnings.map((w) => w.code).join(', ')}`
          : `valid (${resolution.sources.length} source(s))`
  });

  const scripts = await readScripts(cwd);
  const missingTools = resolution.config.tools.filter((tool) => !(tool in scripts));
  checks.push({
    name: 'Tools',
    status: resolution.config.tools.length === 0 ? 'ok' : missingTools.length > 0 ? 'fail' : 'ok',
    detail:
      resolution.config.tools.length === 0
        ? 'none configured'
        : missingTools.length > 0
          ? `missing npm scripts: ${missingTools.join(', ')}`
          : `all present: ${resolution.config.tools.join(', ')}`
  });

  const contextDir = resolution.config.context.outputDir ?? 'outputs/context';
  const contextState = (await checkContext(cwd, resolution.config, contextDir)).state;
  checks.push({
    name: 'Context',
    status: contextState === 'up-to-date' ? 'ok' : 'warn',
    detail:
      contextState === 'up-to-date'
        ? 'up-to-date'
        : `${contextState} — run \`ade context generate\``
  });

  const failed = checks.some((c) => c.status === 'fail');

  logLines([
    `ADE doctor (v${getAdeVersion()})`,
    ...checks.map((c) => `- [${STATUS_MARK[c.status]}] ${c.name}: ${c.detail}`),
    `- Overall: ${failed ? 'problems found' : 'healthy'}`
  ]);

  if (failed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  logFailure('Doctor failed', error);
});
