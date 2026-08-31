import { doctorExitCode, renderDoctorReport, runDoctor } from './doctor/runDoctor.ts';
import { logFailure, logLines } from './cli/logger.ts';

/**
 * `ade doctor` — diagnoses the local setup: Node version, configuration
 * validity, presets, configured tools, and context freshness. Exits 1 if any
 * check fails (warnings do not fail).
 *
 * Thin wrapper: the diagnosis itself lives in `doctor/runDoctor.ts` so the CLI,
 * the CI and the MCP server share one implementation.
 *
 * Usage: ade doctor
 */
async function main(): Promise<void> {
  const report = await runDoctor({ projectRoot: process.cwd() });

  logLines(renderDoctorReport(report));

  const exitCode = doctorExitCode(report);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

main().catch((error: unknown) => {
  logFailure('Doctor failed', error);
});
