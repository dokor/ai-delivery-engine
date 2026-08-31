import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getAdeVersion } from '../cli/packageInfo.ts';
import { resolveConfig } from '../config/loadConfig.ts';
import { checkContext } from '../context/checkContext.ts';

/**
 * Diagnostic core behind `ade doctor` and the `ade_doctor` MCP tool.
 *
 * CLI-independent: takes an explicit project root, returns data, and never
 * reads `process.argv`, writes to a stream or sets an exit code. Rendering and
 * process concerns belong to the caller.
 */

export const MIN_NODE_MAJOR = 22;

export type DoctorCheckStatus = 'ok' | 'warn' | 'fail';

export interface DoctorCheck {
  name: string;
  status: DoctorCheckStatus;
  detail: string;
}

export interface DoctorReport {
  adeVersion: string;
  checks: DoctorCheck[];
  /** False as soon as any check failed; warnings do not make a project unhealthy. */
  healthy: boolean;
}

export interface RunDoctorOptions {
  /** Absolute path to the project to diagnose. Never defaulted to the cwd. */
  projectRoot: string;
  /** Node version to assess. Defaults to the running process's version. */
  nodeVersion?: string;
}

const STATUS_MARK: Record<DoctorCheckStatus, string> = { ok: 'OK', warn: 'WARN', fail: 'FAIL' };

async function readScripts(projectRoot: string): Promise<Record<string, string>> {
  try {
    const pkg = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

/** Diagnoses Node version, configuration validity, configured tools and context freshness. */
export async function runDoctor(options: RunDoctorOptions): Promise<DoctorReport> {
  const projectRoot = options.projectRoot;
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const checks: DoctorCheck[] = [];

  const nodeMajor = Number(nodeVersion.split('.')[0]);
  checks.push({
    name: 'Node version',
    status: nodeMajor >= MIN_NODE_MAJOR ? 'ok' : 'fail',
    detail: `${nodeVersion} (requires >=${MIN_NODE_MAJOR})`
  });

  const resolution = await resolveConfig({ cwd: projectRoot });
  const errors = resolution.issues.filter((issue) => issue.severity === 'error');
  const warnings = resolution.issues.filter((issue) => issue.severity === 'warning');
  checks.push({
    name: 'Configuration',
    status: errors.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'ok',
    detail:
      errors.length > 0
        ? `${errors.length} error(s): ${errors.map((error) => error.code).join(', ')}`
        : warnings.length > 0
          ? `${warnings.length} warning(s): ${warnings.map((warning) => warning.code).join(', ')}`
          : `valid (${resolution.sources.length} source(s))`
  });

  const scripts = await readScripts(projectRoot);
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
  const contextState = (await checkContext(projectRoot, resolution.config, contextDir)).state;
  checks.push({
    name: 'Context',
    status: contextState === 'up-to-date' ? 'ok' : 'warn',
    detail:
      contextState === 'up-to-date'
        ? 'up-to-date'
        : `${contextState} — run \`ade context generate\``
  });

  return {
    adeVersion: getAdeVersion(),
    checks,
    healthy: !checks.some((check) => check.status === 'fail')
  };
}

/** Human-readable rendering, byte-for-byte identical to the historical CLI output. */
export function renderDoctorReport(report: DoctorReport): string[] {
  return [
    `ADE doctor (v${report.adeVersion})`,
    ...report.checks.map((check) => `- [${STATUS_MARK[check.status]}] ${check.name}: ${check.detail}`),
    `- Overall: ${report.healthy ? 'healthy' : 'problems found'}`
  ];
}

/** Exit code contract: 1 when any check failed, else 0. */
export function doctorExitCode(report: DoctorReport): number {
  return report.healthy ? 0 : 1;
}
