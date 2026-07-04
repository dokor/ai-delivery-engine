import { spawnSync } from 'node:child_process';

import type { Finding } from './findings.types.ts';

export interface ToolRunResult {
  tool: string;
  status: number;
  ok: boolean;
}

/** npm script names are limited to safe characters; anything else is rejected. */
const SAFE_TOOL_NAME = /^[A-Za-z0-9_:.-]+$/;

/**
 * Runs a configured tool as an npm script (`npm run <tool>`) and reports its
 * outcome. ADE orchestrates existing tools (tsc, ESLint, tests, …) — it does
 * not replace them. Non-interactive; inherits no TTY. Tool names are validated
 * before spawning to avoid shell metacharacter injection on Windows (where npm
 * is invoked through a shell).
 */
export function runTool(tool: string, cwd: string): ToolRunResult {
  if (!SAFE_TOOL_NAME.test(tool)) {
    return { tool, status: 1, ok: false };
  }
  const result = spawnSync('npm', ['run', tool, '--silent'], {
    cwd,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  const status = result.status ?? 1;
  return { tool, status, ok: status === 0 };
}

/**
 * Normalizes tool outcomes into deterministic findings. Pure — takes results,
 * so it is unit-testable without spawning anything. A failing tool becomes an
 * error finding; a passing tool produces no finding.
 */
export function toolResultsToFindings(results: ToolRunResult[]): Finding[] {
  return results
    .filter((result) => !result.ok)
    .map((result) => ({
      rule: `tools/${result.tool}`,
      severity: 'error' as const,
      message: `Tool "${result.tool}" failed with exit code ${result.status}.`,
      suggestion: `Run \`npm run ${result.tool}\` locally to see the details.`,
      origin: 'deterministic' as const
    }));
}
